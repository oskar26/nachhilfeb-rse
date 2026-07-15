import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
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
    Menu,
    X,
    Megaphone,
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Übersicht', value: 'overview', icon: LayoutDashboard },
    { label: 'Nutzer', value: 'users', icon: Users },
    { label: 'Anzeigen', value: 'ads', icon: FileText },
    { label: 'News / Infos', value: 'news', icon: Megaphone },
    { label: 'Meldungen', value: 'reports', icon: AlertTriangle },
    { label: 'Chat', value: 'chat', icon: MessageSquare },
    { label: 'Codes', value: 'codes', icon: Key },
    { label: 'Analytics', value: 'analytics', icon: BarChart2 },
    { label: 'Audit Log', value: 'auditlog', icon: ClipboardList },
];

const TAB_LABELS: Record<string, string> = {
    overview: 'Übersicht',
    users: 'Nutzer',
    ads: 'Anzeigen',
    news: 'News / Infos',
    reports: 'Meldungen',
    chat: 'Chat',
    codes: 'Codes',
    analytics: 'Analytics',
    auditlog: 'Audit Log',
};

export default function AdminLayout() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [openReports, setOpenReports] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Determine active tab from hash or query param
    const hash = location.hash.replace('#', '');
    const params = new URLSearchParams(location.search);
    const activeTab = params.get('tab') || hash || 'overview';

    useEffect(() => {
        if (!isAdmin) {
            navigate('/', { replace: true });
        }
    }, [isAdmin, navigate]);

    useEffect(() => {
        const fetchOpenReports = async () => {
            const { count } = await supabase
                .from('reports')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open');
            setOpenReports(count || 0);
        };
        fetchOpenReports();
    }, []);

    if (!isAdmin) return null;

    const breadcrumbs = ['Admin Panel', TAB_LABELS[activeTab] || 'Übersicht'];

    const handleNavClick = (value: string) => {
        navigate(`?tab=${value}`);
        setSidebarOpen(false);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col transform transition-transform duration-200 md:translate-x-0 md:static md:z-auto',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Sidebar header */}
                <div className="h-16 flex items-center gap-3 px-6 border-b dark:border-gray-800 shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary-hover">
                        <ShieldCheck size={18} />
                    </div>
                    <span className="font-bold text-base tracking-tight">SV Admin Panel</span>
                    <button
                        className="ml-auto md:hidden text-gray-400 hover:text-gray-600"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(({ label, value, icon: Icon }) => {
                        const isActive = activeTab === value;
                        return (
                            <button
                                key={value}
                                onClick={() => handleNavClick(value)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-primary/10 text-primary-hover font-bold'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                )}
                            >
                                <Icon size={18} className={isActive ? 'text-primary-hover' : 'text-gray-400'} />
                                <span className="flex-1 text-left">{label}</span>
                                {value === 'reports' && openReports > 0 && (
                                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-black">
                                        {openReports > 9 ? '9+' : openReports}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Sidebar footer */}
                <div className="p-4 border-t dark:border-gray-800 text-[10px] text-gray-400 text-center">
                    FWG Nachhilfebörse · SV Admin
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-16 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex items-center gap-4 px-6 shrink-0">
                    <button
                        className="md:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={22} />
                    </button>

                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
                        {breadcrumbs.map((crumb, i) => (
                            <span key={crumb} className="flex items-center gap-1.5">
                                {i > 0 && <ChevronRight size={14} className="text-gray-400" />}
                                <span
                                    className={cn(
                                        i === breadcrumbs.length - 1
                                            ? 'font-bold text-gray-900 dark:text-white'
                                            : 'text-gray-400'
                                    )}
                                >
                                    {crumb}
                                </span>
                            </span>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <span className="hidden md:flex items-center gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-3 py-1.5 rounded-full font-bold border border-red-100 dark:border-red-900/40">
                            <ShieldCheck size={12} />
                            SV Einsicht aktiv
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
