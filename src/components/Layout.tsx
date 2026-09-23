import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, LogOut, Settings, Users, MessageSquare, Inbox, Zap, Heart, Sparkles, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { useRef, useState } from 'react';
import NotificationCenter from './NotificationCenter';
import InstallPrompt from './InstallPrompt';
import { Logo } from './ui/Logo';
import { triggerHaptic } from '../lib/haptics';

export default function Layout() {
    const { signOut, isParent, isAdmin, isCoachAdmin } = useAuth();
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

        return `relative flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
            active
                ? 'bg-primary/15 text-gray-900 dark:bg-primary/15 dark:text-primary border-primary/30 dark:border-primary/25 shadow-sm font-extrabold'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800/60'
        }`;
    };

    const mobileNavItems = [
        { to: '/', label: 'Entdecken', icon: Home, end: true },
        !isParent
            ? { to: '/social', label: 'Social', icon: MessageSquare, activateOnChat: true }
            : { to: '/parent-dashboard', label: 'Eltern', icon: Users },
        { to: '/create-ad', label: 'Erstellen', icon: PlusCircle, isAction: true },
        { to: '/settings', label: 'Optionen', icon: Settings },
        { to: '/profile', label: 'Profil', icon: User }
    ];

    const showCreateAd = !isParent;

    return (
        <div className="flex h-[100dvh] w-full bg-[#f8f9fa] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
            <Link
                to={pathname || '/'}
                onClick={event => {
                    event.preventDefault();
                    handleNavClick();
                    mainContentRef.current?.focus();
                }}
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-extrabold focus:text-amber-950 focus:shadow-lg"
            >
                Zum Hauptinhalt springen
            </Link>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 flex-col m-4 rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-soft border border-gray-200/60 dark:border-gray-800/80 overflow-hidden h-[calc(100vh-2rem)] shrink-0 z-40">
                <div className="p-6 pb-4 flex items-center justify-between relative z-50">
                    <NavLink to="/welcome" onClick={handleNavClick} className="flex items-center gap-3 group">
                        <Logo className="w-9 h-9 text-black dark:text-white shrink-0 transition-transform group-hover:scale-105" />
                        <div>
                            <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-white leading-none group-hover:text-primary transition-colors">Nachhilfebörse</h1>
                            <p className="text-xs text-gray-400 font-semibold mt-1">FWG Köln</p>
                        </div>
                    </NavLink>
                    {/* Notification bell on desktop */}
                    <NotificationCenter unreadCount={unreadCount} onCountChange={setUnreadCount} />
                </div>

                <div className="px-6 py-1">
                    <div className="h-px bg-gray-100 dark:bg-gray-800/80 w-full" />
                </div>

                <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                    <p className="px-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
                    <NavLink to="/" end onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/', isActive)}>
                        <Home size={20} /> Entdecken
                    </NavLink>
                    <NavLink to="/requests" onClick={handleNavClick} className={() => getDesktopNavLinkClass('social_tab', 'requests')}>
                        <Inbox size={20} /> Anfragen
                    </NavLink>
                    
                    {!isParent ? (
                        <>
                            <NavLink to="/matches" onClick={handleNavClick} className={() => getDesktopNavLinkClass('social_tab', 'matches')}>
                                <Zap size={20} /> Matches
                            </NavLink>
                            <NavLink to="/favorites" onClick={handleNavClick} className={() => getDesktopNavLinkClass('social_tab', 'watchlist')}>
                                <Heart size={20} /> Merkliste
                            </NavLink>
                        </>
                    ) : (
                        <NavLink to="/parent-dashboard" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/parent-dashboard', isActive)}>
                            <Users size={20} /> Eltern-Dashboard
                        </NavLink>
                    )}

                    {!isParent && (
                        <>
                            <p className="px-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mt-6 mb-2">Erstellen</p>
                            <NavLink to="/create-ad" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/create-ad', isActive)}>
                                <PlusCircle size={20} /> Neue Anzeige
                            </NavLink>
                        </>
                    )}

                    <p className="px-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mt-6 mb-2">Account</p>
                    <NavLink to="/profile" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/profile', isActive)}>
                        <User size={20} /> Profil
                    </NavLink>
                    <NavLink to="/settings" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/settings', isActive)}>
                        <Settings size={20} /> Einstellungen
                    </NavLink>
                    <NavLink to="/welcome" onClick={handleNavClick} className={({ isActive }) => getDesktopNavLinkClass('path', '/welcome', isActive)}>
                        <Sparkles size={20} /> Willkommen
                    </NavLink>

                    {/* Coach Admin Panel (Frau Balistreri & SV) */}
                    {isCoachAdmin && (
                        <div className="mt-4 p-3 bg-primary/10 dark:bg-amber-950/20 border border-primary/25 dark:border-amber-900/30 rounded-2xl">
                            <p className="px-2 text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-[0.08em] mb-1.5">Schüler-Coaching</p>
                            <NavLink to="/coach-panel" onClick={handleNavClick} className={({ isActive }) => `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary ${isActive ? 'bg-primary/20 text-gray-900 dark:text-amber-100 font-extrabold' : 'text-amber-800 dark:text-amber-200 hover:bg-primary/10 dark:hover:bg-amber-900/40'}`}>
                                <Award size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="font-bold">Coaching Panel</span>
                            </NavLink>
                        </div>
                    )}

                    {isAdmin && (
                        <div className="mt-4 p-3 bg-red-50/60 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 rounded-2xl">
                            <p className="px-2 text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.08em] mb-1.5">Admin Area</p>
                            <NavLink to="/sv-panel" onClick={handleNavClick} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${isActive ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' : 'text-red-600 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-900/40'}`}>
                                <span className="font-bold">SV Panel</span>
                            </NavLink>
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/60 dark:bg-gray-900/50">
                    <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl" onClick={handleSignOut}>
                        <LogOut size={20} /> Abmelden
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative md:p-4 flex flex-col min-w-0 min-h-0">
                {/* Mobile Header — aligns with desktop glass (90% + blur-xl) */}
                <div className="md:hidden flex items-center justify-between gap-2 px-4 sm:px-5 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200/60 dark:border-gray-800/80 shrink-0 shadow-sm">
                    <NavLink to="/welcome" onClick={handleNavClick} className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Logo className="w-8 h-8 text-black dark:text-white shrink-0" />
                        <span className="font-black text-lg tracking-tight text-gray-900 dark:text-white truncate">Nachhilfebörse</span>
                    </NavLink>
                    {/* Notification bell on mobile */}
                    <div className="shrink-0">
                    <NotificationCenter unreadCount={unreadCount} onCountChange={setUnreadCount} />
                    </div>
                </div>

                {/* Main View Wrapper with Fast, Native-feeling Rendering (No stutter/freeze) */}
                <div
                    ref={mainContentRef}
                    tabIndex={-1}
                    aria-label="Hauptinhalt"
                    className="flex-1 w-full md:rounded-3xl md:bg-white/80 md:dark:bg-gray-900/80 md:backdrop-blur-md md:border md:border-gray-100/80 md:dark:border-gray-800/60 md:shadow-soft flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-clip focus:outline-none"
                >
                    <Outlet />
                    {/* Spacer for bottom nav on mobile */}
                    <div className="h-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:hidden shrink-0" />
                </div>
            </main>

            {/* Mobile Bottom Navigation — pill, consistent radius + border */}
            <nav aria-label="Hauptnavigation" className="md:hidden fixed bottom-[max(1rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] left-4 right-4 h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-around z-50 px-2 border border-gray-200/60 dark:border-gray-800/80 ring-1 ring-black/[0.04] dark:ring-white/5">
                {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    if (item.isAction) {
                        if (!showCreateAd) return null;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={handleNavClick}
                                className="flex flex-col items-center justify-center -mt-6"
                                title={item.label}
                                aria-label={`Neue Anzeige erstellen`}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                    className="bg-primary text-primary-foreground p-3.5 rounded-full shadow-lg shadow-primary/25 border-4 border-white dark:border-gray-950 ring-1 ring-black/5"
                                >
                                    <PlusCircle size={24} strokeWidth={2.5} />
                                </motion.div>
                            </NavLink>
                        );
                    }

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end || (item.activateOnChat ? false : undefined)}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center justify-center w-full min-w-0 h-full gap-1 text-[11px] font-bold transition-all px-1 ${
                                    isActive || (item.activateOnChat && (isSocialRoute || isChatRoute))
                                        ? 'text-gray-950 dark:text-white font-extrabold'
                                        : 'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
                                }`
                            }
                            title={item.label}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={20} strokeWidth={isActive || (item.activateOnChat && (isSocialRoute || isChatRoute)) ? 2.5 : 2} />
                                    <span className="truncate max-w-full">{item.label}</span>
                                    {(isActive || (item.activateOnChat && (isSocialRoute || isChatRoute))) && (
                                        <motion.div
                                            layoutId="mobileNavActiveDot"
                                            className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* PWA Install banner prompt */}
            <InstallPrompt />
        </div>
    );
}
