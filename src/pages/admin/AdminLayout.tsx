import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Logo } from '../../components/ui/Logo';
import {
    ShieldCheck,
    LayoutDashboard,
    Users,
    FileText,
    AlertTriangle,
    MessageSquare,
    Key,
    BarChart2,
    ClipboardList,
    ChevronRight,
    Menu,
    X,
    Megaphone,
    LifeBuoy,
    Award,
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Übersicht', value: 'overview', icon: LayoutDashboard },
    { label: 'Codes & Verifikation', value: 'codes', icon: Key },
    { label: 'Support & Feedback', value: 'support', icon: LifeBuoy },
    { label: 'Nutzer', value: 'users', icon: Users },
    { label: 'Anzeigen', value: 'ads', icon: FileText },
    { label: 'News / Infos', value: 'news', icon: Megaphone },
    { label: 'Meldungen', value: 'reports', icon: AlertTriangle },
    { label: 'Chat', value: 'chat', icon: MessageSquare },
    { label: 'Analytics', value: 'analytics', icon: BarChart2 },
    { label: 'Audit Log', value: 'auditlog', icon: ClipboardList },
    { label: 'Schüler-Coaching Log', value: 'coachlog', icon: Award },
];

const TAB_LABELS: Record<string, string> = {
    codes: 'Codes & Verifikation',
    overview: 'Übersicht',
    support: 'Support & Feedback',
    users: 'Nutzer',
    ads: 'Anzeigen',
    news: 'News / Infos',
    reports: 'Meldungen',
    chat: 'Chat',
    analytics: 'Analytics',
    auditlog: 'Audit Log',
    coachlog: 'Schüler-Coaching Log',
};

export default function AdminLayout() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [openReports, setOpenReports] = useState(0);
    const [openTickets, setOpenTickets] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Determine active tab from hash or query param - Defaults to 'overview' as first item
    const hash = location.hash.replace('#', '');
    const params = new URLSearchParams(location.search);
    const activeTab = params.get('tab') || hash || 'overview';

    useEffect(() => {
        if (!isAdmin) {
            navigate('/', { replace: true });
        }
    }, [isAdmin, navigate]);

    useEffect(() => {
        let cancelled = false;
        const fetchCounts = async () => {
            try {
                const { data, error } = await api.admin.overview();
                if (cancelled || error) return;
                const stats = (data as any)?.stats;
                setOpenReports(Number(stats?.open_reports) || 0);
                setOpenTickets(Number(stats?.open_tickets) || 0);
            } catch {
                /* Zähler optional – Badge bleibt bei Fehler auf 0 */
            }
        };
        fetchCounts();
        window.addEventListener('focus', fetchCounts);
        window.addEventListener('admin:counts-refresh', fetchCounts);
        return () => {
            cancelled = true;
            window.removeEventListener('focus', fetchCounts);
            window.removeEventListener('admin:counts-refresh', fetchCounts);
        };
    }, [location.search]);

    if (!isAdmin) return null;

    const breadcrumbs = ['Admin Panel', TAB_LABELS[activeTab] || 'Übersicht'];

    const handleNavClick = (value: string) => {
        navigate(`?tab=${value}`);
        setSidebarOpen(false);
    };

    const sidebarContent = (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <Logo className="size-5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground">SV Admin Panel</span>
                <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="-mr-2 h-11 w-11 shrink-0 rounded-full xl:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Menü schließen"
                >
                    <X size={20} aria-hidden />
                </Button>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3" aria-label="SV-Admin-Navigation">
                {NAV_ITEMS.map(({ label, value, icon: Icon }) => {
                    const isActive = activeTab === value;
                    const count = value === 'reports' ? openReports : value === 'support' ? openTickets : 0;
                    return (
                        <Button
                            variant="unstyled"
                            size="unstyled"
                            type="button"
                            key={value}
                            onClick={() => handleNavClick(value)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                                isActive
                                    ? 'border-primary/30 bg-primary/15 font-semibold text-foreground dark:border-primary/25'
                                    : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <Icon
                                size={20}
                                aria-hidden
                                className={cn('shrink-0', isActive ? 'text-brand-ink dark:text-primary' : 'text-muted-foreground')}
                            />
                            <span className="min-w-0 flex-1 break-words">{label}</span>
                            {count > 0 && (
                                <span
                                    className={cn(
                                        'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
                                        value === 'reports'
                                            ? 'bg-destructive/10 text-destructive'
                                            : 'bg-primary/20 text-brand-ink dark:text-primary'
                                    )}
                                >
                                    {count > 9 ? '9+' : count}
                                </span>
                            )}
                        </Button>
                    );
                })}
            </nav>

            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground">
                FWG Nachhilfebörse · SV Admin
            </div>
        </div>
    );

    return (
        <div className="flex min-h-full shrink-0 flex-col bg-background md:flex-row">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent
                    side="left"
                    showCloseButton={false}
                    className="w-80 max-w-[85vw] gap-0 border-r border-border bg-card p-0"
                >
                    <SheetTitle className="sr-only">Admin-Menü</SheetTitle>
                    <SheetDescription className="sr-only">Navigation im SV-Admin-Panel</SheetDescription>
                    {sidebarContent}
                </SheetContent>
            </Sheet>

            <aside className="hidden w-64 shrink-0 flex-col border-border bg-card/60 xl:sticky xl:top-0 xl:flex xl:h-[calc(100dvh-2rem)] xl:self-start xl:border-r">
                {sidebarContent}
            </aside>

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Top bar */}
                <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="-ml-2 h-11 w-11 shrink-0 rounded-full xl:hidden"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Menü öffnen"
                    >
                        <Menu size={22} aria-hidden />
                    </Button>

                    {/* Breadcrumbs */}
                    <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
                        {breadcrumbs.map((crumb, i) => (
                            <span key={crumb} className="flex min-w-0 items-center gap-1.5">
                                {i > 0 && <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />}
                                <span
                                    className={cn(
                                        'min-w-0 truncate',
                                        i === breadcrumbs.length - 1
                                            ? 'font-semibold text-foreground'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {crumb}
                                </span>
                            </span>
                        ))}
                    </nav>

                    <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive xl:flex">
                        <ShieldCheck size={16} aria-hidden />
                        SV Einsicht aktiv
                    </span>
                </header>

                {/* Page content */}
                <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-8 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
