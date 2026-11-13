import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Nachhilfebörse Dokumentation';
export const docsRoute = '/docs';
export const docsContentRoute = '/llms.mdx/docs';

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const getContentUrl = createGetUrl(docsContentRoute);
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getContentUrl(segments, page.locale) };
}
