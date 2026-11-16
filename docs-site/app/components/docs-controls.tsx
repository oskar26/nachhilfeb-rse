'use client';

import { useSidebar } from 'fumadocs-ui/components/sidebar/base';
import { Link } from 'fumadocs-core/link';
import { SearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { ArrowUp, BookOpen, House, PanelLeftOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DocsThemeSwitch } from '@/components/theme-switch';

/**
 * A slim rail instead of the built-in off-canvas rectangle. It keeps the docs
 * identity, expand, search, theme, and the platform exit reachable without
 * leaving an empty white strip and two floating circles behind.
 */
export function DocsCollapsedControls() {
  const { collapsed, setCollapsed, mode } = useSidebar();
  const expandRef = useRef<HTMLButtonElement>(null);

  // Collapsing makes the sidebar trigger inert, so the browser drops focus to
  // <body>. Move it to the newly mounted expand control instead.
  useEffect(() => {
    if (collapsed && mode === 'full') expandRef.current?.focus();
  }, [collapsed, mode]);

  if (!collapsed || mode !== 'full') return null;

  function expandSidebar() {
    setCollapsed(false);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>('#nd-sidebar button[aria-controls="nd-sidebar"]')
        ?.focus();
    });
  }

  return (
    <nav className="docs-rail" aria-label="Dokumentationswerkzeuge">
      <div className="docs-rail-top">
        <Link href="/docs" className="docs-rail-action" aria-label="Dokumentation Startseite">
          <BookOpen aria-hidden="true" strokeWidth={2} />
        </Link>
        <span className="docs-rail-divider" aria-hidden="true" />
        <button
          ref={expandRef}
          type="button"
          className="docs-rail-action"
          aria-label="Seitenleiste ausklappen"
          aria-expanded={false}
          aria-controls="nd-sidebar"
          title="Seitenleiste ausklappen"
          onClick={expandSidebar}
        >
          <PanelLeftOpen aria-hidden="true" strokeWidth={2} />
        </button>
        <div className="docs-rail-search">
          <SearchTrigger />
        </div>
      </div>
      <div className="docs-rail-bottom">
        <DocsThemeSwitch />
        <a
          href="/"
          className="docs-rail-action"
          aria-label="Zur Plattform"
          title="Zur Plattform"
        >
          <House aria-hidden="true" strokeWidth={2} />
        </a>
      </div>
    </nav>
  );
}

/**
 * Fumadocs marks every heading that crosses its 90% viewport threshold as
 * active. With `single` that keeps a parent section highlighted while its
 * children scroll past, then jumps to the next parent. This small spy instead
 * follows the deepest heading above a reading line, so the TOC always names
 * the section the reader is actually in.
 */
export function DocsTocSpy() {
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const headings = Array.from(
        document.querySelectorAll<HTMLElement>('#nd-page :is(h2, h3)[id]'),
      );
      if (headings.length === 0) return;

      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          '#nd-toc a[href^="#"], [data-toc-popover] a[href^="#"]',
        ),
      );
      const readingLine = Math.max(96, Math.min(168, window.innerHeight * 0.16));
      let activeId: string | null = null;

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= readingLine) activeId = heading.id;
        else break;
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) activeId = headings.at(-1)?.id ?? activeId;

      for (const link of links) {
        let target = link.hash.slice(1);
        try {
          target = decodeURIComponent(target);
        } catch {
          // Keep the raw fragment if the browser encoded something unusual.
        }
        const active = target === activeId;
        if (active) link.setAttribute('data-docs-active', 'true');
        else link.removeAttribute('data-docs-active');
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    };

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('hashchange', schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      observer.disconnect();
    };
  }, []);

  return null;
}

function scrollToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

/** Always-visible "back to top" action at the bottom of the desktop TOC. */
export function DocsTocBackToTop() {
  return (
    <button type="button" className="docs-toc-top" onClick={scrollToTop}>
      <ArrowUp aria-hidden="true" className="docs-toc-top-icon" strokeWidth={2} />
      <span>Zum Seitenanfang</span>
    </button>
  );
}

/** Floating variant for viewports where the TOC (and its footer) is hidden. */
export function DocsMobileBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 480);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <button
      type="button"
      className="docs-back-to-top"
      data-visible={visible}
      aria-label="Zum Seitenanfang"
      title="Zum Seitenanfang"
      onClick={scrollToTop}
    >
      <ArrowUp aria-hidden="true" className="size-5" strokeWidth={2} />
    </button>
  );
}
