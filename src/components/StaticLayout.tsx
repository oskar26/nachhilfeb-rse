import { useEffect } from 'react';
import type * as React from 'react';
import type { JSX } from 'react/jsx-runtime';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './ui/Logo';
import SiteHeader from './SiteHeader';
import { Button } from '@/components/ui/button';

const FOOTER_LINKS: Array<[string, string]> = [
    ['Impressum', '/impressum'],
    ['Datenschutz', '/datenschutz'],
    ['Cookies', '/cookies'],
    ['Coaching-AG', '/coaching'],
    ['Nutzungsbedingungen', '/nutzungsbedingungen'],
    ['Eltern-Leitfaden', '/eltern-leitfaden'],
    ['Transparenz', '/transparenz'],
];

export default function StaticLayout({
    children,
    title,
    intro,
    titleContent,
    introContent,
    showHeader = true,
    embedded = false,
    idPrefix = '',
}: {
    children: React.ReactNode;
    title: string;
    intro?: string;
    /** Optional custom heading content (e.g. an inline editor). Falls back to `title`. */
    titleContent?: React.ReactNode;
    /** Optional custom intro content. Falls back to `intro`. */
    introContent?: React.ReactNode;
    showHeader?: boolean;
    embedded?: boolean;
    idPrefix?: string;
}): JSX.Element {
    const location = useLocation();
    const contentId = `${idPrefix}inhalt`;
    const hasCustomIntro = introContent !== undefined;
    const introContentValue = hasCustomIntro ? introContent : intro;

    // Öffentliche Unterseiten starten nach einem Routenwechsel oben. Ausnahmen:
    // eingebettete Vorschauen und gezielte Sprünge zu Abschnitten (z. B.
    // aus der App), die die Zielseite selbst scrollt.
    useEffect(() => {
        if (embedded) return;
        const section = (location.state as { section?: string } | null)?.section;
        if (section) return;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [embedded, location.pathname, location.state]);

    const pageHeader = showHeader ? (
        <div className="border-b border-border bg-muted/40 text-foreground">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
                <h1 id={`${idPrefix}page-title`} className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
                    {titleContent !== undefined ? titleContent : (title || <span className="sr-only">Seitentitel</span>)}
                </h1>
                {hasCustomIntro || intro ? (
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                        {introContentValue}
                    </p>
                ) : null}
            </div>
        </div>
    ) : null;
    const pageContent = (
        <div className={`relative z-10${embedded ? '' : ' pt-8 sm:pt-10'}`}>
            {children}
        </div>
    );
    const shellClass = 'bg-background font-sans text-foreground';

    if (embedded) {
        return (
            <div className={`${shellClass} min-h-0`}>
                {pageHeader}
                {pageContent}
            </div>
        );
    }

    return (
        <div className={`${shellClass} flex min-h-dvh flex-col`}>
            <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => {
                    const el = document.getElementById(contentId) as HTMLElement | null;
                    if (!el) return;
                    const reduce = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
                    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
                }}
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground"
            >
                Zum Inhalt springen
            </Button>

            <SiteHeader />

            <main id={contentId} tabIndex={-1} className="flex-1 bg-background focus:outline-none">
                {pageHeader}
                {pageContent}
            </main>

            <footer className="border-t border-border bg-background text-muted-foreground">
                <div className="mx-auto max-w-7xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-12 sm:px-6 sm:pt-14">
                    <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                        <div className="flex items-center gap-3">
                            <Logo size={26} className="shrink-0 text-primary" />
                            <div className="min-w-0">
                                <p className="text-lg font-semibold leading-none text-foreground">Nachhilfebörse</p>
                                <p className="mt-1 text-xs font-medium">Nachhilfebörse der Schülervertretung am FWG.</p>
                            </div>
                        </div>
                        <nav className="flex flex-wrap gap-x-5 gap-y-0 text-sm font-medium" aria-label="Rechtliches und Infos">
                            {FOOTER_LINKS.map(([label, path]) => (
                                <Link key={path} to={path} className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-8 flex flex-col justify-between gap-3 border-t border-border pt-6 text-xs sm:flex-row">
                        <p>© Schülervertretung Friedrich-Wilhelm-Gymnasium Köln {new Date().getFullYear()}.</p>
                        <p className="tabular-nums">Hosting in Deutschland · DSGVO-konform</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
