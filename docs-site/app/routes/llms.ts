import { docsLlms } from '@/lib/source';

/**
 * Serves the generated index as a real text file during the prerender step.
 * The docs build copies `build/client/docs` verbatim, so this ends up at
 * `/docs/llms.txt` next to the rendered documentation.
 */
export async function loader() {
  const body = await docsLlms.index();

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
