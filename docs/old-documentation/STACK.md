# 📚 Stack Tecnológico - Avaltra

## 🎯 Visión General

Aplicación web full-stack para gestión financiera personal/familiar con soporte multi-moneda.

---

## 🔧 Backend (Completado ✅)

### Core
- **Lenguaje:** Go 1.23
- **Framework Web:** Gin (HTTP router y middleware)
- **Base de Datos:** PostgreSQL 15
- **Driver DB:** pgx/v5 (conexión pool nativa)
- **Autenticación:** JWT (access + refresh tokens)
- **Password Hashing:** bcrypt

### Dependencias Principales
```go
github.com/gin-gonic/gin v1.11.0           // Web framework
github.com/jackc/pgx/v5 v5.7.0             // PostgreSQL driver (compatible Go 1.23)
github.com/golang-jwt/jwt/v5 v5.3.0        // JWT tokens
github.com/joho/godotenv v1.5.1            // Variables de entorno
golang.org/x/crypto v0.40.0                // bcrypt
github.com/google/uuid v1.6.0              // UUIDs
```

### Deployment
- **Containerización:** Docker (multi-stage build)
- **Imagen Base:** golang:1.23-alpine (build) + alpine:latest (runtime)
- **Tamaño Imagen:** ~80MB (optimizada)
- **Reverse Proxy:** Apache 2.4.66
- **SSL:** Let's Encrypt (certbot)
- **URL Producción:** https://api.fakerbostero.online/avaltra

### Infraestructura
- **VPS:** Debian 12
- **PostgreSQL:** Compartido con otros proyectos
- **Docker Network:** Bridge (host.docker.internal para DB)
- **Puerto Interno:** 8080
- **Logs:** Docker logs + Apache logs

---

## ⚛️ Frontend (En Desarrollo 🚧)

### Core Stack

#### Build Tool & Framework
- **Build Tool:** Vite 6.x (última versión)
  - **¿Por qué?** Super rápido (10x más que Webpack), HMR instantáneo, configuración mínima
  - **Alternativas descartadas:** 
    - Create React App (obsoleto, no mantenido)
    - Webpack directo (configuración compleja)

- **Framework:** React 18
  - **¿Por qué?** El estándar de la industria, ecosistema gigante
  - **Alternativas descartadas:**
    - Next.js (overkill, no necesitamos SSR para app privada)
    - Vue/Angular (menos demanda laboral)

- **Lenguaje:** TypeScript 5.x
  - **¿Por qué?** Previene bugs, autocompletado increíble, estándar de la industria
  - **Trade-off:** Curva de aprendizaje inicial (pero vale la pena)

---

### Librerías Principales

#### 1. React Router v6
```bash
npm install react-router-dom
```
**Propósito:** Navegación entre páginas (SPA)
**¿Por qué?**
- Estándar de facto para routing en React
- Soporte para rutas protegidas (requieren autenticación)
- Navegación programática
- URL params, query strings, etc.

**Rutas planeadas:**
- `/` - Landing/Home
- `/login` - Login
- `/register` - Registro
- `/dashboard` - Dashboard principal (protegida)
- `/expenses` - Lista de gastos (protegida)
- `/incomes` - Lista de ingresos (protegida)
- `/savings-goals` - Metas de ahorro (protegida)
- `/accounts` - Gestión de cuentas (protegida)

---

