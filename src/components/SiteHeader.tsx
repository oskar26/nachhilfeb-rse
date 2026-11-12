import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from './ui/Logo';
import { useAuth } from '../context/AuthContext';
import { buttonVariants } from '@/components/ui/button';
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

const MOBILE_NAV: NavItem[] = NAV_ITEMS;

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollToSection(id: string): void {
    const scrollNow = () => {
        const el = document.getElementById(id);
        if (!el) return false;
        const header = document.querySelector<HTMLElement>('[data-site-header]');
        const offset = (header?.getBoundingClientRect().height ?? 64) + 16;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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
        `inline-flex min-h-10 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors ${active
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`;

    const menuTrigger = (
        <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted lg:hidden"
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
        >
            {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
    );

    return (
        <>
            <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-full" />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <header
                    data-site-header
                    className="sticky top-0 z-50 border-b border-border bg-background pt-[env(safe-area-inset-top,0px)]"
                >
                    <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 xl:gap-6">
                        <Link to="/welcome" className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-md" aria-label="Nachhilfebörse Startseite">
                            <Logo size={26} className="shrink-0 text-primary" />
                            <span className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                                Nachhilfebörse <span className="text-primary">FWG</span>
                            </span>
                        </Link>
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
                        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-2">
                            {!user && (
                                <Link
                                    to="/login"
                                    className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' hidden lg:inline-flex'}
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
                        <span className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground">
                            Nachhilfebörse <span className="text-primary">FWG</span>
                        </span>
                        <SheetClose
                            type="button"
                            aria-label="Menü schließen"
                            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
                        >
                            <X size={20} aria-hidden />
                        </SheetClose>
                    </div>

                    <nav id="mobile-nav" aria-label="Bereiche mobil" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
                        <ul className="divide-y divide-border border-y border-border">
                            {MOBILE_NAV.map((item) => {
                                const active = isActive(item);
                                return (
                                    <li key={item.label}>
                                        <Link
                                            to={item.to}
                                            onClick={item.section ? goSection(item.section) : closeMenu}
                                            aria-current={active ? (item.section ? 'location' : 'page') : undefined}
                                            className={`flex min-h-14 items-center gap-4 px-2 py-3 text-base transition-colors ${active ? 'bg-muted font-medium text-foreground' : 'text-foreground hover:bg-muted/60'}`}
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
                    {!user && (
                        <div className="shrink-0 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                            <SheetClose
                                render={<Link to="/login" />}
                                className={buttonVariants({ size: 'lg' }) + ' w-full'}
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
