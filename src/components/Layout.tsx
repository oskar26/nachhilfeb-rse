import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, LogOut, Settings, MessageSquare, Inbox, Zap, Heart, Sparkles, Award, ShieldCheck } from 'lucide-react';
import AccessGuard from './AccessGuard';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { useRef, useState } from 'react';
import NotificationCenter from './NotificationCenter';
import InstallPrompt from './InstallPrompt';
import { Logo } from './ui/Logo';
import { triggerHaptic } from '../lib/haptics';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarSeparator,
} from './ui/sidebar';

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
    const isSvPanel = pathname.startsWith('/sv-panel');
    const pathTab = pathname === '/matches' || pathname === '/matching' ? 'matches'
        : pathname === '/favorites' || pathname === '/watchlist' ? 'watchlist'
        : 'requests';
    const requestedTab = new URLSearchParams(location.search).get('tab');
    const currentTab = requestedTab === 'requests' || requestedTab === 'matches' || requestedTab === 'watchlist'
        ? requestedTab
        : pathTab;

    const isTabActive = (tab: string) => isSocialRoute && currentTab === tab;
    const isPathActive = (path: string) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

    const mobileNavItems = [
        { to: '/', label: 'Entdecken', icon: Home, end: true },
        { to: '/social', label: 'Social', icon: MessageSquare, activateOnChat: true },
        { to: '/create-ad', label: 'Erstellen', icon: PlusCircle, isAction: true },
        { to: '/settings', label: 'Optionen', icon: Settings },
        { to: '/profile', label: 'Profil', icon: User }
    ];

    return (
        <SidebarProvider
            key={isSvPanel ? 'sv-panel' : 'app'}
            defaultOpen={!isSvPanel}
            className="h-dvh min-h-0 overflow-hidden bg-background font-sans text-foreground"
        >
            <Link
                to={pathname || '/'}
                onClick={event => {
                    event.preventDefault();
                    handleNavClick();
                    mainContentRef.current?.focus();
                }}
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
            >
                Zum Hauptinhalt springen
            </Link>

            <Sidebar
                variant="inset"
                collapsible={isSvPanel ? 'icon' : 'offcanvas'}
                className="[&_[data-sidebar=sidebar]]:bg-card"
            >
                <SidebarHeader className="gap-0 p-3">
                    <NavLink
                        to="/welcome"
                        onClick={handleNavClick}
                        className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg p-1"
                    >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                            <Logo size={22} />
                        </span>
                        <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                            <p className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground">Nachhilfebörse</p>
                            <p className="mt-0.5 text-xs font-medium text-muted-foreground">FWG Köln</p>
                        </div>
                    </NavLink>
                </SidebarHeader>

                <SidebarSeparator />

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Menü</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={pathname === '/'}
                                        tooltip="Entdecken"
                                        render={<NavLink to="/" end onClick={handleNavClick} />}
                                    >
                                        <Home aria-hidden />
                                        <span>Entdecken</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isTabActive('requests')}
                                        tooltip="Anfragen"
                                        render={<NavLink to="/requests" onClick={handleNavClick} />}
                                    >
                                        <Inbox aria-hidden />
                                        <span>Anfragen</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isTabActive('matches')}
                                        tooltip="Vorschläge"
                                        render={<NavLink to="/matches" onClick={handleNavClick} />}
                                    >
                                        <Zap aria-hidden />
                                        <span>Vorschläge</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isTabActive('watchlist')}
                                        tooltip="Merkliste"
                                        render={<NavLink to="/favorites" onClick={handleNavClick} />}
                                    >
                                        <Heart aria-hidden />
                                        <span>Merkliste</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupLabel>Erstellen</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isPathActive('/create-ad')}
                                        tooltip="Neue Anzeige"
                                        render={<NavLink to="/create-ad" onClick={handleNavClick} />}
                                    >
                                        <PlusCircle aria-hidden />
                                        <span>Neue Anzeige</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupLabel>Konto</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isPathActive('/profile')}
                                        tooltip="Profil"
                                        render={<NavLink to="/profile" onClick={handleNavClick} />}
                                    >
                                        <User aria-hidden />
                                        <span>Profil</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isPathActive('/settings')}
                                        tooltip="Einstellungen"
                                        render={<NavLink to="/settings" onClick={handleNavClick} />}
                                    >
                                        <Settings aria-hidden />
                                        <span>Einstellungen</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isPathActive('/welcome')}
                                        tooltip="Willkommen"
                                        render={<NavLink to="/welcome" onClick={handleNavClick} />}
                                    >
                                        <Sparkles aria-hidden />
                                        <span>Willkommen</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {isCoachAdmin && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Coaching-AG</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            isActive={isPathActive('/coach-panel')}
                                            tooltip="Coaching Panel"
                                            render={<NavLink to="/coach-panel" onClick={handleNavClick} />}
                                        >
                                            <Award aria-hidden />
                                            <span>Coaching Panel</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    {isAdmin && (
                        <SidebarGroup>
                            <SidebarGroupLabel>SV-Bereich</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            isActive={isSvPanel}
                                            tooltip="SV Panel"
                                            render={<NavLink to="/sv-panel" onClick={handleNavClick} />}
                                        >
                                            <ShieldCheck aria-hidden />
                                            <span>SV Panel</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}
                </SidebarContent>

                <SidebarFooter className="gap-1 border-t border-border p-2">
                    <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                        <NotificationCenter unreadCount={unreadCount} onCountChange={setUnreadCount} />
                    </div>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Abmelden"
                                onClick={handleSignOut}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <LogOut aria-hidden />
                                <span>Abmelden</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset className="h-dvh min-h-0 overflow-hidden bg-background md:border md:border-border">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
                    <Link to="/welcome" onClick={handleNavClick} className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                            <Logo size={20} />
                        </span>
                        <span className="truncate text-sm font-semibold tracking-tight text-foreground">Nachhilfebörse <span className="text-primary">FWG</span></span>
                    </Link>
                    <NotificationCenter
                        unreadCount={unreadCount}
                        onCountChange={setUnreadCount}
                        scrollRef={mainContentRef}
                    />
                </div>
                <div
                    ref={mainContentRef}
                    tabIndex={-1}
                    aria-label="Hauptinhalt"
                    className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-clip focus:outline-none"
                >
                    <AccessGuard>
                        <Outlet />
                    </AccessGuard>
                    <div className="h-[calc(6.5rem+env(safe-area-inset-bottom,0px))] shrink-0 md:hidden" />
                </div>
            </SidebarInset>

            <nav
                aria-label="Hauptnavigation"
                className="fixed right-4 bottom-[max(0.75rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] left-4 z-50 flex h-16 items-center justify-around rounded-xl border border-border bg-card px-1.5 shadow-overlay md:hidden"
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
                                className="relative flex h-full w-16 shrink-0 flex-col items-center justify-center rounded-lg"
                                title={item.label}
                                aria-label="Neue Anzeige erstellen"
                            >
                                <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                                    <PlusCircle size={20} strokeWidth={2} aria-hidden />
                                </span>
                                <span className="max-w-full truncate text-xs font-medium">Erstellen</span>
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
                                `relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-xs font-medium transition-colors ${
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
                                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-foreground" aria-hidden />
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <InstallPrompt />
        </SidebarProvider>
    );
}