#### 2. TanStack Query v5 (ex React Query)
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```
**Propósito:** Data fetching, caching, sincronización con servidor
**¿Por qué?**
- ✅ Caching automático (no re-fetches innecesarios)
- ✅ Optimistic updates (UI instantánea)
- ✅ Auto-refetch cuando volvés a la tab
- ✅ Invalidación inteligente de cache
- ✅ Menos código boilerplate

**Ejemplo de uso:**
```tsx
// Sin TanStack Query: ~30 líneas de código
// Con TanStack Query: ~5 líneas
const { data, isLoading, error } = useQuery({
  queryKey: ['expenses', accountId],
  queryFn: () => api.getExpenses(accountId)
});
```

**Configuración:**
- staleTime: 5 minutos (datos frescos por 5min)
- cacheTime: 30 minutos (cache persiste 30min)
- retry: 3 intentos
- refetchOnWindowFocus: true (recarga al volver a la tab)

---

#### 3. Axios
```bash
npm install axios
```
**Propósito:** Cliente HTTP para llamadas a la API
**¿Por qué NO fetch nativo?**
- ✅ Interceptors (agregar token JWT automático en cada request)
- ✅ Auto-throw en errores 4xx/5xx (fetch no lo hace)
- ✅ Transformación automática de JSON
- ✅ Timeout built-in
- ✅ Upload progress

**Configuración planeada:**
```tsx
// Interceptor para agregar JWT automáticamente
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para refresh token automático en 401
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Intentar refresh token
      // Si falla, redirect a /login
    }
    return Promise.reject(error);
  }
);
```

---

#### 4. React Hook Form v7
```bash
npm install react-hook-form
```
**Propósito:** Manejo de formularios
**¿Por qué?**
- ✅ Performance: NO re-renderiza todo el form en cada tecla
- ✅ Menos código boilerplate
- ✅ Validaciones declarativas
- ✅ Se integra perfecto con Zod

**Formularios en el proyecto:**
- Login (email, password)
- Registro (email, password, name)
- Crear gasto (amount, description, category, date, currency)
- Crear ingreso (amount, description, category, date, currency)
- Crear meta de ahorro (name, target_amount, deadline, saved_in)
- Agregar/retirar fondos (amount, description)

---

#### 5. Zod v3
```bash
npm install zod
```
**Propósito:** Validación de datos con TypeScript
**¿Por qué?**
- ✅ Validación de datos del backend (type-safety)
- ✅ Validación de formularios (integración con React Hook Form)
- ✅ Mensajes de error claros
- ✅ Inferencia de tipos TypeScript automática

**Schemas planeados:**
```tsx
// Usuario
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});

// Expense
const ExpenseSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['ARS', 'USD', 'EUR']),
  description: z.string(),
  date: z.string().datetime(),
  category_id: z.string().uuid().optional(),
});
```

---

#### 6. Tailwind CSS v4 (Beta)
```bash
npm install tailwindcss@next
```
**Propósito:** Styling con utility classes
**¿Por qué Tailwind v4 beta?**
- ✅ Zero-config (NO necesita tailwind.config.js)
- ✅ Más rápido (nueva engine en Rust)
- ✅ Menos boilerplate
- ✅ Ya estable para producción

**¿Por qué Tailwind en general?**
- ✅ Desarrollo rápido (no pensás nombres de clases)
- ✅ Bundle pequeño (purga clases no usadas)
- ✅ Responsive design fácil
- ✅ Dark mode built-in
- ✅ Estándar de la industria

**Alternativas descartadas:**
- CSS Modules (más verboso)
- Styled Components (runtime overhead)
- SCSS/SASS (compilación extra)

---

### Dependencias de Desarrollo

```bash
npm install -D @types/react @types/react-dom typescript
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
```

**Propósito:**
- TypeScript types para React
- Linting (ESLint)
- Formatting (Prettier)

---

## 🏗️ Arquitectura Frontend

### Estructura de Carpetas
```
frontend/
├── src/
│   ├── components/        # Componentes reutilizables
│   │   ├── ui/           # Componentes básicos (Button, Input, Card)
│   │   └── layout/       # Layout components (Header, Sidebar, Footer)
│   ├── pages/            # Páginas (una por ruta)
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Expenses.tsx
│   │   └── ...
│   ├── hooks/            # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useExpenses.ts
│   │   └── ...
│   ├── services/         # API calls (Axios)
│   │   ├── api.ts        # Axios instance
│   │   ├── auth.ts       # Auth endpoints
│   │   ├── expenses.ts   # Expenses endpoints
│   │   └── ...
│   ├── types/            # TypeScript types y Zod schemas
│   │   ├── user.ts
│   │   ├── expense.ts
│   │   └── ...
│   ├── context/          # React Context (Auth, Theme)
│   │   └── AuthContext.tsx
│   ├── utils/            # Funciones helpers
│   │   ├── formatCurrency.ts
│   │   ├── formatDate.ts
│   │   └── ...
│   ├── App.tsx           # Componente principal
│   └── main.tsx          # Entry point
├── public/               # Assets estáticos
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

### Patrones de Diseño

#### 1. Container/Presentational Pattern
- **Container:** Lógica y data fetching
- **Presentational:** Solo UI, recibe props

#### 2. Custom Hooks
- Encapsular lógica reutilizable
- Ejemplo: `useAuth()`, `useExpenses()`, `useDebounce()`

#### 3. Atomic Design (componentes UI)
- **Atoms:** Button, Input, Label
- **Molecules:** FormField (Label + Input + Error)
- **Organisms:** LoginForm, ExpenseForm

---

## 🔐 Autenticación Frontend

