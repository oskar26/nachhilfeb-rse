import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { demoApiPlugin } from './scripts/demo-api-plugin.mjs';

// Dev-only config for browsing every app page with the fictional demo data.
// It intentionally omits PWA/docs so no service worker or docs middleware
// interferes with the mocked API.
export default defineConfig({
    base: './',
    resolve: {
        alias: {
            '@': path.resolve(process.cwd(), 'src'),
        },
    },
    plugins: [react(), tailwindcss(), demoApiPlugin()],
    server: {
        port: 5182,
        strictPort: true,
    },
});
