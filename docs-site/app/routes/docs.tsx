import type { Route } from './+types/docs';
import { useBreadcrumb } from 'fumadocs-core/breadcrumb';
import { usePathname } from 'fumadocs-core/framework';
import { Link } from 'fumadocs-core/link';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  type BreadcrumbProps,
} from 'fumadocs-ui/layouts/docs/page';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import { ChevronRight } from 'lucide-react';
import { docs, source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { useMDXComponents } from '@/components/mdx';
import { PageActions } from '@/components/page-actions';
import {
  DocsCollapsedControls,
  DocsMobileBackToTop,
  DocsTocBackToTop,
  DocsTocSpy,
} from '@/components/docs-controls';
import { use, type ComponentProps } from 'react';

function Table(props: ComponentProps<'table'>) {
  return (
    <div className="docs-table-scroll" tabIndex={0} role="region" aria-label="Tabelle">
      <table {...props} />
    </div>
  );
}

function DocsBreadcrumb({
  includeRoot: _includeRoot,
  includeSeparator: _includeSeparator,
  includePage: _includePage,
  className,
  ...props
}: BreadcrumbProps) {
  const pathname = usePathname();
  const { full } = useTreeContext();
  const items = useBreadcrumb(pathname, full, { includePage: true });
  const trail = items.filter((item) => item.url !== '/docs');

  return (
    <nav
      {...props}
      aria-label="Brotkrumen"
      className={['docs-breadcrumb', className].filter(Boolean).join(' ')}
    >
      <ol>
        <li>
          {trail.length === 0 ? (
            <span aria-current="page">Dokumentation</span>
          ) : (
            <Link href="/docs">Dokumentation</Link>
          )}
        </li>
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;

          return (
            <li key={`${item.url ?? 'eintrag'}-${index}`}>
              <ChevronRight aria-hidden="true" className="docs-breadcrumb-separator" />
              {isLast || !item.url ? (
                <span aria-current={isLast ? 'page' : undefined}>{item.name}</span>
              ) : (
                <Link href={item.url}>{item.name}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    path: page.path,
    markdown: await page.data.getText('processed'),
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
}

function Content({ path, markdown }: { path: string; markdown: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const Mdx = page.body;

  return (
    <DocsPage
      toc={toc}
      slots={{ breadcrumb: DocsBreadcrumb }}
      tableOfContent={{
        // A single active anchor keeps one TOC pill on the section the reader
        // clicked, instead of marking every heading visible in the viewport.
        single: true,
        container: { role: 'navigation', 'aria-labelledby': 'toc-title' },
        footer: <DocsTocBackToTop />,
      }}
    >
      <DocsCollapsedControls />
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <div className="docs-page-title-row">
        <DocsTitle>{page.title}</DocsTitle>
        <div className="hidden md:block">
          <PageActions markdown={markdown} />
        </div>
      </div>
      <DocsDescription>{page.description}</DocsDescription>
      <div className="mt-3 md:hidden">
        <PageActions markdown={markdown} />
      </div>
      <DocsBody>
        <Mdx components={{ ...useMDXComponents(), table: Table }} />
        <footer className="not-prose mt-12 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-fd-border pt-4 text-[13px] text-fd-muted-foreground">
          <span>Stand: November 2026</span>
          <span aria-hidden>·</span>
          <a
            href="mailto:info@nachhilfe-sv.de?subject=Feedback%20zur%20Dokumentation"
            className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-fd-foreground"
          >
            Feedback zur Dokumentation
          </a>
          <span aria-hidden>·</span>
          <a
            href="/docs/llms.txt"
            className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-fd-foreground"
            title="Die Dokumentation als llms.txt für KI-Assistenten"
          >
            llms.txt für KI-Assistenten
          </a>
          <span aria-hidden>·</span>
          <a
            href="/docs/llms-full.txt"
            className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-fd-foreground"
            title="Alle Dokumentationsseiten als eine Markdown-Datei"
          >
            Vollständige Markdown-Fassung
          </a>
        </footer>
      </DocsBody>
      <DocsMobileBackToTop />
      <DocsTocSpy />
    </DocsPage>
  );
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { pageTree, path, markdown } = useFumadocsLoader(loaderData);

  return (
    <DocsLayout
      {...baseOptions()}
      tree={pageTree}
      sidebar={{
        footer: (
          <a href="/" className="platform-cta platform-cta-footer">
            Zur Plattform
          </a>
        ),
      }}
    >
      <Content path={path} markdown={markdown} />
    </DocsLayout>
  );
}
