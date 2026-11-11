import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from './ui/Logo';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

type NavItem = { label: string; to: string; section?: string };

/* Reihenfolge + Labels exakt wie der Desktop-Nav (Chronologie aus DESIGN.md-Nachtrag). */
const NAV_ITEMS: NavItem[] = [
    { label: 'Start', to: '/welcome' },
    { label: 'Suchen & Anbieten', to: '/welcome', section: 'wege' },
    { label: 'Die App', to: '/welcome', section: 'brett' },
    { label: 'Coaching-AG', to: '/coaching' },
    { label: 'Eltern', to: '/eltern-leitfaden' },
];

const MOBILE_NAV: NavItem[] = NAV_ITEMS;

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Scrollt mit Abstand zur Sticky-Header-Höhe. Reines scrollIntoView + scroll-mt
   reicht nicht, weil der Header beim Scrollen seine Höhe ändert. */
function scrollToSection(id: string): void {
    const scrollNow = () => {
        const el = document.getElementById(id);
        if (!el) return false;
        const header = document.querySelector<HTMLElement>('[data-site-header]');
        const offset = (header?.getBoundingClientRect().height ?? 56) + 16;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        return true;
    };
    if (scrollNow()) return;
    /* Nach Navigation aus einem anderen Hash-Route-Ziel kann die Sektion erst
       im nächsten Frame gemountet sein. Kurz (max. ~500 ms) nachfassen. */
    let tries = 0;
    const retry = () => {
        if (scrollNow() || tries >= 30) return;
        tries += 1;
        window.requestAnimationFrame(retry);
    };
    window.requestAnimationFrame(retry);
}

/**
 * Einheitlicher Site-Header: sticky Papier-Header ohne Dienstleiste.
 * Wird in Landing.tsx UND StaticLayout.tsx genutzt, überall exakt gleich.
 * Sektions-Links (Wege, Die App) sind HashRouter-sicher: auf /welcome wird
 * direkt gescrollt, von anderen Seiten erst navigiert und dann gescrollt.
 * Mobil: shadcn Sheet von rechts; Fokus, Escape und Fokus-Rückgabe kommen
 * von Base UI, das Burger-Menü bleibt der sichtbare Trigger.
 */
