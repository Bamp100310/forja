/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

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
