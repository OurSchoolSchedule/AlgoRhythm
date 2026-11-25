/// <reference types="vitest/config" />
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function devProxy(mode) {
  const { API_PROXY_TARGET } = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'API_PROXY_')
  const upstream = { target: API_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true }
  return { '/api': upstream, '/oauth2': upstream }
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Vitest 3 transforms legacy .jsx through Vite 7's esbuild pipeline.
  ...(process.env.VITEST ? { esbuild: { jsx: 'automatic' } } : {}),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: devProxy(mode),
  },
  test: {
    environment: 'node',
    globals: true,
    include: mode === 'school42-local'
      ? ['src/test/school42.local.ts']
      : ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
}))
