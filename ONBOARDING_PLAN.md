# 🎯 Plan de Onboarding - Bolsillo Claro

> **Fecha de creación:** 01 de Febrero, 2026  
> **Prioridad:** 🔴 CRÍTICA  
> **Objetivo:** Hacer la app usable para usuarios nuevos sin necesidad de explicación  
> **Basado en:** Feedback real de usuario no-técnico

---

## 📋 Índice

- [Contexto y Problema](#-contexto-y-problema)
- [Diagnóstico Actual](#-diagnóstico-actual)
- [Soluciones Priorizadas](#-soluciones-priorizadas)
- [Plan de Implementación](#-plan-de-implementación)
- [Métricas de Éxito](#-métricas-de-éxito)
- [Referencias](#-referencias)

---

## 🔴 Contexto y Problema

### Feedback Real de Usuario

**Testeo con usuario no-técnico:**  
> "No sabía qué hacía cada cosa. Si no estabas vos explicándome, no sabía qué hacer."

### Análisis del Problema

Si un usuario necesita que alguien le explique la app, significa que:

1. ❌ **No hay suficiente contexto** - Los conceptos no son auto-explicativos
2. ❌ **No hay guía inicial** - Usuario cae directo al dashboard sin orientación  
3. ❌ **Las acciones no son obvias** - No queda claro qué hacer primero
4. ❌ **Falta onboarding** - No hay proceso de primera vez

### Impacto Esperado

- **Sin mejoras:** 80% de abandono en primeros 5 minutos
- **Con mejoras:** 60-70% de retención y comprensión

---

## 📊 Diagnóstico Actual

### ✅ Lo que está BIEN

- ✅ Diseño limpio y moderno
- ✅ Traducciones completas (ES/EN)
- ✅ Estructura técnica sólida
- ✅ Estados de loading y error
- ✅ Empty states básicos con mensajes

### ❌ Lo que está MAL

#### 1. CERO Onboarding
- Usuario se registra → Cae al dashboard vacío
- No hay tutorial ni wizard de configuración inicial
- No hay guía de "primeros pasos"
- No hay tooltips explicativos

#### 2. Flujo Confuso para Nuevos Usuarios  
- ¿Qué es una "Cuenta"? ¿Por qué necesito crear una?
- ¿Qué diferencia hay entre "Gastos" y "Plantillas Recurrentes"?
- ¿Para qué sirve "Actividad" vs "Reportes"?
- ¿Qué es "Saldo Disponible"?

#### 3. Jerga Técnica sin Contexto
- "Primary Currency"
- "Available Balance"
- "Recurring Templates"
- "Family Member (Optional)"
- "Multi-Currency Transaction"

#### 4. Sin Ayuda Contextual
- No hay tooltips con "?"
- No hay iconos de ayuda
- No hay ejemplos inline
- No hay sugerencias o hints

#### 5. Dashboard Abrumador con Datos
- 5-6 cards sin explicación
- Gráficos sin contexto
- Números sin significado para novatos

---

## 🎯 Soluciones Priorizadas

### 🟢 NIVEL 1: CRÍTICO - Implementar INMEDIATAMENTE

#### 1.1 Onboarding Wizard Obligatorio ⭐⭐⭐⭐⭐

**Objetivo:** Guiar al usuario en los primeros 3 minutos.

**Flujo Propuesto:**

```
┌─────────────────────────────────────────────────────────┐
│ REGISTRO EXITOSO                                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Bienvenida                                      │
│                                                         │
│  👋 ¡Bienvenido a Bolsillo Claro!                      │
│                                                         │
│  Te vamos a ayudar a configurar tu cuenta en           │
│  3 simples pasos para que puedas empezar a             │
│  controlar tus finanzas.                               │
│                                                         │
│  [Comenzar] [Saltar (no recomendado)]                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Crear Primera Cuenta                           │
│                                                         │
│  💰 Creá tu Primera Cuenta                             │
│                                                         │
│  💡 Una "cuenta" es donde organizás tu plata.          │
│     Por ejemplo: "Mis Finanzas Personales" o           │
│     "Presupuesto Familiar"                             │
│                                                         │
│  Nombre: [ej. Mi Cuenta Personal]                      │
│  Moneda: [ARS ▼]                                       │
│                                                         │
│  [← Volver] [Siguiente →]                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Primer Gasto (Opcional)                        │
│                                                         │
│  📝 ¿Querés agregar tu primer gasto?                   │
│                                                         │
│  💡 Ejemplo: Si gastaste $500 en el supermercado,      │
│     podés registrarlo acá para llevar control          │
│                                                         │
│  Descripción: [ej. Supermercado Día]                   │
│  Monto: [ej. 500]                                      │
│                                                         │
│  [← Volver] [Lo haré después] [Agregar →]             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Completado                                     │
│                                                         │
│  ✅ ¡Listo! Ya podés usar Bolsillo Claro               │
│                                                         │
│  ✓ Tu cuenta está configurada                          │
│  ✓ Podés agregar gastos e ingresos                     │
│  ✓ Vas a ver reportes de tu plata                      │
│                                                         │
│  [Ir al Dashboard] [Ver Tour Rápido]                   │
└─────────────────────────────────────────────────────────┘
```

**Implementación Técnica:**

```typescript
// Estructura de archivos
frontend/src/features/onboarding/
├── OnboardingWizard.tsx        // Componente principal
├── steps/
│   ├── WelcomeStep.tsx        // Step 1: Bienvenida
│   ├── CreateAccountStep.tsx  // Step 2: Crear cuenta
│   ├── FirstExpenseStep.tsx   // Step 3: Primer gasto
│   └── CompletedStep.tsx      // Step 4: Completado
├── hooks/
│   └── useOnboarding.ts       // Estado y lógica
└── types.ts                   // Tipos TypeScript
```

**Estado y Persistencia:**

```typescript
// useOnboarding.ts
import { useLocalStorage } from '@/hooks/useLocalStorage';

export const useOnboarding = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = 
    useLocalStorage('hasCompletedOnboarding', false);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [accountData, setAccountData] = useState({});
  const [expenseData, setExpenseData] = useState({});

  return {
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    currentStep,
    setCurrentStep,
    accountData,
    setAccountData,
    expenseData,
    setExpenseData,
  };
};
```

**Traducciones Necesarias:**

```json
// frontend/src/i18n/locales/es/onboarding.json
{
  "welcome": {
    "title": "¡Bienvenido a Bolsillo Claro!",
    "subtitle": "Te vamos a ayudar a configurar tu cuenta en 3 simples pasos para que puedas empezar a controlar tus finanzas",
    "start": "Comenzar",
    "skip": "Saltar (no recomendado)",
    "skipWarning": "¿Estás seguro? Vas a tener que configurar todo manualmente"
  },
  "createAccount": {
    "title": "Creá tu Primera Cuenta",
    "subtitle": "Paso 1 de 3",
    "hint": "Una 'cuenta' es donde organizás tu plata. Por ejemplo: 'Mis Finanzas Personales' o 'Presupuesto Familiar'",
    "nameLabel": "Nombre de la Cuenta",
    "namePlaceholder": "ej. Mi Cuenta Personal",
    "currencyLabel": "Moneda Principal",
    "currencyHint": "Esta será la moneda principal de tu cuenta. Podés registrar gastos en otras monedas también",
    "back": "Volver",
    "next": "Siguiente"
  },
  "firstExpense": {
    "title": "¿Querés agregar tu primer gasto?",
    "subtitle": "Paso 2 de 3 (Opcional)",
    "hint": "Ejemplo: Si gastaste $500 en el supermercado, podés registrarlo acá para llevar control",
    "optional": "Este paso es opcional. Podés hacerlo después desde el Dashboard",
    "descriptionLabel": "Descripción",
    "descriptionPlaceholder": "ej. Supermercado Día",
    "amountLabel": "Monto",
    "amountPlaceholder": "ej. 500",
    "back": "Volver",
    "skip": "Lo haré después",
    "add": "Agregar"
  },
  "completed": {
    "title": "¡Listo! Ya podés usar Bolsillo Claro",
    "subtitle": "Todo configurado",
    "checklist": {
      "account": "Tu cuenta está configurada",
      "transactions": "Podés agregar gastos e ingresos",
      "reports": "Vas a ver reportes de tu plata"
    },
    "tips": {
      "title": "💡 Consejos para empezar:",
      "tip1": "Registrá tus gastos diarios para ver en qué gastás",
      "tip2": "Usá categorías para organizar mejor tus gastos",
      "tip3": "Revisá los reportes para entender tus finanzas"
    },
    "dashboard": "Ir al Dashboard",
    "tour": "Ver Tour Rápido"
  },
  "progress": {
    "step": "Paso {{current}} de {{total}}"
  }
}
```

```json
// frontend/src/i18n/locales/en/onboarding.json
{
  "welcome": {
    "title": "Welcome to Bolsillo Claro!",
    "subtitle": "We'll help you set up your account in 3 simple steps so you can start managing your finances",
    "start": "Get Started",
    "skip": "Skip (not recommended)",
    "skipWarning": "Are you sure? You'll need to set everything up manually"
  },
  "createAccount": {
    "title": "Create Your First Account",
    "subtitle": "Step 1 of 3",
    "hint": "An 'account' is where you organize your money. For example: 'My Personal Finances' or 'Family Budget'",
    "nameLabel": "Account Name",
    "namePlaceholder": "e.g. My Personal Account",
    "currencyLabel": "Primary Currency",
    "currencyHint": "This will be your account's main currency. You can still record transactions in other currencies",
    "back": "Back",
    "next": "Next"
  },
  "firstExpense": {
    "title": "Want to add your first expense?",
    "subtitle": "Step 2 of 3 (Optional)",
    "hint": "Example: If you spent $500 at the supermarket, you can log it here to keep track",
    "optional": "This step is optional. You can do it later from the Dashboard",
    "descriptionLabel": "Description",
    "descriptionPlaceholder": "e.g. Grocery Store",
    "amountLabel": "Amount",
    "amountPlaceholder": "e.g. 500",
    "back": "Back",
    "skip": "I'll do it later",
    "add": "Add"
  },
  "completed": {
    "title": "All Set! You're Ready to Use Bolsillo Claro",
    "subtitle": "Everything is configured",
    "checklist": {
      "account": "Your account is set up",
      "transactions": "You can add expenses and incomes",
      "reports": "You'll see reports of your finances"
    },
    "tips": {
      "title": "💡 Tips to get started:",
      "tip1": "Log your daily expenses to see where you spend",
      "tip2": "Use categories to better organize your expenses",
      "tip3": "Check reports to understand your finances"
    },
    "dashboard": "Go to Dashboard",
    "tour": "Take Quick Tour"
  },
  "progress": {
    "step": "Step {{current}} of {{total}}"
  }
}
```

**Integración en App:**

```typescript
// En App.tsx o donde manejes las rutas protegidas
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';
import { useOnboarding } from '@/features/onboarding/hooks/useOnboarding';

function App() {
  const { hasCompletedOnboarding } = useOnboarding();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        {/* ... rutas públicas ... */}
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Mostrar onboarding si no lo completó */}
          {isAuthenticated && !hasCompletedOnboarding && (
            <Route path="*" element={<OnboardingWizard />} />
          )}
          
          {/* Rutas normales si ya completó onboarding */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* ... resto de rutas ... */}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

#### 1.2 Tooltips Contextuales (Info Buttons) ⭐⭐⭐⭐

**Objetivo:** Explicar conceptos clave con un hover/click.

**Componente Reutilizable:**

```tsx
// frontend/src/components/ui/InfoTooltip.tsx
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export const InfoTooltip = ({ content, className = '' }: InfoTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={`inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${className}`}
            aria-label="Más información"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

**Ubicaciones Clave:**

| Ubicación | Concepto | Tooltip (ES) | Tooltip (EN) |
|-----------|----------|--------------|--------------|
| Dashboard | "Saldo Disponible" | "Es cuánta plata te queda después de restar tus gastos de tus ingresos" | "It's how much money you have left after subtracting expenses from income" |
| Dashboard | "Gastos del Mes" | "Total de todo lo que gastaste este mes" | "Total of everything you spent this month" |
| Dashboard | "Ingresos del Mes" | "Total de plata que ganaste o recibiste este mes" | "Total money you earned or received this month" |
| Expenses Tabs | "Plantillas Recurrentes" | "Gastos que se repiten todos los meses (ej: alquiler, Netflix, gimnasio)" | "Expenses that repeat every month (e.g. rent, Netflix, gym)" |
| Account Form | "Moneda" | "La moneda principal de tu cuenta. Podés registrar gastos en otras monedas también" | "Your account's main currency. You can still record expenses in other currencies" |
| Account Form | "Cuenta Familiar" | "Si compartís gastos con tu familia, podés crear miembros y asignar quién gastó" | "If you share expenses with family, you can create members and assign who spent" |
| Expense Form | "Categoría" | "Ayuda a organizar tus gastos. Ejemplo: 'Supermercado', 'Transporte', 'Entretenimiento'" | "Helps organize your expenses. Example: 'Groceries', 'Transport', 'Entertainment'" |

**Uso en Dashboard:**

```tsx
// En Dashboard.tsx
import { InfoTooltip } from '@/components/ui/InfoTooltip';

<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <CardTitle>
        {t('cards.availableBalance.title')}
      </CardTitle>
      <InfoTooltip 
        content={t('tooltips.availableBalance')}
      />
    </div>
  </CardHeader>
  <CardContent>
    {/* ... */}
  </CardContent>
</Card>
```

**Traducciones:**

```json
// Agregar a common.json
{
  "tooltips": {
    "availableBalance": "Es cuánta plata te queda después de restar tus gastos de tus ingresos",
    "monthlyExpenses": "Total de todo lo que gastaste este mes",
    "monthlyIncome": "Total de plata que ganaste o recibiste este mes",
    "recurringTemplates": "Gastos que se repiten todos los meses (ej: alquiler, Netflix, gimnasio)",
    "currency": "La moneda principal de tu cuenta. Podés registrar gastos en otras monedas también",
    "familyAccount": "Si compartís gastos con tu familia, podés crear miembros y asignar quién gastó",
    "category": "Ayuda a organizar tus gastos. Ejemplo: 'Supermercado', 'Transporte', 'Entretenimiento'",
    "multiCurrency": "Si gastás en una moneda diferente a tu cuenta (ej: dólares), podés especificar el costo real"
  }
}
```

---

#### 1.3 Empty States Mejorados ⭐⭐⭐⭐

**Objetivo:** Enseñar al usuario qué es cada sección y dar ejemplos claros.

**Componente Reutilizable:**

```tsx
// frontend/src/components/ui/EmptyState.tsx
import { Button } from './Button';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  examples?: string[];
  examplesTitle?: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState = ({
  icon,
  title,
  description,
  examples,
  examplesTitle = "💡 Ejemplos:",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) => {
  return (
    <div className="text-center py-10 px-4">
      {/* Icon */}
      <div className="mb-4">
        <span className="text-5xl" role="img" aria-label="icon">
          {icon}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
      )}

      {/* Examples Box */}
      {examples && examples.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
            {examplesTitle}
          </p>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
            {examples.map((example, index) => (
              <li key={index}>• {example}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
        {secondaryActionLabel && onSecondaryAction && (
          <Button 
            size="lg" 
            variant="outline" 
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
```

**Uso en ExpenseList:**

```tsx
// En ExpenseList.tsx
import { EmptyState } from '@/components/ui/EmptyState';

// Reemplazar empty state actual con:
<EmptyState
  icon="📝"
  title={t('list.empty.title')}
  description={t('list.empty.description')}
  examples={[
    t('list.empty.examples.groceries'),
    t('list.empty.examples.transport'),
    t('list.empty.examples.entertainment'),
  ]}
  examplesTitle={t('list.empty.examplesTitle')}
  actionLabel={t('list.empty.button')}
  onAction={() => navigate('/expenses/new')}
/>
```

**Traducciones:**

```json
// Actualizar en expenses.json
{
  "list": {
    "empty": {
      "title": "Todavía no registraste ningún gasto",
      "description": "Los gastos son todo lo que gastás en el día a día",
      "examplesTitle": "💡 Ejemplos de gastos:",
      "examples": {
        "groceries": "Supermercado, alquiler, servicios",
        "transport": "Salidas, transporte, ropa",
        "entertainment": "Netflix, gimnasio, delivery"
      },
      "button": "Agregar mi Primer Gasto"
    }
  }
}
```

---

#### 1.4 Feature Tour (Tour Guiado) ⭐⭐⭐⭐

**Objetivo:** Mostrar dónde está cada cosa después del onboarding.

**Instalación:**

```bash
pnpm add react-joyride
```

**Implementación:**

```tsx
// frontend/src/components/FeatureTour.tsx
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export const FeatureTour = () => {
  const { t } = useTranslation('tour');
  const [tourCompleted, setTourCompleted] = useLocalStorage('tourCompleted', false);
  const [runTour, setRunTour] = useLocalStorage('runTour', false);

  const steps: Step[] = [
    {
      target: '[data-tour="available-balance"]',
      content: t('steps.availableBalance'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="add-expense"]',
      content: t('steps.addExpense'),
    },
    {
      target: '[data-tour="add-income"]',
      content: t('steps.addIncome'),
    },
    {
      target: '[data-tour="reports"]',
      content: t('steps.reports'),
    },
    {
      target: '[data-tour="settings"]',
      content: t('steps.settings'),
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setTourCompleted(true);
      setRunTour(false);
    }
  };

  if (tourCompleted || !runTour) return null;

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: t('controls.back'),
        close: t('controls.close'),
        last: t('controls.last'),
        next: t('controls.next'),
        skip: t('controls.skip'),
      }}
      styles={{
        options: {
          primaryColor: '#3B82F6',
          zIndex: 10000,
        },
      }}
    />
  );
};
```

**Agregar data-tour attributes:**

```tsx
// En Dashboard.tsx
<Card data-tour="available-balance">
  {/* ... */}
</Card>

// En QuickActions o donde estén los botones
<Button data-tour="add-expense" onClick={() => navigate('/expenses/new')}>
  {t('common:buttons.addExpense')}
</Button>

<Button data-tour="add-income" onClick={() => navigate('/incomes/new')}>
  {t('common:buttons.addIncome')}
</Button>

// En Layout.tsx - Sidebar
<NavItem data-tour="reports" to="/reports">
  Reportes
</NavItem>

<NavItem data-tour="settings" to="/settings">
  Configuración
</NavItem>
```

**Traducciones:**

```json
// frontend/src/i18n/locales/es/tour.json
{
  "welcome": "¿Querés que te mostremos cómo funciona?",
  "start": "Sí, mostrame",
  "skip": "No, lo descubro solo",
  "steps": {
    "availableBalance": "Acá ves tu Saldo Disponible: cuánta plata te queda después de restar gastos de ingresos",
    "addExpense": "Acá agregás Gastos: todo lo que gastás (supermercado, servicios, salidas)",
    "addIncome": "Acá agregás Ingresos: lo que ganás (salario, freelance, etc.)",
    "reports": "Acá ves Reportes: gráficos y análisis de tus finanzas",
    "settings": "Acá cambiás la Configuración: perfil, idioma, preferencias"
  },
  "controls": {
    "back": "Atrás",
    "close": "Cerrar",
    "last": "Finalizar",
    "next": "Siguiente",
    "skip": "Saltar tour"
  }
}
```

---

## 📅 Plan de Implementación

### **Semana 1 - CRÍTICO** (5 días)

**Objetivo:** Usuario nuevo puede usar la app sin ayuda.

#### Día 1-2: Onboarding Wizard
- [ ] Crear estructura de carpetas
- [ ] Implementar componente `<OnboardingWizard />`
- [ ] Implementar 4 steps (Welcome, CreateAccount, FirstExpense, Completed)
- [ ] Crear hook `useOnboarding`
- [ ] Agregar traducciones ES/EN
- [ ] Conectar con API de accounts
- [ ] Guardar estado en localStorage
- [ ] Integrar en App.tsx

#### Día 3: Tooltips en Dashboard
- [ ] Crear componente `<InfoTooltip />`
- [ ] Agregar 6 tooltips en Dashboard
- [ ] Agregar tooltips en Account Form
- [ ] Agregar tooltips en Expense Form
- [ ] Agregar traducciones

#### Día 4: Empty States Mejorados
- [ ] Crear componente `<EmptyState />`
- [ ] Actualizar ExpenseList empty state
- [ ] Actualizar IncomeList empty state
- [ ] Actualizar RecurringExpensesList empty state
- [ ] Actualizar RecurringIncomesList empty state
- [ ] Actualizar SavingsList empty state
- [ ] Agregar traducciones

#### Día 5: Testing y Ajustes
- [ ] Testear flujo completo de onboarding
- [ ] Testear todos los tooltips
- [ ] Testear todos los empty states
- [ ] Ajustar copy y traducciones
- [ ] Pulir animaciones y transiciones
- [ ] Testing con usuario real

**Entregable:** Usuario nuevo puede configurar cuenta y agregar primer gasto sin ayuda.

---

### **Semana 2 - IMPORTANTE** (3 días)

**Objetivo:** Agregar ayuda contextual en toda la app.

#### Día 1: Feature Tour
- [ ] Instalar react-joyride
- [ ] Crear componente `<FeatureTour />`
- [ ] Configurar 5 pasos del tour
- [ ] Agregar data-tour attributes
- [ ] Integrar con onboarding (botón "Ver Tour")
- [ ] Agregar traducciones
- [ ] Testing

#### Día 2-3: Helpers Inline
- [ ] Actualizar componente Input con prop helper
- [ ] Agregar helpers en ExpenseForm
- [ ] Agregar helpers en IncomeForm
- [ ] Agregar helpers en AccountForm
- [ ] Agregar helpers en RecurringForms
- [ ] Agregar traducciones
- [ ] Testing

**Entregable:** Usuario tiene ayuda disponible en toda la app.

---

## 📊 Métricas de Éxito

### Métricas a Medir (Antes vs Después)

| Métrica | Actual (estimado) | Objetivo |
|---------|-------------------|----------|
| % usuarios que completan onboarding | 0% (no existe) | 85%+ |
| Tiempo hasta primer gasto | N/A | < 3 minutos |
| % usuarios que vuelven al día siguiente | ~20% | 60%+ |
| % usuarios activos a los 7 días | ~10% | 50%+ |
| % usuarios que entienden "cuenta" sin ayuda | ~30% | 90%+ |
| Tasa de abandono en primeros 5 min | ~80% | < 30% |

### Cómo Medir

**Implementar tracking básico:**

```typescript
// frontend/src/lib/analytics.ts
export const trackEvent = (event: string, properties?: object) => {
  // Por ahora, solo console.log
  // Después se puede integrar con Google Analytics, Mixpanel, etc.
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event, properties);
  }
  
  // Guardar en localStorage para análisis básico
  try {
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push({
      event,
      properties,
      timestamp: new Date().toISOString(),
    });
    // Mantener solo últimos 100 eventos
    const recentEvents = events.slice(-100);
    localStorage.setItem('analytics_events', JSON.stringify(recentEvents));
  } catch (error) {
    console.error('Error saving analytics event:', error);
  }
};

// Eventos clave a trackear:
export const ANALYTICS_EVENTS = {
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  
  // First actions
  FIRST_ACCOUNT_CREATED: 'first_account_created',
  FIRST_EXPENSE_CREATED: 'first_expense_created',
  FIRST_INCOME_CREATED: 'first_income_created',
  
  // Feature tour
  TOUR_STARTED: 'tour_started',
  TOUR_COMPLETED: 'tour_completed',
  TOUR_SKIPPED: 'tour_skipped',
  
  // Help/tooltips
  TOOLTIP_CLICKED: 'tooltip_clicked',
  HELP_CENTER_VISITED: 'help_center_visited',
};
```

**Uso:**

```typescript
// En OnboardingWizard.tsx
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

useEffect(() => {
  trackEvent(ANALYTICS_EVENTS.ONBOARDING_STARTED);
}, []);

const handleComplete = () => {
  trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
    time_taken: (Date.now() - startTime) / 1000,
    steps_completed: currentStep,
  });
  setHasCompletedOnboarding(true);
};
```

---

## 📚 Referencias

### Apps con Excelente Onboarding

1. **Notion** - https://notion.so
   - Wizard de 3 pasos
   - Templates pre-cargados
   - Tour interactivo

2. **Trello** - https://trello.com
   - Board de ejemplo
   - Cards explicativas
   - Tutorial integrado

3. **Slack** - https://slack.com
   - Setup guiado paso a paso
   - Tooltips contextuales
   - Bot de bienvenida

4. **Todoist** - https://todoist.com
   - Quick start
   - Ejemplos de proyectos
   - Gamification

5. **YNAB (You Need A Budget)** - https://youneedabudget.com
   - Tutorial obligatorio (como app de finanzas)
   - Conceptos explicados paso a paso
   - Video tutoriales integrados

### Librerías Útiles

- **react-joyride:** Tour guiado interactivo
  - GitHub: https://github.com/gilbarbara/react-joyride
  - Tamaño: 12kb gzipped
  - Stars: 5.8k
  - Muy customizable

### Artículos Recomendados

- **The Anatomy of a Perfect Onboarding Flow**
  - https://www.appcues.com/blog/user-onboarding

- **First-Time User Experience (FTUX) Best Practices**
  - https://www.nngroup.com/articles/first-time-ux/

- **Progressive Disclosure in UX**
  - https://www.nngroup.com/articles/progressive-disclosure/

---

## 🎯 Resumen Ejecutivo

### El Problema
- Usuario nuevo se pierde sin ayuda
- No hay onboarding ni contexto
- 80% abandono estimado en primeros 5 minutos

### La Solución
1. **Onboarding obligatorio** (3 pasos, 3 minutos)
2. **Tooltips en conceptos clave** (6-8 ubicaciones)
3. **Empty states educativos** (con ejemplos)
4. **Tour guiado opcional** (5 pasos)

### El Impacto
- ✅ 85%+ completarán onboarding
- ✅ < 3 minutos hasta primer gasto
- ✅ 60%+ volverán al día siguiente
- ✅ 50%+ activos a los 7 días

### Inversión de Tiempo
- **Semana 1 (Crítico):** 5 días
  - Onboarding Wizard (2 días)
  - Tooltips (1 día)
  - Empty States (1 día)
  - Testing (1 día)

- **Semana 2 (Importante):** 3 días
  - Feature Tour (1 día)
  - Helpers Inline (2 días)

**Total:** 8 días de desarrollo para transformar la UX.

---

**Última actualización:** 01 de Febrero, 2026  
**Estado:** 📝 Documentado - Listo para implementar  
**Prioridad:** 🔴 CRÍTICA  
**Próximo paso:** Implementar Onboarding Wizard