### Flow JWT
1. Login → Backend devuelve `access_token` + `refresh_token`
2. Guardar en `localStorage`:
   - `accessToken` (expira en 15min)
   - `refreshToken` (expira en 7 días)
3. Axios interceptor agrega `Authorization: Bearer {token}` automático
4. Si 401 → Intentar refresh token
5. Si refresh falla → Redirect a `/login`

### Protected Routes
```tsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

---

## 🎨 Theming & Styling

### Tailwind Config (cuando lo necesitemos)
```js
// Personalización de colores
colors: {
  primary: '#3b82f6',   // blue-500
  success: '#10b981',   // green-500
  danger: '#ef4444',    // red-500
  warning: '#f59e0b',   // amber-500
}
```

### Dark Mode
- Implementar toggle light/dark
- Guardar preferencia en `localStorage`
- Usar `dark:` prefix de Tailwind

---

## 📊 State Management

### Estado Global (React Context)
- **AuthContext:** Usuario logueado, tokens, logout()
- **ThemeContext:** Dark mode toggle
- **AccountContext:** Cuenta activa (para multi-account)

### Estado Servidor (TanStack Query)
- Expenses, Incomes, Categories, etc.
- TanStack Query maneja cache, loading, errors

### Estado Local (useState)
- Estado de UI (modals, dropdowns, etc.)

---

## 🚀 Deployment Frontend

### Desarrollo (VPS)
- Puerto: 5173 (Vite dev server)
- Acceso: http://200.58.105.147:5173
- Hot Module Replacement (HMR) activo

### Producción (Futuro)
- Build: `npm run build` → carpeta `dist/`
- Servir con Apache/Nginx
- URL: https://avaltra.fakerbostero.online
- Assets optimizados (minificados, tree-shaken)

---

## 📦 Comandos Útiles

### Desarrollo
```bash
npm run dev           # Dev server (puerto 5173)
npm run build         # Build producción
npm run preview       # Preview build
npm run lint          # Lint con ESLint
npm run format        # Format con Prettier
```

### Instalación Completa
```bash
# Dependencias principales
npm install react-router-dom @tanstack/react-query @tanstack/react-query-devtools axios react-hook-form zod tailwindcss@next

# Integración React Hook Form + Zod
npm install @hookform/resolvers

# Dev dependencies
npm install -D @types/react @types/react-dom typescript eslint prettier
```

---

## 🔄 Changelog Frontend

### [2026-01-14] - Setup Inicial
- ✅ Decisión de stack completo
- ✅ Documentación de arquitectura
- 🚧 Instalación de Vite + React + TypeScript (pendiente)
- 🚧 Instalación de dependencias (pendiente)
- 🚧 Configuración de Tailwind v4 (pendiente)

---

## 🎯 Próximos Pasos

1. ✅ Crear proyecto Vite
2. ✅ Instalar todas las dependencias
3. ✅ Configurar Tailwind v4
4. ✅ Configurar Axios interceptors
5. ✅ Configurar TanStack Query
6. ✅ Crear estructura de carpetas
7. ✅ Implementar AuthContext
8. ✅ Crear página de Login
9. ✅ Crear página de Dashboard
10. ✅ Implementar CRUD de Expenses

---

## 📚 Recursos y Documentación

### Documentación Oficial
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Axios](https://axios-http.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

### Tutoriales Recomendados
- React TypeScript Cheatsheet: https://react-typescript-cheatsheet.netlify.app/
- TanStack Query en 10min: https://www.youtube.com/watch?v=8K1N3fE-cDs
- React Hook Form + Zod: https://www.youtube.com/watch?v=u6PQ5xZAv7Q

---

## 🤝 Decisiones de Diseño

### ¿Por qué NO Next.js?
- No necesitamos SSR (Server-Side Rendering)
- Es una app privada, no un sitio público con SEO
- Vite es más simple y rápido para desarrollo

### ¿Por qué TypeScript?
- Previene ~30% de bugs en runtime
- Autocompletado increíble en VSCode
- Refactoring seguro
- Es lo que se usa en empresas serias

### ¿Por qué TanStack Query?
- Evita 100+ líneas de código boilerplate por feature
- Caching inteligente mejora UX
- Es el estándar de la industria

### ¿Por qué Tailwind?
- Desarrollo 3x más rápido
- No tengo que pensar nombres de clases
- Bundle size pequeño (purga clases no usadas)
- Responsive design trivial

---

**Última actualización:** 2026-01-14
**Versión:** 1.0.0
