import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { glob, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';

/**
 * React Router writes asset references itself and does not pass them through
 * Vite's `renderBuiltUrl`. The runtime base stays relative so React Router's
 * data requests remain at the server root; only the prerendered HTML and the
 * client manifest are rewritten to the absolute `/docs/assets/...` URLs used
 * in production.
 */
function absoluteDocsAssets(): Plugin {
  return {
    name: 'docs-absolute-assets',
    apply: 'build',
    enforce: 'post',
    buildApp: {
      order: 'post',
      async handler() {
        const docsRoot = resolve(import.meta.dirname, 'build/client/docs');

        for await (const entry of glob('**/*.html', { cwd: docsRoot })) {
          const file = resolve(docsRoot, entry);
          const html = await readFile(file, 'utf8');
          const rewritten = html.replace(
            /(["'])\.\/assets\//g,
            '$1/docs/assets/',
          );

          if (rewritten !== html) await writeFile(file, rewritten);
        }

        // The client manifest is used for hydration-time preloads. Its asset
        // URLs are resolved against the document URL, so they need the same
        // absolute prefix as the prerendered HTML.
        const assetsRoot = resolve(import.meta.dirname, 'build/client/assets');
        for await (const entry of glob('manifest-*.js', { cwd: assetsRoot })) {
          const file = resolve(assetsRoot, entry);
          const source = await readFile(file, 'utf8');
          const rewritten = source.replaceAll('"./assets/', '"/docs/assets/');

          if (rewritten !== source) await writeFile(file, rewritten);
        }
      },
    },
  };
}

export default defineConfig(({ command }) => ({
  // In dev the app is mounted below `/docs/`, so module and HMR URLs must be
  // rooted at `/`. The build keeps a relative runtime base for React Router's
  // data requests and rewrites prerendered HTML to `/docs/assets/...` instead.
  base: command === 'serve' ? '/' : './',
  plugins: [fumadocsMdx(), tailwindcss(), reactRouter(), absoluteDocsAssets()],
  resolve: {
    tsconfigPaths: true,
  },
}));
