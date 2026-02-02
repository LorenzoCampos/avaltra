# 🎨 Bolsillo Claro - UX Improvements Roadmap

> **Objetivo:** Transformar Bolsillo Claro de una app funcional a una experiencia de usuario excepcional
> 
> **Filosofía:** Menos fricción, más velocidad, mejor feedback

---

## 📋 Índice

- [🔴 Prioridad CRÍTICA](#-prioridad-crítica)
- [🟠 Prioridad ALTA](#-prioridad-alta)
- [🟡 Prioridad MEDIA](#-prioridad-media)
- [🟢 Prioridad BAJA](#-prioridad-baja)
- [📅 Roadmap Sugerido](#-roadmap-sugerido)

---

## 🔴 Prioridad CRÍTICA

### 1. Quick Add Expense/Income Button

**Problema:**
- Usuario está en el supermercado, termina de pagar
- Quiere agregar el gasto YA
- Tiene que: Dashboard → Expenses → New Expense (3 clicks + navegación)
- **Resultado:** Fricción = Usuario dice "lo agrego después" = Nunca lo agrega

**Solución:**
Agregar botones de acción rápida en Dashboard con dos enfoques:

#### Opción A: Quick Action Cards (Recomendado para Desktop)
```
Dashboard (después del resumen financiero):
┌─────────────────────────────────────────┐
│  💸 Quick Actions                       │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ + Add Expense│  │ + Add Income │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
```

#### Opción B: FAB (Floating Action Button) - Recomendado para Mobile
```
                         [💸]  ← Floating button (bottom-right)
                           ↓ (click)
                    ┌─────────────┐
                    │ Add Expense │
                    │ Add Income  │
                    └─────────────┘
```

**Implementación:**
1. **Desktop:** Quick Action cards después del Monthly Summary
2. **Mobile:** FAB que abre un mini-menu
3. Al hacer click → Modal con form simplificado (ver mejora #3)

**Ubicación:**
- `frontend/src/features/dashboard/Dashboard.tsx` - Agregar Quick Actions section
- `frontend/src/components/QuickAddModal.tsx` - Nuevo componente modal

**Impacto:** ⭐⭐⭐⭐⭐
- Reduce tiempo de agregar gasto de 30 segundos a 5 segundos
- Aumenta frecuencia de uso (más fácil = más usado)
- Mejora retention (app útil en el momento que la necesitás)

**Esfuerzo:** 3-4 horas

---

### 2. Agrupar Expenses + Recurring Expenses en Tabs

**Problema:**
- Navbar tiene 11 items (Dashboard, Activity, Accounts, Expenses, Incomes, Recurring Expenses, Recurring Incomes, Categories, Reports, Savings, Settings)
- En mobile es un DESASTRE (scroll horizontal o menu hamburguesa saturado)
- Conceptualmente, Recurring Expenses SON expenses, solo que templates

**Solución:**
Agrupar items relacionados usando tabs dentro de las páginas

#### Estructura Propuesta:

**ANTES:**
```
Navbar: 
- Expenses
- Recurring Expenses
- Incomes  
- Recurring Incomes
```

**DESPUÉS:**
```
Navbar:
- Expenses (con tabs internos)
- Incomes (con tabs internos)
```

**Dentro de `/expenses`:**
```
┌──────────────────────────────────┐
│ Expenses                         │
│ ┌──────────┐ ┌──────────┐       │
│ │ Expenses │ │Recurring │       │
│ └──────────┘ └──────────┘       │
│                                  │
│ [Lista de gastos o templates]   │
└──────────────────────────────────┘
```

**Implementación:**
1. Crear `ExpensesPage.tsx` que contenga tabs
2. Tab 1: `ExpensesList.tsx` (ya existe)
3. Tab 2: `RecurringExpensesList.tsx` (ya existe)
4. Mismo patrón para Incomes
5. Actualizar rutas en `App.tsx`
6. Actualizar navbar en `Layout.tsx`

**Nota:** Ya tenés este patrón implementado en `CategoriesList.tsx` (Expense Categories / Income Categories)

**Ubicación:**
- `frontend/src/features/expenses/ExpensesPage.tsx` - NUEVO
- `frontend/src/features/incomes/IncomesPage.tsx` - NUEVO
- `frontend/src/components/Layout.tsx` - Actualizar navbar
- `frontend/src/App.tsx` - Actualizar rutas

**Items de Navbar FINAL (11 → 7):**
1. Dashboard
2. Activity
3. Accounts
4. Expenses (con tabs: Expenses / Recurring)
5. Incomes (con tabs: Incomes / Recurring)
6. Categories
7. Reports
8. Savings
9. Settings (mover a user icon/dropdown)

**Impacto:** ⭐⭐⭐⭐⭐
- Mejora drastically mobile UX
- Reduce cognitive load
- Más limpio y profesional

**Esfuerzo:** 2-3 horas

---

### 3. Defaults Inteligentes en Forms

**Problema:**
Usuario quiere agregar "Café $3" pero tiene que llenar:
- ✅ Amount (requerido)
- ✅ Description (requerido)
- ✅ Category (requerido - dropdown)
- ✅ Account (requerido - dropdown)
- ✅ Date (requerido - date picker)
- ✅ Currency (requerido si multi-currency)

**Resultado:** 30 segundos para agregar un gasto simple = Fricción extrema

**Solución:**
Aplicar defaults inteligentes basados en contexto del usuario

#### Defaults Propuestos:

| Campo | Default | Lógica |
|-------|---------|--------|
| Account | User's default account | Ya implementado en `users.default_account_id` |
| Date | HOY | `new Date()` |
| Currency | Del account seleccionado | Si Personal Checking es USD → USD |
| Category | Última categoría usada | Guardar en localStorage `lastUsedCategory` |
| Description | Vacío | Usuario escribe |
| Amount | Vacío | Usuario escribe |

#### Campos Requeridos vs Opcionales:

**Mínimo Requerido:**
- Amount
- Description (o hacer opcional con placeholder "Quick expense")

**Opcionales con Defaults:**
- Category → Default: "Other" o última usada
- Account → Default: Default account del user
- Date → Default: Hoy
- Currency → Default: Del account

**Implementación:**

```typescript
// En ExpenseForm.tsx
const { data: user } = useUser();
const { accounts } = useAccounts();

// Defaults inteligentes
const defaultAccount = accounts.find(a => a.id === user?.default_account_id) || accounts[0];
const defaultCurrency = defaultAccount?.currency || 'USD';
const defaultDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const lastCategory = localStorage.getItem('lastExpenseCategory') || '';

// Pre-llenar form
useEffect(() => {
  if (defaultAccount) {
    setValue('account_id', defaultAccount.id);
    setValue('currency', defaultCurrency);
  }
  setValue('date', defaultDate);
  if (lastCategory) {
    setValue('category_id', lastCategory);
  }
}, [defaultAccount, defaultCurrency, defaultDate, lastCategory]);

// Guardar última categoría usada
const onSubmit = (data) => {
  localStorage.setItem('lastExpenseCategory', data.category_id);
  // ... rest of submit logic
};
```

**Ubicación:**
- `frontend/src/features/expenses/ExpenseForm.tsx`
- `frontend/src/features/incomes/IncomeForm.tsx`

**Impacto:** ⭐⭐⭐⭐⭐
- Reduce tiempo de entrada de 30s a 5s
- Mejora MASIVAMENTE la UX del caso de uso más común
- Usuarios agregan más transacciones = Mejor tracking

**Esfuerzo:** 1-2 horas

---

### 4. Navegación Mobile - Hamburger Menu + Bottom Nav

**Problema:**
- 11 items en navbar horizontal = Scroll horrible en mobile
- User experience en mobile es crítico (80% del uso de apps financieras)
- Navbar actual ocupa demasiado espacio vertical

**Solución:**
Implementar navegación mobile-first con bottom navigation

#### Desktop (sin cambios):
```
┌────────────────────────────────────┐
│ Logo  [Dashboard][Activity][...]   │ ← Top navbar
└────────────────────────────────────┘
```

#### Mobile (nuevo):
```
┌────────────────────────────────────┐
│ ☰ Logo                     [User]  │ ← Top bar (minimal)
└────────────────────────────────────┘

[Contenido]

┌────────────────────────────────────┐
│ [🏠] [📊] [💰] [💸] [⚙️]          │ ← Bottom nav
│ Home  Stats Money  Add  More       │
└────────────────────────────────────┘
```

**Bottom Nav Items:**
1. 🏠 Home (Dashboard)
2. 📊 Activity
3. 💰 Money (modal: Incomes / Expenses / Accounts)
4. 💸 Quick Add (FAB - abre modal)
5. ⚙️ More (hamburger: Categories, Reports, Savings, Settings)

**Implementación:**
- Crear `MobileBottomNav.tsx` (solo visible en mobile)
- Ocultar navbar horizontal en mobile
- Usar `@media (max-width: 768px)` para toggle

**Ubicación:**
- `frontend/src/components/MobileBottomNav.tsx` - NUEVO
- `frontend/src/components/Layout.tsx` - Conditional rendering

**Impacto:** ⭐⭐⭐⭐⭐
- Mobile UX 10x mejor
- Más accesible para thumbs
- Navegación más rápida

**Esfuerzo:** 3-4 horas

---

### 5. Onboarding Wizard para Nuevos Usuarios

**Problema:**
1. Usuario se registra exitosamente
2. Es redirigido a Dashboard vacío
3. Ve: "No expenses. No incomes. No accounts."
4. **Usuario:** "¿Y ahora qué hago?" → Abandona la app

**Solución:**
Wizard de onboarding de 3 pasos después del registro

#### Flujo del Wizard:

**Paso 1/3: Create Your First Account**
```
┌──────────────────────────────────┐
│   👋 Welcome to Bolsillo Claro!  │
│                                  │
│   Let's set up your first       │
│   account to start tracking     │
│                                  │
│   Account Name: [_____________] │
│   Type: [Personal ▼]            │
│   Currency: [USD ▼]             │
│                                  │
│   [Skip] [Next →]               │
└──────────────────────────────────┘
```

**Paso 2/3: Add Your First Expense**
```
┌──────────────────────────────────┐
│   💸 Add Your First Expense      │
│                                  │
│   Try adding a recent purchase   │
│   (Example: Coffee $5)           │
│                                  │
│   Amount: [_____________]       │
│   Description: [___________]    │
│                                  │
│   [Skip] [Next →]               │
└──────────────────────────────────┘
```

**Paso 3/3: You're All Set!**
```
┌──────────────────────────────────┐
│   🎉 You're All Set!             │
│                                  │
│   ✅ Account created             │
│   ✅ First expense tracked       │
│                                  │
│   Start exploring:              │
│   • Add more transactions       │
│   • Create categories           │
│   • Set savings goals           │
│                                  │
│   [Go to Dashboard]             │
└──────────────────────────────────┘
```

**Implementación:**
1. Crear `OnboardingWizard.tsx` con stepper UI
2. Guardar en user metadata: `onboarding_completed: boolean`
3. En Dashboard, verificar si `!onboardingCompleted` → Mostrar wizard
4. Permitir "Skip" en cada paso
5. Guardar progreso en caso de cierre accidental

**Ubicación:**
- `frontend/src/features/onboarding/OnboardingWizard.tsx` - NUEVO
- `frontend/src/features/dashboard/Dashboard.tsx` - Conditional rendering
- Backend: Agregar campo `onboarding_completed` a tabla `users`

**Impacto:** ⭐⭐⭐⭐⭐
- MASIVO - Define si el usuario continúa usando la app
- Reduce abandono en primeros 5 minutos
- Enseña flujo básico de la app

**Esfuerzo:** 4-5 horas

---

## 🟠 Prioridad ALTA

### 6. Búsqueda y Filtros Rápidos en Expenses/Incomes

**Problema:**
Usuario pregunta: "¿Cuánto gasté en Starbucks el mes pasado?"
- Tiene que scrollear manualmente toda la lista de Expenses
- Si tiene 200 transacciones → Imposible encontrar

**Solución:**
Agregar barra de búsqueda + filtros rápidos

#### UI Propuesta:

```
┌────────────────────────────────────────────┐
│ Expenses                                   │
│ ┌──────────────────────────────────────┐  │
│ │ 🔍 Search expenses...                │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ Filter by category:                       │
│ [All] [Food] [Transport] [Shopping] [+]  │ ← Pills/Chips
│                                            │
│ Filter by date:                           │
│ [This Month ▼]                            │
│                                            │
│ [Lista de expenses filtrados]             │
└────────────────────────────────────────────┘
```

**Funcionalidades:**

1. **Búsqueda por texto:**
   - Busca en: Description, Notes, Category name
   - Debounce de 300ms para no saturar
   - Case-insensitive

2. **Filtro por categoría:**
   - Chips clickeables
   - Multi-selección
   - Contador de resultados

3. **Filtro por fecha:**
   - Presets: Today, This Week, This Month, Last Month, Custom Range
   - Date picker para custom

4. **Filtro por monto:**
   - Range slider: Min - Max

**Implementación:**

```typescript
// En ExpensesList.tsx
const [searchQuery, setSearchQuery] = useState('');
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [dateRange, setDateRange] = useState('this_month');
const [amountRange, setAmountRange] = useState({ min: 0, max: 10000 });

const filteredExpenses = useMemo(() => {
  return expenses.filter(expense => {
    // Search query
    if (searchQuery && !expense.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(expense.category_id)) {
      return false;
    }
    
    // Date filter
    if (!isInDateRange(expense.date, dateRange)) {
      return false;
    }
    
    // Amount filter
    if (expense.amount < amountRange.min || expense.amount > amountRange.max) {
      return false;
    }
    
    return true;
  });
}, [expenses, searchQuery, selectedCategories, dateRange, amountRange]);
```

**Ubicación:**
- `frontend/src/features/expenses/ExpensesList.tsx`
- `frontend/src/features/incomes/IncomesList.tsx`
- `frontend/src/components/SearchBar.tsx` - NUEVO (reutilizable)
- `frontend/src/components/FilterChips.tsx` - NUEVO (reutilizable)

**Impacto:** ⭐⭐⭐⭐⭐
- Diferencia entre "útil" y "indispensable"
- Permite análisis rápido de gastos
- Mejora dramatically la usabilidad con muchas transacciones

**Esfuerzo:** 3-4 horas

---

### 7. Insights Accionables en Dashboard

**Problema:**
Dashboard actual muestra:
- Total Expenses: $1,500
- Total Incomes: $3,000

Pero el usuario piensa: "¿Eso es bueno o malo? ¿Gasté más que el mes pasado?"

**Solución:**
Transformar números en insights accionables

#### Insights Propuestos:

```
┌────────────────────────────────────────┐
│ 📊 Monthly Insights                    │
│                                        │
│ ↑ You spent 20% more than last month  │
│   $1,500 (this month) vs $1,250       │
│                                        │
│ 🔥 Top spending category: Food & Drink│
│   $450 (30% of total expenses)        │
│                                        │
│ 🎯 Savings Goal Progress               │
│   $850 / $1,000 (85%)                 │
│   You're $150 away from your goal!    │
│                                        │
│ 💡 Recurring expenses due this week:  │
│   • Netflix ($15.99) - Tomorrow       │
│   • Spotify ($9.99) - Friday          │
└────────────────────────────────────────┘
```

**Insights a Implementar:**

1. **Comparison vs Last Month:**
   - Calcular % change en expenses/incomes
   - Mostrar con flechas ↑↓ y colores (rojo/verde)

2. **Top Spending Category:**
   - Agrupar expenses por category
   - Mostrar la que tiene más gasto
   - Calcular % del total

3. **Savings Progress:**
   - Si hay savings goals activos
   - Mostrar progreso + mensaje motivacional
   - "You're almost there!" cuando >80%

4. **Upcoming Recurring:**
   - Listar recurring expenses de próximos 7 días
   - Con fecha específica

5. **Budget Alerts (futuro):**
   - "You've spent 80% of your Food budget this month"
   - Requiere implementar budgets primero

**Implementación:**

```typescript
// En Dashboard.tsx
const insights = useMemo(() => {
  const lastMonthExpenses = calculateLastMonthExpenses();
  const changePercent = ((currentExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
  
  const topCategory = getTopSpendingCategory(expenses);
  const savingsProgress = calculateSavingsProgress(savingsGoals);
  const upcomingRecurring = getUpcomingRecurring(recurringExpenses, 7);
  
  return {
    monthComparison: {
      current: currentExpenses,
      last: lastMonthExpenses,
      change: changePercent,
      trend: changePercent > 0 ? 'up' : 'down'
    },
    topCategory,
    savingsProgress,
    upcomingRecurring
  };
}, [expenses, savingsGoals, recurringExpenses]);
```

**Ubicación:**
- `frontend/src/features/dashboard/Dashboard.tsx`
- `frontend/src/features/dashboard/InsightsCard.tsx` - NUEVO
- `frontend/src/utils/insights.ts` - NUEVO (helpers de cálculo)

**Impacto:** ⭐⭐⭐⭐
- Transforma números en historias
- Usuario entiende su situación financiera de un vistazo
- Aumenta engagement (quieren ver los insights)

**Esfuerzo:** 2-3 horas

---

### 8. Modo Quick Entry vs Full Entry

**Problema:**
Dos casos de uso muy diferentes:
1. **Quick:** Salgo del súper, quiero agregar "$50 - Supermercado" en 5 segundos
2. **Full:** Hice una inversión, quiero agregar todos los detalles, notas, adjuntar recibo

Actualmente, el mismo form para ambos = Compromiso que no satisface a ninguno

**Solución:**
Dos modos de entrada con diferentes niveles de detalle

#### Quick Entry (Modal):
```
┌────────────────────────────────┐
│ 💸 Quick Add Expense           │
│                                │
│ Amount: [$________]           │
│ Description: [____________]   │
│                                │
│ Account: Personal Checking ✓   │
│ Date: Today ✓                  │
│                                │
│ [Add more details...]          │ ← Link
│                                │
│ [Cancel] [Save]               │
└────────────────────────────────┘
```

#### Full Entry (Page):
```
┌────────────────────────────────┐
│ Add Expense - Full Details     │
│                                │
│ Amount: [$________]           │
│ Description: [____________]   │
│ Category: [Dropdown ▼]        │
│ Account: [Dropdown ▼]         │
│ Date: [Date Picker]           │
│ Currency: [USD ▼]             │
│ Notes: [Text area...]         │
│ Receipt: [📎 Upload]           │
│ Tags: [#work #client]         │
│                                │
│ [Cancel] [Save]               │
└────────────────────────────────┘
```

**Flujos:**

1. **Quick Entry:**
   - Click en "Quick Add" button → Modal
   - Solo Amount + Description requeridos
   - Resto usa defaults inteligentes
   - Link "Add more details" → Redirect a Full Entry con datos pre-llenados

2. **Full Entry:**
   - Click en "New Expense" en navbar → Full page
   - Todos los campos disponibles
   - Para transacciones importantes

**Implementación:**

```typescript
// QuickAddModal.tsx
const QuickAddModal = ({ isOpen, onClose, type = 'expense' }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  const handleQuickSave = () => {
    // Usar defaults para campos no mostrados
    const data = {
      amount,
      description,
      account_id: user.default_account_id,
      date: new Date().toISOString(),
      category_id: localStorage.getItem('lastUsedCategory'),
      currency: defaultAccount.currency
    };
    
    createExpense.mutate(data);
  };
  
  const handleFullEntry = () => {
    // Guardar datos en sessionStorage
    sessionStorage.setItem('quickEntryData', JSON.stringify({ amount, description }));
    // Redirect a full form
    navigate('/expenses/new');
  };
};

// ExpenseForm.tsx
useEffect(() => {
  // Pre-llenar con datos de quick entry si existen
  const quickData = sessionStorage.getItem('quickEntryData');
  if (quickData) {
    const { amount, description } = JSON.parse(quickData);
    setValue('amount', amount);
    setValue('description', description);
    sessionStorage.removeItem('quickEntryData');
  }
}, []);
```

**Ubicación:**
- `frontend/src/components/QuickAddModal.tsx` - NUEVO
- `frontend/src/features/expenses/ExpenseForm.tsx` - Modificar para recibir pre-filled data
- `frontend/src/features/dashboard/Dashboard.tsx` - Quick Add buttons

**Impacto:** ⭐⭐⭐⭐
- Best of both worlds: Velocidad + Flexibilidad
- 90% de los casos usan Quick Entry
- 10% que necesitan detalles tienen Full Entry

**Esfuerzo:** 3-4 horas

---

## 🟡 Prioridad MEDIA

### 9. Feedback Visual de Acciones

**Problema:**
Usuario hace una acción (agregar gasto, borrar transacción) pero el feedback es mínimo:
- Solo un toast notification (que puede pasar desapercibido)
- Sin animaciones
- Sin confirmación visual clara

**Solución:**
Mejorar feedback visual en todas las acciones CRUD

#### Acciones a Mejorar:

**1. Crear (Add):**
```
Antes: Item aparece en la lista de golpe
Después: 
- Item hace slide-in desde arriba
- Highlight verde por 2 segundos
- Confetti si es un milestone (primera transacción, meta alcanzada)
```

**2. Actualizar (Edit):**
```
Antes: Item cambia de golpe
Después:
- Item hace "pulse" animation
- Highlight amarillo por 1 segundo
- Toast con "Undo" button (5 segundos)
```

**3. Eliminar (Delete):**
```
Antes: Item desaparece
Después:
- Item hace slide-out animation
- Toast con "Undo" button (5 segundos para restaurar)
- Si es recurring → Mostrar modal de confirmación
```

**4. Acciones en progreso:**
```
- Button muestra spinner mientras está loading
- Disable form mientras guarda
- Skeleton loader mientras carga data
```

**Implementación:**

```typescript
// animations.ts
export const slideIn = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3 }
};

export const pulse = {
  scale: [1, 1.02, 1],
  transition: { duration: 0.5 }
};

// En ExpensesList.tsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {expenses.map((expense) => (
    <motion.div
      key={expense.id}
      {...slideIn}
      className={isNewlyAdded(expense) ? 'bg-green-50' : ''}
    >
      {/* Expense row */}
    </motion.div>
  ))}
</AnimatePresence>
```

**Confetti en Milestones:**
```typescript
import confetti from 'canvas-confetti';

const onFirstExpenseAdded = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
  
  toast.success('🎉 First expense tracked!', {
    description: 'You\'re on your way to better financial tracking!'
  });
};
```

**Ubicación:**
- `frontend/src/utils/animations.ts` - NUEVO
- `frontend/src/features/expenses/ExpensesList.tsx`
- `frontend/src/features/incomes/IncomesList.tsx`
- Todos los forms (ExpenseForm, IncomeForm, etc.)

**Dependencias:**
```bash
npm install framer-motion canvas-confetti
npm install -D @types/canvas-confetti
```

**Impacto:** ⭐⭐⭐⭐
- Hace la app sentir más "viva" y responsive
- Mejora percepción de velocidad
- Aumenta satisfaction del usuario

**Esfuerzo:** 2-3 horas

---

### 10. Undo después de Borrar

**Problema:**
- Usuario borra un gasto por error
- No hay forma de recuperarlo
- Tiene que volver a crearlo manualmente (frustrante)

**Solución:**
Implementar "soft delete" con opción de Undo

#### UX Flow:

**1. Usuario hace click en Delete:**
```
Antes: 
- Modal "Are you sure?" → Yes → Item borrado (permanente)

Después:
- Item se marca como deleted (no se elimina de DB)
- Toast: "Expense deleted. [Undo]" (5 segundos)
- Si no hace Undo en 5 segundos → Borrado permanente
```

**2. Usuario hace click en Undo:**
```
- Item se restaura inmediatamente
- Toast: "Expense restored"
- Se cancela el borrado permanente
```

**Implementación:**

```typescript
// Backend: Agregar soft delete
ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE incomes ADD COLUMN deleted_at TIMESTAMP;

// Modificar queries para excluir deleted items
SELECT * FROM expenses WHERE account_id = $1 AND deleted_at IS NULL;

// Hook de delete con undo
const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  let undoTimeoutId: NodeJS.Timeout;

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete (marcar como deleted, no borrar)
      await api.delete(`/expenses/${id}?soft=true`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remover optimistically de la UI
      queryClient.setQueryData(['expenses'], (old) => 
        old.filter(e => e.id !== deletedId)
      );
      
      // Toast con Undo
      const { dismiss } = toast.error('Expense deleted', {
        description: 'Click Undo to restore',
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => handleUndo(deletedId, dismiss)
        }
      });
      
      // Programar borrado permanente después de 5 segundos
      undoTimeoutId = setTimeout(() => {
        permanentDelete(deletedId);
      }, 5000);
    }
  });

  const handleUndo = async (id: string, dismissToast: () => void) => {
    clearTimeout(undoTimeoutId);
    await api.post(`/expenses/${id}/restore`);
    queryClient.invalidateQueries(['expenses']);
    dismissToast();
    toast.success('Expense restored');
  };

  const permanentDelete = async (id: string) => {
    await api.delete(`/expenses/${id}?permanent=true`);
  };
};
```

**Backend Endpoints Nuevos:**
```go
// Soft delete
DELETE /api/expenses/:id?soft=true
- SET deleted_at = NOW()

// Restore
POST /api/expenses/:id/restore
- SET deleted_at = NULL

// Permanent delete (auto-llamado después de 5 segundos)
DELETE /api/expenses/:id?permanent=true
- DELETE FROM expenses WHERE id = $1

// Cleanup job (cron job - opcional)
// Borrar permanentemente items con deleted_at > 30 días
```

**Ubicación:**
- Backend: `backend/internal/handlers/expenses/delete.go` - Modificar para soft delete
- Backend: `backend/internal/handlers/expenses/restore.go` - NUEVO
- Frontend: `frontend/src/hooks/useExpenses.ts` - Modificar delete mutation
- Frontend: `frontend/src/hooks/useIncomes.ts` - Modificar delete mutation

**Impacto:** ⭐⭐⭐⭐
- Reduce frustración por errores
- Mejora confianza del usuario
- Pattern común en apps profesionales

**Esfuerzo:** 2-3 horas

---

### 11. Empty States Amigables

**Problema:**
Cuando no hay data, se muestra:
```
No expenses found.
```

Es frío, impersonal, no ayuda al usuario.

**Solución:**
Empty states con ilustración + mensaje amigable + CTA

#### Ejemplos:

**Expenses vacíos:**
```
┌──────────────────────────────────┐
│           📝                     │
│                                  │
│     No expenses yet              │
│                                  │
│  Start tracking your spending    │
│  by adding your first expense    │
│                                  │
│     [+ Add Expense]              │
└──────────────────────────────────┘
```

**Incomes vacíos:**
```
┌──────────────────────────────────┐
│           💰                     │
│                                  │
│     No income recorded yet       │
│                                  │
│  Track your income sources to    │
│  get a complete financial view   │
│                                  │
│     [+ Add Income]               │
└──────────────────────────────────┘
```

**Accounts vacíos:**
```
┌──────────────────────────────────┐
│           🏦                     │
│                                  │
│     Create your first account    │
│                                  │
│  Accounts help you organize      │
│  your money by wallet, bank, etc │
│                                  │
│     [+ Create Account]           │
└──────────────────────────────────┘
```

**Search sin resultados:**
```
┌──────────────────────────────────┐
│           🔍                     │
│                                  │
│  No results for "Starbucks"      │
│                                  │
│  Try searching for something     │
│  else or adjust your filters     │
│                                  │
│     [Clear Filters]              │
└──────────────────────────────────┘
```

**Implementación:**

```typescript
// EmptyState.tsx
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="text-6xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
      {description}
    </p>
    {action && (
      <Button onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

// Uso en ExpensesList.tsx
{expenses.length === 0 && (
  <EmptyState
    icon="📝"
    title="No expenses yet"
    description="Start tracking your spending by adding your first expense"
    action={{
      label: "+ Add Expense",
      onClick: () => navigate('/expenses/new')
    }}
  />
)}
```

**Ubicación:**
- `frontend/src/components/EmptyState.tsx` - NUEVO (reutilizable)
- `frontend/src/features/expenses/ExpensesList.tsx`
- `frontend/src/features/incomes/IncomesList.tsx`
- `frontend/src/features/accounts/AccountList.tsx`
- `frontend/src/features/savings/SavingsList.tsx`
- `frontend/src/features/categories/CategoriesList.tsx`

**Impacto:** ⭐⭐⭐
- Hace la app sentir más amigable
- Guía al usuario sobre qué hacer
- Reduce confusión en nuevos usuarios

**Esfuerzo:** 1 hora

---

### 12. Loading States Mejorados

**Problema:**
Mientras carga data, se muestra:
- Nada (pantalla en blanco)
- O un spinner genérico

No da contexto de QUÉ está cargando.

**Solución:**
Skeleton loaders que imitan la estructura del contenido final

#### Ejemplos:

**Expense List Loading:**
```
┌────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓     ▓▓▓▓              │ ← Skeleton row
│ ▓▓▓▓▓         ▓▓▓              │
│ ▓▓▓▓▓▓▓▓▓▓    ▓▓▓▓             │
│ ▓▓▓▓          ▓▓▓              │
│ ▓▓▓▓▓▓        ▓▓▓▓             │
└────────────────────────────────┘
```

**Dashboard Loading:**
```
┌────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓                   │ ← Summary cards
│                                │
│ ▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓   │ ← Stats
│                                │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │ ← Chart
└────────────────────────────────┘
```

**Implementación:**

Ya tenés `TableSkeleton` implementado. Ahora crear más variantes:

```typescript
// Skeleton.tsx (ampliar el existente)

export const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
);

export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);
```

**Ubicación:**
- `frontend/src/components/ui/Skeleton.tsx` - Ampliar con más variantes
- Usar en todas las páginas mientras `isLoading`

**Impacto:** ⭐⭐⭐
- Mejora perceived performance
- Usuario sabe que algo está pasando
- Más profesional

**Esfuerzo:** 1-2 horas

---

## 🟢 Prioridad BAJA

### 13. Export de Datos (CSV/PDF)

**Problema:**
Usuario quiere su data para:
- Hacer análisis en Excel
- Compartir con contador
- Backup personal

Actualmente no hay forma de exportar.

**Solución:**
Botón "Export" en cada sección con opciones CSV/PDF

#### UI:

```
Expenses Page:
┌────────────────────────────────────┐
│ Expenses              [Export ▼]  │ ← Dropdown
│                       ├─ CSV       │
│                       └─ PDF       │
└────────────────────────────────────┘
```

**Export CSV:**
```csv
Date,Description,Category,Amount,Currency,Account
2024-01-15,Coffee,Food & Drink,5.00,USD,Personal Checking
2024-01-16,Gas,Transportation,50.00,USD,Personal Checking
```

**Export PDF:**
```
┌──────────────────────────────────────┐
│  Expenses Report                     │
│  January 2024                        │
│                                      │
│  Date       Description    Amount    │
│  ────────────────────────────────    │
│  Jan 15     Coffee         $5.00     │
│  Jan 16     Gas            $50.00    │
│                                      │
│  Total: $55.00                       │
└──────────────────────────────────────┘
```

**Implementación:**

```typescript
// CSV Export
import { parse } from 'json2csv';

const exportToCSV = (expenses: Expense[]) => {
  const fields = ['date', 'description', 'category_name', 'amount', 'currency', 'account_name'];
  const csv = parse(expenses, { fields });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};

// PDF Export
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const exportToPDF = (expenses: Expense[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Expenses Report', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  const tableData = expenses.map(e => [
    e.date,
    e.description,
    e.category_name,
    `$${e.amount.toFixed(2)}`
  ]);
  
  doc.autoTable({
    head: [['Date', 'Description', 'Category', 'Amount']],
    body: tableData,
    startY: 40
  });
  
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  doc.text(`Total: $${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
  
  doc.save(`expenses-${new Date().toISOString().split('T')[0]}.pdf`);
};
```

**Ubicación:**
- `frontend/src/utils/export.ts` - NUEVO
- `frontend/src/features/expenses/ExpensesList.tsx` - Export button
- `frontend/src/features/incomes/IncomesList.tsx` - Export button

**Dependencias:**
```bash
npm install json2csv jspdf jspdf-autotable
npm install -D @types/json2csv
```

**Impacto:** ⭐⭐⭐
- Importante para power users
- Necesario para uso profesional
- Backup de seguridad

**Esfuerzo:** 2-3 horas

---

### 14. Notificaciones de Recurring Expenses

**Problema:**
Tenés recurring expenses configurados (Netflix, Spotify, etc.) pero no hay recordatorio de cuándo se van a debitar.

**Solución:**
Sistema de notificaciones para recordar próximos débitos

#### Tipos de Notificaciones:

**1. In-App Notifications:**
```
Dashboard (top right):
┌────────────────────────────────┐
│ 🔔 (2)                         │ ← Badge con contador
└────────────────────────────────┘
        ↓ (click)
┌────────────────────────────────┐
│ Notifications                  │
│ ────────────────────────────   │
│ 💳 Netflix ($15.99)            │
│    Debits tomorrow             │
│                                │
│ 🎵 Spotify ($9.99)             │
│    Debits in 3 days            │
└────────────────────────────────┘
```

**2. Email Notifications (futuro):**
```
Subject: Upcoming Recurring Expenses

Hi Lorenzo,

You have 2 recurring expenses coming up this week:
- Netflix: $15.99 (Tomorrow)
- Spotify: $9.99 (Friday)

Total: $25.98
```

**Implementación:**

```typescript
// Backend: Job diario que verifica upcoming recurring expenses
// backend/internal/scheduler/notifications.go

func CheckUpcomingRecurringExpenses() {
  // Para cada usuario
  users := getAllUsers()
  
  for _, user := range users {
    // Obtener recurring expenses activos
    recurring := getActiveRecurringExpenses(user.ID)
    
    // Filtrar los que se debitan en próximos 7 días
    upcoming := filterUpcoming(recurring, 7)
    
    if len(upcoming) > 0 {
      // Crear notificación in-app
      createNotification(user.ID, upcoming)
      
      // (Opcional) Enviar email
      sendEmailNotification(user.Email, upcoming)
    }
  }
}

// Tabla de notificaciones
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'recurring_expense_upcoming'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB, -- { expense_id, amount, due_date }
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Frontend:**

```typescript
// useNotifications.ts
export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get<Notification[]>('/notifications');
      return response.data;
    },
    refetchInterval: 60000 // Check cada minuto
  });
};

// NotificationBell.tsx
const NotificationBell = () => {
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <div className="relative">
      <button className="relative p-2">
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
```

**Ubicación:**
- Backend: `backend/internal/scheduler/notifications.go` - NUEVO
- Backend: `backend/migrations/019_create_notifications.sql` - NUEVO
- Backend: `backend/internal/handlers/notifications/` - NUEVO
- Frontend: `frontend/src/hooks/useNotifications.ts` - NUEVO
- Frontend: `frontend/src/components/NotificationBell.tsx` - NUEVO

**Impacto:** ⭐⭐⭐
- Evita sorpresas financieras
- Aumenta awareness de gastos fijos
- Feature diferenciadora

**Esfuerzo:** 4-5 horas

---

### 15. Modo Offline

**Problema:**
Usuario está en el subte (sin internet), agrega gastos, pero cuando llega a casa se perdieron.

**Solución:**
Offline-first con sincronización automática

#### Estrategia:

**1. LocalStorage/IndexedDB como cache:**
```typescript
// Cuando no hay internet
const addExpense = (expense: Expense) => {
  // Guardar en IndexedDB
  db.expenses.add({
    ...expense,
    id: `temp-${Date.now()}`,
    synced: false
  });
  
  // Mostrar en UI inmediatamente
  // Marcar como "pending sync" (icono 🔄)
};

// Cuando vuelve internet
window.addEventListener('online', () => {
  syncPendingExpenses();
});

const syncPendingExpenses = async () => {
  const pending = await db.expenses.where('synced').equals(false).toArray();
  
  for (const expense of pending) {
    try {
      // Enviar al servidor
      const response = await api.post('/expenses', expense);
      
      // Actualizar ID temporal con ID real del servidor
      await db.expenses.update(expense.id, {
        id: response.data.id,
        synced: true
      });
      
      toast.success('Synced offline expenses');
    } catch (error) {
      toast.error('Failed to sync. Will retry later.');
    }
  }
};
```

**2. Service Worker para requests offline:**
```javascript
// service-worker.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Si falla (offline), guardar en queue
          return saveToOfflineQueue(event.request);
        })
    );
  }
});
```

**Implementación:**

```bash
# Instalar Dexie (IndexedDB wrapper)
npm install dexie
```

```typescript
// db.ts
import Dexie, { Table } from 'dexie';

interface OfflineExpense extends Expense {
  synced: boolean;
}

class AppDatabase extends Dexie {
  expenses!: Table<OfflineExpense>;
  
  constructor() {
    super('BolsilloClaroDB');
    this.version(1).stores({
      expenses: '++id, synced, created_at'
    });
  }
}

export const db = new AppDatabase();
```

**Ubicación:**
- `frontend/src/utils/db.ts` - NUEVO (IndexedDB)
- `frontend/src/utils/offline.ts` - NUEVO (sync logic)
- `frontend/public/service-worker.js` - NUEVO
- Modificar hooks para usar offline-first approach

**Impacto:** ⭐⭐
- Nice to have para power users
- Importante si se usa mucho en mobile
- Aumenta reliability

**Esfuerzo:** 5-6 horas (complejo)

---

### 16. Gráficos Interactivos

**Problema:**
Gráficos actuales son estáticos (si los hay).
No se puede hacer click, zoom, o filtrar visualmente.

**Solución:**
Usar Recharts o Chart.js para gráficos interactivos

#### Ejemplos:

**1. Expense Breakdown (Pie Chart):**
```
Cuando haces hover en un slice:
┌────────────────────────────────┐
│      📊 Expenses by Category   │
│                                │
│        [Pie Chart]             │
│          ↑                     │
│     Food & Drink: $450 (30%)   │ ← Tooltip
│                                │
│ Click a slice to filter list   │
└────────────────────────────────┘
```

**2. Monthly Trend (Line Chart):**
```
┌────────────────────────────────┐
│   📈 Spending Trend            │
│                                │
│   [Line Chart with dots]       │
│          ↑                     │
│     Jan 15: $125 in expenses   │ ← Tooltip
│                                │
│ Drag to zoom in on date range  │
└────────────────────────────────┘
```

**3. Income vs Expenses (Bar Chart):**
```
┌────────────────────────────────┐
│   📊 Income vs Expenses        │
│                                │
│   [Grouped Bar Chart]          │
│     Jan    Feb    Mar          │
│                                │
│ Click a bar to see details     │
└────────────────────────────────┘
```

**Implementación:**

```typescript
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const ExpensePieChart = ({ expenses }: { expenses: Expense[] }) => {
  const data = useMemo(() => {
    // Agrupar por categoría
    const grouped = expenses.reduce((acc, expense) => {
      const category = expense.category_name;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value
    }));
  }, [expenses]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  const handleClick = (data: any) => {
    // Filtrar expenses por esta categoría
    onCategoryFilter(data.name);
  };
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.name}: ${entry.value}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          onClick={handleClick}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

**Ubicación:**
- `frontend/src/features/dashboard/ExpensePieChart.tsx` - NUEVO
- `frontend/src/features/dashboard/TrendLineChart.tsx` - NUEVO
- `frontend/src/features/dashboard/IncomeVsExpenseChart.tsx` - NUEVO
- `frontend/src/features/reports/ReportsPage.tsx` - Usar charts

**Dependencias:**
```bash
npm install recharts
```

**Impacto:** ⭐⭐⭐
- Hace los datos más comprensibles
- Insights visuales rápidos
- Aumenta engagement

**Esfuerzo:** 3-4 horas

---

### 17. Tags/Labels para Transacciones

**Problema:**
Usuario quiere etiquetar gastos para análisis más granular.
Ejemplo: Gasté en "Coffee" pero quiero saber cuánto fue:
- #work (café durante trabajo)
- #personal (café por placer)
- #client (café con cliente - reembolsable)

Actualmente solo hay Categories, que es muy rígido.

**Solución:**
Sistema de tags flexible

#### UI:

**Add Expense Form:**
```
┌────────────────────────────────┐
│ Amount: [$5.00]               │
│ Description: [Coffee]         │
│ Category: [Food & Drink ▼]    │
│                                │
│ Tags: [#work] [#client] [x]   │ ← Tags editables
│       [+ Add tag]              │
└────────────────────────────────┘
```

**Expense List:**
```
┌────────────────────────────────┐
│ Coffee               $5.00     │
│ 🏷️ #work #client               │
└────────────────────────────────┘
```

**Filter by Tags:**
```
┌────────────────────────────────┐
│ Expenses                       │
│                                │
│ Popular tags:                  │
│ [#work] [#personal] [#client]  │ ← Click to filter
│                                │
│ [Filtered expense list]        │
└────────────────────────────────┘
```

**Implementación:**

```sql
-- Backend: Nueva tabla
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7), -- Hex color
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE expense_tags (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, tag_id)
);
```

```typescript
// Frontend
interface Tag {
  id: string;
  name: string;
  color?: string;
}

const TagInput = ({ selectedTags, onChange }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const { data: availableTags } = useTags();
  
  const handleAddTag = (tagName: string) => {
    // Si el tag ya existe, usarlo
    // Si no, crear nuevo
    const existingTag = availableTags.find(t => t.name === tagName);
    
    if (existingTag) {
      onChange([...selectedTags, existingTag]);
    } else {
      createTag.mutate(
        { name: tagName },
        {
          onSuccess: (newTag) => {
            onChange([...selectedTags, newTag]);
          }
        }
      );
    }
    
    setInputValue('');
  };
  
  return (
    <div className="flex flex-wrap gap-2">
      {selectedTags.map(tag => (
        <span
          key={tag.id}
          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
          style={{ backgroundColor: tag.color }}
        >
          #{tag.name}
          <button onClick={() => handleRemoveTag(tag)}>×</button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputValue.trim()) {
            handleAddTag(inputValue.trim());
          }
        }}
        placeholder="+ Add tag"
        className="outline-none"
      />
    </div>
  );
};
```

**Ubicación:**
- Backend: `backend/migrations/020_create_tags.sql` - NUEVO
- Backend: `backend/internal/handlers/tags/` - NUEVO
- Frontend: `frontend/src/types/tag.ts` - NUEVO
- Frontend: `frontend/src/hooks/useTags.ts` - NUEVO
- Frontend: `frontend/src/components/TagInput.tsx` - NUEVO
- Frontend: Modificar ExpenseForm/IncomeForm

**Impacto:** ⭐⭐⭐
- Flexibilidad para power users
- Análisis más detallado
- Feature diferenciadora

**Esfuerzo:** 3-4 horas

---

## 📅 Roadmap Sugerido

### **Semana 1: Quick Wins (UX Crítico)** 
*Objetivo: Hacer la app 10x más rápida y amigable*

| Día | Mejora | Esfuerzo | Prioridad |
|-----|--------|----------|-----------|
| Lunes | #2 - Agrupar Expenses/Recurring en tabs | 2-3h | 🔴 CRÍTICA |
| Martes | #1 - Quick Add Expense button (FAB) | 3-4h | 🔴 CRÍTICA |
| Miércoles | #3 - Defaults inteligentes en forms | 1-2h | 🔴 CRÍTICA |
| Jueves | #11 - Empty states amigables | 1h | 🟡 MEDIA |
| Viernes | #12 - Loading states mejorados | 1-2h | 🟡 MEDIA |

**Total:** ~10-12 horas
**Resultado:** App se siente profesional y rápida

---

### **Semana 2: Onboarding + Discovery**
*Objetivo: Usuarios nuevos saben qué hacer, usuarios activos encuentran lo que buscan*

| Día | Mejora | Esfuerzo | Prioridad |
|-----|--------|----------|-----------|
| Lunes | #5 - Onboarding wizard | 4-5h | 🔴 CRÍTICA |
| Martes-Miércoles | #6 - Búsqueda/filtros en Expenses | 3-4h | 🟠 ALTA |
| Jueves | #7 - Insights en Dashboard | 2-3h | 🟠 ALTA |
| Viernes | Buffer / Testing | - | - |

**Total:** ~10-12 horas
**Resultado:** Onboarding claro + búsqueda potente

---

### **Semana 3: Polish + Mobile**
*Objetivo: App se siente premium y funciona perfecto en mobile*

| Día | Mejora | Esfuerzo | Prioridad |
|-----|--------|----------|-----------|
| Lunes-Martes | #4 - Navegación mobile (bottom nav) | 3-4h | 🔴 CRÍTICA |
| Miércoles | #8 - Quick Entry vs Full Entry | 3-4h | 🟠 ALTA |
| Jueves | #9 - Feedback visual + animaciones | 2-3h | 🟡 MEDIA |
| Viernes | #10 - Undo después de borrar | 2-3h | 🟡 MEDIA |

**Total:** ~10-14 horas
**Resultado:** UX pulido y mobile-friendly

---

### **Semana 4+: Features Avanzadas** (Opcional)
*Para cuando quieras llevar la app al siguiente nivel*

- #13 - Export CSV/PDF (2-3h)
- #14 - Notificaciones de recurring (4-5h)
- #16 - Gráficos interactivos (3-4h)
- #17 - Tags para transacciones (3-4h)
- #15 - Modo offline (5-6h) - Solo si es crítico

---

## 🎯 Métricas de Éxito

Para medir el impacto de estas mejoras:

### **Antes vs Después:**

| Métrica | Antes | Objetivo Después |
|---------|-------|------------------|
| Tiempo para agregar gasto | 30 segundos | 5 segundos |
| Clicks para agregar gasto | 3 clicks + form | 1 click + form simplificado |
| Usuarios que completan onboarding | ? | >80% |
| Tiempo para encontrar un gasto | 1-2 minutos (scroll) | <10 segundos (búsqueda) |
| Abandono en primer día | ? | <20% |
| Satisfacción mobile UX | Baja | Alta |

---

## 💡 Principios de Diseño

Mantené estos principios en mente al implementar:

### **1. Menos Fricción**
- Cada click cuenta
- Defaults inteligentes
- Pre-llenar todo lo posible

### **2. Feedback Inmediato**
- Loading states claros
- Animaciones suaves
- Toasts informativos

### **3. Mobile First**
- Diseñar para thumbs
- Bottom navigation
- FAB buttons

### **4. Guiar al Usuario**
- Empty states con CTAs
- Onboarding claro
- Tooltips cuando sea necesario

### **5. Perdonar Errores**
- Undo en borrados
- Confirmaciones en acciones destructivas
- Soft deletes

---

## 🚀 Quick Start

Para empezar con las mejoras críticas **hoy mismo**:

```bash
# 1. Crear rama de features
git checkout -b feature/ux-improvements

# 2. Empezar con Quick Wins (Semana 1)
# Implementar en este orden:
# - Agrupar Expenses/Recurring (reutiliza patrón de Categories)
# - Quick Add button (modal simple)
# - Defaults inteligentes (usar default_account_id del user)

# 3. Testear en mobile
# Abrir en celu: http://192.168.0.46:5173

# 4. Iterar y mejorar
```

---

## 📝 Notas Finales

**Recordá:**
- **No hagas todo de golpe** - Implementá por semanas
- **Testeá en mobile constantemente** - 80% del uso será mobile
- **Pedí feedback real** - Mostrale a alguien que no sea dev
- **Iterá** - No tiene que ser perfecto en v1

**Pregunta clave después de cada mejora:**
> "¿Esto hace la vida del usuario MÁS FÁCIL o más complicada?"

Si la respuesta es "más complicada", descartala.

---

**¿Listo para empezar? 🚀**

Recomiendo arrancar con **Semana 1** (Quick Wins). Son mejoras de alto impacto con bajo esfuerzo que van a transformar la app inmediatamente.

¿Por cuál querés arrancar?
