import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
// import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

import { BRAND } from './src/lib/brand'

const publicAsset = (assetUrl: string) => assetUrl.replace(/^\//, '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    // basicSsl(), // HTTPS comentado - descomenta en producción para PWA
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [publicAsset(BRAND.assets.iconSvg), publicAsset(BRAND.assets.iconPng)],
      manifest: {
        name: BRAND.name,
        short_name: BRAND.name,
        description: BRAND.tagline,
        theme_color: BRAND.colors.trustBlue,
        background_color: BRAND.colors.white,
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: publicAsset(BRAND.assets.iconSvg),
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: publicAsset(BRAND.assets.iconPng),
            sizes: '795x620',
            type: 'image/png'
          },
          {
            src: publicAsset(BRAND.assets.iconSvg),
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: publicAsset(BRAND.assets.iconSvg),
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: publicAsset(BRAND.assets.iconPng),
            sizes: '795x620',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: publicAsset(BRAND.assets.iconPng),
            sizes: '795x620',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: publicAsset(BRAND.assets.wordmarkSvg),
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: publicAsset(BRAND.assets.wordmarkPng),
            sizes: '2930x648',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Cache de assets estáticos
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: true, // Habilitar PWA en dev mode
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Escucha en todas las interfaces (red local)
    port: 5173,
    strictPort: true,
    open: false, // No abrir browser automáticamente
    // https: true, // Comentado - descomenta en producción para PWA
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
