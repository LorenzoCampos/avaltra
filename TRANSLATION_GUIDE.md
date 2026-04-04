# 🌍 Guía de Traducción - Avaltra

## ✅ Traducciones Creadas

Se crearon archivos JSON con traducciones completas para:

- ✅ **common.json** - Botones, acciones, labels comunes
- ✅ **navigation.json** - Menú de navegación
- ✅ **auth.json** - Login y Register
- ✅ **dashboard.json** - Dashboard/Panel
- ✅ **expenses.json** - Gastos
- ✅ **incomes.json** - Ingresos
- ✅ **activity.json** - Actividad
- ✅ **settings.json** - Configuración
- ✅ **accounts.json** - Cuentas

---

## 📖 Cómo Usar las Traducciones

### Opción 1: Hook `useTranslation()` (Recomendado)

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('expenses'); // Namespace

  return (
    <div>
      <h1>{t('title')}</h1>
      <Button>{t('add')}</Button>
      <p>{t('list.empty')}</p>
    </div>
  );
}
```

**Resultado (Español):**
```
Gastos
[Agregar Gasto]
No hay Gastos Todavía
```

---

### Opción 2: Componente `<T>` (Más simple)

```tsx
import { T } from '@/components/T';

function MyComponent() {
  return (
    <div>
      <Button><T>Save</T></Button>
      <Button><T>Cancel</T></Button>
    </div>
  );
}
```

**Resultado (Español):**
```
[Guardar]
[Cancelar]
```

---

## 🎯 Ejemplos por Sección

### Navigation (Sidebar/Bottom Nav)

**Antes:**
```tsx
<NavItem>Dashboard</NavItem>
<NavItem>Expenses</NavItem>
<NavItem>Incomes</NavItem>
```

**Después:**
```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('navigation');

<NavItem>{t('menu.dashboard')}</NavItem>
<NavItem>{t('menu.expenses')}</NavItem>
<NavItem>{t('menu.incomes')}</NavItem>
```

---

### Botones Comunes

**Antes:**
```tsx
<Button>Save</Button>
<Button>Cancel</Button>
<Button>Delete</Button>
```

**Después:**
```tsx
const { t } = useTranslation('common');

<Button>{t('buttons.save')}</Button>
<Button>{t('buttons.cancel')}</Button>
<Button>{t('buttons.delete')}</Button>
```

---

### Formularios

**Antes:**
```tsx
<Input label="Description" placeholder="e.g. Groceries" />
<Input label="Amount" />
<Button type="submit">Create Expense</Button>
```

**Después:**
```tsx
const { t } = useTranslation('expenses');

<Input 
  label={t('form.description')} 
  placeholder={t('form.descriptionPlaceholder')} 
/>
<Input label={t('form.amount')} />
<Button type="submit">{t('form.submit')}</Button>
```

---

### Con Variables (Interpolación)

**Antes:**
```tsx
<p>Are you sure you want to delete "{expense.description}"?</p>
```

**Después:**
```tsx
const { t } = useTranslation('expenses');

<p>{t('actions.deleteConfirm', { description: expense.description })}</p>
```

**JSON:**
```json
{
  "actions": {
    "deleteConfirm": "¿Estás seguro que querés eliminar \"{{description}}\"?"
  }
}
```

---

## 📝 Estructura de Archivos JSON

### common.json
```json
{
  "buttons": { "save": "Guardar", "cancel": "Cancelar" },
  "actions": { "loading": "Cargando...", "search": "Buscar" },
  "navigation": { "dashboard": "Panel", "expenses": "Gastos" },
  "common": { "description": "Descripción", "amount": "Monto" }
}
```

### expenses.json
```json
{
  "title": "Gastos",
  "add": "Agregar Gasto",
  "list": {
    "title": "Todos los Gastos",
    "empty": "No hay Gastos Todavía"
  },
  "form": {
    "description": "Descripción",
    "submit": "Crear Gasto"
  }
}
```

---

## 🔄 Cambiar Idioma Programáticamente

```tsx
import { useTranslation } from 'react-i18next';

function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('preferred_language', lang);
  };

  return (
    <select onChange={(e) => changeLanguage(e.target.value)} value={i18n.language}>
      <option value="es">Español</option>
      <option value="en">English</option>
    </select>
  );
}
```

---

## 🎨 Cambiar Idioma en Settings

Ya está implementado en:
`frontend/src/features/settings/UserSettings.tsx`

**Ubicación:** Settings → Preferences → Language

---

## ✅ Próximos Pasos

### 1. Traducir Navigation

**Archivo:** `frontend/src/components/Layout.tsx`

Buscar strings como:
- "Dashboard"
- "Expenses"
- "Incomes"
- "Activity"

Reemplazar con:
```tsx
const { t } = useTranslation('navigation');
{t('menu.dashboard')}
```

---

### 2. Traducir Auth Pages

**Archivos:**
- `frontend/src/features/auth/Login.tsx`
- `frontend/src/features/auth/Register.tsx`

Usar namespace: `auth`

---

### 3. Traducir Dashboard

**Archivo:** `frontend/src/features/dashboard/DashboardPage.tsx`

Usar namespace: `dashboard`

---

### 4. Traducir Expenses/Incomes

**Archivos:**
- `frontend/src/features/expenses/ExpenseList.tsx`
- `frontend/src/features/expenses/ExpenseForm.tsx`
- `frontend/src/features/incomes/IncomeList.tsx`
- `frontend/src/features/incomes/IncomeForm.tsx`

Usar namespaces: `expenses`, `incomes`

---

## 🐛 Debugging

Si no ves las traducciones:

1. **Verificar que i18n esté inicializado:**
   ```tsx
   // En main.tsx debe existir:
   import './i18n'
   ```

2. **Verificar idioma actual:**
   ```tsx
   const { i18n } = useTranslation();
   console.log('Current language:', i18n.language);
   ```

3. **Verificar que la traducción existe:**
   ```tsx
   console.log(t('expenses:title')); // "Gastos"
   ```

4. **Activar modo debug:**
   En `i18n/index.ts` ya está activado:
   ```ts
   debug: import.meta.env.DEV
   ```

---

## 📊 Estado Actual

| Componente | Traducciones | Estado |
|-----------|-------------|---------|
| Archivos JSON | ✅ | Completo |
| Settings Selector | ✅ | Implementado |
| Navigation | ⏳ | Pendiente |
| Auth Pages | ⏳ | Pendiente |
| Dashboard | ⏳ | Pendiente |
| Expenses | ⏳ | Pendiente |
| Incomes | ⏳ | Pendiente |
| Activity | ⏳ | Pendiente |

---

## 🎯 Testing

1. Ir a Settings → Preferences
2. Cambiar idioma a English
3. Navegar por la app
4. Los componentes traducidos deberían cambiar a inglés
5. Recargar página → debería mantener el idioma

---

**¡Traducciones listas para usar! Ahora solo falta aplicarlas en los componentes.** 🚀
