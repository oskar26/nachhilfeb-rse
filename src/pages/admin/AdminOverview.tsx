import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import {
    Users,
    FileText,
    AlertTriangle,
    Ban,
    ArrowUpRight,
    ShieldCheck,
    Clock,
    UserPlus,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Stats {
    users: number;
    ads: number;
    reports: number;
    banned: number;
    verified: number;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    subValue: string;
    color?: 'default' | 'amber' | 'red' | 'blue' | 'green';
    onClick?: () => void;
}

function StatCard({ icon, label, value, subValue, color = 'default', onClick }: StatCardProps) {
    const valueClass = {
        default: '',
        amber: 'text-amber-600',
        red: 'text-red-600',
        blue: 'text-blue-600',
        green: 'text-green-600',
    }[color];

    return (
        <Card
            className={cn(
                'rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 hover:shadow-md transition-all',
                onClick && 'cursor-pointer active:scale-[0.98]'
            )}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        {icon}
                    </div>
                    {onClick ? (
                        <button
                            type="button"
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600"
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                        >
                            <ArrowUpRight size={16} />
                        </button>
                    ) : (
                        <ArrowUpRight size={16} className="text-gray-300" />
                    )}
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                    <div className={cn('text-3xl font-bold tracking-tight', valueClass)}>{value}</div>
                    <p className="text-xs text-gray-400 font-medium">{subValue}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdminOverview() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats>({ users: 0, ads: 0, reports: 0, banned: 0, verified: 0 });
    const [recentReports, setRecentReports] = useState<any[]>([]);
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [
                { count: userCount },
                { count: verifiedCount },
                { count: bannedCount },
                { count: adCount },
                { count: reportCount },
                { data: reports },
                { data: users },
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
                supabase.from('ads').select('*', { count: 'exact', head: true }),
                supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
                supabase
                    .from('reports')
                    .select('id, reason, status, created_at, reporter:reporter_id(display_name), user:reported_user_id(display_name)')
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase
                    .from('profiles')
                    .select('id, display_name, first_name, last_name, email, created_at, role')
                    .order('created_at', { ascending: false })
                    .limit(5),
            ]);

            setStats({
                users: userCount || 0,
                verified: verifiedCount || 0,
                banned: bannedCount || 0,
                ads: adCount || 0,
                reports: reportCount || 0,
            });
            setRecentReports(reports || []);
            setRecentUsers(users || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const navTo = (tab: string) => navigate(`?tab=${tab}`);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Page title */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Übersicht</h1>
                <p className="text-gray-500 text-sm mt-1">Zusammenfassung des aktuellen Systemstatus</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Users className="text-blue-500" size={20} />}
                    label="Nutzer"
                    value={stats.users}
                    subValue={`${stats.verified} verifiziert`}
                    color="blue"
                    onClick={() => navTo('users')}
                />
                <StatCard
                    icon={<FileText className="text-green-500" size={20} />}
                    label="Anzeigen"
                    value={stats.ads}
                    subValue="Aktive Angebote"
                    color="green"
                    onClick={() => navTo('ads')}
                />
                <StatCard
                    icon={<AlertTriangle className="text-amber-500" size={20} />}
                    label="Offene Meldungen"
                    value={stats.reports}
                    subValue="Handlungsbedarf"
                    color="amber"
                    onClick={() => navTo('reports')}
                />
                <StatCard
                    icon={<Ban className="text-red-500" size={20} />}
                    label="Gesperrt"
                    value={stats.banned}
                    subValue="Inaktive Accounts"
                    color="red"
                    onClick={() => navTo('users')}
                />
            </div>

            {/* Quick actions */}
            <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Schnellzugriff</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Nutzerverwaltung', icon: <Users size={18} />, tab: 'users', color: 'blue' },
                        { label: 'Meldungen prüfen', icon: <AlertTriangle size={18} />, tab: 'reports', color: 'amber' },
                        { label: 'Codes verwalten', icon: <ShieldCheck size={18} />, tab: 'codes', color: 'green' },
                        { label: 'Audit Log', icon: <Clock size={18} />, tab: 'auditlog', color: 'gray' },
                    ].map(({ label, icon, tab, color }) => (
                        <button
                            key={tab}
                            onClick={() => navTo(tab)}
                            className={cn(
                                'flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border dark:border-gray-800 shadow-sm hover:shadow-md transition-all text-left font-medium text-sm',
                                `hover:border-${color}-200 dark:hover:border-${color}-900`
                            )}
                        >
                            <span className={`text-${color}-500`}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent reports */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <AlertTriangle size={16} className="text-amber-500" />
                            Letzte Meldungen
                        </div>
                        <button onClick={() => navTo('reports')} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1">
                            Alle <ArrowUpRight size={12} />
                        </button>
                    </div>
                    <div className="divide-y dark:divide-gray-800">
                        {loading ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Lade...</div>
                        ) : recentReports.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Keine Meldungen vorhanden.</div>
                        ) : (
                            recentReports.map((r) => (
                                <div key={r.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="font-medium text-sm">{r.reason || r.category || 'Kein Grund angegeben'}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {(r.reporter as any)?.display_name || 'Anonym'} → {(r.user as any)?.display_name || 'Unbekannt'}
                                            </div>
                                        </div>
                                        <span className={cn(
                                            'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                            r.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                        )}>
                                            {r.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent users */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <UserPlus size={16} className="text-blue-500" />
                            Neue Nutzer
                        </div>
                        <button onClick={() => navTo('users')} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1">
                            Alle <ArrowUpRight size={12} />
                        </button>
                    </div>
                    <div className="divide-y dark:divide-gray-800">
                        {loading ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Lade...</div>
                        ) : recentUsers.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Keine Nutzer gefunden.</div>
                        ) : (
                            recentUsers.map((u) => (
                                <div key={u.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary-hover text-sm shrink-0">
                                        {(u.display_name || u.first_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{u.display_name || `${u.first_name} ${u.last_name}`}</div>
                                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                                    </div>
                                    {u.role === 'sv_admin' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 uppercase shrink-0">
                                            Admin
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
