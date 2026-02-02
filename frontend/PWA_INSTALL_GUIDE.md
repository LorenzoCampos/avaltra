# 📱 Guía de Instalación PWA

## ¿Por qué no aparece "Install app" en Chrome Android?

Chrome Android requiere **HTTPS** para mostrar el banner de instalación. En desarrollo local con HTTP, el banner NO aparece automáticamente.

---

## 🔧 Solución 1: HTTPS en Desarrollo (Configurado)

Ahora Vite sirve la app con HTTPS (certificado auto-firmado):

```bash
cd /home/devuser/projects/bolsillo-claro/frontend
pnpm dev

# La app ahora corre en:
# https://192.168.0.46:5173  (HTTPS ✅)
```

### En el mobile (Chrome Android):

1. Abrir: `https://192.168.0.46:5173`
2. Chrome mostrará **"Your connection is not private"** (certificado auto-firmado)
3. Click en **"Advanced"** → **"Proceed to 192.168.0.46 (unsafe)"**
4. Ahora SÍ debería aparecer el banner "Install app" en la barra de direcciones
5. O: Menú (⋮) → **"Install app"** o **"Add to Home screen"**

---

## 🔧 Solución 2: Instalación Manual (Siempre Funciona)

Si el banner no aparece, podés instalar manualmente:

### Chrome Android:
1. Abrir la app en Chrome
2. Tocar el menú (⋮) arriba a la derecha
3. Buscar **"Install app"** o **"Add to Home screen"**
4. Confirmar → ícono aparece en home screen

### Safari iOS:
1. Abrir la app en Safari
2. Tocar el botón **"Share"** (⬆️)
3. **"Add to Home Screen"**
4. Confirmar

---

## 🔧 Solución 3: Producción (Mejor opción)

En producción con HTTPS real (no auto-firmado), el banner aparece automáticamente.

**Setup producción:**
```bash
cd /home/devuser/projects/bolsillo-claro/frontend
pnpm build

# Subir dist/ a servidor con HTTPS
# Ejemplo: https://bolsillo.tudominio.com
```

En producción, Chrome detecta automáticamente que es PWA y muestra el banner de instalación después de:
- 1º visita
- Usuario interactúa con la app (click/scroll)
- Espera ~30 segundos

---

## ✅ Verificar que PWA está configurada

### En Chrome DevTools (desktop):

1. Abrir la app en Chrome desktop
2. F12 → Tab **"Application"**
3. Sidebar → **"Manifest"**
   - ✅ Debería mostrar: Bolsillo Claro, ícono, colores, etc.
4. Sidebar → **"Service Workers"**
   - ✅ Debería mostrar: Service Worker registrado y activo

### En Chrome Android:

1. Abrir: `chrome://inspect/#service-workers`
2. Debería aparecer tu app con Service Worker activo

---

## 🐛 Troubleshooting

**"Install app" no aparece:**
- ✅ Verificar que estás en HTTPS (no HTTP)
- ✅ Verificar que Service Worker está registrado (DevTools)
- ✅ Verificar que Manifest es válido (DevTools → Application → Manifest)
- ✅ Recargar la página (puede tardar 30 seg en aparecer)
- ✅ Interactuar con la app (Chrome espera engagement)

**Certificado auto-firmado en mobile:**
- Es normal ver warning "Not secure"
- Click "Advanced" → "Proceed" para continuar
- Solo pasa en desarrollo (producción usa certificado real)

**Banner no aparece pero puedo instalar desde menú:**
- Es normal. Chrome decide cuándo mostrar el banner automático
- Siempre podés instalar desde: Menú → "Install app"

---

## 📊 Criterios de Chrome para mostrar banner

Chrome muestra el banner automáticamente SOLO si:

1. ✅ App servida por HTTPS (o localhost)
2. ✅ Manifest válido con nombre, íconos, etc.
3. ✅ Service Worker registrado y activo
4. ✅ Usuario visitó al menos 2 veces
5. ✅ Usuario interactuó con la app
6. ✅ Pasaron al menos 30 segundos desde la carga

**Conclusión:** En desarrollo, es más fácil instalar manualmente desde el menú.

---

## 🚀 Instalación Recomendada

**Para testear:**
→ Usar instalación manual (Menú → Install app)

**Para producción:**
→ Certificado HTTPS real → Banner aparece automáticamente
