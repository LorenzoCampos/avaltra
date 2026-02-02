# PWA Icons - ✅ INSTRUCCIONES

## Estado: Pendiente para producción

Los íconos actuales son placeholders SVG. Para producción, seguí estas opciones:

### ⚡ Opción 1: Online (RECOMENDADO - 5 minutos)
1. Ir a **https://realfavicongenerator.net/**
2. Subir un logo/ícono de 512x512 (PNG con fondo azul)
3. Generar y descargar
4. Copiar `pwa-192x192.png` y `pwa-512x512.png` a `public/`
5. Listo!

### 🎨 Opción 2: Crear logo custom en Figma/Canva
1. Diseñar logo cuadrado 512x512
2. Fondo: Gradiente azul (#3B82F6 → #1E40AF)
3. Ícono: Billetera + símbolo $
4. Exportar como PNG
5. Usar **https://realfavicongenerator.net/** para generar todas las variantes

### 🖼️ Opción 3: Con ImageMagick (local - si tenés instalado)
```bash
# Convertir SVG actual a PNG
convert -background "#3B82F6" -size 512x512 public/pwa-icon.svg public/pwa-512x512.png
convert -background "#3B82F6" -size 192x192 public/pwa-icon.svg public/pwa-192x192.png
```

---

## Prioridad: BAJA
Esto NO bloquea funcionalidad, solo mejora el aspecto cuando se instala como PWA.
Los SVG actuales funcionan perfectamente en desarrollo.
