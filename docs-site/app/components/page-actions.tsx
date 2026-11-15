'use client';

import { Check, Copy, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'error';

async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the textarea path for browsers that block the
      // asynchronous clipboard API (for example an insecure origin).
    }
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.inset = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);

  try {
    area.select();
    const copied = document.execCommand('copy');
    if (!copied) throw new Error('Kopieren fehlgeschlagen');
  } finally {
    area.remove();
  }
}

export function PageActions({ markdown }: { markdown: string }) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeout.current) window.clearTimeout(timeout.current);
    };
  }, []);

  async function copyPage() {
    if (timeout.current) window.clearTimeout(timeout.current);

    try {
      await writeToClipboard(markdown);
      setCopyState('copied');
      timeout.current = window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      timeout.current = window.setTimeout(() => setCopyState('idle'), 3000);
    }
  }

  const copyLabel =
    copyState === 'copied'
      ? 'Kopiert'
      : copyState === 'error'
        ? 'Kopieren fehlgeschlagen'
        : 'Seite kopieren';

  return (
    <div className="docs-page-actions" role="group" aria-label="Seitenaktionen">
      <button
        type="button"
        className="docs-action"
        onClick={copyPage}
        title="Seite als Markdown in die Zwischenablage kopieren"
      >
        {copyState === 'copied' ? (
          <Check aria-hidden="true" className="docs-action-icon" strokeWidth={2.25} />
        ) : (
          <Copy aria-hidden="true" className="docs-action-icon" strokeWidth={2} />
        )}
        <span>{copyLabel}</span>
      </button>
      <button
        type="button"
        className="docs-action"
        onClick={() => window.print()}
        title="Diese Seite drucken"
      >
        <Printer aria-hidden="true" className="docs-action-icon" strokeWidth={2} />
        <span>Drucken</span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copyState === 'copied'
          ? 'Seite als Markdown kopiert.'
          : copyState === 'error'
            ? 'Kopieren nicht möglich. Bitte markiere den Text manuell.'
            : ''}
      </span>
    </div>
  );
}
