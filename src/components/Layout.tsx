import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, User, LogOut, Settings, Inbox, Heart, Users, Bell, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import NotificationCenter from './NotificationCenter';
import InstallPrompt from './InstallPrompt';

export default function Layout() {
    const { user, signOut, isParent } = useAuth();
    const navigate = useNavigate();
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
        await signOut();
        navigate('/login');
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all ${isActive
            ? 'bg-gray-100 text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100 font-bold'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
        }`;

    const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors ${isActive
            ? 'text-primary'
            : 'text-gray-500 dark:text-gray-400'
        }`;

    return (
        <div className="h-screen w-full bg-[#f8f9fa] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans animate-in fade-in duration-500 flex justify-center">
            <div className="flex h-full w-full max-w-[1440px] relative overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex w-72 flex-col m-4 rounded-[2rem] bg-white dark:bg-gray-900 shadow-soft border-none overflow-hidden h-[calc(100vh-2rem)] shrink-0">
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Nachhilfebörse</h1>
                        <p className="text-xs text-gray-400 font-medium">FWG Köln</p>
                    </div>
                    {/* Notification bell on desktop */}
                    <NotificationCenter unreadCount={unreadCount} onCountChange={setUnreadCount} />
                </div>

                <div className="px-6 py-2">
                    <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />
                </div>

                <nav className="flex-1 space-y-2 px-6 py-4 overflow-y-auto">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
                    <NavLink to="/" className={navLinkClass}>
                        <Home size={20} /> Entdecken
                    </NavLink>
                    <NavLink to="/requests" className={navLinkClass}>
                        <Inbox size={20} /> Anfragen
                    </NavLink>
                    
                    {!isParent ? (
                        <>
                            <NavLink to="/matching" className={navLinkClass}>
                                <Zap size={20} /> Matches
                            </NavLink>
                            <NavLink to="/favorites" className={navLinkClass}>
                                <Heart size={20} /> Merkliste
                            </NavLink>
                        </>
                    ) : (
                        <NavLink to="/parent-dashboard" className={navLinkClass}>
                            <Users size={20} /> Eltern-Dashboard
                        </NavLink>
                    )}

                    {!isParent && (
                        <>
                            <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-2">Erstellen</p>
                            <NavLink to="/create-ad" className={navLinkClass}>
                                <PlusCircle size={20} /> Neue Anzeige
                            </NavLink>
                        </>
                    )}

                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-2">Account</p>
                    <NavLink to="/profile" className={navLinkClass}>
                        <User size={20} /> Profil
                    </NavLink>
                    <NavLink to="/settings" className={navLinkClass}>
                        <Settings size={20} /> Einstellungen
                    </NavLink>

                    {isAdmin && (
                        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-3xl">
                            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Admin Area</p>
                            <NavLink to="/sv-panel" className={navLinkClass}>
                                <span className="font-bold text-red-600">SV Panel</span>
                            </NavLink>
                        </div>
                    )}
                </nav>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full" onClick={handleSignOut}>
                        <LogOut size={20} /> Abmelden
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative md:p-4 flex flex-col min-w-0">
                <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-800 shrink-0">
                    <span className="font-bold text-lg">Nachhilfebörse</span>
                    {/* Notification bell on mobile */}
                    <NotificationCenter unreadCount={unreadCount} onCountChange={setUnreadCount} />
                </div>
                {/* Desktop layout wrapper */}
                <div className="flex-1 w-full md:rounded-[2rem] md:bg-white/50 md:dark:bg-gray-900/50 md:backdrop-blur-sm md:shadow-inner-soft flex flex-col min-h-0">
                    <div className="flex-1 w-full">
                        <Outlet />
                    </div>
                    {/* Spacer for bottom nav on mobile */}
                    <div className="h-24 md:hidden shrink-0" />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white dark:bg-gray-900 rounded-full shadow-2xl flex items-center justify-around z-50 px-2 ring-1 ring-black/5">
                <NavLink to="/" className={mobileNavLinkClass}>
                    <Home size={22} />
                </NavLink>
                <NavLink to="/requests" className={mobileNavLinkClass}>
                    <Inbox size={22} />
                </NavLink>
                
                {!isParent ? (
                    <>
                        <NavLink to="/create-ad" className={mobileNavLinkClass}>
                            <div className="bg-primary text-white p-3 rounded-full -mt-6 shadow-lg border-4 border-white dark:border-gray-950">
                                <PlusCircle size={28} />
                            </div>
                        </NavLink>
                        <NavLink to="/matching" className={mobileNavLinkClass}>
                            <Zap size={22} />
                        </NavLink>
                    </>
                ) : (
                    <NavLink to="/parent-dashboard" className={mobileNavLinkClass}>
                        <Users size={22} />
                    </NavLink>
                )}
                
                <NavLink to="/profile" className={mobileNavLinkClass}>
                    <User size={22} />
                </NavLink>
            </div>

            {/* PWA Install banner prompt */}
            <InstallPrompt />
            </div>
        </div>
    );
}
