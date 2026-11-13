import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const DOCS_ROOT = path.resolve(__dirname, 'dist/docs');
const DOCS_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.data': 'application/octet-stream',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function docsDevServer(): Plugin {
  return {
    name: 'docs-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url !== '/docs' && !url.startsWith('/docs/')) return next();
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        let rel = url.slice('/docs'.length);
        try {
          rel = decodeURIComponent(rel);
        } catch {
          return next();
        }
        if (!rel || rel === '/') rel = '/index.html';

        let file = path.resolve(DOCS_ROOT, `.${rel}`);
        if (!file.startsWith(DOCS_ROOT + path.sep)) return next();

        try {
          if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        } catch {
          const html = path.join(file, 'index.html');
          if (!fs.existsSync(html)) return next();
          file = html;
        }
        if (!fs.existsSync(file)) return next();

        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, {
          'Content-Type': DOCS_TYPES[ext] ?? 'application/octet-stream',
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    docsDevServer(),
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
        // Die Dokumentation liegt als eigener statischer Ordner unter /docs.
        // Der App-Fallback darf diese Pfade nicht auf die SPA umleiten.
        navigateFallbackDenylist: [/^\/docs(?:\/|$)/],
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
