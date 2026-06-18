import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'PaySlip Pro',
        short_name: 'PaySlip',
        description: 'Professional Payroll Management System',
        theme_color: '#0a0d0a',
        background_color: '#0a0d0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: '/index.html',
        // Deny SW interception for API calls AND all portal routes
        navigateFallbackDenylist: [/^\/api/, /^\/portal/],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
})
