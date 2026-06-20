import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'FWG Nachhilfebörse',
        short_name: 'Nachhilfe',
        description: 'Nachhilfe-Plattform des Friedrich-Wilhelms-Gymnasiums Köln. Finde und biete Nachhilfe direkt unter Schülern.',
        theme_color: '#6366f1',
        background_color: '#f8f9fa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        shortcuts: [
          { name: 'Entdecken', url: '/', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Anzeige erstellen', url: '/create-ad', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] }
        ]
      },
      devOptions: { enabled: true }
    })
  ]
});
