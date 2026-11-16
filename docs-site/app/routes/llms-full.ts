import { docsLlms } from '@/lib/source';

/**
 * A complete Markdown version of the documentation for AI assistants and
 * offline reading. Prerendered next to `/docs/llms.txt`.
 */
export async function loader() {
  const body = await docsLlms.full();

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
