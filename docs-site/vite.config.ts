import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';

export default defineConfig({
  // Relative asset paths plus <base href="/docs/"> in the document head let the
  // docs live in a subfolder without absolute root-relative asset URLs.
  base: './',
  plugins: [fumadocsMdx(), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
});
