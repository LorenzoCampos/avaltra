# 📚 Stack Tecnológico - Avaltra

Aplicación web full-stack para gestión financiera personal/familiar con soporte multi-moneda.

---

## 🔧 Backend

### Core
- **Go 1.23** - Lenguaje principal
- **Gin** - Framework HTTP (routing, middleware)
- **PostgreSQL 15** - Base de datos relacional
- **pgx/v5** - Driver PostgreSQL nativo con connection pooling
- **JWT** - Autenticación (access 15min + refresh 7d)
- **bcrypt** - Hashing de contraseñas (cost factor 12)

**¿Por qué Go?**
- Rendimiento superior (compilado, concurrente)
- Tipado fuerte reduce bugs
- Binary único simplifica deployment
- Ecosistema maduro para APIs REST

**¿Por qué Gin?**
- Framework minimalista pero completo
- Excelente performance (basado en httprouter)
- Middleware system flexible
- Documentación clara

**¿Por qué PostgreSQL?**
- Transacciones ACID críticas para finanzas
- Soporte JSON, Arrays, ENUMs
- Queries complejas para analytics
- Robustez probada

### Dependencias Principales

```go
github.com/gin-gonic/gin v1.11.0           // Web framework
github.com/jackc/pgx/v5 v5.7.0             // PostgreSQL driver
github.com/golang-jwt/jwt/v5 v5.3.0        // JWT tokens
github.com/joho/godotenv v1.5.1            // .env loader
golang.org/x/crypto v0.40.0                // bcrypt
github.com/google/uuid v1.6.0              // UUIDs
```

### Deployment

- **Docker:** Multi-stage build (golang:1.23-alpine → alpine:latest)
- **Tamaño imagen:** ~80MB optimizada
- **Reverse Proxy:** Apache 2.4.66 con SSL (Let's Encrypt)
- **VPS:** Debian 12
- **URL Producción:** https://api.fakerbostero.online/avaltra
- **Puerto interno:** 8080
- **DB:** PostgreSQL compartida (host.docker.internal)

---

## ⚛️ Frontend

### Core Stack

- **React 18** - UI library
- **Vite 6** - Build tool & dev server
- **TypeScript 5** - Tipado estático
- **pnpm** - Package manager

**¿Por qué React?**
- Estándar de la industria
- Ecosistema gigante
- Demand laboral alta

**¿Por qué NO Next.js?**
- No necesitamos SSR (app privada sin SEO)
- Vite es más simple y rápido para desarrollo
- Menor complejidad de setup

**¿Por qué TypeScript?**
- Previene ~30% de bugs en runtime
- Autocompletado increíble (DX)
- Refactoring seguro
- Estándar en empresas serias

**¿Por qué Vite?**
- 10x más rápido que Webpack
- HMR instantáneo (<50ms)
- Configuración mínima
- ESM nativo

### Librerías Principales

#### React Router v7
```bash
pnpm add react-router-dom
```
**Uso:** Navegación SPA con rutas protegidas

**Rutas:**
- `/` - Landing
- `/login`, `/register` - Auth
- `/dashboard` - Dashboard principal (protegida)
- `/expenses`, `/incomes` - Listas (protegidas)
- `/savings-goals` - Metas (protegida)
- `/accounts` - Gestión de cuentas (protegida)

---

#### TanStack Query v5
```bash
pnpm add @tanstack/react-query
```
**Uso:** Data fetching, caching, sincronización con servidor

**¿Por qué NO useState + useEffect?**
- ✅ Caching automático (evita re-fetches)
- ✅ Optimistic updates (UI instantánea)
- ✅ Auto-refetch al volver a la tab
- ✅ Invalidación inteligente de cache
- ✅ Evita 100+ líneas de boilerplate por feature

**Configuración:**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5min fresh
      cacheTime: 30 * 60 * 1000,     // 30min cache
      retry: 3,
      refetchOnWindowFocus: true,
    },
  },
});
```

---

#### Axios
```bash
pnpm add axios
```
**Uso:** Cliente HTTP con interceptors

**¿Por qué NO fetch?**
- ✅ Interceptors (JWT automático, refresh token)
- ✅ Auto-throw en 4xx/5xx
- ✅ Transformación JSON automática
- ✅ Timeout built-in

**Setup:**
```tsx
// Interceptor para JWT
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  const accountId = localStorage.getItem('activeAccountId');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (accountId) {
    config.headers['X-Account-ID'] = accountId;
  }
  
  return config;
});

