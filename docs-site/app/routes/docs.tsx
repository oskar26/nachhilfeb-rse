import type { Route } from './+types/docs';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { docs, source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { useMDXComponents } from '@/components/mdx';
import { use, type ComponentProps } from 'react';

function Table(props: ComponentProps<'table'>) {
  return (
    <div className="docs-table-scroll" tabIndex={0}>
      <table {...props} />
    </div>
  );
}

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    path: page.path,
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
}

function Content({ path }: { path: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const Mdx = page.body;

  return (
    <DocsPage toc={toc}>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <DocsBody>
        <Mdx components={{ ...useMDXComponents(), table: Table }} />
        <footer className="not-prose mt-12 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-fd-border pt-4 text-[13px] text-fd-muted-foreground">
          <span>Stand: November 2026</span>
          <span aria-hidden>·</span>
          <a
            href="mailto:info@nachhilfe-sv.de?subject=Feedback%20zur%20Dokumentation"
            className="underline underline-offset-2 hover:text-fd-foreground"
          >
            Feedback zur Dokumentation
          </a>
        </footer>
      </DocsBody>
    </DocsPage>
  );
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { pageTree, path } = useFumadocsLoader(loaderData);

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      <Content path={path} />
    </DocsLayout>
  );
}
