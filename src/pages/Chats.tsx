import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import { avatarTone, initials } from '@/lib/avatar';
import {
    conversationPreview,
    excludeHiddenConversations,
    filterConversations,
    formatConversationTime,
    parseConversationSummaries,
    type ConversationSummary,
} from '@/lib/chat-conversations';
import { triggerHaptic } from '@/lib/haptics';
import { getHiddenChatIds } from '@/lib/hidden-chats';
import { PAGE_ENTER } from '@/lib/motion';
import { startNotificationPoll } from '@/lib/polling';
import { cn } from '@/lib/utils';
import { m, useReducedMotion } from 'motion/react';
import { AlertTriangle, ChevronLeft, MessagesSquare, Search, X } from 'lucide-react';
import chatStyles from '@/components/chat/chat-theme.module.css';

export default function Chats() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [staleError, setStaleError] = useState(false);
    const [query, setQuery] = useState('');
    const conversationsRef = useRef<ConversationSummary[]>([]);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const fetchConversations = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        setStaleError(false);
        try {
            const { data, error: apiError } = await api.messages.conversations();
            if (apiError) {
                setError(apiErrorMessage(apiError, 'Chats konnten nicht geladen werden.'));
                if (conversationsRef.current.length > 0) setStaleError(true);
                return;
            }
            const list = parseConversationSummaries(data);
            setConversations(list);
            setError(null);
        } catch (e) {
            console.error('[Chats] fetch error:', e);
            setError('Chats konnten nicht geladen werden.');
            if (conversationsRef.current.length > 0) setStaleError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchConversations(false);
    }, [fetchConversations]);

    // Die Übersicht aktualisiert sich still im Hintergrund. Der Notification-
    // Tick ist nur ein generischer 12-Sekunden-Takt; es wird nichts markiert.
    useEffect(() => startNotificationPoll(() => { void fetchConversations(true); }), [fetchConversations]);

    useEffect(() => {
        const onFocus = () => { void fetchConversations(true); };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchConversations]);

    const visibleConversations = useMemo(
        () => excludeHiddenConversations(conversations, getHiddenChatIds()),
        [conversations]
    );

    const filtered = useMemo(
        () => filterConversations(visibleConversations, query, user?.id),
        [visibleConversations, query, user?.id]
    );

    return (
        <div className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden', chatStyles.surface)}>
            <header className={cn('sticky top-0 z-30 shrink-0 pt-[max(0.5rem,env(safe-area-inset-top,0px))]', chatStyles.header)}>
                <div className="mx-auto w-full max-w-3xl px-2 pb-3 sm:px-4">
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-11 shrink-0 rounded-full text-chat-text hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Zurück zu den Anfragen"
                            onClick={() => navigate('/requests')}
                        >
                            <ChevronLeft size={22} aria-hidden />
                        </Button>
                        <div className="min-w-0 flex-1 px-0.5">
                            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-chat-text">Chats</h1>
                            <p className="text-[13px] leading-tight text-chat-meta">
                                {visibleConversations.length === 0
                                    ? 'Deine Unterhaltungen an einem Ort'
                                    : `${visibleConversations.length} ${visibleConversations.length === 1 ? 'Unterhaltung' : 'Unterhaltungen'}`}
                            </p>
                        </div>
                    </div>

                    <div className="relative mt-2.5">
                        <Search
                            size={17}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6452] dark:text-muted-foreground"
                            aria-hidden
                        />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Chats durchsuchen"
                            aria-label="Chats durchsuchen"
                            autoComplete="off"
                            className="h-12 rounded-full border-black/5 bg-white/85 pl-11 pr-11 text-base text-foreground shadow-sm placeholder:text-[#6b6452] hover:bg-white focus-visible:border-primary/60 dark:border-white/10 dark:bg-white/10 dark:placeholder:text-muted-foreground sm:text-sm"
                        />
                        {query && (
                            <button
                                type="button"
                                aria-label="Suche löschen"
                                onClick={() => setQuery('')}
                                className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-chat-meta transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            >
                                <X size={17} aria-hidden />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 sm:px-6', chatStyles.scroller)}>
                <div className="mx-auto w-full max-w-3xl">
                    {staleError && (
                        <div className="mb-2 rounded-2xl border border-border bg-white/70 px-3 py-2 text-xs leading-relaxed text-chat-meta dark:bg-white/5">
                            Aktualisierung fehlgeschlagen. Es werden die zuletzt geladenen Chats angezeigt.
                        </div>
                    )}

                    {loading && (
                        <div className="space-y-2" role="status" aria-label="Chats werden geladen">
                            {[0, 1, 2, 3].map((item) => (
                                <div key={item} className="flex items-center gap-3 rounded-[20px] bg-white/60 px-3 py-3 dark:bg-white/5">
                                    <Skeleton className="size-12 shrink-0 rounded-full" />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <Skeleton className="h-3.5 w-32 rounded-full" />
                                        <Skeleton className="h-3 w-3/4 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && error && visibleConversations.length === 0 && (
                        <div className="mx-auto mt-10 flex max-w-sm flex-col items-center rounded-[24px] bg-white/65 px-5 py-7 text-center dark:bg-white/5" role="alert">
                            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                                <AlertTriangle size={22} aria-hidden />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-foreground">Chats konnten nicht geladen werden.</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-chat-meta">{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 min-h-11 rounded-full bg-white/80 px-4 text-xs"
                                onClick={() => { void fetchConversations(false); }}
                            >
                                Erneut versuchen
                            </Button>
                        </div>
                    )}

                    {!loading && !error && visibleConversations.length === 0 && (
                        <m.div
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={reduceMotion ? { duration: 0 } : PAGE_ENTER}
                            className="mx-auto mt-8 flex max-w-sm flex-col items-center rounded-[26px] px-5 py-8 text-center sm:mt-12"
                        >
                            <div className="grid size-16 place-items-center rounded-full bg-primary/25 text-[#18181b] ring-1 ring-black/5 dark:bg-primary/20 dark:text-primary">
                                <MessagesSquare size={28} aria-hidden />
                            </div>
                            <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground">Noch keine Chats</h2>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-chat-meta">
                                Sobald eine Anfrage angenommen wurde, erscheint euer Chat hier. Offene Anfragen findest du weiterhin unter Anfragen.
                            </p>
                            {conversations.length > visibleConversations.length && (
                                <p className="mt-1.5 text-xs leading-relaxed text-chat-meta">
                                    Verborgene Chats kannst du auf der Anfragen-Seite wieder einblenden.
                                </p>
                            )}
                            <Button
                                size="sm"
                                className="mt-5 min-h-11 rounded-full px-5 text-sm font-semibold"
                                onClick={() => navigate('/requests')}
                            >
                                Zu den Anfragen
                            </Button>
                        </m.div>
                    )}

                    {!loading && !error && visibleConversations.length > 0 && filtered.length === 0 && (
                        <div className="mx-auto mt-10 max-w-sm rounded-[24px] bg-white/65 px-5 py-7 text-center dark:bg-white/5">
                            <p className="text-sm font-semibold text-foreground">Keine Chats gefunden</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-chat-meta">
                                Für „{query.trim()}“ gibt es keinen Treffer.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 min-h-11 rounded-full bg-white/80 px-4 text-xs"
                                onClick={() => setQuery('')}
                            >
                                Suche löschen
                            </Button>
                        </div>
                    )}

                    {!loading && filtered.length > 0 && (
                        <ul className="space-y-2" aria-label="Chats">
                            {filtered.map((conversation) => {
                                const unread = Math.max(0, Number(conversation.unread_count) || 0);
                                const name = conversation.display_name || 'Unbekannt';
                                const preview = conversationPreview(conversation, user?.id);
                                const time = formatConversationTime(conversation.last_message_at || conversation.request_created_at);
                                return (
                                    <li key={conversation.request_id}>
                                        <Link
                                            to={`/chat/${conversation.request_id}`}
                                            onClick={() => triggerHaptic('selection')}
                                            aria-label={`Chat mit ${name}${unread > 0 ? `, ${unread} ungelesen` : ''}`}
                                            className="group flex min-h-[4.75rem] items-center gap-3 rounded-[20px] border border-black/5 bg-white/85 px-3 py-2.5 shadow-[0_1px_1px_rgb(60_50_15_/_0.03),0_6px_18px_rgb(60_50_15_/_0.045)] backdrop-blur-sm transition-[background-color,box-shadow,transform] duration-150 hover:bg-white hover:shadow-[0_6px_22px_rgb(60_50_15_/_0.08)] active:scale-[0.995] dark:border-white/10 dark:bg-[#1d1f24]/90 dark:hover:bg-[#23252b]"
                                        >
                                            <span
                                                className={cn(
                                                    'grid size-12 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold ring-1 ring-black/5 dark:ring-white/10',
                                                    conversation.avatar_url ? 'bg-muted' : avatarTone(conversation.display_name)
                                                )}
                                            >
                                                {conversation.avatar_url
                                                    ? <img src={conversation.avatar_url} alt="" className="h-full w-full object-cover" />
                                                    : initials(conversation.display_name)}
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-baseline gap-2">
                                                    <span className={cn('min-w-0 flex-1 truncate text-[15px] leading-tight', unread > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground')}>
                                                        {name}
                                                    </span>
                                                    <span className={cn('shrink-0 text-xs tabular-nums', unread > 0 ? 'font-semibold text-primary-soft-foreground dark:text-primary' : 'text-chat-meta')}>
                                                        {time}
                                                    </span>
                                                </span>
                                                <span className="mt-1 flex items-center gap-2">
                                                    <span className={cn('min-w-0 flex-1 truncate text-[13px] leading-tight', unread > 0 ? 'font-medium text-foreground' : 'text-chat-meta')}>
                                                        {preview}
                                                    </span>
                                                    {unread > 0 && (
                                                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold leading-none text-primary-foreground tabular-nums">
                                                            {unread > 99 ? '99+' : unread}
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
