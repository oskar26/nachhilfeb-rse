import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'apple-touch-icon.png', 'pwa-192x192-maskable.png', 'pwa-512x512-maskable.png'],
      manifest: {
        name: 'FWG Nachhilfebörse',
        short_name: 'Nachhilfe',
        description: 'Nachhilfe-Plattform des Friedrich-Wilhelm-Gymnasiums Köln. Finde und biete Nachhilfe direkt unter Schülern.',
        theme_color: '#facc15',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Entdecken', url: './#/', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Anzeige erstellen', url: './#/create-ad', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: { enabled: true }
    })
  ],
  test: {
    // Nur vitest-Dateien einbeziehen; test/ai-drafts.test.mjs nutzt weiterhin node:test.
    include: ['test/**/*.test.ts'],
    environment: 'node',
  }
});
