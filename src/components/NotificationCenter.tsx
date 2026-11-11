import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useEffect, useState, useCallback } from 'react';
import type { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    motion,
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
    X,
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
        default:        return <Bell size={16} className="text-muted-foreground" />;
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
    const reduceMotion = useReducedMotion();

    // Sticker schrumpft/fadet dezent beim Scrollen des Inhalts
    const { scrollY } = useScroll({ container: scrollRef });
    const stickerScale = useSpring(useTransform(scrollY, [0, 64], [1, 0.95]), { stiffness: 320, damping: 30 });
    const stickerOpacity = useSpring(useTransform(scrollY, [0, 96], [1, 0.8]), { stiffness: 320, damping: 30 });

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

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) triggerHaptic('light');
        setOpen(nextOpen);
        // Beim Öffnen still aktualisieren (kein Spinner-Flash)
        if (nextOpen) fetchNotifications(true);
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
        <div className="flex items-center justify-between gap-3 border-b border-border bg-background poster-grain-dark px-5 pb-4 pt-3.5 text-foreground">
            <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                    <h2 className="font-display text-base uppercase leading-none tracking-tight">Meldungen</h2>
                    {unread > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-black leading-none text-primary-foreground tabular-nums">
                            {badgeCount}
                        </span>
                    )}
                </div>
                <span className="mt-2 block h-1 w-10 rounded-full bg-primary" aria-hidden />
            </div>
            {hasNotifications && unread > 0 && (
                <Button variant="unstyled" size="unstyled"
                    type="button"
                    onClick={markAllRead}
                    className="press flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <CheckCheck size={13} />
                    Alle als gelesen
                </Button>
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
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground ring-1 ring-black/5">
                        <BellOff size={24} />
                    </div>
                    <p className="font-display text-lg uppercase leading-none tracking-tight text-foreground">Nichts Neues</p>
                    <p className="text-xs text-muted-foreground">Du bist auf dem aktuellen Stand.</p>
                </div>
            )}

            {!loading && hasNotifications && Object.entries(groups).map(([label, items]) => (
                <div key={label} className="mb-1 last:mb-0">
                    <p className="px-2 pb-1.5 pt-2 font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {label}
                    </p>
                    <div className="flex flex-col gap-2">
                        {items.map(n => (
                            <Button
                                key={n.id}
                                variant="unstyled"
                                size="unstyled"
                                hapticStyle={false}
                                type="button"
                                onClick={() => handleClick(n)}
                                className={cn(
                                    'flex w-full select-none cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                    n.read
                                        ? 'border-border bg-card/85 hover:bg-card'
                                        : 'border-primary/45 bg-primary/[0.07] hover:bg-primary/10 dark:border-primary/30 dark:bg-primary/[0.06] dark:hover:bg-primary/10'
                                )}
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary ring-1 ring-black/5">
                                    {typeIcon(n.type)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold leading-snug text-foreground">
                                        {n.title}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground line-clamp-2 dark:text-muted-foreground">
                                        {n.body}
                                    </span>
                                    <span className="mt-1.5 block text-xs font-semibold tabular-nums text-muted-foreground dark:text-muted-foreground">
                                        {relativeTime(n.created_at)}
                                    </span>
                                </span>
                                {!n.read && (
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                                )}
                            </Button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const desktopTrigger = (
        <Button
            variant="unstyled"
            size="unstyled"
            hapticStyle={false}
            type="button"
            className="relative grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={triggerLabel}
        >
            <Bell size={20} />
            {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 grid place-items-center" aria-hidden>
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/70" />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                </span>
            )}
        </Button>
    );

    const mobileTrigger = (
        <Button
            variant="unstyled"
            size="unstyled"
            hapticStyle={false}
            type="button"
            className={cn(
                'relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground ring-1 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                unread > 0 ? 'ring-primary/60' : 'ring-foreground/10'
            )}
            aria-label={triggerLabel}
        >
            <Bell size={20} strokeWidth={2} aria-hidden />
            {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid place-items-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/70" aria-hidden />
                    <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-black leading-none text-primary-foreground ring-2 ring-card tabular-nums">
                        {badgeCount}
                    </span>
                </span>
            )}
        </Button>
    );

    if (variant === 'desktop') {
        return (
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger render={desktopTrigger} />
                <PopoverContent
                    align="end"
                    sideOffset={8}
                    aria-label="Meldungen"
                    className="hidden max-h-[520px] w-[380px] flex-col overflow-hidden rounded-t-3xl border border-border bg-background p-0 shadow-overlay md:flex"
                >
                    {headerContent}
                    {listContent}
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <motion.div style={reduceMotion ? undefined : { scale: stickerScale, opacity: stickerOpacity }}>
                <SheetTrigger render={mobileTrigger} />
            </motion.div>
            <SheetContent
                side="bottom"
                showCloseButton={false}
                className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-3xl border-x border-t border-border bg-background p-0 md:hidden"
            >
                <SheetTitle className="sr-only">Meldungen</SheetTitle>
                <SheetDescription className="sr-only">Benachrichtigungen und Aktivitäten</SheetDescription>
                <div className="shrink-0 bg-background poster-grain-dark pt-3">
                    <div className="relative flex justify-center pb-1">
                        <span className="h-1.5 w-12 rounded-full bg-black/15" aria-hidden />
                        <SheetClose className="absolute right-4 top-0 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-card/10">
                            <X size={18} />
                            <span className="sr-only">Schließen</span>
                        </SheetClose>
                    </div>
                    {headerContent}
                </div>
                {listContent}
            </SheetContent>
        </Sheet>
    );
}
