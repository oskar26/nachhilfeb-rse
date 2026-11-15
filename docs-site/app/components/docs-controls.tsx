'use client';

import { useSidebar } from 'fumadocs-ui/components/sidebar/base';
import { SearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { ArrowUp, PanelLeftOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * The built-in collapsed panel uses the "Collapse Sidebar" label even when the
 * sidebar is closed and its buttons are only 30px high. Replace it with a
 * labelled 44px control that also keeps search within reach.
 */
export function DocsCollapsedControls() {
  const { collapsed, setCollapsed, mode } = useSidebar();

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
    <div className="docs-collapsed-controls" role="group" aria-label="Dokumentation">
      <button
        type="button"
        aria-label="Seitenleiste ausklappen"
        aria-expanded={false}
        aria-controls="nd-sidebar"
        title="Seitenleiste ausklappen"
        onClick={expandSidebar}
      >
        <PanelLeftOpen aria-hidden="true" strokeWidth={2} />
      </button>
      <SearchTrigger />
    </div>
  );
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
