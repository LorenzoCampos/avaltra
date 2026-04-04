# 📬 Guía de Postman - Avaltra API

Esta guía te explica cómo usar la colección de Postman para probar TODOS los endpoints de la API de Avaltra.

---

## 📥 INSTALACIÓN

### 1. Descargar Postman

Si no lo tenés instalado:
- **Descargar**: [postman.com/downloads](https://www.postman.com/downloads/)
- O usar la versión web: [go.postman.co](https://go.postman.co/)

### 2. Importar la Colección

1. Abrí Postman
2. Click en **Import** (arriba a la izquierda)
3. Arrastrá estos 2 archivos:
   - `Bolsillo_Claro_API.postman_collection.json`
   - `Bolsillo_Claro_Local.postman_environment.json`
4. Click en **Import**

### 3. Seleccionar el Environment

1. Arriba a la derecha, en el selector de environment
2. Seleccioná **"Avaltra - Local"**
3. ✅ Ya está configurado con tu IP local: `http://192.168.0.46:9090/api`

---

## ⚠️ IMPORTANTE: Headers y Campos Requeridos

### Headers requeridos

Todos los endpoints (excepto Auth) requieren estos headers:

| Endpoint | Authorization | X-Account-ID |
|----------|--------------|--------------|
| **Auth** (Register, Login, Refresh) | ❌ No | ❌ No |
| **Accounts** (CRUD) | ✅ Sí | ❌ No |
| **Expenses, Incomes, Dashboard, etc.** | ✅ Sí | ✅ Sí |

**¿Cómo se configuran?**
- `Authorization: Bearer {{access_token}}` → Se configura automáticamente en cada request
- `X-Account-ID: {{account_id}}` → Se configura automáticamente DESPUÉS de crear una cuenta

**¿Cómo sé qué cuenta está activa?**
1. Mirá las variables de entorno (ícono del ojo 👁️)
2. El valor de `account_id` es la cuenta actualmente "activa"
3. Todos los gastos/ingresos se crean en ESA cuenta
4. Para cambiar de cuenta: ejecutá "Get All Accounts", copiá otro ID, y pegalo en la variable `account_id`

### Campos requeridos en Expenses

Cuando crees un expense, el backend REQUIERE estos campos:

```json
{
  "amount": 5000,                    // ✅ Requerido: monto > 0
  "currency": "ARS",                 // ✅ Requerido: "ARS" o "USD"
  "description": "Descripción",      // ✅ Requerido: no puede estar vacío
  "expense_type": "one-time",        // ✅ Requerido: "one-time" o "recurring"
  "date": "2026-01-20",              // ✅ Requerido: formato YYYY-MM-DD
  "category_id": null,               // ⚠️ Opcional: si es null, usa "Otros"
  "family_member_id": null           // ⚠️ Opcional: solo para family accounts
}
```

**¿Por qué `expense_type`?**
- `"one-time"`: Gasto puntual (la mayoría de los casos)
- `"recurring"`: Gasto que se repite (pero esto lo maneja mejor el módulo de Recurring Expenses)

**💡 Tip:** Para gastos recurrentes (Netflix, alquiler), es mejor usar el módulo **"🔁 Recurring Expenses"** que crea templates y genera los gastos automáticamente.

---

## 🚀 FLUJO DE USO RECOMENDADO

### PASO 1: Verificar que el backend esté corriendo

```bash
# En tu terminal
docker-compose ps

# Deberías ver:
# avaltra-backend   Up
# avaltra-db        Up (healthy)
```

### PASO 2: Health Check

1. En Postman, abrí la carpeta **"❤️ Health Check"**
2. Click en **"Health"**
3. Click en **Send**
4. Deberías ver:
```json
{
  "message": "Avaltra API está funcionando correctamente",
  "status": "ok"
}
```

✅ Si ves eso, el backend está funcionando perfecto.

---

### PASO 3: Registrar un Usuario

1. Abrí la carpeta **"🔐 Authentication"**
2. Click en **"Register"**
3. Click en **Send**

**¿Qué pasó?**
- Se creó un usuario con email random (generado automáticamente por Postman)
- Se guardó el `access_token` y `refresh_token` en las variables de entorno
- Se guardó el `user_id` y `user_email`

**Verificá las variables:**
1. Click en el ícono del ojo 👁️ arriba a la derecha
2. Deberías ver:
   - `access_token`: "eyJhbGciOiJ..." (un JWT largo)
   - `refresh_token`: "eyJhbGciOiJ..." (otro JWT)
   - `user_id`: "uuid-del-usuario"
   - `user_email`: "email@generado.com"

---

### PASO 4: Crear una Cuenta

1. Abrí la carpeta **"💰 Accounts"**
2. Click en **"Create Personal Account"**
3. Click en **Send**

**¿Qué pasó?**
- Se creó una cuenta personal
- Se guardó el `account_id` automáticamente
- Se creó automáticamente una meta de ahorro "Ahorro General"

**Respuesta esperada:**
```json
{
  "id": "uuid-de-la-cuenta",
  "name": "Mi Cuenta Personal",
  "type": "personal",
  "currency": "ARS",
  "createdAt": "2026-01-20T21:30:00Z"
}
```

---

### PASO 5: Probar otros endpoints

Ahora tenés **TODO configurado automáticamente**:
- ✅ `access_token` (para autenticación)
- ✅ `account_id` (para endpoints que lo requieren)

Podés probar cualquier endpoint y **YA FUNCIONA**, no tenés que copiar/pegar tokens ni IDs manualmente.

---

## 📚 ESTRUCTURA DE LA COLECCIÓN

### 🔐 Authentication (3 requests)
- **Register**: Crea usuario y guarda tokens automáticamente
- **Login**: Inicia sesión y actualiza tokens
- **Refresh Token**: Renueva el access token usando el refresh token

### 💰 Accounts (6 requests)
- **Create Personal Account**: Cuenta sin miembros
- **Create Family Account**: Cuenta con miembros
- **Get All Accounts**: Lista todas tus cuentas
- **Get Account Detail**: Detalle de una cuenta específica
- **Update Account**: Actualiza el nombre
- **Delete Account**: Elimina una cuenta (CASCADE)

### 💸 Expenses (6 requests)
- **Create Expense (ARS)**: Gasto en pesos
- **Create Expense (USD - Modo 3)**: Gasto en dólares con conversión
- **Get All Expenses**: Lista gastos (con filtros opcionales)
- **Get Expense Detail**: Detalle de un gasto
- **Update Expense**: Modifica un gasto
- **Delete Expense**: Elimina un gasto

### 💰 Incomes (4 requests)
- **Create Income**: Crea un ingreso
- **Get All Incomes**: Lista ingresos
- **Update Income**: Modifica un ingreso
- **Delete Income**: Elimina un ingreso

### 📊 Dashboard (1 request)
- **Get Summary**: Resumen financiero completo del mes

### 🎯 Savings Goals (6 requests)
- **Create Goal**: Crea una meta de ahorro
- **Get All Goals**: Lista todas las metas
- **Get Goal Detail**: Detalle con historial de transacciones
- **Add Funds**: Agrega fondos a una meta
- **Withdraw Funds**: Retira fondos de una meta
- **Delete Goal**: Elimina una meta

### 🔁 Recurring Expenses (4 requests)
- **Create Recurring Expense**: Template de gasto recurrente
- **Get All Recurring Expenses**: Lista templates
- **Update Recurring Expense**: Modifica un template
- **Delete Recurring Expense**: Desactiva un template

### 🔁 Recurring Incomes (2 requests)
- **Create Recurring Income**: Template de ingreso recurrente
- **Get All Recurring Incomes**: Lista templates

### 🏷️ Categories (4 requests)
- **Get Expense Categories**: Lista categorías de gastos
- **Create Custom Expense Category**: Crea categoría personalizada
- **Get Income Categories**: Lista categorías de ingresos
- **Create Custom Income Category**: Crea categoría personalizada

### 👥 Family Members (2 requests)
- **Get Members**: Lista miembros de una cuenta family
- **Add Member**: Agrega un miembro a la cuenta

### ❤️ Health Check (1 request)
- **Health**: Verifica que la API esté funcionando

---

## 🧪 TESTS AUTOMÁTICOS

Cada request tiene **tests automáticos** que verifican:

✅ **Status code correcto** (200, 201, etc.)  
✅ **Estructura de la respuesta** (tiene los campos requeridos)  
✅ **Guarda variables automáticamente** (tokens, IDs, etc.)

**Ver resultados de tests:**
1. Después de enviar un request
2. Click en la pestaña **"Test Results"** abajo
3. Vas a ver algo como:
   - ✅ Status code is 201
   - ✅ Response has access_token
   - ✅ Account created with correct type

---

## 🔄 VARIABLES DE ENTORNO

Las variables se **guardan automáticamente** cuando ejecutás ciertos requests:

| Variable | Se guarda en | Para qué se usa |
|----------|--------------|----------------|
| `access_token` | Register / Login | Autenticación (header Authorization) |
| `refresh_token` | Register / Login | Renovar access token |
| `user_id` | Register / Login | Identificar usuario |
| `user_email` | Register | Login posterior |
| `account_id` | Create Account | Header X-Account-ID |
| `member_id` | Create Family Account | Asignar gastos/ingresos |
| `expense_id` | Create Expense | Actualizar/eliminar gasto |
| `income_id` | Create Income | Actualizar/eliminar ingreso |
| `savings_goal_id` | Create Goal | Agregar fondos, etc. |
| `recurring_expense_id` | Create Recurring | Actualizar template |

**Ver variables:**
- Click en el ícono del ojo 👁️ arriba a la derecha
- O click en "Avaltra - Local" → Edit

**Editar manualmente:**
Si necesitás cambiar alguna variable (ej: probar con otro account_id):
1. Click en el ícono del ojo 👁️
2. Click en "Edit" al lado del environment
3. Modificá el valor
4. Click en "Save"

---

## 🎯 EJEMPLOS DE USO

### Ejemplo 1: Flujo completo de un usuario nuevo

```
1. Register → Crea usuario y guarda tokens
2. Create Personal Account → Crea cuenta y guarda account_id
3. Create Expense (ARS) → Registra un gasto
4. Create Income → Registra un ingreso
5. Get Summary → Ve el resumen del mes
```

### Ejemplo 2: Probar multi-currency (Modo 3)

```
1. Register / Login
2. Create Personal Account con currency: ARS
3. Create Expense (USD - Modo 3)
   - amount: 50 (USD)
   - amount_in_primary_currency: 78750 (ARS)
   - Sistema calcula: exchange_rate = 1575
4. Get Summary → Ve el gasto convertido a ARS
```

### Ejemplo 3: Crear cuenta familiar con gastos atribuidos

```
1. Register / Login
2. Create Family Account → Guarda account_id y member_id
3. Create Expense (ARS) → Agregar "member_id" en el body
4. Get All Expenses → Ver a qué miembro está atribuido
```

### Ejemplo 4: Probar gastos recurrentes

```
1. Register / Login
2. Create Personal Account
3. Create Recurring Expense
   - frequency: "monthly"
   - day_of_month: 15
   - start_date: "2026-01-15"
4. Esperar a que el scheduler genere el gasto (corre diariamente a las 00:00)
5. Get All Expenses → Debería aparecer el gasto generado automáticamente
```

---

## 🔧 TROUBLESHOOTING

### ❌ Error: "Could not send request"

**Problema:** Postman no puede conectarse al backend.

**Solución:**
1. Verificá que Docker esté corriendo: `docker-compose ps`
2. Verificá la URL en el environment: debe ser `http://192.168.0.46:9090/api`
3. Si cambiaste de red WiFi, tu IP puede haber cambiado:
   ```bash
   hostname -I | awk '{print $1}'
   # Actualizá la variable base_url en el environment
   ```

---

### ❌ Error: 401 Unauthorized

**Problema:** El access token expiró (duran 15 minutos).

**Solución:**
1. Ejecutá el request **"Refresh Token"**
2. O ejecutá **"Login"** nuevamente

---

### ❌ Error: 404 Not Found

**Problema:** El endpoint no existe o la URL está mal.

**Solución:**
1. Verificá que el `base_url` sea correcto: `http://192.168.0.46:9090/api`
2. Verificá que el backend esté corriendo: `docker-compose logs backend`

---

### ❌ Error: "account_id is not set"

**Problema:** Algunos endpoints requieren `X-Account-ID` pero la variable está vacía.

**Solución:**
1. Ejecutá primero **"Create Personal Account"** o **"Create Family Account"**
2. O manualmente copiá un `account_id` válido en las variables de entorno

---

### ❌ Los tests fallan

**Problema:** La respuesta no tiene la estructura esperada.

**Solución:**
1. Mirá el **Response Body** para ver qué devolvió la API
2. Mirá el **Response Status** (debería ser 200 o 201)
3. Verificá los logs del backend: `docker-compose logs -f backend`

---

## 🌐 CAMBIAR ENTRE AMBIENTES

### Local (Docker)
```json
{
  "base_url": "http://192.168.0.46:9090/api"
}
```

### Producción
Podés crear otro environment para producción:
```json
{
  "base_url": "https://api.fakerbostero.online/avaltra/api"
}
```

Y cambiar entre ellos con el selector arriba a la derecha.

---

## 📖 RECURSOS

- **API.md**: Documentación completa de todos los endpoints
- **FEATURES.md**: Explicación de cada funcionalidad
- **DOCKER.md**: Guía de Docker
- **RED_LOCAL.md**: Guía de acceso desde red local

---

## 🎓 TIPS PRO

### 1. Usar variables en el Body

Postman soporta variables en el body de los requests:

```json
{
  "email": "{{user_email}}",
  "account_id": "{{account_id}}"
}
```

### 2. Usar variables dinámicas de Postman

En el body de **Register**, usamos:
```json
{
  "email": "{{$randomEmail}}",
  "name": "{{$randomFullName}}"
}
```

Otras variables útiles:
- `{{$timestamp}}` - Unix timestamp
- `{{$randomInt}}` - Número random
- `{{$guid}}` - UUID random

### 3. Ejecutar toda una carpeta

1. Click derecho en una carpeta (ej: "💸 Expenses")
2. Click en **"Run folder"**
3. Postman ejecuta todos los requests en orden
4. Perfecto para testing rápido

### 4. Exportar respuestas

1. Después de hacer un request
2. Click en **"Save Response"** (abajo del response)
3. Podés usarlo como ejemplo de documentación

### 5. Compartir la colección

1. Click en los 3 puntos (...) al lado de la colección
2. Click en **"Export"**
3. Compartí el .json con tu equipo

---

## ✅ CHECKLIST ANTES DE EMPEZAR

- [ ] Backend corriendo: `docker-compose ps`
- [ ] Postman instalado
- [ ] Colección importada
- [ ] Environment seleccionado: "Avaltra - Local"
- [ ] Health check pasando (request "Health")
- [ ] Usuario registrado (request "Register")
- [ ] Cuenta creada (request "Create Personal Account")
- [ ] Variables guardadas (ver ícono del ojo 👁️)

---

¡Listo! Ahora tenés una colección completa para probar TODOS los endpoints del backend de Avaltra de forma eficiente y profesional. 🚀
