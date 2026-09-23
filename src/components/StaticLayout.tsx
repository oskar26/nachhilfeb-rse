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
    ['Schüler-Coaching', '/coaching'],
    ['Nutzungsbedingungen', '/nutzungsbedingungen'],
    ['Eltern-Leitfaden', '/eltern-leitfaden'],
    ['Transparenz', '/transparenz'],
];

// Spacing-Scale (4er-Basis, dokumentiert — keine One-off-Werte):
// tight-innen: gap-3 (12) / gap-4 (16) · Leseeinheit: gap-4/5 (16/20)
// Sektion: gap-10 (40) / sm:gap-12 (48) · Header-Overlap: -mt-8 (32) / sm:-mt-12 (48)
// Muster Header→Content (alle StaticLayout-Seiten): bewusstes Overlap —
// schwarzer Poster-Header mit tiefer Unterkante (pb-16/24), Content zieht per
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
        <div className="relative overflow-hidden bg-black text-white border-b border-white/10">
            <div className="absolute inset-0 poster-grain" aria-hidden />
            <div className="absolute inset-0 board-vignette pointer-events-none" aria-hidden />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-14 sm:pt-16 sm:pb-20">
                <motion.h1
                    {...posterH1}
                    id={`${idPrefix}page-title`}
                    className="max-w-4xl text-balance font-display uppercase leading-[0.95] tracking-tight text-[clamp(2.5rem,10vw,3.5rem)] sm:text-6xl"
                >
                    {title || <span className="sr-only">Seitentitel</span>}
                </motion.h1>
                <motion.span {...posterBar} className="mt-4 block h-1.5 w-16 sm:w-20 origin-left rounded-full bg-primary" aria-hidden />
                {intro ? (
                    <motion.p
                        {...posterIntro}
                        className="mt-5 max-w-2xl text-lg leading-relaxed tabular-nums text-gray-100"
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
    const shellClass = 'bg-gray-50 font-sans text-gray-900 selection:bg-primary selection:text-black dark:bg-gray-950 dark:text-gray-100';

    if (embedded) {
        return (
            <div className={`${shellClass} min-h-0`}>
                {pageHeader}
                {pageContent}
            </div>
        );
    }

    return (
        <div className={`${shellClass} min-h-screen`}>
            {/* Skip-Link als Scroll-Button: reines href="#inhalt" wäre unter HashRouter eine 404-Route. */}
            <button type="button" onClick={() => { const el = document.getElementById(contentId) as HTMLElement | null; if (!el) return; const reduce = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); try { el.focus({ preventScroll: true }); } catch { el.focus(); } }} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-black">Zum Inhalt springen</button>

            <SiteHeader />

            {/* Inhalt */}
            <main id={contentId} tabIndex={-1} className="bg-gray-50 focus:outline-none dark:bg-gray-950">
                {pageHeader}
                {pageContent}
            </main>

            {/* Footer */}
            <footer className="bg-black text-gray-400 border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <span className="grid place-items-center w-11 h-11 rounded-xl bg-primary text-black"><Logo size={26} /></span>
                            <div>
                                <p className="font-display uppercase text-2xl text-white leading-none">Nachhilfebörse</p>
                                <p className="mt-1 text-xs font-semibold">Die clevere Art, am FWG zu lernen.</p>
                            </div>
                        </div>
                        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Rechtliches und Infos">
                            {FOOTER_LINKS.map(([label, path]) => (
                                <Link key={path} to={path} className="hover:text-primary transition-colors">{label}</Link>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                        <p>© Schülervertretung Friedrich-Wilhelm-Gymnasium Köln {new Date().getFullYear()}.</p>
                        <p className="font-mono tabular-nums">Hosting in Deutschland · DSGVO-konform</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
