# PWA Icons - TODO

## Generar íconos PWA correctos:

Los íconos actuales son placeholders SVG. Para producción, necesitás generar PNGs:

### Opción 1: Online (rápido)
1. Ir a https://realfavicongenerator.net/
2. Subir un logo/ícono de 512x512 (PNG con fondo)
3. Generar y descargar
4. Copiar `pwa-192x192.png` y `pwa-512x512.png` a `public/`

### Opción 2: Con ImageMagick (local)
```bash
# Instalar ImageMagick
sudo apt install imagemagick  # Linux
brew install imagemagick      # Mac

# Convertir SVG a PNG
convert -background "#3B82F6" -size 512x512 pwa-icon.svg pwa-512x512.png
convert -background "#3B82F6" -size 192x192 pwa-icon.svg pwa-192x192.png
```

### Opción 3: Diseño Custom (recomendado)
1. Crear un diseño en Figma/Canva
2. Exportar como PNG 512x512
3. Usar herramienta online para generar todos los tamaños
