import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    BellOff,
    MessageSquare,
    Heart,
    AlertTriangle,
    Star,
    Zap,
    CheckCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

// ── Types ────────────────────────────────────────────────────────

type NotificationType = 'message' | 'like' | 'alert' | 'review' | 'match' | string;

interface AppNotification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string;
    read: boolean;
    created_at: string;
    link?: string;
}

interface Props {
    unreadCount: number;
    onCountChange: (n: number) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function typeIcon(type: NotificationType) {
    switch (type) {
        case 'message': return <MessageSquare size={16} className="text-blue-500" />;
        case 'like':    return <Heart size={16} className="text-rose-500" />;
        case 'alert':   return <AlertTriangle size={16} className="text-amber-500" />;
        case 'review':  return <Star size={16} className="text-yellow-500" />;
        case 'match':   return <Zap size={16} className="text-purple-500" />;
        default:        return <Bell size={16} className="text-gray-400" />;
    }
}

function relativeTime(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)          return 'gerade eben';
    if (diff < 3600)        return `vor ${Math.floor(diff / 60)} Min`;
    if (diff < 86400)       return `vor ${Math.floor(diff / 3600)} Std`;
    const d = new Date(iso);
    return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}

function groupByDate(notifications: AppNotification[]): Record<string, AppNotification[]> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 6 * 86400000;

    const groups: Record<string, AppNotification[]> = {
        'Heute': [],
        'Gestern': [],
        'Diese Woche': [],
        'Älter': [],
    };

    for (const n of notifications) {
        const t = new Date(n.created_at).getTime();
        if (t >= startOfToday)     groups['Heute'].push(n);
        else if (t >= startOfYesterday) groups['Gestern'].push(n);
        else if (t >= startOfWeek) groups['Diese Woche'].push(n);
        else                        groups['Älter'].push(n);
    }

    // Remove empty groups
    return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
}

// ── Component ────────────────────────────────────────────────────

export default function NotificationCenter({ onCountChange }: Props) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // ── Fetch ──────────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                // Table likely doesn't exist yet — graceful fallback
                if (error.code === '42P01') {
                    setNotifications([]);
                    setUnread(0);
                    onCountChange(0);
                    return;
                }
                throw error;
            }

            const list = (data ?? []) as AppNotification[];
            setNotifications(list);
            const count = list.filter(n => !n.read).length;
            setUnread(count);
            onCountChange(count);
        } catch (e) {
            console.error('[NotificationCenter] fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [user, onCountChange]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ── Realtime subscription ──────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                () => { fetchNotifications(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, fetchNotifications]);

    // ── Click outside ──────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // ── Mark all as read ───────────────────────────────────────────
    const markAllRead = async () => {
        if (!user || notifications.every(n => n.read)) return;
        const ids = notifications.filter(n => !n.read).map(n => n.id);
        await supabase.from('notifications').update({ read: true }).in('id', ids);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnread(0);
        onCountChange(0);
    };

    // ── Mark single as read & navigate ────────────────────────────
    const handleClick = async (n: AppNotification) => {
        if (!n.read) {
            await supabase.from('notifications').update({ read: true }).eq('id', n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
            const newCount = unread - 1;
            setUnread(newCount);
            onCountChange(newCount);
        }
        setOpen(false);
        if (n.link) navigate(n.link);
    };

    const groups = groupByDate(notifications);
    const hasNotifications = notifications.length > 0;

    return (
        <div className="relative">
            {/* Bell button */}
            <button
                ref={buttonRef}
                onClick={() => setOpen(o => !o)}
                className="relative p-2.5 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                aria-label="Benachrichtigungen"
            >
                <Bell size={20} />
                {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse" />
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div
                    ref={panelRef}
                    className={cn(
                        'fixed right-4 top-16 w-[calc(100vw-2rem)] max-w-[380px] max-h-[70vh] overflow-hidden',
                        'sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[380px] sm:max-h-[560px]',
                        'bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl',
                        'rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10',
                        'flex flex-col z-[9999]',
                        'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200'
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white text-sm">Benachrichtigungen</span>
                            {unread > 0 && (
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                    {unread}
                                </span>
                            )}
                        </div>
                        {hasNotifications && unread > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                            >
                                <CheckCheck size={13} />
                                Alle als gelesen
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto flex-1">
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {!loading && !hasNotifications && (
                            <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <BellOff size={24} className="text-gray-400" />
                                </div>
                                <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">Keine Benachrichtigungen</p>
                                <p className="text-xs text-gray-400">Du bist auf dem aktuellen Stand!</p>
                            </div>
                        )}

                        {!loading && hasNotifications && Object.entries(groups).map(([label, items]) => (
                            <div key={label}>
                                <p className="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    {label}
                                </p>
                                {items.map(n => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleClick(n)}
                                        className={cn(
                                            'w-full flex items-start gap-3 px-5 py-3 text-left transition-colors',
                                            'hover:bg-gray-50 dark:hover:bg-gray-800/60',
                                            !n.read && 'bg-primary/5 dark:bg-primary/10'
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {typeIcon(n.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug">
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                                                {n.body}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {relativeTime(n.created_at)}
                                            </p>
                                        </div>

                                        {/* Unread dot */}
                                        {!n.read && (
                                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
