import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { DocsThemeSwitch } from '@/components/theme-switch';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <span className="hidden items-center gap-2 md:inline-flex">
            Nachhilfebörse
            <span className="rounded-full border border-fd-border px-2 py-0.5 text-[10px] leading-none font-semibold tracking-wide text-fd-muted-foreground">
              Doku
            </span>
          </span>
          <span className="md:hidden">Dokumentation</span>
        </>
      ),
      url: '/docs',
      children: (
        <a href="/" className="platform-cta">
          <span className="hidden md:inline">Zur Plattform</span>
          <span className="md:hidden">Plattform</span>
        </a>
      ),
    },
    slots: {
      themeSwitch: DocsThemeSwitch,
    },
  };
}
