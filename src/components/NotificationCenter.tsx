import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
import { useReducedMotion } from 'motion/react';
import { EASE_STANDARD, m } from '../lib/motion';

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
    /** Optional kontrolliertes Öffnen (z. B. aus dem MobileQuickMenu). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Blendet den eingebauten Trigger aus, wenn der Aufrufer ihn ersetzt. */
    hideTrigger?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

function typeIcon(type: NotificationType) {
    switch (type) {
        case 'message': return <MessageSquare size={16} className="text-muted-foreground" />;
        case 'like':    return <Heart size={16} className="text-muted-foreground" />;
        case 'alert':   return <AlertTriangle size={16} className="text-destructive" />;
        case 'review':  return <Star size={16} className="text-muted-foreground" />;
        case 'match':   return <Zap size={16} className="text-muted-foreground" />;
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

export default function NotificationCenter({ unreadCount, onCountChange, variant = 'desktop', open: openProp, onOpenChange, hideTrigger = false }: Props) {
    const reduceMotion = useReducedMotion();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unread, setUnread] = useState(unreadCount);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [staleError, setStaleError] = useState(false);
    const notificationsRef = useRef<AppNotification[]>([]);
    const wasOpenRef = useRef(open);

    useEffect(() => {
        setUnread(unreadCount);
    }, [unreadCount]);

    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    // ── Fetch ──────────────────────────────────────────────────────
    // silent=true: kein Spinner-Flash, Liste bleibt stehen (gegen Flackern)
    const fetchNotifications = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) {
            setLoading(true);
            setLoadError(false);
            setStaleError(false);
        }
        try {
            // 30 Einträge — identisch zum bisherigen Verhalten der Supabase-Attrappe (limit(50) war dort wirkungslos).
            const { data, error } = await api.notifications.list(30);

            if (error) throw error;

            const list = (data ?? []) as AppNotification[];
            notificationsRef.current = list;
            setNotifications(list);
            setLoadError(false);
            setStaleError(false);
            const count = list.filter(n => !n.read).length;
            setUnread(count);
            onCountChange(count);
        } catch (e) {
            console.error('[NotificationCenter] fetch error:', e);
            if (silent && notificationsRef.current.length > 0) {
                setStaleError(true);
            } else {
                setLoadError(true);
            }
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

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            // Beim Öffnen still aktualisieren (kein Spinner-Flash) – auch
            // wenn der Aufrufer das Sheet kontrolliert öffnet.
            void fetchNotifications(true);
        }
        wasOpenRef.current = open;
    }, [open, fetchNotifications]);

    const handleOpenChange = (nextOpen: boolean) => {
        if (openProp === undefined) setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
        if (nextOpen) triggerHaptic('light');
    };

    // ── Mark all as read ───────────────────────────────────────────
    const markAllRead = async () => {
        if (!user || notifications.every(n => n.read)) return;
        triggerHaptic('medium');
        const ids = notifications.filter(n => !n.read).map(n => n.id);
        const { error } = await api.notifications.markRead(ids);
        if (error) {
            toast.error('Meldungen konnten nicht als gelesen markiert werden.');
            return;
        }
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnread(0);
        onCountChange(0);
    };

    // ── Mark single as read & navigate ────────────────────────────
    const handleClick = async (n: AppNotification) => {
        triggerHaptic('light');
        if (!n.read) {
            const { error } = await api.notifications.markRead(n.id);
            if (error) {
                toast.error('Meldung konnte nicht als gelesen markiert werden.');
            } else {
                setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                const newCount = Math.max(0, unread - 1);
                setUnread(newCount);
                onCountChange(newCount);
            }
        }
        // Ein fehlgeschlagenes Markieren darf die Navigation nicht blockieren.
        handleOpenChange(false);
        if (n.link) navigate(n.link);
    };

    const groups = groupByDate(notifications);
    const hasNotifications = notifications.length > 0;
    const badgeCount = unread > 99 ? '99+' : unread;
    const triggerLabel = unread > 0 ? `Benachrichtigungen, ${unread} ungelesen` : 'Benachrichtigungen';

    const headerContent = (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-5 pb-4 pt-3.5 text-foreground">
            <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-semibold leading-none">Meldungen</h2>
                    {unread > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-md bg-muted px-1.5 text-xs font-medium leading-none text-foreground tabular-nums">
                            {badgeCount}
                        </span>
                    )}
                </div>
            </div>
            {hasNotifications && unread > 0 && (
                <Button variant="unstyled" size="unstyled"
                    type="button"
                    onClick={markAllRead}
                    className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <CheckCheck size={13} />
                    Alle als gelesen
                </Button>
            )}
        </div>
    );

    const listContent = (
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 [scrollbar-width:thin]">
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                </div>
            )}

            {!loading && loadError && (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-muted text-muted-foreground">
                        <AlertTriangle size={24} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Meldungen konnten nicht geladen werden.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-11 min-h-11 text-xs"
                        onClick={() => fetchNotifications(false)}
                    >
                        Erneut versuchen
                    </Button>
                </div>
            )}

            {!loading && !loadError && !hasNotifications && (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-muted text-muted-foreground">
                        <BellOff size={24} />
                    </div>
                    <p className="text-lg font-semibold leading-none text-foreground">Nichts Neues</p>
                    <p className="text-xs text-muted-foreground">Du bist auf dem aktuellen Stand.</p>
                </div>
            )}

            {!loading && !loadError && staleError && hasNotifications && (
                <div className="mb-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    Aktualisierung fehlgeschlagen. Es werden die zuletzt geladenen Meldungen angezeigt.
                </div>
            )}

            {!loading && !loadError && hasNotifications && Object.entries(groups).map(([label, items]) => (
                <div key={label} className="mb-1 last:mb-0">
                    <p className="px-2 pb-1.5 pt-2 text-xs font-medium text-muted-foreground">
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
                                    'flex w-full select-none cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                                    n.read
                                        ? 'border-border bg-card hover:bg-muted/40'
                                        : 'border-foreground/20 bg-muted/50 hover:bg-muted'
                                )}
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
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
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-foreground" aria-hidden />
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
            className="relative grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={triggerLabel}
        >
            <m.span
                aria-hidden
                whileHover={reduceMotion ? undefined : { rotate: [0, -12, 10, -6, 0] }}
                whileTap={reduceMotion ? undefined : { scale: 0.88, rotate: -8 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_STANDARD }}
                className="inline-flex"
            >
                <Bell size={20} />
            </m.span>
            {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 grid place-items-center" aria-hidden>
                    <span className="relative h-2.5 w-2.5 rounded-full bg-foreground ring-2 ring-card" />
                </span>
            )}
        </Button>
    );

    const mobileTrigger = (
        <Button
            variant="ghost"
            size="icon"
            hapticStyle={false}
            type="button"
            className="relative size-11 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={triggerLabel}
        >
            <m.span
                aria-hidden
                whileHover={reduceMotion ? undefined : { rotate: [0, -12, 10, -6, 0] }}
                whileTap={reduceMotion ? undefined : { scale: 0.88, rotate: -8 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_STANDARD }}
                className="inline-flex"
            >
                <Bell size={20} strokeWidth={2} />
            </m.span>
            {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid place-items-center">
                    <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-xs font-medium leading-none text-background ring-2 ring-background tabular-nums">
                        {badgeCount}
                    </span>
                </span>
            )}
        </Button>
    );

    if (variant === 'desktop') {
        return (
            <Popover open={open} onOpenChange={handleOpenChange}>
                {!hideTrigger && <PopoverTrigger render={desktopTrigger} />}
                <PopoverContent
                    align="end"
                    sideOffset={8}
                    aria-label="Meldungen"
                    className="hidden max-h-[520px] w-[380px] flex-col overflow-hidden rounded-xl border border-border bg-background p-0 shadow-overlay md:flex"
                >
                    {headerContent}
                    {listContent}
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            {!hideTrigger && <SheetTrigger render={mobileTrigger} />}
            <SheetContent
                side="bottom"
                showCloseButton={false}
                className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-xl border-x border-t border-border bg-background p-0 md:hidden"
            >
                <SheetTitle className="sr-only">Meldungen</SheetTitle>
                <SheetDescription className="sr-only">Benachrichtigungen und Aktivitäten</SheetDescription>
                <div className="shrink-0 bg-background pt-3">
                    <div className="relative flex justify-center pb-1">
                        <span className="h-1.5 w-12 rounded-full bg-muted-foreground/30" aria-hidden />
                        <SheetClose className="absolute right-4 top-0 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
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
