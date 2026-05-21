import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const __dirname = new URL('.', import.meta.url).pathname

export default defineConfig({
  root: resolve(__dirname, 'admin'),
  publicDir: resolve(__dirname, 'public'),
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist',
  },
})
