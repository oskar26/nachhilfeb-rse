import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
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
    };

    return (
        <div className="flex min-h-full min-w-0 flex-col bg-background">
            <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
                <div className="flex min-h-16 items-center gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
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

                    <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
                        <ShieldCheck size={16} aria-hidden />
                        SV Einsicht aktiv
                    </span>
                </div>

                <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto px-3 pb-2 sm:px-5" aria-label="SV-Admin-Navigation">
                    {NAV_ITEMS.map(({ label, value, icon: Icon }) => {
                        const isActive = activeTab === value;
                        const count = value === 'reports' ? openReports : value === 'support' ? openTickets : 0;
                        return (
                            <Button
                                key={value}
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => handleNavClick(value)}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'shrink-0 justify-start gap-2 px-3',
                                    isActive
                                        ? 'bg-muted text-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                            >
                                <Icon size={16} aria-hidden />
                                <span className="whitespace-nowrap">{label}</span>
                                {count > 0 && (
                                    <span
                                        className={cn(
                                            'ml-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums',
                                            value === 'reports'
                                                ? 'bg-destructive/10 text-destructive'
                                                : 'bg-muted text-foreground'
                                        )}
                                    >
                                        {count > 9 ? '9+' : count}
                                    </span>
                                )}
                            </Button>
                        );
                    })}
                </nav>
            </header>

            <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-8 sm:p-6">
                <Outlet />
            </main>
        </div>
    );
}
