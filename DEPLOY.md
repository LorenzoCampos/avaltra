# Deploy Multi-Proveedor: Vercel + Render + Neon

Guia para deployar aplicaciones con arquitectura **React/Vite (frontend) + Go/Gin (backend) + PostgreSQL** usando servicios gratuitos.

**Costo total: $0/mes** (free tiers de los 3 proveedores).

```
Browser --> Vercel (CDN, frontend estatico)
              |
              | /api/* (rewrite server-side)
              v
           Render (Docker, Go backend)
              |
              | SQL (SSL)
              v
           Neon (PostgreSQL serverless)
```

---

## Requisitos previos

- Cuenta de GitHub con el repo del proyecto
- El proyecto es un monorepo con estructura:
  ```
  /
  ├── backend/        # Go + Dockerfile
  │   └── migrations/ # archivos NNN_name.up.sql
  └── frontend/       # React + Vite
  ```

---

## Paso 1: Base de datos (Neon)

**Free tier:** 3 proyectos, 512MB storage, 0.25 vCPU.

1. Ir a [neon.tech](https://neon.tech) y registrarse con GitHub
2. **Create Project** → elegir nombre y region (us-east-1 recomendado)
3. Copiar el **connection string** con formato:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Guardar esta URL — se usa en el backend como `DATABASE_URL`

### Alternativa: Supabase

Si ya usas Supabase (2 proyectos gratis, 500MB):
```
postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

> **IMPORTANTE:** Tanto Neon como Supabase generan URLs con `postgresql://`. Si tu backend usa `lib/pq` (Go), necesitas normalizar a `postgres://` en el codigo. Ver seccion "Gotchas".

---

## Paso 2: Backend (Render)

**Free tier:** 750 hrs/mes, Docker nativo, autodeploy desde GitHub.

### Opcion A: Con render.yaml (recomendado)

1. Crear `render.yaml` en la **raiz** del repo:

```yaml
services:
  - type: web
    name: mi-app-api
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    plan: free
    region: oregon
    branch: main
    healthCheckPath: /api/health
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: ENV
        value: production
      - key: COOKIE_SECURE
        value: "true"
      - key: CORS_ALLOWED_ORIGINS
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        sync: false
      - key: SMTP_USERNAME
        sync: false
      - key: SMTP_PASSWORD
        sync: false
      - key: SMTP_FROM
        sync: false
```

2. Ir a [render.com](https://render.com) → registrarse con GitHub
3. **New → Blueprint** → seleccionar el repo
4. Completar las variables marcadas `sync: false` en el dashboard:
   - `DATABASE_URL` = connection string de Neon (paso 1)
   - `CORS_ALLOWED_ORIGINS` = `https://tu-app.vercel.app`
   - `FRONTEND_URL` = `https://tu-app.vercel.app`
   - Variables SMTP segun tu proveedor
5. Deploy y esperar ~3 min
6. Copiar la URL asignada (ej: `https://mi-app-api.onrender.com`)

### Opcion B: Manual

1. **New → Web Service** → conectar repo GitHub
2. **Root Directory:** `backend`
3. **Runtime:** Docker
4. Configurar variables de entorno en el dashboard
5. Deploy

### Verificar que funciona

```bash
curl https://mi-app-api.onrender.com/api/health
# Respuesta esperada: {"status":"ok"}
```

> **NOTA:** El free tier suspende el servicio tras 15 min de inactividad. La primera request despues de eso tarda ~30s (cold start). Es normal.

---

## Paso 3: Frontend (Vercel)

**Free tier:** Ilimitado para proyectos personales, CDN global, autodeploy.

### 3.1 Crear vercel.json

Crear `frontend/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://MI-APP-API.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

**Reemplazar** `MI-APP-API.onrender.com` con la URL real del paso 2.

### 3.2 Sobre los rewrites

El orden de los rewrites es critico:

1. **`/api/:path*`** (primero) — proxea requests al backend via Render
2. **`/(.*)`** (ultimo) — SPA fallback, sirve `index.html` para todas las rutas de React

Sin el segundo rewrite, navegar directamente a `/login`, `/dashboard`, etc. devuelve 404 de Vercel.

### 3.3 Deploy en Vercel

1. Ir a [vercel.com](https://vercel.com) → registrarse con GitHub
2. **Import Project** → seleccionar el repo
3. **Root Directory:** `frontend`
4. **Framework:** Vite (autodetectado)
5. **Environment Variables:** no necesitas ninguna (el rewrite maneja el proxy)
6. Deploy

### Verificar que funciona

Abrir `https://tu-app.vercel.app` — deberia cargar la app de React.

---

## Gotchas (problemas comunes y soluciones)

### 1. `new URL()` falla con "Invalid URL"

**Causa:** `VITE_API_URL=/api` es relativo. `new URL("/api/path")` necesita URL absoluta.

**Solucion** en `api/client.js`:
```js
const RAW_URL = import.meta.env.VITE_API_URL || '/api'
const BASE_URL = RAW_URL.startsWith('http')
  ? RAW_URL
  : `${window.location.origin}${RAW_URL}`
```

### 2. Pagina recarga infinitamente en /login

**Causa:** AuthContext monta → GET /profile → 401 → client redirige a /login → pagina recarga → loop.

**Solucion:** Agregar opcion `skipAuthRedirect` al API client:
```js
async function request(method, path, { body, params, skipAuthRedirect } = {}) {
  // ... en el catch del 401:
  if (!skipAuthRedirect) {
    window.location.href = '/login'
  }
  throw new Error('Sesion expirada')
}
```

Y en AuthContext, el check inicial usa:
```js
api.get('/profile', { skipAuthRedirect: true })
```

### 3. `postgresql://` vs `postgres://`

**Causa:** Neon/Supabase generan `postgresql://` pero `lib/pq` (Go) registra el driver como `postgres://`.

**Solucion** en el backend:
```go
dbURL := strings.Replace(databaseURL, "postgresql://", "postgres://", 1)
m, err := migrate.New(migrationsPath, dbURL)
```

### 4. Migraciones no se ejecutan (golang-migrate)

**Causa:** golang-migrate requiere formato `NNN_name.up.sql`. Archivos sin `.up.` son ignorados silenciosamente.

**Solucion:**
```bash
# Renombrar todos los archivos
cd backend/migrations
for f in *.sql; do mv "$f" "${f%.sql}.up.sql"; done
```

### 5. Vercel devuelve 404 en rutas de React

**Causa:** Falta el SPA catch-all rewrite en `vercel.json`.

**Solucion:** Agregar como ULTIMO rewrite:
```json
{ "source": "/(.*)", "destination": "/index.html" }
```

### 6. Cookies no llegan al backend

**Causa probable:** Si el frontend y backend estan en dominios distintos sin proxy, las cookies `SameSite=Lax` no se envian cross-origin.

**Solucion:** Usar Vercel rewrites como proxy (recomendado). El browser ve todo como same-origin y las cookies funcionan sin cambiar `SameSite` a `None`.

### 7. CORS bloqueado

**Causa:** `CORS_ALLOWED_ORIGINS` en el backend no incluye el dominio de Vercel.

**Solucion:** En Render, setear:
```
CORS_ALLOWED_ORIGINS=https://tu-app.vercel.app
```

---

## Variables de entorno por servicio

### Render (backend)

| Variable | Ejemplo | Requerida |
|----------|---------|-----------|
| `DATABASE_URL` | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` | Si |
| `JWT_SECRET` | (auto-generado por Render) | Si |
| `ENV` | `production` | Si |
| `COOKIE_SECURE` | `true` | Si |
| `CORS_ALLOWED_ORIGINS` | `https://tu-app.vercel.app` | Si |
| `FRONTEND_URL` | `https://tu-app.vercel.app` | Si |
| `SMTP_HOST` | `smtp.mailtrap.io` | Si (si envia emails) |
| `SMTP_PORT` | `2525` | Si (si envia emails) |
| `SMTP_USERNAME` | `xxx` | Si (si envia emails) |
| `SMTP_PASSWORD` | `xxx` | Si (si envia emails) |
| `SMTP_FROM` | `App <noreply@dominio>` | Si (si envia emails) |

> `PORT` es inyectado automaticamente por Render. No configurar manualmente.

### Vercel (frontend)

No necesita variables de entorno. El `vercel.json` maneja todo.

Si por algun motivo necesitas `VITE_API_URL`, setealo como `/api` (el rewrite lo resuelve).

### Neon (base de datos)

No necesita configuracion adicional. Solo copiar el connection string al backend.

---

## Desarrollo local

Para desarrollo local, nada cambia:

```bash
# Terminal 1: Backend
cd backend
cp .env.example .env  # editar con valores locales
go run ./cmd/server/

# Terminal 2: Frontend
cd frontend
cp .env.example .env  # VITE_API_URL=http://localhost:8081/api
pnpm dev
```

O con Docker Compose (si prefieres):
```bash
docker compose up
```

Los archivos `Dockerfile`, `nginx.conf` y `docker-compose.yml` siguen siendo validos para desarrollo local y no interfieren con Vercel/Render.

---

## Checklist de deploy

- [ ] Crear proyecto en Neon → copiar connection string
- [ ] Crear servicio en Render → setear variables de entorno
- [ ] Verificar `curl https://backend.onrender.com/api/health` → `{"status":"ok"}`
- [ ] Actualizar `frontend/vercel.json` con URL real de Render
- [ ] Deploy en Vercel → root directory: `frontend`
- [ ] Verificar que la app carga en `https://app.vercel.app`
- [ ] Probar registro de usuario
- [ ] Probar login / logout
- [ ] Verificar que las migraciones corrieron (logs de Render)
