# 📄 Avaltra - API Cheat Sheet

Referencia rápida de endpoints y estructuras de datos.

---

## 🔑 Autenticación

### Headers
```
# JWT solamente
Authorization: Bearer <access_token>

# JWT + Account ID
Authorization: Bearer <access_token>
X-Account-ID: <account_uuid>
```

---

## 📊 Estructuras de Datos Principales

### Account
```typescript
{
  id: string (uuid)
  user_id: string (uuid)
  name: string
  type: "personal" | "family"  // ⚠️ REQUERIDO
  currency: "ARS" | "USD"
  initial_balance: number (siempre 0)
  current_balance: number
  created_at: string
  updated_at: string
  members?: Member[] // Solo si type='family'
}
```

### Expense
```typescript
{
  id: string (uuid)
  account_id: string (uuid)
  category_id: string (uuid)
  amount: number
  currency: "ARS" | "USD"
  amount_in_primary_currency: number  // Auto-calculado
  description: string
  date: string (YYYY-MM-DD)
  created_at: string
  updated_at: string
}
```

### Income
```typescript
{
  id: string (uuid)
  account_id: string (uuid)
  family_member_id?: string (uuid)
  category_id?: string (uuid)
  amount: number
  currency: "ARS" | "USD" | "EUR"
  amount_in_primary_currency: number
  exchange_rate: number
  description: string
  income_type: "one-time" | "recurring"
  date: string (YYYY-MM-DD)
  end_date?: string (YYYY-MM-DD)
  created_at: string
}
```

### SavingsGoal
```typescript
{
  id: string (uuid)
  account_id: string (uuid)
  name: string
  target_amount: number
  current_amount: number
  currency: "ARS" | "USD"
  deadline?: string (YYYY-MM-DD)
  description?: string
  is_general: boolean  // Solo 1 por cuenta
  is_active: boolean
  progress_percentage: number  // Auto-calculado
  created_at: string
  updated_at: string
}
```

### Category
```typescript
{
  id: string (uuid)
  account_id?: string (uuid)  // null = predefinida
  name: string
  icon: string (emoji)
  color: string (hex)
  is_custom: boolean
  created_at: string
}
```

---

## 🎯 Validaciones Críticas

### Account Creation
```typescript
✅ VÁLIDO:
{
  name: "Mi Cuenta",
  type: "personal",
  currency: "USD",
  initial_balance: 0
}

❌ INVÁLIDO (falta type):
{
  name: "Mi Cuenta",
  currency: "USD",
  initial_balance: 0
}

❌ INVÁLIDO (family sin members):
{
  name: "Cuenta Familiar",
  type: "family",
  currency: "USD",
  initial_balance: 0
  // Falta: members: [...]
}
```

### Expense/Income Creation
```typescript
✅ VÁLIDO:
Headers: {
  "Authorization": "Bearer token123",
  "X-Account-ID": "uuid-de-cuenta"
}
Body: {
  category_id: "uuid",
  amount: 100.50,
  currency: "USD",
  description: "Compras",
  date: "2026-01-15"
}

❌ INVÁLIDO (falta X-Account-ID):
Headers: {
  "Authorization": "Bearer token123"
  // Falta: "X-Account-ID"
}
```

---

## 🔄 Flujos Comunes

### 1️⃣ Setup Inicial
```
1. POST /auth/register
2. POST /auth/login → Guardar access_token
3. POST /accounts → Guardar account.id
4. Setear account.id en X-Account-ID para todos los requests
```

### 2️⃣ Agregar Transacción
```
1. GET /expense-categories (obtener categorías)
2. POST /expenses (crear gasto con category_id)
3. GET /dashboard/summary (ver resumen actualizado)
```

### 3️⃣ Crear Meta de Ahorro
```
1. POST /savings-goals (crear meta)
2. POST /savings-goals/:id/add-funds (agregar fondos)
3. GET /savings-goals/:id (ver progreso)
```

---

## ⚠️ Errores Más Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `400: account_id not found in context` | Falta header X-Account-ID | Agregar header en request |
| `400: Datos inválidos` | Campo requerido faltante o formato incorrecto | Validar con Zod antes de enviar |
| `401: Usuario no autenticado` | Token JWT faltante o inválido | Verificar Authorization header |
| `403: No tenés permiso` | Intentando acceder a recurso de otro usuario | Verificar que el recurso pertenezca al usuario |
| `409: El email ya está registrado` | Email duplicado en registro | Usar otro email o hacer login |

---

## 💡 Tips de Implementación

### Axios Interceptor para X-Account-ID
```typescript
api.interceptors.request.use(config => {
  const accountId = localStorage.getItem('activeAccountId');
  if (accountId) {
    config.headers['X-Account-ID'] = accountId;
  }
  return config;
});
```

### Zod Schemas Recomendados
```typescript
// Account
export const CreateAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['personal', 'family']),
  currency: z.enum(['ARS', 'USD']),
  initial_balance: z.number().default(0),
  members: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email().optional()
  })).optional()
});

// Expense
export const CreateExpenseSchema = z.object({
  category_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['ARS', 'USD']),
  description: z.string().min(1).max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

// Income
export const CreateIncomeSchema = z.object({
  family_member_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.enum(['ARS', 'USD', 'EUR']),
  description: z.string().min(1).max(500),
  income_type: z.enum(['one-time', 'recurring']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
```

---

## 🎨 Respuestas Normalizadas

### Success (200/201)
```json
{
  "message": "Operación exitosa",
  "data_key": { /* objeto o array */ }
}
```

### Error (4xx/5xx)
```json
{
  "error": "Mensaje de error descriptivo",
  "details": "Información adicional (opcional)"
}
```

---

**Versión:** 1.0.0  
**Última actualización:** 2026-01-15
