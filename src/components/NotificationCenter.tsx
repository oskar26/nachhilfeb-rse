import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { triggerHaptic } from '../lib/haptics';

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

    const toggleOpen = () => {
        triggerHaptic('light');
        setOpen(o => !o);
    };

    // ── Mark all as read ───────────────────────────────────────────
    const markAllRead = async () => {
        if (!user || notifications.every(n => n.read)) return;
        triggerHaptic('medium');
        const ids = notifications.filter(n => !n.read).map(n => n.id);
        await supabase.from('notifications').update({ read: true }).in('id', ids);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnread(0);
        onCountChange(0);
    };

    // ── Mark single as read & navigate ────────────────────────────
    const handleClick = async (n: AppNotification) => {
        triggerHaptic('light');
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
            <motion.button
                ref={buttonRef}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleOpen}
                className="relative p-2.5 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none cursor-pointer"
                aria-label="Benachrichtigungen"
            >
                <Bell size={20} />
                {unread > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse"
                    />
                )}
            </motion.button>

            {/* Dropdown panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className={cn(
                            // Mobile: fixed below header bar
                            'fixed left-3 right-3 top-[4.5rem]',
                            // Desktop: absolute positioning anchored smoothly
                            'md:absolute md:left-auto md:-right-2 md:top-12 md:w-84 md:max-w-sm',
                            'max-h-[70vh] md:max-h-[520px] overflow-hidden',
                            'bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl',
                            'rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-800',
                            'flex flex-col z-[9999]'
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white text-sm">Benachrichtigungen</span>
                                {unread > 0 && (
                                    <span className="px-2 py-0.5 bg-primary/20 text-yellow-900 dark:text-yellow-200 text-xs font-black rounded-full">
                                        {unread}
                                    </span>
                                )}
                            </div>
                            {hasNotifications && unread > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1.5 text-xs text-primary-hover font-bold hover:underline"
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
                                <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
                                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <BellOff size={24} className="text-gray-400" />
                                    </div>
                                    <p className="font-bold text-sm text-gray-700 dark:text-gray-300">Keine Benachrichtigungen</p>
                                    <p className="text-xs text-gray-400">Du bist auf dem aktuellen Stand!</p>
                                </div>
                            )}

                            {!loading && hasNotifications && Object.entries(groups).map(([label, items]) => (
                                <div key={label}>
                                    <p className="px-5 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                                        {label}
                                    </p>
                                    {items.map(n => (
                                        <motion.button
                                            key={n.id}
                                            whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.03)" }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleClick(n)}
                                            className={cn(
                                                'w-full flex items-start gap-3 px-5 py-3 text-left transition-colors select-none cursor-pointer',
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
                                        </motion.button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
