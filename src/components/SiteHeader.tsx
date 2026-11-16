import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Menu, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Logo } from './ui/Logo';
import { m, prefersReducedMotion, SPRING } from '../lib/motion';
import { triggerHaptic } from '../lib/haptics';
import { useAuth } from '../context/AuthContext';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

type NavItem = { label: string; to: string; section?: string };

const NAV_ITEMS: NavItem[] = [
    { label: 'Start', to: '/welcome' },
    { label: 'Suchen & Anbieten', to: '/welcome', section: 'wege' },
    { label: 'Die App', to: '/welcome', section: 'brett' },
    { label: 'Coaching-AG', to: '/coaching' },
    { label: 'Eltern', to: '/eltern-leitfaden' },
];

const MOBILE_NAV: NavItem[] = NAV_ITEMS.map((item) => {
    if (item.to === '/coaching') return { ...item, label: 'Coaching' };
    if (item.to === '/eltern-leitfaden') return { ...item, label: 'Eltern-Leitfaden' };
    return item;
});

/* Die Wortmarke ist ein eigener Motion-Bereich: Beim Hover kippt das Logo
   kurz an, beim Tippen federt es zurück. Der Link selbst hebt sich nur um
   einen Pixel, damit die Navigation ruhig bleibt. */
const HeaderLink = motion.create(Link);

const LOGO_LINK_VARIANTS = {
    hover: { y: -1 },
    press: { scale: 0.985 },
};

const LOGO_MARK_VARIANTS = {
    hover: { rotate: -7, scale: 1.09 },
    press: { rotate: 3, scale: 0.92 },
};

function scrollToSection(id: string): void {
    const scrollNow = () => {
        const el = document.getElementById(id);
        if (!el) return false;
        // Die Abschnitte tragen scroll-mt-28; scrollIntoView übernimmt damit
        // denselben Abstand wie die CSS-Sprungmarken unter dem Sticky-Header.
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        return true;
    };
    if (scrollNow()) return;
    let tries = 0;
    const retry = () => {
        if (scrollNow() || tries >= 30) return;
        tries += 1;
        window.requestAnimationFrame(retry);
    };
    window.requestAnimationFrame(retry);
}

