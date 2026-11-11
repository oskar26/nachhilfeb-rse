import { Button } from '@/components/ui/button';
import type * as React from 'react';
import type { JSX } from 'react/jsx-runtime';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Logo } from './ui/Logo';
import SiteHeader from './SiteHeader';

const easeOut = [0.16, 1, 0.3, 1] as const;

const FOOTER_LINKS: Array<[string, string]> = [
    ['Impressum', '/impressum'],
    ['Datenschutz', '/datenschutz'],
    ['Cookies', '/cookies'],
    ['Coaching-AG', '/coaching'],
    ['Nutzungsbedingungen', '/nutzungsbedingungen'],
    ['Eltern-Leitfaden', '/eltern-leitfaden'],
    ['Transparenz', '/transparenz'],
];

// Spacing-Scale (4er-Basis, dokumentiert — keine One-off-Werte):
// tight-innen: gap-3 (12) / gap-4 (16) · Leseeinheit: gap-4/5 (16/20)
// Sektion: gap-10 (40) / sm:gap-12 (48) · Header-Overlap: -mt-8 (32) / sm:-mt-12 (48)
// Muster Header→Content (alle StaticLayout-Seiten): bewusstes Overlap —
// heller Papier-Header mit tiefer Unterkante (pb-16/24), Content zieht per
// -mt-8/12 darüber, erste Card mit Radius + Schatten klebt wie ein Plakat.
// Kein Karten-Wrapper um children (keine verschachtelten Cards).
export default function StaticLayout({ children, title, intro, showHeader = true, embedded = false, idPrefix = '' }: { children: React.ReactNode; title: string; intro?: string; showHeader?: boolean; embedded?: boolean; idPrefix?: string }): JSX.Element {
    const reduceMotion = useReducedMotion();
    /* Poster-Header-Einzug: H1 als Line-Wipe (Siebdruck-Zug), Akzentlinie zieht nach,
       Intro blendet ein — die Content-Cards darunter gleiten per eigenem anim() herein. */
    const posterH1 = reduceMotion ? {} : {
        initial: { clipPath: 'inset(-14% 100% -26% 0)' },
        animate: { clipPath: 'inset(-14% -8% -26% 0)' },
        transition: { duration: 0.65, ease: easeOut },
    };
    const posterBar = reduceMotion ? {} : {
        initial: { scaleX: 0 },
        animate: { scaleX: 1 },
        transition: { duration: 0.5, delay: 0.2, ease: easeOut },
    };
    const posterIntro = reduceMotion ? {} : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: 0.3, ease: easeOut },
    };
    const contentId = `${idPrefix}inhalt`;
    const pageHeader = showHeader ? (
        <div className="relative overflow-hidden border-b border-border bg-background text-foreground">
            <div className="absolute inset-0 poster-grain-dark dark:opacity-30" aria-hidden />
            <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
                <motion.h1
                    {...posterH1}
                    id={`${idPrefix}page-title`}
                    className="max-w-4xl text-balance break-words font-display uppercase leading-[0.95] tracking-tight text-[clamp(2.25rem,9vw,3.5rem)] sm:text-6xl"
                >
                    {title || <span className="sr-only">Seitentitel</span>}
                </motion.h1>
                <motion.span {...posterBar} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary sm:w-20" aria-hidden />
                {intro ? (
                    <motion.p
                        {...posterIntro}
                        className="mt-5 max-w-2xl text-base leading-relaxed tabular-nums text-muted-foreground sm:text-lg"
                    >
                        {intro}
                    </motion.p>
                ) : null}
            </div>
        </div>
    ) : null;
    const pageContent = (
        <div className={showHeader ? 'relative z-10 -mt-8 sm:-mt-12' : 'relative z-10 pt-8 sm:pt-12'}>
            {children}
        </div>
    );
    const shellClass = 'bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground';

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
            {/* Skip-Link als Scroll-Button: reines href="#inhalt" wäre unter HashRouter eine 404-Route. */}
            <Button variant="unstyled" size="unstyled" type="button" onClick={() => { const el = document.getElementById(contentId) as HTMLElement | null; if (!el) return; const reduce = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); try { el.focus({ preventScroll: true }); } catch { el.focus(); } }} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground">Zum Inhalt springen</Button>

            <SiteHeader />

            {/* Inhalt */}
            <main id={contentId} tabIndex={-1} className="flex-1 bg-background focus:outline-none">
                {pageHeader}
                {pageContent}
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-background text-muted-foreground">
                <div className="mx-auto max-w-7xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-12 sm:px-6 sm:pt-14">
                    <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                        <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Logo size={24} /></span>
                            <div className="min-w-0">
                                <p className="font-display uppercase text-2xl leading-none text-foreground">Nachhilfebörse</p>
                                <p className="mt-1 text-xs font-semibold">Nachhilfebörse der Schülervertretung am FWG.</p>
                            </div>
                        </div>
                        <nav className="flex flex-wrap gap-x-5 gap-y-0 text-sm font-semibold" aria-label="Rechtliches und Infos">
                            {FOOTER_LINKS.map(([label, path]) => (
                                <Link key={path} to={path} className="inline-flex min-h-11 items-center rounded-full transition-colors hover:text-foreground">
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-8 flex flex-col justify-between gap-3 border-t border-border pt-6 text-xs sm:flex-row">
                        <p>© Schülervertretung Friedrich-Wilhelm-Gymnasium Köln {new Date().getFullYear()}.</p>
                        <p className="font-mono tabular-nums">Hosting in Deutschland · DSGVO-konform</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
