import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1000 },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
})
