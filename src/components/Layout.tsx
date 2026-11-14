import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Plus, PlusCircle, User, LogOut, Settings, MessageSquare, Inbox, Zap, Heart, Sparkles, Award, ShieldCheck, MoreVertical, BookOpen } from 'lucide-react';
import AccessGuard from './AccessGuard';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { useEffect, useRef, useState } from 'react';
import NotificationCenter from './NotificationCenter';
import MobileQuickMenu from './MobileQuickMenu';
import InstallPrompt from './InstallPrompt';
import { Logo } from './ui/Logo';
import { triggerHaptic } from '../lib/haptics';
import { avatarTone, initials } from '../lib/avatar';
import { cn } from '../lib/utils';
import { getDesktopSocialTab, type DesktopSocialTab } from '../lib/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
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
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from './ui/sidebar';

/* App-Shell: Sidebar ab md, Bottom-Navigation darunter. Die Shell selbst
   scrollt nicht; nur der Inhaltsbereich scrollt, damit Chat/Composer eine
   stabile Höhe behalten. Safe-Areas werden oben und unten berücksichtigt. */
export default function Layout() {
    return (
        <SidebarProvider className="h-dvh min-h-0 overflow-hidden bg-background font-sans text-foreground">
            <AppShell />
        </SidebarProvider>
    );
}