export default function SiteHeader() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const reduceMotion = useReducedMotion();
    const onWelcomePage = location.pathname === '/welcome' || location.pathname === '/landing';
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setActiveSection(null);
        });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!onWelcomePage) return;
        const ids = ['wege', 'brett', 'sicher', 'coaching', 'eltern'];
        const sections = ids
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => Boolean(el));
        if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver((entries) => {
            // Bei zwei gleichzeitig sichtbaren Abschnitten gewinnt der untere
            // (zuletzt erreichte) Abschnitt, nicht der flächenmäßig größere.
            const visible = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top)[0];
            if (visible) setActiveSection(visible.target.id);
        }, { rootMargin: '-32% 0px -58% 0px', threshold: [0, 0.1, 0.5] });
        sections.forEach((section) => io.observe(section));
        return () => io.disconnect();
    }, [onWelcomePage]);

    const closeMenu = useCallback(() => {
        setMenuOpen(false);
    }, []);

    const [prevPath, setPrevPath] = useState(location.pathname);
    if (prevPath !== location.pathname) {
        setPrevPath(location.pathname);
        setMenuOpen(false);
        setActiveSection(null);
    }

    useEffect(() => {
        if (!menuOpen || typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(min-width: 1024px)');
        const onChange = () => {
            if (!mq.matches) return;
            setMenuOpen(false);
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [menuOpen]);

    const isPlainClick = (e: MouseEvent<HTMLAnchorElement>) =>
        e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

    const goSection = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
        // Modifier- und Mittelklicks nicht abfangen: Der Browser öffnet dann
        // wie gewohnt einen neuen Tab.
        if (!isPlainClick(e)) return;
        e.preventDefault();
        closeMenu();
        setActiveSection(id);
        if (onWelcomePage) {
            scrollToSection(id);
        } else {
            navigate('/welcome', { state: { section: id } });
        }
    };

    const goStart = (e: MouseEvent<HTMLAnchorElement>) => {
        if (!isPlainClick(e)) return;
        closeMenu();
        if (!onWelcomePage) return;
        e.preventDefault();
        setActiveSection(null);
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };

    const isActive = (item: NavItem): boolean => {
        if (item.section) return onWelcomePage && activeSection === item.section;
        if (item.to === '/welcome') return onWelcomePage && activeSection === null;
        // Die Welcome-Abschnitte „coaching“/„eltern“ markieren die passenden
        // Navigationspunkte, auch wenn diese auf die Unterseite verlinken.
        if (onWelcomePage && activeSection === 'coaching' && item.to === '/coaching') return true;
        if (onWelcomePage && activeSection === 'eltern' && item.to === '/eltern-leitfaden') return true;
        return location.pathname === item.to;
    };

    const navLinkClass = (active: boolean) =>
        `relative isolate inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-[color,background-color,transform,translate,scale] duration-150 ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.97] ${active
            ? 'text-primary-soft-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`;

    const menuTrigger = (
        <button
            type="button"
            className="tactile-press inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft hover:shadow-card lg:hidden"
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => triggerHaptic('light')}
        >
            <m.span
                key={menuOpen ? 'close' : 'open'}
                initial={reduceMotion ? false : { rotate: menuOpen ? -45 : 45, scale: 0.82, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : SPRING.press}
                className="inline-flex"
            >
                {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </m.span>
        </button>
    );

    return (
        <>
            <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-full" />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <header
                    data-site-header
                    className="sticky top-0 z-50 pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
                >
                    <div className="mx-auto w-full max-w-site px-3 sm:px-6">
                    <div className="flex h-16 items-center gap-3 rounded-full border border-border/80 bg-card/95 px-4 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-card/90 sm:px-5 xl:gap-6">
                        <HeaderLink
                            to="/welcome"
                            onClick={goStart}
                            whileHover={reduceMotion ? undefined : 'hover'}
                            whileTap={reduceMotion ? undefined : 'press'}
                            variants={LOGO_LINK_VARIANTS}
                            transition={SPRING.settle}
                            className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-full px-1"
                            aria-label="Nachhilfebörse FWG – zur Startseite"
                        >
                            <m.span
                                variants={LOGO_MARK_VARIANTS}
                                transition={SPRING.press}
                                className="inline-flex shrink-0"
                            >
                                <Logo size={27} className="shrink-0 text-primary" />
                            </m.span>
                            <span className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                                Nachhilfebörse <span className="text-foreground">FWG</span>
                            </span>
                        </HeaderLink>
                        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-1 text-sm text-foreground lg:flex" aria-label="Bereiche">
                            {NAV_ITEMS.map((item) => {
                                const active = isActive(item);
                                return item.section ? (
                                    <Link
                                        key={item.label}
                                        to={item.to}
                                        onClick={goSection(item.section)}
                                        aria-current={active ? 'location' : undefined}
                                        className={navLinkClass(active)}
                                    >
                                        {active && (
                                            <m.span
                                                layoutId={reduceMotion ? undefined : 'site-nav-active'}
                                                initial={false}
                                                transition={reduceMotion ? { duration: 0 } : SPRING.settle}
                                                className="absolute inset-0 -z-10 rounded-full bg-primary-soft"
                                                aria-hidden
                                            />
                                        )}
                                        <span className="relative z-10">{item.label}</span>
                                    </Link>
                                ) : (
                                    <Link
                                        key={item.label}
                                        to={item.to}
                                        onClick={item.to === '/welcome' ? goStart : undefined}
                                        aria-current={active ? 'page' : undefined}
                                        className={navLinkClass(active)}
                                    >
                                        {active && (
                                            <m.span
                                                layoutId={reduceMotion ? undefined : 'site-nav-active'}
                                                initial={false}
                                                transition={reduceMotion ? { duration: 0 } : SPRING.settle}
                                                className="absolute inset-0 -z-10 rounded-full bg-primary-soft"
                                                aria-hidden
                                            />
                                        )}
                                        <span className="relative z-10">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-2">
                            <a
                                href="/docs"
                                className={navLinkClass(false) + ' group max-lg:hidden gap-1.5'}
                            >
                                Dokumentation
                                <BookOpen
                                    size={15}
                                    aria-hidden
                                    className="icon-react motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110 motion-safe:group-active:scale-90"
                                />
                            </a>
                            {!user && (
                                <Link
                                    to="/login"
                                    onClick={() => triggerHaptic('light')}
                                    className="tactile-press inline-flex h-12 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-soft hover:shadow-card motion-safe:hover:-translate-y-0.5 max-lg:hidden"
                                >
                                    Anmelden
                                </Link>
                            )}
                            <SheetTrigger render={menuTrigger} />
                        </div>
                    </div>
                    </div>
                </header>

                <SheetContent
                    side="right"
                    showCloseButton={false}
                    className="flex w-full max-w-md flex-col gap-0 border-l border-border bg-background p-0 text-foreground shadow-overlay data-[side=right]:w-full lg:hidden"
                >
                    <SheetTitle className="sr-only">Menü</SheetTitle>
                    <SheetDescription className="sr-only">
                        Hauptnavigation der Nachhilfebörse
                    </SheetDescription>

                    <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top,0px)]">
                        <span className="flex min-w-0 items-center gap-2.5 truncate text-lg font-bold tracking-tight text-foreground">
                            <Logo size={26} className="shrink-0 text-primary" />
                            Nachhilfebörse <span className="text-foreground">FWG</span>
                        </span>
                        <SheetClose
                            type="button"
                            aria-label="Menü schließen"
                            onClick={() => triggerHaptic('light')}
                            className="tactile-press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
                        >
                            <X size={20} aria-hidden />
                        </SheetClose>
                    </div>

                    <nav id="mobile-nav" aria-label="Bereiche mobil" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
                        <ul className="space-y-1">
                            {MOBILE_NAV.map((item) => {
                                const active = isActive(item);
                                return (
                                    <li key={item.label}>
                                        <Link
                                            to={item.to}
                                            onClick={(event) => {
                                                triggerHaptic('light');
                                                if (item.section) goSection(item.section)(event);
                                                else if (item.to === '/welcome') goStart(event);
                                                else closeMenu();
                                            }}
                                            aria-current={active ? (item.section ? 'location' : 'page') : undefined}
                                            className={`tactile-press flex min-h-12 items-center gap-4 rounded-full px-4 py-3 text-base font-semibold ${active ? 'bg-primary-soft text-primary-soft-foreground' : 'text-foreground hover:bg-muted'}`}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="px-1 pb-4 pt-5 text-xs font-medium text-muted-foreground">
                            Ein Produkt der Schülervertretung
                        </p>
                    </nav>
                    <div className="shrink-0 space-y-2 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                        <a
                            href="/docs"
                            onClick={() => {
                                triggerHaptic('light');
                                closeMenu();
                            }}
                            className="tactile-press flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-base font-semibold text-foreground hover:bg-muted"
                        >
                            Dokumentation
                            <BookOpen size={17} aria-hidden />
                        </a>
                        {!user && (
                            <SheetClose
                                nativeButton={false}
                                render={<Link to="/login" />}
                                onPointerDown={(event) => {
                                    if (event.button === 0) triggerHaptic('light');
                                }}
                                className="tactile-press inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-soft hover:shadow-card"
                            >
                                Anmelden
                            </SheetClose>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
