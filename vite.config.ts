/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // En GitHub Pages el sitio vive en /forja/. El workflow o entorno define VITE_BASE_PATH.
  const base = env.VITE_BASE_PATH || (mode === 'production' ? '/forja/' : '/')

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'FORJA — Taller financiero',
          short_name: 'FORJA',
          description: 'Finanzas personales, ingresos de moto, deudas y préstamos en un solo taller.',
          lang: 'es-CO',
          theme_color: '#0e1312',
          background_color: '#0e1312',
          display: 'standalone',
          orientation: 'any',
          start_url: '.',
          scope: '.',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Solo recursos estáticos del build. Las respuestas de Supabase (datos
          // financieros privados) NUNCA se guardan en caché.
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: 'index.html',
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts'
            if (id.includes('node_modules/@supabase')) return 'supabase'
            return undefined
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'supabase/tests/**/*.test.ts'],
      testTimeout: 30_000,
      hookTimeout: 60_000,
    },
  }
})