function AppShell() {
    const { signOut, isAdmin, isCoachAdmin, profile } = useAuth();
    const { setOpenMobile } = useSidebar();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [unreadCount, setUnreadCount] = useState(0);
    const mainContentRef = useRef<HTMLDivElement>(null);

    const handleSignOut = async () => {
        triggerHaptic('medium');
        await signOut();
        navigate('/login');
    };

    const handleNavClick = () => {
        triggerHaptic('selection');
        // Auf Mobil schließt jede Navigation das Sidebar-Sheet.
        setOpenMobile(false);
    };

    const pathname = location.pathname.replace(/\/+$/, '') || '/';

    useEffect(() => {
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [pathname]);
    const isSocialRoute = ['/social', '/requests', '/matches', '/matching', '/favorites', '/watchlist'].includes(pathname);
    const isChatRoute = pathname === '/chat' || pathname.startsWith('/chat/');
    const isSvPanel = pathname.startsWith('/sv-panel');
    const currentTab = getDesktopSocialTab(pathname, location.search);

    const isTabActive = (tab: DesktopSocialTab) => isSocialRoute && currentTab === tab;
    const isPathActive = (path: string) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
    // Dark mode uses the neutral active surface; the base button would otherwise
    // show the olive --primary-soft pill in the SV/sidebar navigation.
    const activeNavClass = 'dark:bg-muted dark:text-foreground dark:data-active:bg-muted dark:data-active:text-foreground dark:data-active:hover:bg-muted dark:data-active:hover:text-foreground';

    const mobileNavItems = [
        { to: '/', label: 'Entdecken', icon: Home },
        { to: '/social', label: 'Social', icon: MessageSquare, activateOnChat: true },
        { to: '/create-ad', label: 'Neue Anzeige', icon: Plus, isAction: true },
        { to: '/settings', label: 'Optionen', icon: Settings },
        { to: '/profile', label: 'Profil', icon: User }
    ];
    const createAdActive = isPathActive('/create-ad');
    const isMobileNavActive = (to: string, activateOnChat = false) => {
        if (to === '/') return pathname === '/';
        if (activateOnChat) return isSocialRoute || isChatRoute;
        return isPathActive(to);
    };

    return (
        <>
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
                collapsible="icon"
                className="[&_[data-sidebar=sidebar]]:border [&_[data-sidebar=sidebar]]:border-border/70 [&_[data-sidebar=sidebar]]:bg-card [&_[data-sidebar=sidebar]]:shadow-card"
            >
                <SidebarHeader className="gap-0 p-3 pr-14 md:pr-2">
                    <div className="flex min-w-0 items-center gap-1">
                        <NavLink
                            to="/welcome"
                            onClick={handleNavClick}
                            aria-label="Nachhilfebörse – Startseite"
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full p-1 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                        >
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                                <Logo size={23} aria-hidden="true" focusable="false" />
                            </span>
                            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                                <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-foreground">Nachhilfebörse</p>
                                <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">FWG Köln</p>
                            </div>
                        </NavLink>
                        <SidebarTrigger
                            aria-label="Navigation einklappen"
                            className="hidden size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground md:inline-flex group-data-[collapsible=icon]:hidden"
                        />
                    </div>
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
                                        aria-label="Entdecken"
                                        className={pathname === '/' ? activeNavClass : undefined}
                                        render={<NavLink to="/" end onClick={handleNavClick} />}
                                    >
                                        <Home aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Entdecken</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isTabActive('requests')}
                                        tooltip="Anfragen"
                                        aria-label="Anfragen"
                                        className={isTabActive('requests') ? activeNavClass : undefined}
                                        render={<NavLink to="/requests" onClick={handleNavClick} />}
                                    >
                                        <Inbox aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Anfragen</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isTabActive('matches')}
                                        tooltip="Vorschläge"
                                        aria-label="Vorschläge"
                                        className={isTabActive('matches') ? activeNavClass : undefined}
                                        render={<NavLink to="/matches" onClick={handleNavClick} />}
                                    >
                                        <Zap aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Vorschläge</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isTabActive('watchlist')}
                                        tooltip="Merkliste"
                                        aria-label="Merkliste"
                                        className={isTabActive('watchlist') ? activeNavClass : undefined}
                                        render={<NavLink to="/favorites" onClick={handleNavClick} />}
                                    >
                                        <Heart aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Merkliste</span>
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
                                        aria-label="Neue Anzeige"
                                        className={isPathActive('/create-ad') ? activeNavClass : undefined}
                                        render={<NavLink to="/create-ad" onClick={handleNavClick} />}
                                    >
                                        <PlusCircle aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Neue Anzeige</span>
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
                                        aria-label="Profil"
                                        className={isPathActive('/profile') ? activeNavClass : undefined}
                                        render={<NavLink to="/profile" onClick={handleNavClick} />}
                                    >
                                        <User aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Profil</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isPathActive('/settings')}
                                        tooltip="Einstellungen"
                                        aria-label="Einstellungen"
                                        className={isPathActive('/settings') ? activeNavClass : undefined}
                                        render={<NavLink to="/settings" onClick={handleNavClick} />}
                                    >
                                        <Settings aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Einstellungen</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        tooltip="Dokumentation"
                                        aria-label="Dokumentation"
                                        render={<a href="/docs" onClick={handleNavClick} />}
                                    >
                                        <BookOpen aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Dokumentation</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isPathActive('/welcome')}
                                        tooltip="Willkommen"
                                        aria-label="Willkommen"
                                        className={isPathActive('/welcome') ? activeNavClass : undefined}
                                        render={<NavLink to="/welcome" onClick={handleNavClick} />}
                                    >
                                        <Sparkles aria-hidden />
                                        <span className="group-data-[collapsible=icon]:hidden">Willkommen</span>
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
                                            aria-label="Coaching Panel"
                                            className={isPathActive('/coach-panel') ? activeNavClass : undefined}
                                            render={<NavLink to="/coach-panel" onClick={handleNavClick} />}
                                        >
                                            <Award aria-hidden />
                                            <span className="group-data-[collapsible=icon]:hidden">Coaching Panel</span>
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
                                            aria-label="SV Panel"
                                            className={isSvPanel ? activeNavClass : undefined}
                                            render={<NavLink to="/sv-panel" onClick={handleNavClick} />}
                                        >
                                            <ShieldCheck aria-hidden />
                                            <span className="group-data-[collapsible=icon]:hidden">SV Panel</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}
                </SidebarContent>

                <SidebarFooter className="border-t border-border/70 p-3 group-data-[collapsible=icon]:p-2">
                    <div className="flex items-center gap-1 rounded-card bg-accent p-2 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
                        <NavLink
                            to="/profile"
                            onClick={handleNavClick}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-card/70 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:p-0"
                            title={profile?.display_name || 'Profil'}
                        >
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt=""
                                    className="size-9 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold', avatarTone(profile?.display_name))}>
                                    {initials(profile?.display_name)}
                                </span>
                            )}
                            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                                <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{profile?.display_name || 'Profil'}</p>
                                <p className="truncate text-xs text-muted-foreground">{profile?.grade_level ? profile.grade_level : 'Profil'}</p>
                            </div>
                        </NavLink>
                        {!isMobile && (
                            <div className="group-data-[collapsible=icon]:hidden">
                                <NotificationCenter unreadCount={unreadCount} onCountChange={setUnreadCount} />
                            </div>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-11 shrink-0 rounded-full group-data-[collapsible=icon]:hidden"
                                        aria-label="Konto-Menü"
                                    />
                                }
                            >
                                <MoreVertical aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-56">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>{profile?.display_name || 'Konto'}</DropdownMenuLabel>
                                    <DropdownMenuItem render={<NavLink to="/profile" onClick={handleNavClick} />}>
                                        <User aria-hidden />
                                        Profil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem render={<NavLink to="/settings" onClick={handleNavClick} />}>
                                        <Settings aria-hidden />
                                        Einstellungen
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                                    <LogOut aria-hidden />
                                    Abmelden
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <SidebarInset className="h-dvh min-h-0 overflow-hidden bg-transparent">
                <div className="flex shrink-0 justify-end px-3 pb-1 pt-[max(0.5rem,calc(0.5rem+env(safe-area-inset-top,0px)))] md:hidden">
                    {isMobile && (
                        <MobileQuickMenu
                            unreadCount={unreadCount}
                            onCountChange={setUnreadCount}
                        />
                    )}
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
                className="fixed right-2 bottom-[max(0.75rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] left-2 z-50 grid h-[4.5rem] grid-cols-5 items-center rounded-full border border-border/70 bg-card/95 px-1 shadow-overlay backdrop-blur-xl md:hidden"
            >
                {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    if (item.isAction) {
                        return (
                            <Button
                                key={item.to}
                                variant="unstyled"
                                size="unstyled"
                                hapticStyle={false}
                                type="button"
                                onClick={() => {
                                    handleNavClick();
                                    navigate('/create-ad');
                                }}
                                className="flex h-full w-full items-center justify-center p-[3px]"
                                title="Neue Anzeige"
                                aria-label="Neue Anzeige"
                                aria-current={createAdActive ? 'page' : undefined}
                            >
                                <span
                                    className={cn(
                                        'grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-card transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-primary-hover',
                                        createAdActive && 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                                    )}
                                >
                                    <Plus size={22} strokeWidth={2.4} aria-hidden />
                                </span>
                            </Button>
                        );
                    }

                    const active = isMobileNavActive(item.to, item.activateOnChat);
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={handleNavClick}
                            className="group flex h-full w-full min-w-0 items-center justify-center p-[3px]"
                            title={item.label}
                            aria-current={active ? 'page' : undefined}
                        >
                            <span
                                className={cn(
                                    'flex h-full w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-medium transition-colors',
                                    active
                                        ? 'bg-primary-soft text-primary-soft-foreground dark:bg-muted dark:text-foreground'
                                        : 'text-muted-foreground group-hover:bg-muted/60 group-hover:text-foreground'
                                )}
                            >
                                <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
                                <span className="max-w-full truncate tracking-[-0.02em]">{item.label}</span>
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <InstallPrompt />
        </>
    );
}
