import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <span className="hidden md:inline">Nachhilfebörse Dokumentation</span>
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
  };
}
