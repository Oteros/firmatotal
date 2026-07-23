import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      crypto: path.resolve(projectRoot, 'src/shims/empty-crypto.js'),
      'node:crypto': path.resolve(projectRoot, 'src/shims/empty-crypto.js'),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1300,
  },
})
