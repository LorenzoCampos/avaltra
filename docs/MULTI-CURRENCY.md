# 💱 Sistema Multi-Currency - Modo 3: Flexibilidad Total

Documentación completa del sistema de multi-moneda implementado en Avaltra.

---

## 📋 Índice

- [Problema](#problema)
- [Solución: 3 Modos](#solución-3-modos)
- [Modo 3 en Detalle](#modo-3-estrella-del-sistema)
- [Implementación Backend](#implementación-backend)
- [Schema de Base de Datos](#schema-de-base-de-datos)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [FAQ](#faq)

---

## Problema

### Realidad Argentina (2026)

Usuario compra **Claude Pro por USD 20** con tarjeta de crédito.

**Costos reales:**
- Dólar oficial: **$900**
- Impuesto PAÍS (30%): **$270**
- Percepción Ganancias (45%): **$405**
- **Dólar tarjeta efectivo: $1,575** por USD

**Monto real debitado: ARS $31,500**

### El Problema Tradicional

Si solo guardamos:
```json
{
  "amount": 20,
  "currency": "USD",
  "exchange_rate": 900
}
```

**Monto calculado:** 20 × 900 = $18,000  
**Monto REAL debitado:** $31,500  
**❌ Diferencia perdida:** $13,500

**Esto hace que tu balance y reportes estén completamente incorrectos.**

---

## Solución: 3 Modos

El sistema implementa **tres modos** para manejar conversiones de moneda, dándote flexibilidad total según qué información tenés disponible.

### Modo 1: Moneda Local (Automático)

**Cuándo:** Gasto/ingreso en la misma moneda que la cuenta

**Ejemplo:**
```json
{
  "amount": 15000,
  "currency": "ARS"
}
```

**Cuenta configurada en:** ARS

**Backend calcula automáticamente:**
```javascript
exchange_rate = 1.0
amount_in_primary_currency = 15000
```

**✅ Sin conversión necesaria**

---

### Modo 2: Con Exchange Rate Provisto

**Cuándo:** Conocés la tasa de cambio que querés usar

**Ejemplo:**
```json
{
  "amount": 10,
  "currency": "USD",
  "exchange_rate": 900
}
```

**Cuenta configurada en:** ARS

**Backend calcula:**
```javascript
amount_in_primary_currency = 10 × 900 = 9000
```

**Uso típico:**
- Transferencias al dólar oficial
- Pagos con tipo de cambio conocido
- Ingresos en USD convertidos a ARS

---

### Modo 3: Con Monto Real Pagado ⭐

**Cuándo:** Sabés exactamente cuánto te debitaron en moneda primaria (LO MÁS COMÚN)

**Ejemplo:**
```json
{
  "amount": 20,
  "currency": "USD",
  "amount_in_primary_currency": 31500
}
```

**Cuenta configurada en:** ARS

**Backend calcula la tasa efectiva:**
```javascript
exchange_rate = 31500 / 20 = 1575
```

**✅ Captura perfecta del dólar tarjeta con todos los impuestos incluidos!**

---

## Modo 3: Estrella del Sistema

### ¿Por qué es tan importante?

**Casos de uso reales:**

#### 1. Compras con Tarjeta (Dólar Tarjeta)
```
Producto: USD 20
Débito: ARS $31,500
Tasa efectiva: 1,575
```

#### 2. Transferencias Cripto con Comisiones
```
Enviás: USD 100
Fee: USD 3
Recibís: USD 97
Vendes en pesos: ARS $95,000
Tasa efectiva: 95,000 / 100 = 950 (por el monto que enviaste)
```

#### 3. Freelance con Comisiones de Plataforma
```
Cliente paga: USD 500
Payoneer cobra: USD 25 (5%)
Recibís: USD 475
Retirás a pesos: ARS $450,000
Tasa efectiva: 450,000 / 500 = 900 (calculada sobre el monto original)
```

#### 4. Dólar Blue / MEP / CCL
```
Comprás: USD 100
Cotización blue: $1,200
Pagás: ARS $120,000
Tasa efectiva: 1,200
```

### Ventajas del Modo 3

✅ **Realidad capturada:** El balance refleja exactamente cuánto pagaste  
✅ **Todos los impuestos incluidos:** Dólar tarjeta, solidario, percepción ganancias  
✅ **Comisiones incluidas:** Transferencias, plataformas de pago, bancos  
✅ **Trazabilidad total:** Ves USD 20 pero sabés que te costó $31,500  
✅ **Reportes precisos:** Dashboard muestra gastos reales  
✅ **Auditoría completa:** Podés ver la tasa efectiva de cada transacción  

---

## Implementación Backend

### Lógica de Conversión (Pseudo-código)

```go
func CalculateExchangeRate(req CreateExpenseRequest, accountCurrency string) (float64, float64, error) {
    var exchangeRate float64
    var amountInPrimaryCurrency float64
    
    // MODO 1: Misma moneda
    if req.Currency == accountCurrency {
        exchangeRate = 1.0
        amountInPrimaryCurrency = req.Amount
        return exchangeRate, amountInPrimaryCurrency, nil
    }
    
    // MODO 3: Usuario proveyó monto real (PRIORIDAD)
    if req.AmountInPrimaryCurrency != nil {
        amountInPrimaryCurrency = *req.AmountInPrimaryCurrency
        exchangeRate = amountInPrimaryCurrency / req.Amount
        return exchangeRate, amountInPrimaryCurrency, nil
    }
    
    // MODO 2: Usuario proveyó tasa
    if req.ExchangeRate != nil {
        exchangeRate = *req.ExchangeRate
        amountInPrimaryCurrency = req.Amount * exchangeRate
        return exchangeRate, amountInPrimaryCurrency, nil
    }
    
    // FALLBACK: Buscar en tabla exchange_rates
    rate, err := db.GetExchangeRate(req.Currency, accountCurrency, req.Date)
    if err != nil {
        return 0, 0, errors.New("no exchange rate found - please provide exchange_rate or amount_in_primary_currency")
    }
    
    exchangeRate = rate
    amountInPrimaryCurrency = req.Amount * rate
    return exchangeRate, amountInPrimaryCurrency, nil
}
```

### Validaciones

```go
// Validar que la tasa calculada sea razonable
if exchangeRate <= 0 {
    return error("exchange_rate must be positive")
}

if amountInPrimaryCurrency <= 0 {
    return error("amount_in_primary_currency must be positive")
}

// Guardar en DB
expense := Expense{
    Amount: req.Amount,
    Currency: req.Currency,
    ExchangeRate: exchangeRate,
    AmountInPrimaryCurrency: amountInPrimaryCurrency,
    // ... otros campos
}
```

---

## Schema de Base de Datos

### Campos Multi-Currency (expenses e incomes)

```sql
-- Campos agregados en migración 010
ALTER TABLE expenses 
    ADD COLUMN exchange_rate DECIMAL(15, 6) NOT NULL,
    ADD COLUMN amount_in_primary_currency DECIMAL(15, 2) NOT NULL;

ALTER TABLE incomes 
    ADD COLUMN exchange_rate DECIMAL(15, 6) NOT NULL,
    ADD COLUMN amount_in_primary_currency DECIMAL(15, 2) NOT NULL;
```

**Precisión:**
- `exchange_rate`: DECIMAL(15, 6) - Hasta 6 decimales (ej: 1575.123456)
- `amount_in_primary_currency`: DECIMAL(15, 2) - Centavos de precisión

### Tabla exchange_rates

```sql
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency currency NOT NULL,
    to_currency currency NOT NULL,
    rate DECIMAL(15, 6) NOT NULL CHECK (rate > 0),
    rate_date DATE NOT NULL,
    source VARCHAR(100),  -- 'manual', 'bcra', 'api', etc.
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(from_currency, to_currency, rate_date)
);
```

**Uso:**
- Admin puede cargar tasas manualmente
- Backend busca tasa por fecha si usuario no provee
- Histórico de tasas oficiales

**Ejemplo de datos:**
```sql
INSERT INTO exchange_rates (from_currency, to_currency, rate, rate_date, source) VALUES
('USD', 'ARS', 900.00, '2026-01-15', 'manual'),
('USD', 'ARS', 905.50, '2026-01-16', 'manual'),
('EUR', 'ARS', 980.00, '2026-01-15', 'manual');
```

---

## Ejemplos de Uso

### Ejemplo 1: Gasto con Tarjeta (Modo 3)

**Request:**
```json
POST /api/expenses
{
  "description": "Claude Pro - Enero 2026",
  "amount": 20,
  "currency": "USD",
  "amount_in_primary_currency": 31500,
  "date": "2026-01-16",
  "category_id": "uuid-tecnologia"
}
```

**Headers:**
```
Authorization: Bearer <token>
X-Account-ID: <uuid-cuenta-en-ARS>
```

**Response:**
```json
{
  "id": "uuid-del-gasto",
  "description": "Claude Pro - Enero 2026",
  "amount": 20.00,
  "currency": "USD",
  "exchange_rate": 1575.00,
  "amount_in_primary_currency": 31500.00,
  "date": "2026-01-16",
  "created_at": "2026-01-16T10:30:00Z"
}
```

**Guardado en DB:**
```sql
SELECT description, amount, currency, exchange_rate, amount_in_primary_currency
FROM expenses WHERE id = 'uuid-del-gasto';

-- description              | amount | currency | exchange_rate | amount_in_primary_currency
-- Claude Pro - Enero 2026  |  20.00 | USD      |      1575.000 |                   31500.00
```

---

### Ejemplo 2: Ingreso Freelance con Comisiones (Modo 3)

**Escenario:**
- Cliente paga: USD 500
- Payoneer cobra: USD 25 (5%)
- Recibís: USD 475
- Retirás a pesos: ARS $450,000

**Request:**
```json
POST /api/incomes
{
  "description": "Proyecto Web - Cliente USA",
  "amount": 500,
  "currency": "USD",
  "amount_in_primary_currency": 450000,
  "date": "2026-01-16",
  "category_id": "uuid-freelance"
}
```

**Backend calcula:**
```javascript
exchange_rate = 450000 / 500 = 900
```

**Resultado:**
- Ves que facturaste USD 500
- Sabés que recibiste ARS $450,000
- Tasa efectiva: 900 (ya descontada la comisión)

---

### Ejemplo 3: Compra con Tasa Conocida (Modo 2)

**Request:**
```json
POST /api/expenses
{
  "description": "Amazon Prime",
  "amount": 10,
  "currency": "USD",
  "exchange_rate": 900,
  "date": "2026-01-16"
}
```

**Backend calcula:**
```javascript
amount_in_primary_currency = 10 × 900 = 9000
```

---

### Ejemplo 4: Gasto Local (Modo 1)

**Request:**
```json
POST /api/expenses
{
  "description": "Supermercado",
  "amount": 15000,
  "currency": "ARS",
  "date": "2026-01-16"
}
```

**Backend calcula automáticamente:**
```javascript
exchange_rate = 1.0
amount_in_primary_currency = 15000
```

---

## Snapshot Histórico

### ¿Por qué guardar exchange_rate en cada transacción?

**Problema sin snapshot:**
```
Enero: Compro USD 20, dólar a $900
Febrero: Dólar sube a $1,200
Marzo: Consulto gastos de enero
❌ Sistema usa tasa actual ($1,200) → muestra $24,000 en lugar de $18,000
```

**Solución con snapshot:**
```
Enero: Compro USD 20, guardo exchange_rate: 900
Febrero: Dólar sube a $1,200
Marzo: Consulto gastos de enero
✅ Sistema usa tasa guardada (900) → muestra $18,000 correcto
```

### Datos Guardados por Transacción

Cada gasto/ingreso guarda:
- `amount` - Monto original en moneda original
- `currency` - Moneda original
- `exchange_rate` - Tasa en el momento de la transacción
- `amount_in_primary_currency` - Monto convertido
- `date` - Fecha de la transacción (= fecha del tipo de cambio)

**Esto garantiza que los reportes históricos sean precisos sin importar cómo cambien las tasas después.**

---

## Dashboard y Reportes

### Conversión Automática

Cuando consultás el dashboard:

```
GET /api/dashboard/summary?month=2026-01
```

**Datos en diferentes monedas:**
```
Gastos enero:
- Supermercado: ARS $15,000 (tasa 1.0)
- Claude Pro: USD $20 (tasa 1575) → ARS $31,500
- Amazon: USD $10 (tasa 900) → ARS $9,000
```

**Dashboard calcula:**
```javascript
total_expenses = 15000 + 31500 + 9000 = $55,500 ARS
```

**Response:**
```json
{
  "period": "2026-01",
  "primary_currency": "ARS",
  "total_expenses": 55500.00,
  "expenses": [
    {
      "description": "Claude Pro",
      "amount": 20.00,
      "currency": "USD",
      "amount_in_primary_currency": 31500.00
    },
    // ...
  ]
}
```

**✅ Todo consolidado en la moneda primaria de la cuenta usando las tasas guardadas (snapshot).**

---

## FAQ

### ¿Puedo cambiar el exchange_rate de una transacción vieja?

**No.** El exchange_rate es un snapshot histórico que no debe modificarse porque refleja la tasa real del momento.

Si te equivocaste, tenés dos opciones:
1. Eliminar el gasto y crear uno nuevo con los datos correctos
2. Usar el endpoint `PUT /expenses/:id` y actualizar `amount_in_primary_currency` (recalcula tasa automáticamente)

---

### ¿Qué pasa si la cuenta está en USD y gasto en ARS?

Funciona exactamente igual pero invertido:

**Cuenta en USD, gasto en ARS:**
```json
{
  "amount": 31500,
  "currency": "ARS",
  "amount_in_primary_currency": 20
}
```

**Backend calcula:**
```javascript
exchange_rate = 20 / 31500 = 0.000635 (tasa inversa)
```

**O podés usar Modo 2:**
```json
{
  "amount": 31500,
  "currency": "ARS",
  "exchange_rate": 0.000635
}
```

---

### ¿Puedo tener múltiples monedas en la misma cuenta?

**Sí.** Cada gasto/ingreso puede ser en cualquier moneda soportada (ARS, USD, EUR).

La cuenta tiene una "moneda primaria" que es solo para **visualización consolidada** en el dashboard. Todos los gastos se guardan en su moneda original + conversión.

---

### ¿Cómo cargo tasas en exchange_rates?

**Opción 1: Manual (actual)**
```sql
INSERT INTO exchange_rates (from_currency, to_currency, rate, rate_date, source) 
VALUES ('USD', 'ARS', 1050.00, '2026-01-16', 'manual');
```

**Opción 2: Endpoint admin (futuro)**
```json
POST /api/admin/exchange-rates
{
  "from_currency": "USD",
  "to_currency": "ARS",
  "rate": 1050.00,
  "rate_date": "2026-01-16"
}
```

**Opción 3: API externa automática (v2.0)**
- Integración con BCRA, dolarhoy.com, etc.
- Actualización automática diaria

---

### ¿Qué monedas están soportadas?

**Actualmente:**
- ARS (Peso argentino)
- USD (Dólar estadounidense)
- EUR (Euro)

**Agregar nuevas:**
```sql
ALTER TYPE currency ADD VALUE 'BRL';  -- Real brasileño
ALTER TYPE currency ADD VALUE 'CLP';  -- Peso chileno
```

---

### ¿El Modo 3 funciona para ingresos también?

**¡Sí!** La lógica es idéntica.

**Ejemplo - Freelance con comisiones:**
```json
POST /api/incomes
{
  "description": "Proyecto React",
  "amount": 1000,
  "currency": "USD",
  "amount_in_primary_currency": 950000
}
```

**Tasa efectiva:** 950 (ya descontadas comisiones de Payoneer/Wise/etc)

---

## 🎓 Mejores Prácticas

### Para Usuarios

1. **Siempre usá Modo 3 para tarjeta de crédito**
   - Mirá el resumen de la tarjeta
   - Copiá el monto exacto debitado en pesos

2. **Para transferencias, revisá comisiones**
   - Si mandaste USD 100 pero te costó $105,000 (con comisiones)
   - Usá Modo 3: `amount: 100, amount_in_primary_currency: 105000`

3. **Guardá comprobantes**
   - El sistema guarda la tasa, pero los comprobantes son útiles para auditoría

### Para Developers

1. **Validar siempre que `exchange_rate > 0`**
2. **Usar DECIMAL para montos** (nunca FLOAT)
3. **Mostrar ambos valores en UI:**
   ```
   USD 20.00 (ARS $31,500 al cambio 1,575)
   ```

4. **Permitir edición de `amount_in_primary_currency`**
   - Útil si usuario se equivocó al cargar

---

**Última actualización:** 2026-01-16  
**Versión:** 1.0
