# ⚡ Quick Start - Postman

Guía ultra-rápida para empezar a probar la API en **2 minutos**.

---

## 📥 PASO 1: Importar archivos en Postman

1. **Abrí Postman** (o [postman.com/downloads](https://www.postman.com/downloads/) si no lo tenés)

2. **Click en "Import"** (arriba a la izquierda)

3. **Arrastrá estos 2 archivos**:
   ```
   Bolsillo_Claro_API.postman_collection.json
   Bolsillo_Claro_Local.postman_environment.json
   ```

4. **Click en "Import"**

---

## 🌍 PASO 2: Seleccionar el Environment

1. **Arriba a la derecha**, en el selector de environment
2. **Seleccioná**: "Avaltra - Local"
3. ✅ Ya está configurado con: `http://192.168.0.46:9090/api`

---

## ✅ PASO 3: Verificar que funciona

### 1. Health Check
- Click en la carpeta **"❤️ Health Check"**
- Click en el request **"Health"**
- Click en **"Send"**
- Deberías ver: `{"status":"ok"}`

✅ **Si ves eso, está todo funcionando**

---

## 🚀 PASO 4: Crear tu primer usuario

### 1. Register
- Click en la carpeta **"🔐 Authentication"**
- Click en **"Register"**
- Click en **"Send"**

✅ **¡Listo!** Se guardaron automáticamente:
- `access_token` (para autenticación)
- `refresh_token` (para renovar)
- `user_id` (tu ID de usuario)

**Verificá las variables:**
- Click en el ícono del ojo 👁️ arriba a la derecha
- Deberías ver los tokens guardados

---

## 💰 PASO 5: Crear una cuenta

### 1. Create Personal Account
- Click en la carpeta **"💰 Accounts"**
- Click en **"Create Personal Account"**
- Click en **"Send"**

✅ **Se guardó automáticamente:**
- `account_id` (para usar en otros endpoints)

---

## 🎯 PASO 6: Probar otros endpoints

**Ahora tenés TODO configurado**, podés probar cualquier cosa:

### Crear un gasto:
- Carpeta **"💸 Expenses"** → **"Create Expense (ARS)"** → Send

### Crear un ingreso:
- Carpeta **"💰 Incomes"** → **"Create Income"** → Send

### Ver el resumen:
- Carpeta **"📊 Dashboard"** → **"Get Summary"** → Send

---

## 🏷️ BONUS: Trabajar con Categorías

Las categorías te permiten organizar tus gastos e ingresos.

### 1️⃣ Ver categorías disponibles:
```
Categories → Get Expense Categories → Send
```
✅ **Script automático:** Guarda el ID de la primera categoría en `expense_category_id`

### 2️⃣ Crear un gasto CON categoría:
```
Expenses → Create Expense WITH Category → Send
```
Este request usa automáticamente la variable `expense_category_id` que guardaste.

### 3️⃣ Crear tu propia categoría custom:
```
Categories → Create Custom Expense Category → Send
```

**Lo mismo funciona para ingresos:**
- `Get Income Categories` → guarda `income_category_id`
- `Create Income WITH Category` → usa esa variable

---

## 📚 CARPETAS DISPONIBLES

| Carpeta | Qué hace |
|---------|----------|
| 🔐 Authentication | Register, Login, Refresh Token |
| 💰 Accounts | Crear/listar/actualizar cuentas |
| 💸 Expenses | Gastos (ARS y USD con Modo 3) |
| 💰 Incomes | Ingresos |
| 📊 Dashboard | Resumen financiero del mes |
| 🎯 Savings Goals | Metas de ahorro |
| 🔁 Recurring Expenses | Gastos recurrentes (Netflix, etc.) |
| 🔁 Recurring Incomes | Ingresos recurrentes (sueldo, etc.) |
| 🏷️ Categories | Categorías custom |
| 👥 Family Members | Miembros de cuentas familiares |
| ❤️ Health Check | Verificar que la API funciona |

---

## 🧪 TESTS AUTOMÁTICOS

**Cada request tiene tests** que se ejecutan automáticamente:

✅ Verifica el status code  
✅ Verifica la estructura de la respuesta  
✅ Guarda variables automáticamente (tokens, IDs, etc.)

**Ver resultados:**
- Después de hacer Send
- Mirá la pestaña **"Test Results"** abajo
- Si ves ✅ verde, todo OK

---

## 🔄 FLUJO COMPLETO DE EJEMPLO

```
1. Health Check          → Verificar que el backend funciona
2. Register              → Crear usuario (guarda tokens)
3. Create Personal Acc   → Crear cuenta (guarda account_id)
4. Create Expense        → Registrar un gasto
5. Create Income         → Registrar un ingreso
6. Get Summary           → Ver resumen del mes
```

**Tiempo total:** 1 minuto ⚡

---

## ❓ PROBLEMAS?

### No se conecta:
```bash
# Verificá que Docker esté corriendo
docker-compose ps

# Deberías ver:
# avaltra-backend   Up
# avaltra-db        Up (healthy)
```

### Error 401 Unauthorized:
El token expiró (duran 15 min). Ejecutá **"Refresh Token"** o **"Login"** de nuevo.

### Variables vacías:
Ejecutá primero **"Register"** y luego **"Create Personal Account"**.

---

## 📖 MÁS INFO

- **POSTMAN.md**: Guía completa con todos los detalles
- **API.md**: Documentación técnica de cada endpoint
- **DOCKER.md**: Guía de Docker

---

**¡Listo! En menos de 2 minutos ya estás probando la API completa** 🚀
