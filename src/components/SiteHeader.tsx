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

type MobileItem = { label: string; to: string; section?: string };

/* Reihenfolge + Labels exakt wie der Desktop-Nav (Chronologie aus DESIGN.md-Nachtrag). */
const MOBILE_NAV: MobileItem[] = [
    { label: 'Start', to: '/welcome' },
    { label: 'Suchen & Anbieten', to: '/welcome', section: 'wege' },
    { label: 'Die App', to: '/welcome', section: 'brett' },
    { label: 'Coaching-AG', to: '/coaching' },
    { label: 'Eltern', to: '/eltern-leitfaden' },
];

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
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

    const closeMenu = useCallback(() => {
        setMenuOpen(false);
    }, []);

    /* Route-Wechsel schließt das Sheet: State-Anpassung während render
       (React-Dokumentationsmuster, statt setState synchron im Effect). */
    const [prevPath, setPrevPath] = useState(location.pathname);
    if (prevPath !== location.pathname) {
        setPrevPath(location.pathname);
        setMenuOpen(false);
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
        if (onWelcomePage) {
            scrollToSection(id);
        } else {
            navigate('/welcome');
            window.setTimeout(() => scrollToSection(id), 150);
        }
    };

    const menuTrigger = (
        <Button
            variant="unstyled"
            size="unstyled"
            hapticStyle={false}
            type="button"
            className="press inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-black/20 text-black hover:bg-black/5 lg:hidden"
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
        >
            {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </Button>
    );

    return (
        <>
            {/* Sentinel am Dokumentanfang: markiert den un-gescrollten Zustand (kein scroll-Listener). */}
            <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-full" />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <header className={`sticky top-0 z-50 border-b border-black/15 bg-[#faf7ef] transition-[box-shadow] duration-200 ${scrolled ? 'shadow-[0_8px_24px_-18px_rgba(0,0,0,0.45)]' : ''}`}>
                    <div className={`mx-auto flex max-w-7xl items-center gap-3 px-4 transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:px-6 xl:gap-6 ${scrolled ? 'py-1.5' : 'py-2.5'}`}>
                        <Link to="/welcome" className="flex min-w-0 items-center gap-3" aria-label="Nachhilfebörse Startseite">
                            <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary text-black shadow-[0_6px_20px_-6px_rgba(250,204,21,0.6)] shrink-0">
                                <Logo size={24} />
                            </span>
                            <span className="flex min-w-0 flex-col leading-none">
                                <span className="text-lg font-extrabold tracking-tight truncate text-black">Nachhilfebörse <span className="text-black">FWG</span></span>
                                {/* Subline kollabiert per Grid-0fr/1fr + Opacity: kein leerer Streifen,
                                    kein Layout-Sprung. RM → instant via motion-reduce + globalem Kill-Switch. */}
                                <span aria-hidden={scrolled} className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                                    <span className="min-h-0 overflow-hidden">
                                        <span className={`block truncate text-xs font-semibold uppercase tracking-widest text-black/70 lg:hidden ${scrolled ? 'mt-0' : 'mt-1'}`}>Ein Produkt der Schülervertretung</span>
                                    </span>
                                </span>
                            </span>
                        </Link>
                        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-3 text-[13px] font-semibold text-black lg:flex xl:gap-5 xl:text-sm" aria-label="Bereiche">
                            <Link to="/welcome" className="press whitespace-nowrap transition-colors hover:text-black/60 active:text-black">Start</Link>
                            <Link to="/welcome" onClick={goSection('wege')} className="press whitespace-nowrap transition-colors hover:text-black/60 active:text-black">Suchen &amp; Anbieten</Link>
                            <Link to="/welcome" onClick={goSection('brett')} className="press whitespace-nowrap transition-colors hover:text-black/60 active:text-black">Die App</Link>
                            <Link to="/coaching" className="press whitespace-nowrap transition-colors hover:text-black/60 active:text-black">Coaching-AG</Link>
                            <Link to="/eltern-leitfaden" className="press whitespace-nowrap transition-colors hover:text-black/60 active:text-black">Eltern</Link>
                        </nav>
                        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 lg:ml-4">
                            <p className="hidden max-w-[11rem] text-right text-[11px] font-bold uppercase leading-tight tracking-wide text-black lg:block">Ein Produkt der Schülervertretung</p>
                            {!user && (
                                <Link
                                    to="/login"
                                    className="press hidden h-10 items-center rounded-full border border-black/20 px-4 text-sm font-bold text-black transition-colors hover:bg-black/5 active:bg-black/10 lg:inline-flex"
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
                    className="flex w-full max-w-md flex-col gap-0 border-l border-black/10 bg-[#faf7ef] p-0 text-black shadow-[-30px_0_60px_-30px_rgba(0,0,0,0.5)] poster-grain-dark lg:hidden"
                >
                    <SheetTitle className="sr-only">Menü</SheetTitle>
                    <SheetDescription className="sr-only">
                        Hauptnavigation der Nachhilfebörse
                    </SheetDescription>

                    <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-black/10 px-4">
                        <span className="min-w-0 truncate font-display uppercase text-xl leading-none tracking-tight text-black">
                            Nachhilfebörse <span className="text-amber-600">FWG</span>
                        </span>
                        <SheetClose
                            type="button"
                            aria-label="Menü schließen"
                            className="press inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-black/20 text-black hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X size={20} aria-hidden />
                        </SheetClose>
                    </div>

                    <nav id="mobile-nav" aria-label="Bereiche mobil" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
                        <ul className="border-y border-black/10 divide-y divide-black/10">
                            {MOBILE_NAV.map((item, i) => (
                                <li key={item.label}>
                                    <Link
                                        to={item.to}
                                        onClick={item.section ? goSection(item.section) : closeMenu}
                                        className="flex min-h-14 items-center gap-4 py-3 text-black transition-colors hover:text-amber-600"
                                    >
                                        <span className="font-mono text-xs font-bold tabular-nums text-amber-600" aria-hidden>
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span className="font-display uppercase text-2xl leading-none tracking-tight">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <p className="px-1 pb-4 pt-5 text-xs font-bold uppercase tracking-wide text-gray-500">
                            Ein Produkt der Schülervertretung
                        </p>
                    </nav>
                    {!user && (
                        <div className="shrink-0 border-t border-black/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                            <SheetClose
                                render={<Link to="/login" />}
                                className="press flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-black text-black"
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
