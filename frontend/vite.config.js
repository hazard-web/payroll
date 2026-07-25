import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Disable PWA entirely — the SW was intercepting /portal routes and
      // serving a blank page (the navigation fallback was denylisted for
      // /portal but the SW still claimed the client, so the network never
      // got a chance to serve Vercel's index.html rewrite).
      // For an internal payroll app, PWA is not worth the routing complexity.
      disable: true,
    }),
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
})