export default function SiteHeader() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const onWelcomePage = location.pathname === '/welcome' || location.pathname === '/landing';
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    /* Continuity: sticky Header verdichtet sich beim Scroll-Auftauchen
       (Border/Shadow/Subline-Fade). Sentinel + IntersectionObserver, kein scroll-Listener. */
    const [scrolled, setScrolled] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
        io.observe(el);
        return () => io.disconnect();
    }, []);

    /* Scroll-Spy: markiert auf /welcome den Abschnitt, in dem man sich befindet. */
    useEffect(() => {
        if (!onWelcomePage) return;
        const ids = ['wege', 'brett', 'eltern'];
        const sections = ids
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => Boolean(el));
        if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver((entries) => {
            const visible = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) setActiveSection(visible.target.id);
        }, { rootMargin: '-32% 0px -58% 0px', threshold: [0, 0.1, 0.5] });
        sections.forEach((section) => io.observe(section));
        return () => io.disconnect();
    }, [onWelcomePage]);

    const closeMenu = useCallback(() => {
        setMenuOpen(false);
    }, []);

    /* Route-Wechsel schließt das Sheet: State-Anpassung während render
       (React-Dokumentationsmuster, statt setState synchron im Effect). */
    const [prevPath, setPrevPath] = useState(location.pathname);
    if (prevPath !== location.pathname) {
        setPrevPath(location.pathname);
        setMenuOpen(false);
        setActiveSection(null);
    }

    /* Viewport wächst auf lg (Burger verschwindet per CSS): Sheet schließen. */
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

    const goSection = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        closeMenu();
        setActiveSection(id);
        if (onWelcomePage) {
            scrollToSection(id);
        } else {
            navigate('/welcome');
            window.setTimeout(() => scrollToSection(id), 150);
        }
    };

    const isActive = (item: NavItem): boolean => {
        if (item.section) return onWelcomePage && activeSection === item.section;
        if (item.to === '/welcome') return onWelcomePage && activeSection === null;
        return location.pathname === item.to;
    };

    const navLinkClass = (active: boolean) =>
        `press relative inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-1.5 text-sm transition-colors after:absolute after:inset-x-1.5 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary after:transition-opacity ${active
            ? 'font-bold text-foreground after:opacity-100'
            : 'text-muted-foreground hover:text-foreground after:opacity-0'}`;

    const menuTrigger = (
        <Button
            variant="unstyled"
            size="unstyled"
            hapticStyle={false}
            type="button"
            className="press inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted lg:hidden"
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
        >
            {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </Button>
    );

    return (
        <>
            {/* Sentinel am Dokumentanfang: markiert den un-gescrollten Zustand (kein scroll-Listener). */}
            <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-full" />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <header
                    data-site-header
                    className={`sticky top-0 z-50 border-b border-border bg-background pt-[env(safe-area-inset-top,0px)] transition-shadow duration-200 ${scrolled ? 'shadow-soft' : ''}`}
                >
                    <div className={`mx-auto flex max-w-7xl items-center gap-3 px-4 transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:px-6 xl:gap-6 ${scrolled ? 'py-1.5' : 'py-2.5'}`}>
                        <Link to="/welcome" className="flex min-h-11 min-w-0 items-center gap-3 rounded-full" aria-label="Nachhilfebörse Startseite">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                                <Logo size={24} />
                            </span>
                            <span className="flex min-w-0 flex-col leading-none">
                                <span className="truncate text-base font-extrabold tracking-tight text-foreground sm:text-lg">Nachhilfebörse <span className="text-brand-ink dark:text-primary">FWG</span></span>
                                {/* Subline kollabiert per Grid-0fr/1fr + Opacity: kein leerer Streifen,
                                    kein Layout-Sprung. RM → instant via motion-reduce + globalem Kill-Switch. */}
                                <span aria-hidden={scrolled} className={`hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:grid ${scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                                    <span className="min-h-0 overflow-hidden">
                                        <span className={`block truncate text-xs font-semibold uppercase tracking-widest text-muted-foreground lg:hidden ${scrolled ? 'mt-0' : 'mt-1'}`}>Ein Produkt der Schülervertretung</span>
                                    </span>
                                </span>
                            </span>
                        </Link>
                        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-1 text-sm font-semibold text-foreground lg:flex xl:gap-2" aria-label="Bereiche">
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
                                        {item.label}
                                    </Link>
                                ) : (
                                    <Link
                                        key={item.label}
                                        to={item.to}
                                        aria-current={active ? 'page' : undefined}
                                        className={navLinkClass(active)}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 lg:ml-4">
                            <p className="hidden max-w-[11rem] text-right text-xs font-bold uppercase leading-tight tracking-wide text-muted-foreground lg:block">Ein Produkt der Schülervertretung</p>
                            {!user && (
                                <Link
                                    to="/login"
                                    className="press hidden h-11 items-center rounded-full border border-border px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted active:bg-muted lg:inline-flex"
                                >
                                    Anmelden
                                </Link>
                            )}
                            <SheetTrigger render={menuTrigger} />
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
                        <span className="min-w-0 truncate font-display uppercase text-xl leading-none tracking-tight text-foreground">
                            Nachhilfebörse <span className="text-brand-ink dark:text-primary">FWG</span>
                        </span>
                        <SheetClose
                            type="button"
                            aria-label="Menü schließen"
                            className="press inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X size={20} aria-hidden />
                        </SheetClose>
                    </div>

                    <nav id="mobile-nav" aria-label="Bereiche mobil" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
                        <ul className="divide-y divide-border border-y border-border">
                            {MOBILE_NAV.map((item, i) => {
                                const active = isActive(item);
                                return (
                                    <li key={item.label}>
                                        <Link
                                            to={item.to}
                                            onClick={item.section ? goSection(item.section) : closeMenu}
                                            aria-current={active ? (item.section ? 'location' : 'page') : undefined}
                                            className={`-mx-2 flex min-h-14 items-center gap-4 rounded-xl px-2 py-3 transition-colors ${active ? 'bg-primary/15 text-foreground' : 'text-foreground hover:bg-muted'}`}
                                        >
                                            <span className={`font-mono text-xs font-bold tabular-nums ${active ? 'text-brand-ink dark:text-primary' : 'text-muted-foreground'}`} aria-hidden>
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <span className={`font-display uppercase text-2xl leading-none tracking-tight ${active ? 'font-bold' : ''}`}>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="px-1 pb-4 pt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Ein Produkt der Schülervertretung
                        </p>
                    </nav>
                    {!user && (
                        <div className="shrink-0 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                            <SheetClose
                                render={<Link to="/login" />}
                                className="press flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground"
                            >
                                Anmelden
                            </SheetClose>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}
