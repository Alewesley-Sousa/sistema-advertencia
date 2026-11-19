import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Fontes, favicon e ícones vêm do pacote compartilhado (único publicDir dos dois apps)
  publicDir: path.resolve(import.meta.dirname, '../../packages/shared/public'),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
    // Garante uma única cópia do React entre o app e o @force/shared
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3334',
        changeOrigin: true,
      },
    },
  },
})
