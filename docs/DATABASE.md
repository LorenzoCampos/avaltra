# 🗄️ Base de Datos - Avaltra

Schema completo de PostgreSQL 15 con todas las tablas, relaciones, constraints y migraciones.

---

## 📋 Índice

- [Overview](#overview)
- [ENUMs](#enums)
- [Tablas](#tablas)
- [Relaciones](#relaciones)
- [Índices](#índices)
- [Migraciones](#migraciones)

---

## Overview

**Motor:** PostgreSQL 15  
**Extensiones:** uuid-ossp (generación de UUIDs)  
**Total de tablas:** 12  
**Migraciones:** 13 archivos SQL ejecutables secuencialmente

---

## ENUMs

```sql
CREATE TYPE currency AS ENUM ('ARS', 'USD', 'EUR');
CREATE TYPE account_type AS ENUM ('personal', 'family');
CREATE TYPE expense_type AS ENUM ('one-time', 'recurring');
CREATE TYPE income_type AS ENUM ('one-time', 'recurring');
CREATE TYPE transaction_type AS ENUM ('add', 'withdraw');
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
```

---

## Tablas

### 1. `users`

Usuarios del sistema. Cada usuario puede administrar múltiples cuentas.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Campos:**
- `id` - UUID v4 generado automáticamente
- `email` - Email único para login
- `password_hash` - Hash bcrypt (cost factor 12)
- `name` - Nombre completo del usuario
- `created_at` / `updated_at` - Timestamps

**Constraints:**
- Email UNIQUE (caso insensitive en aplicación)

---

### 2. `accounts`

Cuentas financieras. Unidad fundamental donde se organizan gastos, ingresos y metas.

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_type account_type NOT NULL,
    currency currency NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Campos:**
- `account_type` - `'personal'` o `'family'`
- `currency` - Moneda primaria (`'ARS'`, `'USD'`)
  - NOTA: Solo ARS y USD están soportados actualmente en el ENUM

**Constraints:**
- FK a `users` con cascade delete
- Name max 100 caracteres

**Triggers:**
- Al crear cuenta → crear meta "Ahorro General" automáticamente

---

### 3. `family_members`

Miembros de cuentas tipo `family`. Son etiquetas para atribuir movimientos, no usuarios con login.

```sql
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Campos:**
- `is_active` - Para desactivar sin eliminar (mantiene historial)
- `email` - Opcional, informativo (no se usa para auth)

**Constraints:**
- FK a `accounts` con cascade delete
- Solo para cuentas `account_type='family'`

---

### 4. `recurring_expenses`

**Templates de gastos recurrentes** (patrón: Recurring Templates). Los gastos reales se generan automáticamente en la tabla `expenses`.

```sql
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency currency NOT NULL,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    
    -- Recurrence configuration
    recurrence_frequency recurrence_frequency NOT NULL,
    recurrence_interval INT NOT NULL DEFAULT 1 CHECK (recurrence_interval > 0),
    recurrence_day_of_month INT CHECK (recurrence_day_of_month BETWEEN 1 AND 31),
    recurrence_day_of_week INT CHECK (recurrence_day_of_week BETWEEN 0 AND 6),
    
    -- Time boundaries
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
    total_occurrences INT CHECK (total_occurrences IS NULL OR total_occurrences > 0),
    current_occurrence INT DEFAULT 0 CHECK (current_occurrence >= 0),
    
    -- Multi-currency (optional)
    exchange_rate DECIMAL(15, 6) CHECK (exchange_rate IS NULL OR exchange_rate > 0),
    amount_in_primary_currency DECIMAL(15, 2) CHECK (amount_in_primary_currency IS NULL OR amount_in_primary_currency > 0),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Campos de recurrencia:**
- `recurrence_frequency` - Frecuencia: daily, weekly, monthly, yearly
- `recurrence_interval` - Cada N períodos (ej: 2 = cada 2 semanas)
- `recurrence_day_of_month` - Día del mes (1-31) para monthly/yearly
- `recurrence_day_of_week` - Día de semana (0=Domingo, 6=Sábado) para weekly
- `start_date` - Cuándo empezar a generar ocurrencias
- `end_date` - Cuándo parar (NULL = indefinido)
- `total_occurrences` - Límite de ocurrencias (ej: 6 cuotas). NULL = indefinido
- `current_occurrence` - Contador de ocurrencias generadas
- `is_active` - Si false, no genera más ocurrencias (soft delete)

**Constraints:**
- Monthly/yearly REQUIERE `day_of_month` (1-31)
- Weekly REQUIERE `day_of_week` (0-6)
- `current_occurrence` <= `total_occurrences`
- `amount` debe ser positivo

**Notas:**
- Un CRON job diario genera las ocurrencias en la tabla `expenses` con FK `recurring_expense_id`
- Editar el template actualiza gastos FUTUROS, preserva histórico
- Desactivar (`is_active = false`) detiene generación sin borrar datos

---

### 5. `expenses`

Gastos reales (one-time o generados desde `recurring_expenses`).

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency currency NOT NULL,
    exchange_rate DECIMAL(15, 6) NOT NULL,
    amount_in_primary_currency DECIMAL(15, 2) NOT NULL,
    expense_type expense_type NOT NULL DEFAULT 'one-time',
    date DATE NOT NULL,
    end_date DATE,
    recurring_expense_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_recurring_end_date CHECK (
        (expense_type = 'one-time' AND end_date IS NULL) OR
        (expense_type = 'recurring' AND (end_date IS NULL OR end_date >= date))
    )
);
```

**Campos multi-currency:**
- `exchange_rate` - Tasa de conversión (snapshot)
- `amount_in_primary_currency` - Monto convertido a moneda de la cuenta

**Campos de recurrencia:**
- `recurring_expense_id` - FK al template si fue auto-generado. NULL para one-time o recurring legacy

**Constraints:**
- One-time NO puede tener `end_date`
- Recurring puede tener `end_date` opcional (null = infinito)
- `amount` debe ser positivo
- `end_date` >= `date` si existe

**Notas:**
- `expense_type = 'recurring'` con `recurring_expense_id = NULL` = sistema legacy (sin template)
- `expense_type = 'recurring'` con `recurring_expense_id != NULL` = generado desde template
- Estadísticas consultan esta tabla directamente (solo gastos reales)

---

### 6. `incomes`

Ingresos (one-time o recurring). Estructura idéntica a `expenses`.

```sql
CREATE TABLE incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    category_id UUID REFERENCES income_categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency currency NOT NULL,
    exchange_rate DECIMAL(15, 6) NOT NULL,
    amount_in_primary_currency DECIMAL(15, 2) NOT NULL,
    income_type income_type NOT NULL DEFAULT 'one-time',
    date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_recurring_end_date CHECK (
        (income_type = 'one-time' AND end_date IS NULL) OR
        (income_type = 'recurring' AND (end_date IS NULL OR end_date >= date))
    )
);
```

---

### 7. `expense_categories`

Categorías de gastos (predefinidas + custom por cuenta).

```sql
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE (COALESCE(account_id::text, 'SYSTEM'), name)
);
```

**Campos:**
- `account_id = NULL` → Categoría predefinida (global)
- `account_id = <uuid>` → Categoría custom de esa cuenta
- `is_system = TRUE` → No se puede editar/eliminar

**Categorías predefinidas (15):**
1. Alimentación 🍔 #FF6B6B
2. Transporte 🚗 #4ECDC4
3. Salud ⚕️ #95E1D3
4. Entretenimiento 🎮 #F38181
5. Educación 📚 #AA96DA
6. Hogar 🏠 #FCBAD3
7. Servicios 💡 #A8D8EA
8. Ropa 👕 #FFCCBC
9. Mascotas 🐶 #C5E1A5
10. Tecnología 💻 #90CAF9
11. Viajes ✈️ #FFAB91
12. Regalos 🎁 #F48FB1
13. Impuestos 🧾 #BCAAA4
14. Seguros 🛡️ #B39DDB
15. Otro 📦 #B0BEC5

---

### 7. `income_categories`

Categorías de ingresos (estructura idéntica a expense_categories).

**Categorías predefinidas (10):**
1. Salario 💼 #66BB6A
2. Freelance 💻 #42A5F5
3. Inversiones 📈 #AB47BC
4. Negocio 🏢 #FFA726
5. Alquiler 🏘️ #26C6DA
6. Regalo 🎁 #EC407A
7. Venta 🏷️ #78909C
8. Intereses 💰 #9CCC65
9. Reembolso ↩️ #7E57C2
10. Otro 💵 #8D6E63

---

### 8. `savings_goals`

Metas de ahorro.

```sql
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    currency currency NOT NULL,
    deadline DATE,
    description TEXT,
    is_general BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE (account_id, is_general) WHERE is_general = TRUE
);
```

**Campos:**
- `is_general = TRUE` - Meta "Ahorro General" (solo 1 por cuenta)
- `deadline` - Opcional (null = sin deadline)
- `current_amount` - Se actualiza automáticamente con transacciones

**Constraints:**
- Solo 1 meta con `is_general=TRUE` por cuenta

---

### 9. `savings_goal_transactions`

Movimientos de fondos en metas (add/withdraw).

```sql
CREATE TABLE savings_goal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Campos:**
- `transaction_type` - `'add'` o `'withdraw'`
- `date` - Fecha del movimiento

**Triggers:**
- Al INSERT → actualiza `savings_goals.current_amount`
- Al DELETE → actualiza `savings_goals.current_amount`

---

### 10. `exchange_rates`

Histórico de tipos de cambio.

```sql
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency currency NOT NULL,
    to_currency currency NOT NULL,
    rate DECIMAL(15, 6) NOT NULL CHECK (rate > 0),
    rate_date DATE NOT NULL,
    source VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE (from_currency, to_currency, rate_date)
);
```

**Campos:**
- `source` - Origen de la tasa ('manual', 'bcra', etc.)
- `rate_date` - Fecha a la que corresponde la tasa

**Uso:**
- Si usuario no provee `exchange_rate` ni `amount_in_primary_currency`
- Backend busca tasa en esta tabla por fecha

---

## Relaciones

```
users (1) ──────< (N) accounts
                        │
                        ├──────< (N) expenses
                        ├──────< (N) incomes
                        ├──────< (N) savings_goals
                        ├──────< (N) family_members
                        ├──────< (N) expense_categories (custom)
                        └──────< (N) income_categories (custom)

family_members (1) ──────< (N) expenses
                   ──────< (N) incomes
                   ──────< (N) savings_goal_transactions

expense_categories (1) ──────< (N) expenses
income_categories (1) ──────< (N) incomes

savings_goals (1) ──────< (N) savings_goal_transactions
```

**Cascade Deletes:**
- Eliminar `user` → elimina todas sus `accounts` y todo lo asociado
- Eliminar `account` → elimina gastos, ingresos, metas, miembros
- Eliminar `family_member` → SET NULL en gastos/ingresos (mantiene historial)
- Eliminar `category` → SET NULL en gastos/ingresos (mantiene registros)

---

## Índices

### Índices Automáticos (PKs y UNIQUEs)
- Todas las columnas `id` (PRIMARY KEY)
- `users.email` (UNIQUE)
- `(from_currency, to_currency, rate_date)` en `exchange_rates`

### Índices Explícitos

**users:**
```sql
CREATE INDEX idx_users_email ON users(email);
```

**accounts:**
```sql
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_type ON accounts(account_type);
```

**expenses:**
```sql
CREATE INDEX idx_expenses_account_id ON expenses(account_id);
CREATE INDEX idx_expenses_family_member_id ON expenses(family_member_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_expense_type ON expenses(expense_type);
```

**incomes:**
```sql
CREATE INDEX idx_incomes_account_id ON incomes(account_id);
CREATE INDEX idx_incomes_family_member_id ON incomes(family_member_id);
CREATE INDEX idx_incomes_category_id ON incomes(category_id);
CREATE INDEX idx_incomes_date ON incomes(date);
CREATE INDEX idx_incomes_income_type ON incomes(income_type);
```

**family_members:**
```sql
CREATE INDEX idx_family_members_account_id ON family_members(account_id);
```

**savings_goals:**
```sql
CREATE INDEX idx_savings_goals_account_id ON savings_goals(account_id);
CREATE INDEX idx_savings_goals_is_general ON savings_goals(is_general);
```

**savings_goal_transactions:**
```sql
CREATE INDEX idx_savings_goal_transactions_goal_id ON savings_goal_transactions(savings_goal_id);
CREATE INDEX idx_savings_goal_transactions_date ON savings_goal_transactions(date);
```

**categories:**
```sql
CREATE INDEX idx_expense_categories_account_id ON expense_categories(account_id);
CREATE INDEX idx_income_categories_account_id ON income_categories(account_id);
```

---

## Migraciones

Archivos en `backend/migrations/` (ejecutar en orden):

### 001 - Create Users Table
```bash
psql -d bolsillo_claro -f 001_create_users_table.sql
```
- Crea tabla `users`
- Habilita extensión `uuid-ossp`

### 002 - Create Accounts Table
```bash
psql -d bolsillo_claro -f 002_create_accounts_table.sql
```
- Crea ENUMs: `currency`, `account_type`
- Crea tabla `accounts`

### 003 - Create Savings Goals Table
```bash
psql -d bolsillo_claro -f 003_create_savings_goals_table.sql
```
- Crea tabla `savings_goals`
- Trigger para crear "Ahorro General" al crear account

### 004 - Create Family Members Table
```bash
psql -d bolsillo_claro -f 004_create_family_members_table.sql
```
- Crea tabla `family_members`

### 005 - Create Expenses Table
```bash
psql -d bolsillo_claro -f 005_create_expenses_table.sql
```
- Crea ENUM `expense_type`
- Crea tabla `expenses`
- Constraint: one-time no puede tener end_date

### 006 - Create Incomes Table
```bash
psql -d bolsillo_claro -f 006_create_incomes_table.sql
```
- Crea ENUM `income_type`
- Crea tabla `incomes`

### 007 - Create Categories Tables
```bash
psql -d bolsillo_claro -f 007_create_categories_tables.sql
```
- Crea tablas `expense_categories` e `income_categories`

### 008 - Seed Default Categories
```bash
psql -d bolsillo_claro -f 008_seed_default_categories.sql
```
- Inserta 15 categorías de gastos predefinidas
- Inserta 10 categorías de ingresos predefinidas

### 009 - Add Category ID to Expenses/Incomes
```bash
psql -d bolsillo_claro -f 009_add_category_id_to_expenses_incomes.sql
```
- Migra campo `category` TEXT → `category_id` UUID
- Hace JOIN con categorías predefinidas

### 010 - Add Multi-Currency Support
```bash
psql -d bolsillo_claro -f 010_add_multi_currency_support.sql
```
- Agrega campos `exchange_rate` y `amount_in_primary_currency`
- Crea tabla `exchange_rates`

### 011 - Update Savings Goals and Create Transactions
```bash
psql -d bolsillo_claro -f 011_update_savings_goals_and_create_transactions.sql
```
- Crea ENUM `transaction_type`
- Crea tabla `savings_goal_transactions`
- Triggers para actualizar `current_amount` automáticamente

---

## Ejecutar Todas las Migraciones

```bash
#!/bin/bash
# Script: run_migrations.sh

DB_NAME="bolsillo_claro"
DB_USER="postgres"
MIGRATIONS_DIR="backend/migrations"

for file in $(ls -1 $MIGRATIONS_DIR/*.sql | sort); do
    echo "Ejecutando: $file"
    psql -U $DB_USER -d $DB_NAME -f "$file"
    if [ $? -ne 0 ]; then
        echo "Error ejecutando $file"
        exit 1
    fi
done

echo "✅ Todas las migraciones ejecutadas exitosamente"
```

---

## Consultas Útiles

### Ver todas las tablas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Ver tamaño de tablas
```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Ver constraints de una tabla
```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'expenses'::regclass;
```

### Ver índices de una tabla
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'expenses';
```

---

**Última actualización:** 2026-01-16  
**Versión del schema:** 1.0 (11 migraciones)
