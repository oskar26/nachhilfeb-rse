import type { Config } from '@react-router/dev/config';
import { glob } from 'node:fs/promises';
import { getSlugs } from 'fumadocs-core/source';

export default {
  ssr: false,
  async prerender({ getStaticPaths }) {
    const paths = new Set(getStaticPaths());

    for await (const entry of glob('**/*.{md,mdx}', { cwd: 'content/docs' })) {
      const slugs = getSlugs(entry);
      paths.add(`/docs${slugs.length > 0 ? `/${slugs.join('/')}` : ''}`);
    }

    return [...paths];
  },
} satisfies Config;
