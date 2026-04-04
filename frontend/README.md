# 💰 Avaltra - Frontend

Frontend application for Avaltra personal/family finance management system.

## 🚀 Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS v4** - Styling
- **React Router** - Navigation
- **React Query** - Data fetching & caching
- **Zustand** - State management
- **Zod** - Schema validation
- **Axios** - HTTP client
- **React Hook Form** - Form management
- **Recharts** - Charts & visualizations
- **date-fns** - Date utilities
- **Lucide React** - Icons

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 🌐 Acceso al Servidor de Desarrollo

El frontend está configurado para ejecutarse en tu red local:

### Desde esta máquina:
```
http://localhost:5173
```

### Desde otros dispositivos en la red local:
```
http://192.168.0.46:5173
```

**Nota:** El servidor Vite está configurado para escuchar en `0.0.0.0` (todas las interfaces de red), permitiendo acceso desde cualquier dispositivo en tu red local.

### Backend API:
En desarrollo, el frontend apunta a:
```
http://localhost:9090/api
```

Configurado en `.env.development`

## 🏗️ Project Structure

```
src/
├── api/                    # Axios configuration
│   ├── axios.ts           # API instance with interceptors
│   └── endpoints/         # API endpoint functions (TODO)
│
├── types/                  # TypeScript types (from API.md v2.5)
│   ├── api.ts             # Base types (Currency, AccountType, etc.)
│   ├── auth.ts            # Authentication types
│   ├── account.ts         # Account & family members
│   ├── expense.ts         # Expenses
│   ├── income.ts          # Incomes
│   ├── category.ts        # Categories
│   ├── savings-goal.ts    # Savings goals
│   └── dashboard.ts       # Dashboard summary
│
├── schemas/                # Zod schemas for validation (TODO)
│   ├── auth.schema.ts
│   ├── expense.schema.ts
│   └── ...
│
├── stores/                 # Zustand stores
│   ├── auth.store.ts      # Auth state (user, tokens)
│   └── account.store.ts   # Active account
│
├── hooks/                  # Custom React hooks (TODO)
│   ├── useAuth.ts
│   ├── useExpenses.ts
│   └── ...
│
├── features/               # Feature modules (TODO)
│   ├── auth/              # Login, Register
│   ├── dashboard/         # Dashboard
│   ├── expenses/          # Expense management
│   ├── incomes/           # Income management
│   ├── savings-goals/     # Savings goals
│   ├── accounts/          # Account management
│   └── categories/        # Category management
│
├── components/             # Shared components (TODO)
│   ├── ui/                # UI primitives
│   ├── Layout.tsx
│   └── ...
│
├── lib/                    # Utilities
│   ├── utils.ts           # Helper functions (cn, formatCurrency, etc.)
│   └── constants.ts       # App constants
│
├── App.tsx
├── main.tsx
└── index.css
```

## 🔑 Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=https://api.fakerbostero.online/avaltra/api
VITE_ENV=production
```

## 📚 API Documentation

The API types are based on **API.md v2.5** from the backend repository.

Key features:
- **29+ documented endpoints**
- **Multi-currency support** (ARS, USD, EUR)
- **Recurring transactions** (expenses & incomes)
- **Savings goals** with transaction tracking
- **Categories** (system + custom)
- **Family members** support

## 🎯 Setup Status

- [x] TypeScript configuration
- [x] Tailwind CSS v4 setup
- [x] React Query setup
- [x] Zustand stores (auth, account)
- [x] API types from backend (all 29+ endpoints)
- [x] Axios with interceptors (auth + refresh token)
- [x] Utility functions (formatCurrency, formatDate, etc.)
- [ ] Zod schemas
- [ ] Custom hooks (useExpenses, useIncomes, etc.)
- [ ] Auth flow (Login, Register, Refresh)
- [ ] Router setup with protected routes
- [ ] Dashboard with charts
- [ ] Expense/Income management
- [ ] Savings goals tracker
- [ ] Category management
- [ ] Family members
- [ ] Recurring transactions
- [ ] Multi-currency handling UI

## 🛠️ Development

```bash
# Run dev server
pnpm dev

# Type check
pnpm tsc --noEmit

# Lint
pnpm lint

# Build
pnpm build
```

## 📖 Documentation

- [Backend API Documentation](../API.md) - Complete API reference v2.5
- [Features Guide](../FEATURES.md) - System features overview
- [Multi-Currency Guide](../docs/MULTI-CURRENCY.md) - Currency handling
- [Recurrence Guide](../docs/RECURRENCE.md) - Recurring transactions

## 🎨 Design System

Using Tailwind CSS v4 with:
- **Mobile-first** responsive design
- **Dark mode** support (planned)
- **Accessibility** focused
- **Custom color palette** (planned)

## 🔐 Authentication

- JWT-based authentication
- Automatic token refresh via interceptors
- Protected routes with auth guards
- Persistent auth state (localStorage + Zustand)
- Auto-logout on expired refresh token

## 📱 Responsive Design

- Mobile: 320px - 640px
- Tablet: 640px - 1024px
- Desktop: 1024px+

---

**Built with ❤️ using modern web technologies**
