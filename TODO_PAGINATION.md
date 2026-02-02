# TODO: Implementar Paginación Server-Side

## ⚠️ Limitación Actual

**Estado actual:** El sistema trae **TODOS** los datos del backend sin paginación.

```go
// Backend actual
GET /api/expenses → [todos los gastos de la cuenta]
GET /api/incomes → [todos los ingresos de la cuenta]
GET /api/activity → [toda la actividad]
```

**Implicaciones:**
- ✅ **Ventajas:** Filtros instantáneos, funciona offline (PWA)
- ❌ **Problema:** Con > 2000 transacciones puede ser lento
- ❌ **Escalabilidad:** No escala para uso comercial

---

## 📋 Plan de Migración a Paginación

### Phase 1: Backend Changes (Go)

#### 1.1 Agregar Query Params a Endpoints

```go
// internal/handlers/expenses/list.go
type ListExpensesParams struct {
    Page     int    `form:"page" binding:"omitempty,min=1"`
    Limit    int    `form:"limit" binding:"omitempty,min=1,max=100"`
    Search   string `form:"search"`
    DateFrom string `form:"date_from"` // YYYY-MM-DD
    DateTo   string `form:"date_to"`
    CategoryID string `form:"category_id"`
    MinAmount float64 `form:"min_amount"`
    MaxAmount float64 `form:"max_amount"`
}

// Default values
if params.Limit == 0 {
    params.Limit = 50 // Default 50 items per page
}
if params.Page == 0 {
    params.Page = 1
}
```

#### 1.2 Query SQL con Paginación y Filtros

```sql
SELECT 
    e.*,
    ec.name as category_name,
    COUNT(*) OVER() as total_count
FROM expenses e
LEFT JOIN expense_categories ec ON e.category_id = ec.id
WHERE e.account_id = $1
    AND e.deleted_at IS NULL
    AND ($2 = '' OR e.description ILIKE '%' || $2 || '%')  -- Search
    AND ($3 = '' OR e.date >= $3)                          -- Date from
    AND ($4 = '' OR e.date <= $4)                          -- Date to
    AND ($5 = '' OR e.category_id = $5)                    -- Category filter
    AND ($6 = 0 OR e.amount_in_primary_currency >= $6)     -- Min amount
    AND ($7 = 0 OR e.amount_in_primary_currency <= $7)     -- Max amount
ORDER BY e.date DESC, e.created_at DESC
LIMIT $8 OFFSET $9
```

#### 1.3 Response Format

```go
type PaginatedExpensesResponse struct {
    Expenses   []Expense `json:"expenses"`
    TotalCount int       `json:"total_count"`
    Page       int       `json:"page"`
    Limit      int       `json:"limit"`
    TotalPages int       `json:"total_pages"`
    Summary    Summary   `json:"summary"` // Optional: calcular summary solo de la página o global
}
```

---

### Phase 2: Frontend Changes (React + TypeScript)

#### 2.1 Actualizar Hooks

```typescript
// hooks/useExpenses.ts
export const useExpenses = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
}) => {
  return useQuery({
    queryKey: ['expenses', activeAccountId, params],
    queryFn: async () => {
      const response = await api.get('/expenses', {
        params,
        headers: { 'X-Account-ID': activeAccountId },
      });
      return response.data;
    },
  });
};
```

#### 2.2 Actualizar ExpenseList con Paginación

```typescript
// ExpenseList.tsx
const [page, setPage] = useState(1);
const [filters, setFilters] = useState({
  search: '',
  dateFrom: '',
  dateTo: '',
  categoryId: '',
  minAmount: null,
  maxAmount: null,
});

const { data, isLoading } = useExpenses({
  page,
  limit: 50,
  ...filters,
});

// Pagination controls
<div className="flex justify-between items-center mt-4">
  <button 
    onClick={() => setPage(p => Math.max(1, p - 1))}
    disabled={page === 1}
  >
    Previous
  </button>
  <span>Page {page} of {data?.total_pages}</span>
  <button 
    onClick={() => setPage(p => p + 1)}
    disabled={page >= data?.total_pages}
  >
    Next
  </button>
</div>
```

#### 2.3 Eliminar useFilters Client-Side

```typescript
// Ya NO necesitamos filtrar en cliente
// El backend hace el filtrado y paginación
// Solo necesitamos enviar los filtros como query params
```

---

### Phase 3: Consideraciones Importantes

#### 3.1 Mantener Backward Compatibility

**Opción 1:** Query param opcional
```
GET /api/expenses → Sin paginación (legacy)
GET /api/expenses?page=1&limit=50 → Con paginación (nuevo)
```

**Opción 2:** Versioning
```
GET /api/v1/expenses → Sin paginación (legacy)
GET /api/v2/expenses → Con paginación (nuevo)
```

#### 3.2 Cache Strategy

```typescript
// React Query: mantener cache de múltiples páginas
queryClient.setQueryData(['expenses', accountId, { page: 1 }], data);
queryClient.setQueryData(['expenses', accountId, { page: 2 }], data);
// Usuario navega entre páginas sin refetch
```

#### 3.3 Summary Calculation

**Problema:** ¿Summary es de la página actual o global?

**Opción A:** Summary global (requiere query adicional)
```sql
-- Query 1: Get paginated expenses
SELECT * FROM expenses WHERE ... LIMIT 50 OFFSET 0

-- Query 2: Get global summary
SELECT 
  SUM(amount_in_primary_currency) as total,
  COUNT(*) as count
FROM expenses 
WHERE account_id = $1
```

**Opción B:** Summary solo de página actual (menos útil)

---

## 🎯 Prioridades de Implementación

### Ahora (< 500 transacciones)
- ✅ Mantener sistema actual (client-side filtering)
- ✅ Monitorear performance

### Mediano plazo (500-2000 transacciones)
- 🔄 Implementar "Load More" (infinite scroll)
- 🔄 Mantener filtros client-side

### Largo plazo (> 2000 transacciones)
- 🔄 Implementar paginación completa server-side
- 🔄 Mover filtros al backend
- 🔄 Optimizar queries con índices

---

## 📊 Performance Benchmarks Esperados

| Transacciones | Sin Paginación | Con Paginación |
|--------------|----------------|----------------|
| 100 | ~50ms | ~30ms |
| 500 | ~200ms | ~30ms |
| 1000 | ~500ms | ~35ms |
| 5000 | ~2s (SLOW) | ~40ms |
| 10000 | ~5s (TERRIBLE) | ~50ms |

---

## 🔗 Referencias

- **Backend actual:**
  - `backend/internal/handlers/expenses/list.go`
  - `backend/internal/handlers/incomes/list.go`
  - `backend/internal/handlers/activity/list.go`

- **Frontend actual:**
  - `frontend/src/hooks/useFilters.ts` (client-side filtering)
  - `frontend/src/features/expenses/ExpenseList.tsx`
  - `frontend/src/features/incomes/IncomeList.tsx`

---

**Creado:** 2026-01-26  
**Razón:** Sistema actual no escala > 2000 transacciones  
**Decisión:** Implementar cuando sea necesario (pragmatismo)
