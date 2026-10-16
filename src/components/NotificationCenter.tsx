import { useEffect, useRef, useState, useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    motion,
    AnimatePresence,
    useDragControls,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
} from 'framer-motion';
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
import { api } from '../lib/api';
import { startNotificationPoll } from '../lib/polling';
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
    /**
     * 'desktop': Glocke (Sidebar) + Dropdown.
     * 'sticker': schwebender Poster-Sticker oben rechts + Bottom-Sheet (mobil).
     */
    variant?: 'desktop' | 'sticker';
    /** Scroll-Container des App-Inhalts — steuert Schrumpfen/Fade des Stickers. */
    scrollRef?: RefObject<HTMLElement | null>;
}

// ── Helpers ──────────────────────────────────────────────────────

function typeIcon(type: NotificationType) {
    switch (type) {
        case 'message': return <MessageSquare size={16} className="text-blue-400" />;
        case 'like':    return <Heart size={16} className="text-rose-400" />;
        case 'alert':   return <AlertTriangle size={16} className="text-amber-400" />;
        case 'review':  return <Star size={16} className="text-primary" />;
        case 'match':   return <Zap size={16} className="text-violet-400" />;
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

export default function NotificationCenter({ onCountChange, variant = 'desktop', scrollRef }: Props) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dragControls = useDragControls();
    const reduceMotion = useReducedMotion();

    // Sticker schrumpft/fadet dezent beim Scrollen des Inhalts
    const { scrollY } = useScroll({ container: scrollRef });
    const stickerScale = useSpring(useTransform(scrollY, [0, 64], [1, 0.84]), { stiffness: 320, damping: 30 });
    const stickerOpacity = useSpring(useTransform(scrollY, [0, 96], [1, 0.55]), { stiffness: 320, damping: 30 });

    // ── Fetch ──────────────────────────────────────────────────────
    // silent=true: kein Spinner-Flash, Liste bleibt stehen (gegen Flackern)
    const fetchNotifications = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setLoading(true);
        try {
            // 30 Einträge — identisch zum bisherigen Verhalten der Supabase-Attrappe (limit(50) war dort wirkungslos).
            const { data, error } = await api.notifications.list(30);

            if (error) throw error;

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
        fetchNotifications(false);
    }, [fetchNotifications]);

    // ── Live-Aktualisierung (Polling ersetzt den früheren Realtime-Kanal) ──
    useEffect(() => {
        if (!user) return;

        const stopPolling = startNotificationPoll(() => { fetchNotifications(true); });

        return stopPolling;
    }, [user, fetchNotifications]);

    // ── Click outside + Escape ─────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const clickHandler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        const keyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', clickHandler);
        window.addEventListener('keydown', keyHandler);
        return () => {
            document.removeEventListener('mousedown', clickHandler);
            window.removeEventListener('keydown', keyHandler);
        };
    }, [open]);

    const toggleOpen = () => {
        triggerHaptic('light');
        const willOpen = !open;
        setOpen(willOpen);
        // Beim Öffnen still aktualisieren (kein Spinner-Flash)
        if (willOpen) fetchNotifications(true);
    };

    const startSheetDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (reduceMotion) return;
        if ((e.target as Element).closest('button')) return;
        dragControls.start(e);
    };

    // ── Mark all as read ───────────────────────────────────────────
    const markAllRead = async () => {
        if (!user || notifications.every(n => n.read)) return;
        triggerHaptic('medium');
        const ids = notifications.filter(n => !n.read).map(n => n.id);
        await api.notifications.markRead(ids);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnread(0);
        onCountChange(0);
    };

    // ── Mark single as read & navigate ────────────────────────────
    const handleClick = async (n: AppNotification) => {
        triggerHaptic('light');
        if (!n.read) {
            await api.notifications.markRead(n.id);
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
    const badgeCount = unread > 99 ? '99+' : unread;
    const triggerLabel = unread > 0 ? `Benachrichtigungen, ${unread} ungelesen` : 'Benachrichtigungen';

    const headerContent = (
        <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-[#faf7ef] poster-grain-dark px-5 pb-4 pt-3.5 text-gray-900">
            <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                    <h2 className="font-display text-base uppercase leading-none tracking-tight">Meldungen</h2>
                    {unread > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-black leading-none text-gray-950 tabular-nums">
                            {badgeCount}
                        </span>
                    )}
                </div>
                <span className="mt-2 block h-1 w-10 rounded-full bg-primary" aria-hidden />
            </div>
            {hasNotifications && unread > 0 && (
                <button
                    type="button"
                    onClick={markAllRead}
                    className="press flex shrink-0 items-center gap-1.5 rounded-full border border-black/15 px-3 py-2 text-[11px] font-bold text-gray-700 transition-colors hover:border-primary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <CheckCheck size={13} />
                    Alle als gelesen
                </button>
            )}
        </div>
    );

    const listContent = (
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}

            {!loading && !hasNotifications && (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-black ring-1 ring-black/5">
                        <BellOff size={24} />
                    </div>
                    <p className="font-display text-lg uppercase leading-none tracking-tight text-gray-900 dark:text-gray-50">Nichts Neues</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Du bist auf dem aktuellen Stand.</p>
                </div>
            )}

            {!loading && hasNotifications && Object.entries(groups).map(([label, items]) => (
                <div key={label} className="mb-1 last:mb-0">
                    <p className="px-2 pb-1.5 pt-2 font-display text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {label}
                    </p>
                    <div className="flex flex-col gap-2">
                        {items.map(n => (
                            <motion.button
                                key={n.id}
                                type="button"
                                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                                onClick={() => handleClick(n)}
                                className={cn(
                                    'flex w-full select-none cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                    n.read
                                        ? 'border-gray-200/90 bg-white/85 hover:bg-white dark:border-gray-800 dark:bg-gray-900/70 dark:hover:bg-gray-900'
                                        : 'border-primary/45 bg-primary/[0.07] hover:bg-primary/10 dark:border-primary/30 dark:bg-primary/[0.06] dark:hover:bg-primary/10'
                                )}
                            >
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary ring-1 ring-black/5">
                                    {typeIcon(n.type)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-bold leading-snug text-gray-900 dark:text-gray-50">
                                        {n.title}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-gray-500 line-clamp-2 dark:text-gray-400">
                                        {n.body}
                                    </span>
                                    <span className="mt-1.5 block text-[10px] font-semibold tabular-nums text-gray-400 dark:text-gray-500">
                                        {relativeTime(n.created_at)}
                                    </span>
                                </span>
                                {!n.read && (
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            {variant === 'desktop' ? (
                <div className="relative">
                    {/* Glocke (Sidebar) */}
                    <motion.button
                        ref={buttonRef}
                        type="button"
                        whileHover={reduceMotion ? undefined : { scale: 1.08 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                        onClick={toggleOpen}
                        className="relative select-none cursor-pointer rounded-2xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                        aria-label={triggerLabel}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                    >
                        <Bell size={20} />
                        {unread > 0 && (
                            <span className="absolute right-1.5 top-1.5 grid place-items-center" aria-hidden>
                                <span className="absolute inset-0 animate-ping rounded-full bg-primary/70" />
                                <span className="relative h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-gray-900" />
                            </span>
                        )}
                    </motion.button>
                </div>
            ) : (
                /* Aufgeklebter Sticker — mobil, oben rechts unter der Safe-Area */
                <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 md:hidden">
                    <motion.div style={reduceMotion ? undefined : { scale: stickerScale, opacity: stickerOpacity }}>
                        <motion.button
                            ref={buttonRef}
                            type="button"
                            onClick={toggleOpen}
                            initial={reduceMotion ? false : { scale: 0.4, rotate: -24, opacity: 0 }}
                            animate={{ scale: 1, rotate: -6, opacity: 1 }}
                            whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: -2 }}
                            whileTap={reduceMotion ? undefined : { scale: 0.9, rotate: -9 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                            className={cn(
                                'relative grid h-14 w-14 select-none cursor-pointer place-items-center rounded-2xl bg-primary text-black shadow-[0_14px_30px_-10px_rgba(0,0,0,0.35)] ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                unread > 0 ? 'ring-primary/60' : 'ring-black/10'
                            )}
                            aria-label={triggerLabel}
                            aria-haspopup="dialog"
                            aria-expanded={open}
                        >
                            <span className="absolute top-2 h-1 w-10 rounded-full bg-black/20" aria-hidden />
                            <Bell size={22} strokeWidth={2.25} className="mt-1.5" />
                            {unread > 0 && (
                                <span className="absolute -right-1.5 -top-1.5 grid place-items-center">
                                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/70" aria-hidden />
                                    <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black leading-none text-gray-950 ring-2 ring-[#f8f9fa] tabular-nums dark:ring-gray-950">
                                        {badgeCount}
                                    </span>
                                </span>
                            )}
                        </motion.button>
                    </motion.div>
                </div>
            )}

            {/* Panel (Portal: immun gegen backdrop-blur/overflow der Header) */}
            {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
                {open && variant === 'desktop' && (
                    <motion.div
                        key="desktop-panel"
                        ref={panelRef}
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 6 }}
                        transition={{ type: 'tween', duration: 0.16, ease: 'easeOut' }}
                        className="fixed right-6 top-[4.5rem] z-[9999] hidden max-h-[520px] w-[380px] flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-[#faf7ef] shadow-2xl dark:border-gray-800 dark:bg-gray-950 md:flex"
                    >
                        {headerContent}
                        {listContent}
                    </motion.div>
                )}

                {open && variant === 'sticker' && (
                    <motion.div
                        key="mobile-scrim"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-[9998] bg-gray-950/60 backdrop-blur-[2px] md:hidden"
                        aria-hidden
                    />
                )}

                {open && variant === 'sticker' && (
                    <motion.div
                        key="mobile-sheet"
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Meldungen"
                        initial={reduceMotion ? false : { y: '100%' }}
                        animate={{ y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
                        drag={reduceMotion ? false : 'y'}
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.6 }}
                        dragMomentum={false}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 110 || info.velocity.y > 700) setOpen(false);
                        }}
                        className="fixed inset-x-0 bottom-0 z-[9999] flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-x border-t border-gray-200/80 bg-[#faf7ef] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.6)] dark:border-gray-800 dark:bg-gray-950 md:hidden"
                    >
                        {/* Griff + schwarzer Kopf = Drag-Zone (Buttons ausgenommen) */}
                        <div
                            className="shrink-0 cursor-grab select-none touch-none bg-[#faf7ef] poster-grain-dark pt-3"
                            onPointerDown={startSheetDrag}
                        >
                            <div className="flex justify-center">
                                <span className="h-1.5 w-12 rounded-full bg-black/15" aria-hidden />
                            </div>
                            {headerContent}
                        </div>
                        {listContent}
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
            )}
        </>
    );
}