// Interceptor para refresh token
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Intentar refresh, si falla → logout
    }
    return Promise.reject(error);
  }
);
```

---

#### React Hook Form + Zod
```bash
pnpm add react-hook-form zod @hookform/resolvers
```
**Uso:** Formularios con validación

**¿Por qué React Hook Form?**
- ✅ NO re-renderiza en cada tecla (performance)
- ✅ Menos código vs formularios manuales
- ✅ Integración perfecta con Zod

**¿Por qué Zod?**
- ✅ Validación + inferencia de tipos TypeScript
- ✅ Mensajes de error claros
- ✅ Valida data del backend también

**Ejemplo:**
```tsx
const ExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['ARS', 'USD', 'EUR']),
  description: z.string().min(1).max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().optional(),
});

type ExpenseForm = z.infer<typeof ExpenseSchema>;

const { register, handleSubmit } = useForm<ExpenseForm>({
  resolver: zodResolver(ExpenseSchema),
});
```

---

#### Tailwind CSS v4
```bash
pnpm add tailwindcss@next @tailwindcss/vite
```
**Uso:** Styling con utility classes

**¿Por qué Tailwind?**
- ✅ Desarrollo 3x más rápido (no pensás nombres de clases)
- ✅ Bundle pequeño (purga clases no usadas)
- ✅ Responsive trivial (`md:`, `lg:`)
- ✅ Dark mode built-in (`dark:`)
- ✅ Estándar de la industria

**¿Por qué v4 beta?**
- ✅ Zero-config (no necesita `tailwind.config.js`)
- ✅ Engine en Rust (más rápido)
- ✅ Ya estable para producción

**Alternativas descartadas:**
- CSS Modules: Más verboso, naming decisions
- Styled Components: Runtime overhead
- SCSS/SASS: Compilación extra innecesaria

---

### Dependencias de Desarrollo

```bash
pnpm add -D typescript @types/react @types/react-dom
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D prettier eslint-config-prettier
```

---

## 🏗️ Arquitectura Frontend

### Estructura de Carpetas

```
frontend/src/
├── pages/              # Páginas (una por ruta)
├── components/         # Componentes reutilizables
│   ├── ui/            # Componentes base (Button, Input, Card)
│   └── layout/        # Layout (Header, Sidebar, Footer)
├── services/          # API calls (Axios)
├── hooks/             # Custom hooks
├── types/             # TypeScript types + Zod schemas
├── utils/             # Helpers (formatCurrency, formatDate)
└── App.tsx
```

### Patrones

**Container/Presentational:**
- Container: Lógica + data fetching
- Presentational: Solo UI, recibe props

**Custom Hooks:**
Encapsulan lógica reutilizable
- `useAuth()` - Login, logout, user state
- `useExpenses()` - CRUD de gastos
- `useAccounts()` - CRUD de cuentas
- `useDebounce()` - Debounce para inputs

**Atomic Design (UI components):**
- Atoms: Button, Input, Label
- Molecules: FormField (Label + Input + Error)
- Organisms: LoginForm, ExpenseForm

---

## 🗄️ Base de Datos

### Schema Overview

**Tablas principales:**
- `users` - Usuarios del sistema
- `accounts` - Cuentas (personal/family)
- `family_members` - Miembros de cuentas family
- `expenses` - Gastos (one-time/recurring)
- `incomes` - Ingresos (one-time/recurring)
- `expense_categories` - Categorías de gastos
- `income_categories` - Categorías de ingresos
- `savings_goals` - Metas de ahorro
- `savings_goal_transactions` - Movimientos de metas
- `exchange_rates` - Histórico de tipos de cambio

**Ver schema completo:** [docs/DATABASE.md](./docs/DATABASE.md)

### Migraciones

11 migraciones SQL en orden secuencial:
1. `001_create_users_table.sql`
2. `002_create_accounts_table.sql`
3. `003_create_savings_goals_table.sql`
4. `004_create_family_members_table.sql`
5. `005_create_expenses_table.sql`
6. `006_create_incomes_table.sql`
7. `007_create_categories_tables.sql`
8. `008_seed_default_categories.sql`
9. `009_add_category_id_to_expenses_incomes.sql`
10. `010_add_multi_currency_support.sql`
11. `011_update_savings_goals_and_create_transactions.sql`

**Ejecutar en orden:**
```bash
for f in backend/migrations/*.sql; do
  psql -U postgres -d bolsillo_claro -f "$f"
done
```

---

## 🔐 Autenticación

### JWT Flow

1. Login → Backend devuelve `access_token` (15min) + `refresh_token` (7d)
2. Frontend guarda en localStorage
3. Axios interceptor agrega `Authorization: Bearer <token>` automático
4. Si 401 → Intenta refresh token
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

## 🎨 Decisiones de Arquitectura

### Users vs Accounts (1:N)

**¿Por qué separados?**
- Usuario puede tener múltiples contextos financieros
- Ejemplo: "Finanzas Personales", "Gastos Familia", "Mi Negocio"
- Cada cuenta está completamente aislada
- Futuro: Co-ownership (2 users, 1 shared account)

### Multi-Currency Modo 3

**Problema (Argentina):**
- Gasto: USD 20
- Débito real: ARS $31,500 (dólar tarjeta con impuestos)
- Tasa oficial: $900
- Tasa efectiva: $1,575

**Solución:**
Usuario provee `amount_in_primary_currency`, sistema calcula `exchange_rate` efectivo automáticamente.

**Ver detalles:** [docs/MULTI-CURRENCY.md](./docs/MULTI-CURRENCY.md)

### Categorías: Predefinidas + Custom

**¿Por qué híbrido?**
- Usuario nuevo tiene categorías listas (onboarding fácil)
- Power users pueden crear específicas ("Veterinario", "Clases de tango")
- Reportes consistentes (mayoría usa predefinidas)

### Gastos Recurrentes: Virtual vs Physical

**Decisión:** NO crear registros físicos mensuales

**¿Cómo funciona?**
- Gasto recurring se guarda UNA VEZ
- Al consultar `GET /expenses?month=2026-02`, backend calcula qué recurrings están activos
- Aparecen en lista pero NO hay múltiples registros

**Ventaja:** No duplica datos  
**Desventaja:** Eliminar gasto recurring = perder historial

### Savings Goals: Descuento Virtual

**Decisión:** Metas NO crean expenses reales

**¿Por qué?**
- Agregar a meta ≠ gastar dinero
- Es "reservar" dinero para un objetivo
- Dashboard calcula `available_balance = income - expenses - assigned_to_goals`

---

## 📦 Comandos Útiles

### Backend
```bash
go run cmd/server/main.go                          # Dev
go build -o bin/server cmd/server/main.go          # Build
go test ./...                                      # Tests
go fmt ./...                                       # Format
```

### Frontend
```bash
pnpm dev                                           # Dev (port 5173)
pnpm build                                         # Build
pnpm preview                                       # Preview build
pnpm lint                                          # ESLint
pnpm type-check                                    # TypeScript check
```

### Database
```bash
psql -U postgres -d bolsillo_claro                 # Connect
pg_dump -U postgres bolsillo_claro > backup.sql   # Backup
psql -U postgres bolsillo_claro < backup.sql      # Restore
```

---

## 🚀 Deployment

### Producción Actual

- **Backend:** Docker container en VPS Debian 12
- **Frontend:** Build estático servido por Apache
- **DB:** PostgreSQL local en VPS
- **Reverse Proxy:** Apache con SSL (Let's Encrypt)
- **URL:** https://api.fakerbostero.online/avaltra

### Build de Producción

```bash
# Backend
docker build -t avaltra-backend .
docker run -d -p 8080:8080 --name avaltra avaltra-backend

# Frontend
cd frontend
pnpm build
# Output en: frontend/dist/
```

---

## 📚 Referencias

### Documentación Oficial
- [Go](https://go.dev/doc/)
- [Gin](https://gin-gonic.com/docs/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)

### Documentación del Proyecto
- [API.md](./API.md) - Especificación completa de endpoints
- [FEATURES.md](./FEATURES.md) - Guía narrativa de funcionalidades
- [docs/DATABASE.md](./docs/DATABASE.md) - Schema de base de datos
- [docs/MULTI-CURRENCY.md](./docs/MULTI-CURRENCY.md) - Sistema multi-moneda
- [docs/RECURRENCE.md](./docs/RECURRENCE.md) - Sistema de recurrencia

---

**Última actualización:** 2026-01-16  
**Versión:** 2.0 (Consolidada)
