import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from './ui/Logo';
import { useAuth } from '../context/AuthContext';

const EASE = [0.16, 1, 0.3, 1] as const;

type MobileItem = { label: string; to: string; section?: string };

/* Reihenfolge + Labels exakt wie der Desktop-Nav (Chronologie aus DESIGN.md-Nachtrag). */
const MOBILE_NAV: MobileItem[] = [
    { label: 'Start', to: '/welcome' },
    { label: 'Suchen & Anbieten', to: '/welcome', section: 'wege' },
    { label: 'Schwarzes Brett', to: '/welcome', section: 'brett' },
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
 * Einheitlicher Site-Header: sticky schwarzer Header ohne Dienstleiste.
 * Wird in Landing.tsx UND StaticLayout.tsx genutzt, überall exakt gleich.
 * Sektions-Links (Wege, Schwarzes Brett) sind HashRouter-sicher: auf /welcome wird
 * direkt gescrollt, von anderen Seiten erst navigiert und dann gescrollt.
 * Mobil: volle Höhe Slide-Sheet von rechts (role=dialog), Fokus-Roundtrip zum Burger.
 */
export default function SiteHeader() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const onWelcomePage = location.pathname === '/welcome' || location.pathname === '/landing';
    const [menuOpen, setMenuOpen] = useState(false);
    const reduceMotion = useReducedMotion();
    const burgerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    const restoreFocusRef = useRef(false);

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
        restoreFocusRef.current = true;
        setMenuOpen(false);
    }, []);

    /* Route-Wechsel schließt das Sheet: State-Anpassung während render
       (React-Dokumentationsmuster, statt setState synchron im Effect). */
    const [prevPath, setPrevPath] = useState(location.pathname);
    if (prevPath !== location.pathname) {
        setPrevPath(location.pathname);
        setMenuOpen(false);
    }

    /* Bei Schließen: Fokus zurück zum Burger-Button. */
    useEffect(() => {
        if (menuOpen) return;
        if (!restoreFocusRef.current) return;
        restoreFocusRef.current = false;
        burgerRef.current?.focus();
    }, [menuOpen]);

    /* Offen: Scroll-Lock, Fokus aufs erste Element, Esc + Fokus-Falle (aria-modal). */
    useEffect(() => {
        if (!menuOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const raf = requestAnimationFrame(() => closeBtnRef.current?.focus());
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeMenu();
                return;
            }
            if (e.key !== 'Tab' || !panelRef.current) return;
            const focusables = Array.from(
                panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
            );
            if (focusables.length === 0) return;
            const first = focusables[0] as HTMLElement;
            const last = focusables[focusables.length - 1] as HTMLElement;
            const active = document.activeElement;
            if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            cancelAnimationFrame(raf);
            document.body.style.overflow = prevOverflow;
        };
    }, [menuOpen, closeMenu]);

    /* Viewport wächst auf md (Burger verschwindet per CSS): Sheet schließen, Fokus nicht klauen. */
    useEffect(() => {
        if (!menuOpen || typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(min-width: 768px)');
        const onChange = () => {
            if (!mq.matches) return;
            restoreFocusRef.current = false;
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

    /* Mobiles Sheet: gestaffelte Anton-Zeilen + verzögerter CTA, gleiche Timing-Sprache
       (rein 320ms / raus 200ms, EASE). reduced-motion → Stagger 0 + Dauer 0 = instant. */
    const listVariants: Variants = {
        hidden: {},
        show: {
            transition: { staggerChildren: reduceMotion ? 0 : 0.06, delayChildren: reduceMotion ? 0 : 0.08 },
        },
        exit: {
            transition: { staggerChildren: 0 },
        },
    };
    const itemVariants: Variants = {
        hidden: { opacity: 0, x: reduceMotion ? 0 : 24 },
        show: { opacity: 1, x: 0, transition: { duration: reduceMotion ? 0 : 0.32, ease: EASE } },
        exit: { opacity: 0, x: reduceMotion ? 0 : 12, transition: { duration: reduceMotion ? 0 : 0.2, ease: EASE } },
    };

    return (
        <>
            {/* Sentinel am Dokumentanfang: markiert den un-gescrollten Zustand (kein scroll-Listener). */}
            <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-full" />
            {/* Navigation */}
            <header className={`sticky top-0 z-50 border-b bg-black/90 backdrop-blur-xl poster-grain transition-[border-color,box-shadow] duration-200 ${scrolled ? 'border-white/25 shadow-[0_14px_36px_-14px_rgba(0,0,0,0.9),0_8px_24px_-16px_rgba(250,204,21,0.45)]' : 'border-white/10 dark-glow'}`}>
                {/* 3-Spalten-Grid mit balancierten 1fr-Seiten-Slots: Mitte bleibt optisch zentriert
                    (minmax(0,1fr) verhindert Track-Wachstum durch lange Nav-Inhalte).
                    Höhe kollabiert sauber mit der Subline (Grid-0fr-Trick + Padding), kein Fix-h. */}
                <div className={`max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4 transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${scrolled ? 'py-1.5' : 'py-2.5'}`}>
                    <div className="flex min-w-0 items-center justify-self-start">
                        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-semibold text-gray-300 whitespace-nowrap" aria-label="Bereiche">
                            <Link to="/welcome" className="press hover:text-white active:text-primary transition-colors">Start</Link>
                            {/* HashRouter-sicher: <Link> liefert href="/#/welcome" als Fallback (niemals href="#..."),
                                onClick fängt ab und scrollt zur Sektion. */}
                            <Link to="/welcome" onClick={goSection('wege')} className="press hover:text-white active:text-primary transition-colors">Suchen &amp; Anbieten</Link>
                            <Link to="/welcome" onClick={goSection('brett')} className="press hover:text-white active:text-primary transition-colors">Schwarzes Brett</Link>
                            <Link to="/coaching" className="press hover:text-white active:text-primary transition-colors">Coaching-AG</Link>
                            <Link to="/eltern-leitfaden" className="press hover:text-white active:text-primary transition-colors">Eltern</Link>
                        </nav>
                    </div>
                    <Link to="/welcome" className="flex items-center gap-3 min-w-0 max-w-full justify-self-center" aria-label="Nachhilfebörse Startseite">
                        <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary text-black shadow-[0_6px_20px_-6px_rgba(250,204,21,0.6)] shrink-0">
                            <Logo size={24} />
                        </span>
                        <span className="flex min-w-0 flex-col leading-none">
                            <span className="text-lg font-extrabold tracking-tight truncate text-white">Nachhilfebörse <span className="text-primary">FWG</span></span>
                            {/* Subline kollabiert per Grid-0fr/1fr + Opacity: kein leerer schwarzer Streifen,
                                kein Layout-Sprung. RM → instant via motion-reduce + globalem Kill-Switch. */}
                            <span aria-hidden={scrolled} className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                                <span className="min-h-0 overflow-hidden">
                                    <span className={`block truncate text-xs font-semibold uppercase tracking-widest text-gray-400 ${scrolled ? 'mt-0' : 'mt-1'}`}>Ein Produkt der Schülervertretung</span>
                                </span>
                            </span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0 justify-self-end min-w-0">
                        <Link to={user ? '/' : '/login'} className="press inline-flex items-center justify-center min-h-11 h-11 px-4 text-xs gap-1.5 rounded-full font-bold bg-primary text-black hover:bg-primary-hover shadow-md">
                            Jetzt loslegen <ArrowRight size={16} aria-hidden />
                        </Link>
                        <button
                            ref={burgerRef}
                            type="button"
                            className="press md:hidden inline-flex items-center justify-center w-11 h-11 min-h-11 min-w-11 rounded-full border border-white/20 text-white hover:bg-white/10"
                            aria-expanded={menuOpen}
                            aria-controls="mobile-nav"
                            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
                            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
                        >
                            <span className="relative grid h-5 w-5 place-items-center">
                                <AnimatePresence initial={false}>
                                    {menuOpen ? (
                                        <motion.span
                                            key="close"
                                            className="absolute inset-0 grid place-items-center"
                                            initial={reduceMotion ? { opacity: 1 } : { rotate: -90, opacity: 0, scale: 0.6 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={reduceMotion ? { opacity: 0 } : { rotate: 90, opacity: 0, scale: 0.6 }}
                                            transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE }}
                                        >
                                            <X size={20} aria-hidden />
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="menu"
                                            className="absolute inset-0 grid place-items-center"
                                            initial={reduceMotion ? { opacity: 1 } : { rotate: 90, opacity: 0, scale: 0.6 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={reduceMotion ? { opacity: 0 } : { rotate: -90, opacity: 0, scale: 0.6 }}
                                            transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE }}
                                        >
                                            <Menu size={20} aria-hidden />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Sheet steht als Geschwister NACH dem Header: backdrop-filter des Headers
                würde fixed-Descendants sonst zum Containing-Block machen. */}
            <AnimatePresence>
                {menuOpen && (
                    <div className="fixed inset-0 z-[60] md:hidden">
                        <motion.div
                            className="absolute inset-0 bg-black/70"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2, ease: EASE } }}
                            transition={{ duration: reduceMotion ? 0 : 0.32, ease: EASE }}
                            onClick={closeMenu}
                            aria-hidden
                        />
                        <motion.div
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Menü"
                            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-black poster-grain shadow-[-30px_0_60px_-30px_rgba(0,0,0,0.9)]"
                            initial={reduceMotion ? false : { x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%', transition: { duration: reduceMotion ? 0 : 0.2, ease: EASE } }}
                            transition={{ duration: reduceMotion ? 0 : 0.32, ease: EASE }}
                        >
                            <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
                                <span className="min-w-0 truncate font-display uppercase text-xl leading-none tracking-tight text-white">
                                    Nachhilfebörse <span className="text-primary">FWG</span>
                                </span>
                                <button
                                    ref={closeBtnRef}
                                    type="button"
                                    onClick={closeMenu}
                                    aria-label="Menü schließen"
                                    className="press inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
                                >
                                    <X size={20} aria-hidden />
                                </button>
                            </div>

                            <nav id="mobile-nav" aria-label="Bereiche mobil" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
                                {/* Einheitliche Divider-Sprache: überall 1px solid white/10, volle Breite. */}
                                <motion.ul
                                    variants={listVariants}
                                    initial={reduceMotion ? false : 'hidden'}
                                    animate="show"
                                    exit={reduceMotion ? undefined : 'exit'}
                                    className="border-y border-white/10 divide-y divide-white/10"
                                >
                                    {MOBILE_NAV.map((item, i) => (
                                        <motion.li key={item.label} variants={itemVariants}>
                                            <Link
                                                to={item.to}
                                                onClick={item.section ? goSection(item.section) : closeMenu}
                                                className="flex min-h-14 items-center gap-4 py-3 text-white transition-colors hover:text-primary"
                                            >
                                                <span className="font-mono text-xs font-bold tabular-nums text-primary" aria-hidden>
                                                    {String(i + 1).padStart(2, '0')}
                                                </span>
                                                <span className="font-display uppercase text-2xl leading-none tracking-tight">{item.label}</span>
                                            </Link>
                                        </motion.li>
                                    ))}
                                </motion.ul>
                                <p className="px-1 pb-4 pt-5 text-xs font-bold uppercase tracking-wide text-gray-300">
                                    Ein Produkt der Schülervertretung
                                </p>
                            </nav>

                            {/* CTA fix am Daumenbereich des Sheets (Thumb-Reach), genau ein CTA — steigt verzögert auf. */}
                            <motion.div
                                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, y: 8, transition: { duration: 0.2, ease: EASE } }}
                                transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.18, ease: EASE }}
                                className="shrink-0 border-t border-white/10 bg-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
                            >
                                <Link
                                    to={user ? '/' : '/login'}
                                    onClick={closeMenu}
                                    className="press inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-bold text-black hover:bg-primary-hover"
                                >
                                    Jetzt loslegen <ArrowRight size={17} aria-hidden />
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
