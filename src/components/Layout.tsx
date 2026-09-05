import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, LogOut, Settings, Users, MessageSquare, Inbox, Zap, Heart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import NotificationCenter from './NotificationCenter';
import InstallPrompt from './InstallPrompt';
import { Logo } from './ui/Logo';
import { triggerHaptic } from '../lib/haptics';

export default function Layout() {
    const { user, signOut, isParent } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) checkAdmin();
    }, [user]);

    const checkAdmin = async () => {
        const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
        if (data?.role === 'sv_admin') setIsAdmin(true);
    };

    const handleSignOut = async () => {
        triggerHaptic('medium');
        await signOut();
        navigate('/login');
    };

    const handleNavClick = () => {
        triggerHaptic('selection');
    };

    const desktopNavLinkClass = ({ isActive }: { isActive: boolean }) =>
        `relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
            isActive
                ? 'bg-amber-400/20 text-amber-950 dark:bg-yellow-400/15 dark:text-yellow-200 font-extrabold border border-amber-300/40 dark:border-yellow-400/30 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800/60'
        }`;

    const mobileNavItems = [
        { to: '/', label: 'Entdecken', icon: Home, end: true },
        !isParent
            ? { to: '/social', label: 'Social', icon: MessageSquare }
            : { to: '/parent-dashboard', label: 'Eltern', icon: Users },
        { to: '/create-ad', label: 'Erstellen', icon: PlusCircle, isAction: true },
        { to: '/settings', label: 'Optionen', icon: Settings },
        { to: '/profile', label: 'Profil', icon: User }
    ];

    return (
        <div className="flex h-[100dvh] w-full bg-[#f8f9fa] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 flex-col m-4 rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-soft border border-gray-100/80 dark:border-gray-800/80 overflow-visible h-[calc(100vh-2rem)] shrink-0 z-40">
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

                <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto">
                    <p className="px-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
                    <NavLink to="/" end onClick={handleNavClick} className={desktopNavLinkClass}>
                        <Home size={20} /> Entdecken
                    </NavLink>
                    <NavLink to="/requests" onClick={handleNavClick} className={desktopNavLinkClass}>
                        <Inbox size={20} /> Anfragen
                    </NavLink>
                    
                    {!isParent ? (
                        <>
                            <NavLink to="/matching" onClick={handleNavClick} className={desktopNavLinkClass}>
                                <Zap size={20} /> Matches
                            </NavLink>
                            <NavLink to="/favorites" onClick={handleNavClick} className={desktopNavLinkClass}>
                                <Heart size={20} /> Merkliste
                            </NavLink>
                        </>
                    ) : (
                        <NavLink to="/parent-dashboard" onClick={handleNavClick} className={desktopNavLinkClass}>
                            <Users size={20} /> Eltern-Dashboard
                        </NavLink>
                    )}

                    {!isParent && (
                        <>
                            <p className="px-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mt-6 mb-2">Erstellen</p>
                            <NavLink to="/create-ad" onClick={handleNavClick} className={desktopNavLinkClass}>
                                <PlusCircle size={20} /> Neue Anzeige
                            </NavLink>
                        </>
                    )}

                    <p className="px-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mt-6 mb-2">Account</p>
                    <NavLink to="/profile" onClick={handleNavClick} className={desktopNavLinkClass}>
                        <User size={20} /> Profil
                    </NavLink>
                    <NavLink to="/settings" onClick={handleNavClick} className={desktopNavLinkClass}>
                        <Settings size={20} /> Einstellungen
                    </NavLink>
                    <NavLink to="/welcome" onClick={handleNavClick} className={desktopNavLinkClass}>
                        <Sparkles size={20} /> Willkommen
                    </NavLink>

                    {isAdmin && (
                        <div className="mt-6 p-3 bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                            <p className="px-2 text-[10px] font-black text-red-500 uppercase tracking-wider mb-1.5">Admin Area</p>
                            <NavLink to="/sv-panel" onClick={handleNavClick} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/40 transition-all">
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
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative md:p-4 flex flex-col min-w-0">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between px-5 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200/60 dark:border-gray-800/80 shrink-0 shadow-sm">
                    <NavLink to="/welcome" onClick={handleNavClick} className="flex items-center gap-2.5">
                        <Logo className="w-8 h-8 text-black dark:text-white shrink-0" />
                        <span className="font-black text-lg tracking-tight text-gray-900 dark:text-white">Nachhilfebörse</span>
                    </NavLink>
                    {/* Notification bell on mobile */}
                    <NotificationCenter unreadCount={unreadCount} onCountChange={setUnreadCount} />
                </div>

                {/* Main View Wrapper with Smooth Page Transition */}
                <div className="flex-1 w-full md:rounded-3xl md:bg-white/60 md:dark:bg-gray-900/40 md:backdrop-blur-md md:border md:border-gray-100/80 md:dark:border-gray-800/60 md:shadow-soft flex flex-col min-h-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="flex-1 w-full min-h-0"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                    {/* Spacer for bottom nav on mobile */}
                    <div className="h-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:hidden shrink-0" />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-[max(1rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] left-4 right-4 h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-around z-50 px-2 border border-gray-200/50 dark:border-gray-800/80 ring-1 ring-black/5">
                {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    if (item.isAction) {
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={handleNavClick}
                                className="flex flex-col items-center justify-center -mt-6"
                                title={item.label}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                    className="bg-primary text-primary-foreground p-3.5 rounded-full shadow-lg shadow-yellow-500/25 border-4 border-white dark:border-gray-950"
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
                            end={item.end}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center justify-center w-full h-full gap-1 text-[11px] font-bold transition-all ${
                                    isActive
                                        ? 'text-gray-950 dark:text-white font-extrabold'
                                        : 'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
                                }`
                            }
                            title={item.label}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                    <span>{item.label}</span>
                                    {isActive && (
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
