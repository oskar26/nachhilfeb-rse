import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, LogOut, Settings, MessageSquare, Inbox, Zap, Heart, Sparkles, Award } from 'lucide-react';
import AccessGuard from './AccessGuard';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { useRef, useState } from 'react';
import NotificationCenter from './NotificationCenter';
import InstallPrompt from './InstallPrompt';
import { Logo } from './ui/Logo';
import { triggerHaptic } from '../lib/haptics';

/* App-Shell: Sidebar ab md, Bottom-Navigation darunter. Die Shell selbst
   scrollt nicht; nur der Inhaltsbereich scrollt, damit Chat/Composer eine
   stabile Höhe behalten. Safe-Areas werden oben und unten berücksichtigt. */
export default function Layout() {
    const { signOut, isAdmin, isCoachAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const mainContentRef = useRef<HTMLDivElement>(null);

    const handleSignOut = async () => {
        triggerHaptic('medium');
        await signOut();
        navigate('/login');
    };

    const handleNavClick = () => {
        triggerHaptic('selection');
    };

    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const isSocialRoute = ['/social', '/requests', '/matches', '/matching', '/favorites', '/watchlist'].includes(pathname);
    const isChatRoute = pathname === '/chat' || pathname.startsWith('/chat/');
    const pathTab = pathname === '/matches' || pathname === '/matching' ? 'matches'
        : pathname === '/favorites' || pathname === '/watchlist' ? 'watchlist'
        : 'requests';
    const requestedTab = new URLSearchParams(location.search).get('tab');
    const currentTab = requestedTab === 'requests' || requestedTab === 'matches' || requestedTab === 'watchlist'
        ? requestedTab
        : pathTab;

    const isTabActive = (tab: string) => isSocialRoute && currentTab === tab;

    const getDesktopNavLinkClass = (type: 'path' | 'social_tab', target: string, isStaticActive?: boolean) => {
        let active = false;
        if (type === 'path') {
            active = !!isStaticActive;
        } else if (type === 'social_tab') {
            active = isTabActive(target);
        }

        return `relative flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
            active
                ? 'border-primary/30 bg-primary/15 text-foreground dark:border-primary/25 dark:text-primary'
                : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
        }`;
    };

    const mobileNavItems = [
        { to: '/', label: 'Entdecken', icon: Home, end: true },
        { to: '/social', label: 'Social', icon: MessageSquare, activateOnChat: true },
        { to: '/create-ad', label: 'Erstellen', icon: PlusCircle, isAction: true },
        { to: '/settings', label: 'Optionen', icon: Settings },
        { to: '/profile', label: 'Profil', icon: User }
    ];

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-background font-sans text-foreground">
            <Link
                to={pathname || '/'}
                onClick={event => {
                    event.preventDefault();
                    handleNavClick();
                    mainContentRef.current?.focus();
                }}
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-overlay"
            >
                Zum Hauptinhalt springen
            </Link>

            {/* Desktop-Sidebar */}
            <aside className="z-40 m-4 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 flex-col overflow-hidden rounded-3xl xl:w-72 border border-border bg-card/90 shadow-soft backdrop-blur-xl md:flex">
                <div className="relative z-50 flex items-center justify-between gap-2 p-5 pb-3">
                    <NavLink to="/welcome" onClick={handleNavClick} className="group flex min-h-11 min-w-0 items-center gap-3 rounded-full">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                            <Logo size={24} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-brand-ink dark:group-hover:text-primary">Nachhilfebörse</h1>
                            <p className="mt-0.5 text-xs font-medium text-muted-foreground">FWG Köln</p>
                        </div>
                    </NavLink>
                    <NotificationCenter unreadCount={unreadCount} onCountChange={setUnreadCount} />
                </div>

                <div className="px-5">
                    <div className="h-px w-full bg-border" />
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin]" aria-label="App-Navigation">
                    <p className="mb-1.5 px-2 text-xs font-semibold text-muted-foreground">Menü</p>
                    <NavLink to="/" end onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/', isActive)}>
                        <Home size={20} aria-hidden /> Entdecken
                    </NavLink>
                    <NavLink to="/requests" onClick={handleNavClick} className={() => getDesktopNavLinkClass('social_tab', 'requests')}>
                        <Inbox size={20} aria-hidden /> Anfragen
                    </NavLink>
                    <NavLink to="/matches" onClick={handleNavClick} className={() => getDesktopNavLinkClass('social_tab', 'matches')}>
                        <Zap size={20} aria-hidden /> Vorschläge
                    </NavLink>
                    <NavLink to="/favorites" onClick={handleNavClick} className={() => getDesktopNavLinkClass('social_tab', 'watchlist')}>
                        <Heart size={20} aria-hidden /> Merkliste
                    </NavLink>

                    <p className="mb-1.5 mt-5 px-2 text-xs font-semibold text-muted-foreground">Erstellen</p>
                    <NavLink to="/create-ad" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/create-ad', isActive)}>
                        <PlusCircle size={20} aria-hidden /> Neue Anzeige
                    </NavLink>

                    <p className="mb-1.5 mt-5 px-2 text-xs font-semibold text-muted-foreground">Konto</p>
                    <NavLink to="/profile" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/profile', isActive)}>
                        <User size={20} aria-hidden /> Profil
                    </NavLink>
                    <NavLink to="/settings" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/settings', isActive)}>
                        <Settings size={20} aria-hidden /> Einstellungen
                    </NavLink>
                    <NavLink to="/welcome" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/welcome', isActive)}>
                        <Sparkles size={20} aria-hidden /> Willkommen
                    </NavLink>

                    {isCoachAdmin && (
                        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 p-2.5">
                            <p className="mb-1 px-2 text-xs font-semibold text-brand-ink dark:text-primary">Coaching-AG</p>
                            <NavLink
                                to="/coach-panel"
                                onClick={handleNavClick}
                                className={({ isActive }) => `flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${isActive ? 'bg-primary/25 text-foreground' : 'text-brand-ink hover:bg-primary/15 dark:text-primary'}`}
                            >
                                <Award size={18} className="shrink-0" aria-hidden />
                                <span>Coaching Panel</span>
                            </NavLink>
                        </div>
                    )}

                    {isAdmin && (
                        <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-2.5">
                            <p className="mb-1 px-2 text-xs font-semibold text-destructive">SV-Bereich</p>
                            <NavLink
                                to="/sv-panel"
                                onClick={handleNavClick}
                                className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${isActive ? 'bg-destructive/15 text-destructive' : 'text-destructive hover:bg-destructive/10'}`}
                            >
                                <span>SV Panel</span>
                            </NavLink>
                        </div>
                    )}
                </nav>

                <div className="border-t border-border bg-muted/40 p-3">
                    <Button variant="ghost" className="h-11 w-full justify-start gap-3 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
                        <LogOut size={20} aria-hidden /> Abmelden
                    </Button>
                </div>
            </aside>

            {/* Hauptbereich */}
            <main className="relative flex min-h-0 min-w-0 flex-1 flex-col md:p-4">
                {/* Mobile App-Leiste: Logo + Benachrichtigungen. Auf Desktop übernimmt die Sidebar. */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
                    <Link to="/welcome" onClick={handleNavClick} className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-full">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                            <Logo size={20} />
                        </span>
                        <span className="truncate text-sm font-semibold tracking-tight text-foreground">Nachhilfebörse <span className="text-brand-ink dark:text-primary">FWG</span></span>
                    </Link>
                    <NotificationCenter
                        variant="sticker"
                        unreadCount={unreadCount}
                        onCountChange={setUnreadCount}
                        scrollRef={mainContentRef}
                    />
                </div>
                <div
                    ref={mainContentRef}
                    tabIndex={-1}
                    aria-label="Hauptinhalt"
                    className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-clip focus:outline-none md:rounded-3xl md:border md:border-border md:bg-card/60 md:shadow-soft md:backdrop-blur-md"
                >
                    <AccessGuard>
                        <Outlet />
                    </AccessGuard>
                    {/* Platz für die schwebende Bottom-Navigation */}
                    <div className="h-[calc(6.5rem+env(safe-area-inset-bottom,0px))] shrink-0 md:hidden" />
                </div>
            </main>

            {/* Mobile Bottom-Navigation */}
            <nav
                aria-label="Hauptnavigation"
                className="fixed right-4 bottom-[max(0.75rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] left-4 z-50 flex h-16 items-center justify-around rounded-full border border-border bg-card/95 px-1.5 shadow-overlay ring-1 ring-foreground/5 backdrop-blur-xl md:hidden"
            >
                {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    if (item.isAction) {
                        return (
                            <Button variant="unstyled" size="unstyled"
                                key={item.to}
                                type="button"
                                onClick={() => {
                                    handleNavClick();
                                    navigate('/create-ad');
                                }}
                                className="relative flex h-full w-16 shrink-0 flex-col items-center justify-center rounded-full"
                                title={item.label}
                                aria-label="Neue Anzeige erstellen"
                            >
                                <span className="press -mt-5 grid size-14 place-items-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-soft ring-1 ring-foreground/10">
                                    <PlusCircle size={24} strokeWidth={2.25} aria-hidden />
                                </span>
                            </Button>
                        );
                    }

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end || (item.activateOnChat ? false : undefined)}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                                `relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                                    isActive || (item.activateOnChat && (isSocialRoute || isChatRoute))
                                        ? 'text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`
                            }
                            title={item.label}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={20} strokeWidth={isActive || (item.activateOnChat && (isSocialRoute || isChatRoute)) ? 2.25 : 2} aria-hidden />
                                    <span className="max-w-full truncate">{item.label}</span>
                                    {(isActive || (item.activateOnChat && (isSocialRoute || isChatRoute))) && (
                                        <motion.span
                                            layoutId="mobileNavActiveDot"
                                            className="absolute bottom-1 h-1 w-1 rounded-full bg-primary"
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            aria-hidden
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <InstallPrompt />
        </div>
    );
}
