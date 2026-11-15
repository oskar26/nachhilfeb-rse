import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../lib/api';
import { startChatPoll } from '../lib/polling';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { ChevronLeft, Send, Trash2, Check, CheckCheck, Pencil, MoreVertical, Ban, Calendar, CalendarDays, Download, EyeOff, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { prefersReducedMotion } from '../lib/motion';
import { mergeMessages, type ChatMessage } from '../lib/chat-messages';
import ReportWizard from '../components/ReportWizard';
import { downloadICSFile } from '../lib/calendar';
import { blockedReason, checkContent, loadFilterOverrides, type FilterOverrides } from '../lib/profanity';
import { maybeAutoReport } from '../lib/autoreport';
import { avatarTone, initials } from '../lib/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

interface Message extends ChatMessage {
    request_id: string;
}

// Auf diesem Gerät verborgene Chats (Anfrage-IDs). Honest client-side hide: Die Anfrage
// und der Verlauf bleiben für die SV-Moderation gespeichert, nur die Liste wird aufgeräumt.
const HIDDEN_CHATS_KEY = 'fwg_hidden_chats';

export function getHiddenChatIds(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(HIDDEN_CHATS_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function hideChatId(id: string): void {
    try {
        const next = new Set(getHiddenChatIds());
        next.add(id);
        localStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify([...next]));
    } catch { /* Storage darf den Flow nie stoppen */ }
}

export function unhideChatId(id: string): void {
    try {
        localStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify(getHiddenChatIds().filter(x => x !== id)));
    } catch { /* ignore */ }
}

export default function Chat() {
    const { requestId } = useParams();    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatSurfaceRef = useRef<HTMLDivElement>(null);
    const forceScrollRef = useRef(false);
    const previousMessageCountRef = useRef(0);
    const nearBottomRef = useRef(true);
    const loadedRequestIdRef = useRef<string | null>(null);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // Header menu state
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string;
        description: string;
        confirmLabel: string;
        onConfirm: () => void;
    } | null>(null);

    // Report/Block state
    const [reportOpen, setReportOpen] = useState(false);
    const [otherUserId, setOtherUserId] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isBlockLoading, setIsBlockLoading] = useState(false);

    // Profanity-2.0-Training: Admin-Overrides einmalig laden
    const [filterOverrides, setFilterOverrides] = useState<FilterOverrides>({ allow: [], block: [] });
    useEffect(() => {
        loadFilterOverrides().then(setFilterOverrides).catch(() => {});
    }, []);

    // Appointment booking state
    const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
    const [appSubject, setAppSubject] = useState('Mathematik');
    const [appDate, setAppDate] = useState('');
    const [appTime, setAppTime] = useState('14:00');

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appDate || !appTime || !user || !requestId) return;
        if (isBlocked) {
            toast.error('Du kannst diesem Nutzer keine Nachrichten senden.');
            return;
        }

        const formattedContent = `TERMIN-VEREINBARUNG\nFach: ${appSubject}\nDatum: ${appDate}\nUhrzeit: ${appTime} Uhr (45 Min)\nOrt: FWG Bibliothek / Schulgelände`;

        const { error } = await api.messages.send(requestId, formattedContent);

        if (error) {
            toast.error('Fehler beim Termin-Vorschlagen.');
        } else {
            forceScrollRef.current = true;
            toast.success('Terminvorschlag im Chat gesendet!');
            setAppointmentModalOpen(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };

    const isNearBottom = () => {
        const surface = chatSurfaceRef.current;
        if (!surface) return true;
        return surface.scrollHeight - surface.scrollTop - surface.clientHeight < 80;
    };

    const fetchData = async () => {
        setLoading(true);
        if (!requestId) {
            navigate('/requests');
            return;
        }
        // Fetch request info to get other user id
        const { data: request } = await api.requests.get(requestId);
        if (!request) {
            navigate('/requests');
            return;
        }

        const otherId = request.requester_id === user?.id ? request.owner_id : request.requester_id;
        const { data: profile } = await api.profiles.get(otherId);
        setOtherUser(profile);
        setOtherUserId(otherId);

        // Blockstatus laden (andere Seite kann den Nutzer blockiert haben)
        if (otherId) {
            setIsBlockLoading(true);
            try {
                const { data: blockStatus } = await api.blocks.status(otherId);
                setIsBlocked(!!blockStatus?.blocked);
            } catch (e) {
                console.error('Blockstatus konnte nicht geladen werden:', e);
            } finally {
                setIsBlockLoading(false);
            }
        } else {
            setIsBlocked(false);
        }

        // Fetch messages (der Server markiert empfangene Nachrichten beim GET serverseitig als gelesen)
        const { data: msgs } = await api.messages.list(requestId);

        if (loadedRequestIdRef.current !== requestId) {
            // Erster Load dieser Unterhaltung: komplett ersetzen, damit der
            // Verlauf der vorherigen Anfrage nicht in den neuen Chat wächst.
            setMessages((msgs ?? []) as Message[]);
            loadedRequestIdRef.current = requestId;
        } else if (msgs) {
            // Erneuter Load derselben Unterhaltung: per id mergen, damit
            // identische Poll-Antworten keinen neuen State erzeugen.
            setMessages(prev => mergeMessages(prev, msgs as Message[]));
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!user || !requestId) return;
        fetchData();

        // Live-Updates: kurzes Polling ersetzt den früheren Supabase-Realtime-Kanal.
        // Der Server liefert die vollständige Liste, damit auch read_at älterer Nachrichten aktualisiert wird.
        let cancelled = false;
        const stopPolling = startChatPoll(requestId, (msgs: any[]) => {
            // Eine verspätete Antwort der vorherigen Anfrage darf nicht in den
            // neu ausgewählten Chat hineingeraten.
            if (cancelled) return;
            setMessages(prev => mergeMessages(prev, msgs as Message[]));
        });

        return () => {
            cancelled = true;
            stopPolling();
        };
    }, [user, requestId]);

    // Neue Anfrage: Der Verlauf startet wieder unten, unabhängig davon, wo die
    // vorherige Unterhaltung gescrollt war.
    useEffect(() => {
        previousMessageCountRef.current = 0;
        nearBottomRef.current = true;
        forceScrollRef.current = true;
        loadedRequestIdRef.current = null;
    }, [requestId]);

    // Nur bei echtem Zuwachs unten nachführen. Reine read_at-/edited-Polls
    // erzeugen dank mergeMessages keinen neuen State und damit keinen Sprung.
    useEffect(() => {
        const messageCount = messages.length;
        const grew = messageCount > previousMessageCountRef.current;
        previousMessageCountRef.current = messageCount;

        if (!forceScrollRef.current && !(grew && nearBottomRef.current)) {
            return;
        }
        forceScrollRef.current = false;
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !requestId) return;
        if (isBlocked) {
            toast.error('Du kannst diesem Nutzer keine Nachrichten senden.');
            return;
        }

        const check = checkContent(newMessage, filterOverrides);
        if (check.blocked) {
            toast.error(blockedReason(newMessage, filterOverrides) ?? 'Diese Nachricht wurde vom Inhaltsfilter blockiert.', { duration: 6000 });
            void maybeAutoReport(check, newMessage, { category: 'chat', reportedUserId: user.id, place: 'Chat' });
            return;
        }

        const msgContent = newMessage;
        setNewMessage(''); // optimistic clear
        setMenuOpenId(null);

        const { error } = await api.messages.send(requestId, msgContent);

        if (error) {
            toast.error(error.status === 403
                ? 'Du kannst diesem Nutzer keine Nachrichten senden.'
                : 'Fehler beim Senden.');
            console.error(error);
        } else {
            // Eigene Nachricht soll auch dann unten erscheinen, wenn man
            // vorher hochgescrollt war.
            forceScrollRef.current = true;
        }
    };

    const deleteMessage = async (msgId: string) => {
        setConfirmDialog({
            title: 'Nachricht ausblenden?',
            description: 'Möchtest du diese Nachricht auf diesem Gerät ausblenden?',
            confirmLabel: 'Ausblenden',
            onConfirm: () => {
                // Kein Backend-Endpunkt zum Ändern von Nachrichten: Das Löschen bleibt lokal
                // sichtbar und ist nach dem Neuladen wieder da.
                setMessages(prev => prev.filter(m => m.id !== msgId));
            },
        });
    };

    const handleHideChat = async () => {
        if (!otherUserId || !user) return;
        setConfirmDialog({
            title: 'Chat verbergen?',
            description: `${otherUser?.display_name || 'Diesen Nutzer'} Chat verbergen? Der Chat wird auf diesem Gerät verborgen. Zum Schutz aller bleibt der Verlauf für die SV-Moderation gespeichert.`,
            confirmLabel: 'Chat verbergen',
            onConfirm: () => {
                if (requestId) hideChatId(requestId);
                toast.success('Chat auf diesem Gerät verborgen.');
                navigate('/requests');
            },
        });
    };

    const blockUser = async () => {
        if (!otherUserId) return;
        setIsBlockLoading(true);
        const { error } = await api.blocks.block(otherUserId);
        setIsBlockLoading(false);
        if (error) {
            toast.error(error.status === 403
                ? 'Du kannst diesem Nutzer keine Nachrichten senden.'
                : apiErrorMessage(error, 'Nutzer konnte nicht blockiert werden.'));
            return;
        }
        setIsBlocked(true);
        toast.success('Nutzer blockiert.');
    };

    const handleToggleBlock = async () => {
        if (!otherUserId || !user || isBlockLoading) return;

        if (isBlocked) {
            setIsBlockLoading(true);
            const { error } = await api.blocks.unblock(otherUserId);
            setIsBlockLoading(false);
            if (error) {
                toast.error(error.status === 403
                    ? 'Du kannst diesem Nutzer keine Nachrichten senden.'
                    : apiErrorMessage(error, 'Blockierung konnte nicht aufgehoben werden.'));
                return;
            }
            setIsBlocked(false);
            toast.success('Blockierung aufgehoben.');
            return;
        }

        setConfirmDialog({
            title: 'Nutzer blockieren?',
            description: `${otherUser?.display_name || 'Dieser Nutzer'} kann dir dann keine Anfragen oder Nachrichten mehr senden. Bestehende Chats bleiben für die SV-Moderation gespeichert.`,
            confirmLabel: 'Blockieren',
            onConfirm: () => {
                void blockUser();
            },
        });
    };

    const hideChatAndLeave = () => {
        if (!requestId) {
            navigate('/requests');
            return;
        }
        setConfirmDialog({
            title: 'Chat verbergen?',
            description: 'Chat auf diesem Gerät verbergen? Deine Anfrage bleibt bestehen, der Verlauf bleibt für die SV-Moderation gespeichert.',
            confirmLabel: 'Chat verbergen',
            onConfirm: () => {
                hideChatId(requestId);
                toast.success('Chat auf diesem Gerät verborgen. Über „Verborgene Chats einblenden“ in den Anfragen holst du ihn zurück.');
                navigate('/requests');
            },
        });
    };

    const startEditing = (msg: Message) => {
        setEditingId(msg.id);
        setEditContent(msg.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const saveEdit = async (msgId: string) => {
        const trimmed = editContent.trim();
        if (!trimmed) return;

        const editCheck = checkContent(trimmed, filterOverrides);
        if (editCheck.blocked) {
            toast.error(blockedReason(trimmed, filterOverrides) ?? 'Diese Nachricht wurde vom Inhaltsfilter blockiert.', { duration: 6000 });
            void maybeAutoReport(editCheck, trimmed, { category: 'chat', reportedUserId: user?.id ?? null, place: 'Chat (Bearbeitung)' });
            return;
        }

        // Kein Backend-Endpunkt zum Ändern von Nachrichten: Die Bearbeitung bleibt lokal sichtbar.
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: trimmed, edited_at: new Date().toISOString() } : m));
        setEditingId(null);
        setEditContent('');
    };

    const handleEditKeyDown = (e: React.KeyboardEvent, msgId: string) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEdit(msgId);
        }
        if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    if (loading) return (
        <div className="chat-surface flex min-h-0 flex-1 flex-col" role="status" aria-label="Chat wird geladen">
            <div className="flex items-center gap-3 bg-chat-header p-3 shadow-soft">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-3.5 w-32 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded-full" />
                </div>
            </div>
            <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 p-4">
                <Skeleton className="mx-auto h-7 w-40 rounded-full bg-chat-chip" />
                <Skeleton className="h-16 w-3/4 rounded-chat bg-chat-other" />
                <Skeleton className="ml-auto h-14 w-2/3 rounded-chat bg-chat-own" />
                <Skeleton className="h-20 w-4/5 rounded-chat bg-chat-other" />
                <Skeleton className="ml-auto h-12 w-1/2 rounded-chat bg-chat-own" />
            </div>
        </div>
    );

    return (
        <>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            {/* Header */}
            <header className="flex shrink-0 items-center gap-0.5 bg-chat-header p-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] md:gap-1">
                <Button variant="ghost" size="icon" onClick={() => navigate('/requests')} className="size-11 shrink-0 rounded-full text-chat-text hover:bg-black/5 dark:hover:bg-white/10" aria-label="Zurück zu den Anfragen">
                    <ChevronLeft size={21} aria-hidden />
                </Button>
                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-0.5">
                    <div className={cn('grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold', otherUser?.avatar_url ? 'bg-muted' : avatarTone(otherUser?.display_name))}>
                        {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(otherUser?.display_name)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold leading-tight text-chat-text">{otherUser?.display_name || 'Unbekannt'}</p>
                        <p className="text-[13px] text-chat-meta">Chat</p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAppointmentModalOpen(true)}
                    className="size-11 shrink-0 rounded-full text-chat-text hover:bg-black/5 dark:hover:bg-white/10"
                    title="Termin für Nachhilfestunde vereinbaren"
                    aria-label="Termin vereinbaren"
                >
                    <Calendar size={19} aria-hidden />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        aria-label="Weitere Optionen"
                        className="grid size-11 shrink-0 place-items-center rounded-full text-chat-text transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <MoreVertical size={20} aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="min-w-56 p-1">
                        <DropdownMenuItem onClick={() => setAppointmentModalOpen(true)} className="min-h-11 gap-2.5 px-3">
                            <CalendarDays size={16} aria-hidden /> Termin vereinbaren
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setReportOpen(true)} className="min-h-11 gap-2.5 px-3">
                            <Flag size={16} aria-hidden /> Nutzer melden
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleToggleBlock}
                            disabled={isBlockLoading || !otherUserId}
                            className="min-h-11 gap-2.5 px-3"
                        >
                            <Ban size={16} aria-hidden /> {isBlocked ? 'Blockierung aufheben' : 'Nutzer blockieren'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleHideChat} className="min-h-11 gap-2.5 px-3">
                            <Ban size={16} aria-hidden /> Chat verbergen
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={hideChatAndLeave} className="min-h-11 gap-2.5 px-3">
                            <EyeOff size={16} aria-hidden /> Chat verbergen und verlassen
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            {/* Messages Area */}
            <div
                ref={chatSurfaceRef}
                onScroll={() => { nearBottomRef.current = isNearBottom(); }}
                className="chat-surface min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
            >
                {messages.length === 0 ? (
                    <div className="mx-auto max-w-sm rounded-panel bg-chat-other/95 p-5 text-center text-[13px] leading-relaxed text-chat-meta shadow-soft">
                        Hier beginnt euer Chat. Deine Nachrichten werden über eine verschlüsselte Verbindung (HTTPS) übertragen und auf Servern in Deutschland gespeichert. Bitte achte auf unsere <a href="#/nutzungsbedingungen" className="font-semibold text-chat-text underline underline-offset-4">Nutzungsbedingungen</a>.
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === user?.id;
                        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isEditing = editingId === msg.id;

                        // Show date divider if day changed
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                        const sameDayAsPrev = prevMsg && new Date(msg.created_at).toDateString() === new Date(prevMsg.created_at).toDateString();
                        const showDate = !sameDayAsPrev;
                        const firstInGroup = showDate || !prevMsg || prevMsg.sender_id !== msg.sender_id;
                        const sameDayAsNext = nextMsg && new Date(msg.created_at).toDateString() === new Date(nextMsg.created_at).toDateString();
                        const lastInGroup = !nextMsg || !sameDayAsNext || nextMsg.sender_id !== msg.sender_id;

                        return (
                            <div key={msg.id} className="flex flex-col">
                                {showDate && (
                                    <div className="my-3 text-center">
                                        <span className="rounded-full bg-chat-chip px-3.5 py-1.5 text-xs font-medium text-chat-meta shadow-soft backdrop-blur-sm">
                                            {new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' })}
                                        </span>
                                    </div>
                                )}
                                <div className={cn("group/message relative flex max-w-[80%] items-start", isMe ? "self-end justify-end" : "self-start", firstInGroup ? "mt-3" : "mt-0.5")}>
                                    <div
                                        onClick={() => isMe && setMenuOpenId(prev => prev === msg.id ? null : msg.id)}
                                        className={cn(
                                            "relative min-w-[86px] break-words rounded-chat px-3 py-2 text-[15px] leading-[1.35] shadow-[0_1px_1px_rgba(11,20,26,0.06)]",
                                            isMe ? "bg-chat-own text-primary-foreground" : "bg-chat-other text-foreground",
                                            firstInGroup && (isMe ? "rounded-tr-chat-corner" : "rounded-tl-chat-corner"),
                                            msg.is_deleted && "italic opacity-70"
                                        )}
                                    >
                                        {firstInGroup && (
                                            <svg
                                                aria-hidden
                                                viewBox="0 0 8 13"
                                                className={cn('absolute top-0 h-3 w-2', isMe ? '-right-[7px] fill-chat-own' : '-left-[7px] -scale-x-100 fill-chat-other')}
                                            >
                                                <path d="M0 0h8L2 13H0z" />
                                            </svg>
                                        )}
                                        {msg.is_deleted ? (
                                            <span className="flex items-center gap-1 pr-14 text-xs opacity-70"><Ban size={12} aria-hidden /> Nachricht auf diesem Gerät ausgeblendet.</span>
                                        ) : isEditing ? (
                                            <div className="min-w-[200px] space-y-2">
                                                <Textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                                                    className="min-h-20 w-full resize-none bg-chat-other text-sm text-chat-text"
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-1.5">
                                                    <Button variant="outline" size="sm" type="button" onClick={cancelEditing} className="h-10 rounded-full bg-chat-other px-4 text-xs text-chat-text">
                                                        Abbrechen
                                                    </Button>
                                                    <Button size="sm" type="button" onClick={() => saveEdit(msg.id)} className="h-10 rounded-full px-4 text-xs font-semibold">
                                                        Speichern
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="whitespace-pre-wrap pr-14">{msg.content}</div>
                                                {msg.content.includes('TERMIN-VEREINBARUNG') && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        type="button"
                                                        onClick={() => {
                                                            const lines = msg.content.split('\n');
                                                            const subject = lines[1]?.replace('Fach: ', '') || 'Nachhilfe';
                                                            const dateStr = lines[2]?.replace('Datum: ', '') || new Date().toISOString().slice(0, 10);
                                                            const timeStr = lines[3]?.replace('Uhrzeit: ', '').slice(0, 5) || '14:00';
                                                            const start = new Date(`${dateStr}T${timeStr}:00`);
                                                            downloadICSFile({
                                                                title: `FWG Nachhilfe: ${subject}`,
                                                                description: `Nachhilfetermin mit ${otherUser?.display_name || 'Partner'}`,
                                                                startDate: isNaN(start.getTime()) ? new Date() : start,
                                                                durationMinutes: 45
                                                            });
                                                        }}
                                                        className="mt-2 h-10 gap-1.5 rounded-full border-chat-border bg-chat-other px-3 text-xs font-semibold text-chat-text"
                                                    >
                                                        <Download size={14} aria-hidden /> In Kalender speichern (.ics)
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {!isEditing && (
                                            <span className={cn("pointer-events-none absolute bottom-1 right-2 inline-flex items-center gap-1 text-[11px] leading-none", isMe ? "text-chat-meta-own" : "text-chat-meta")}>
                                                {msg.edited_at && !msg.is_deleted && (
                                                    <span className="italic">bearbeitet</span>
                                                )}
                                                <span className="tabular-nums">{time}</span>
                                                {isMe && !msg.is_deleted && (
                                                    <span className="ml-0.5">
                                                        {msg.read_at
                                                            ? <CheckCheck size={14} className="text-chat-tick-read" aria-hidden />
                                                            : <Check size={14} className="text-chat-tick-sent" aria-hidden />}
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {isMe && !msg.is_deleted && !isEditing && (
                                        <DropdownMenu open={menuOpenId === msg.id} onOpenChange={(open) => setMenuOpenId(open ? msg.id : null)}>
                                            <DropdownMenuTrigger
                                                aria-label="Nachricht bearbeiten oder ausblenden"
                                                onClick={(event) => event.stopPropagation()}
                                                className={cn(
                                                    "ml-1 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-chat-meta transition-opacity hover:bg-black/5 dark:hover:bg-white/10 max-lg:size-11 max-lg:opacity-100",
                                                    menuOpenId === msg.id ? "opacity-100" : "opacity-0 group-hover/message:opacity-100 focus-visible:opacity-100"
                                                )}
                                            >
                                                <MoreVertical size={16} aria-hidden />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" sideOffset={6} className="min-w-44 p-1">
                                                <DropdownMenuItem onClick={() => startEditing(msg)} className="min-h-11 gap-2.5 px-3">
                                                    <Pencil size={15} aria-hidden /> Bearbeiten
                                                </DropdownMenuItem>
                                                <DropdownMenuItem variant="destructive" onClick={() => deleteMessage(msg.id)} className="min-h-11 gap-2.5 px-3">
                                                    <Trash2 size={15} aria-hidden /> Ausblenden
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    {lastInGroup && <span className="sr-only">Ende der Nachrichtengruppe</span>}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 bg-chat-bg px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:px-4">
                {isBlocked && (
                    <div className="mb-2 rounded-panel border border-border bg-chat-other px-4 py-3 text-[13px] leading-relaxed text-chat-meta shadow-soft" role="status">
                        Du hast diesen Nutzer blockiert. Du kannst die Blockierung im Menü aufheben.
                    </div>
                )}
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 rounded-full bg-chat-composer px-4 shadow-soft">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isBlocked ? 'Nachrichten blockiert' : 'Nachricht schreiben'}
                            className="h-12 w-full border-0 bg-transparent px-0 text-base shadow-none focus-visible:outline-none disabled:opacity-60"
                            autoComplete="off"
                            aria-label="Nachricht schreiben"
                            disabled={isBlocked}
                        />
                    </div>
                    <Button
                        type="submit"
                        size="icon"
                        className="size-12 shrink-0 rounded-full bg-chat-send text-primary-foreground shadow-soft hover:bg-primary-hover hover:text-primary-foreground hover:shadow-card active:scale-[0.98]"
                        disabled={!newMessage.trim() || isBlocked}
                        aria-label="Nachricht senden"
                    >
                        <Send size={19} className="ml-0.5" aria-hidden />
                    </Button>
                </form>
            </div>
        </div>

        {/* Appointment Booking Modal */}
        <Dialog open={appointmentModalOpen} onOpenChange={setAppointmentModalOpen}>
            <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto rounded-dialog sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <CalendarDays className="text-muted-foreground" size={20} aria-hidden />
                        Nachhilfetermin vereinbaren
                    </DialogTitle>
                    <DialogDescription>
                        Schlage {otherUser?.display_name || 'deinem Lernpartner'} einen festen Nachhilfetermin vor.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAppointment} className="space-y-4 py-3">
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-foreground/80">Fach</Label>
                        <NativeSelect
                            value={appSubject}
                            onChange={e => setAppSubject(e.target.value)}
                            className="w-full text-sm font-semibold"
                        >
                            <option value="Mathematik">Mathematik</option>
                            <option value="Englisch">Englisch</option>
                            <option value="Deutsch">Deutsch</option>
                            <option value="Französisch">Französisch</option>
                            <option value="Latein">Latein</option>
                            <option value="Physik">Physik</option>
                            <option value="Chemie">Chemie</option>
                            <option value="Biologie">Biologie</option>
                            <option value="Informatik">Informatik</option>
                            <option value="Geschichte">Geschichte</option>
                        </NativeSelect>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-foreground/80">Datum</Label>
                            <Input
                                type="date"
                                value={appDate}
                                onChange={e => setAppDate(e.target.value)}
                                required
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-foreground/80">Uhrzeit</Label>
                            <Input
                                type="time"
                                value={appTime}
                                onChange={e => setAppTime(e.target.value)}
                                required
                                className="h-12"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => setAppointmentModalOpen(false)} className="h-12 rounded-full">Abbrechen</Button>
                        <Button type="submit" className="h-12 rounded-full font-semibold">Termin vorschlagen</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <AlertDialog
            open={!!confirmDialog}
            onOpenChange={(open) => {
                if (!open) setConfirmDialog(null);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
                    <AlertDialogDescription>{confirmDialog?.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() => {
                            const action = confirmDialog?.onConfirm;
                            setConfirmDialog(null);
                            action?.();
                        }}
                    >
                        {confirmDialog?.confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Report Wizard Modal */}
        {otherUserId && (
            <ReportWizard
                isOpen={reportOpen}
                reportedUserId={otherUserId}
                relatedMessageIds={messages.filter(m => m.sender_id === otherUserId).map(m => m.id)}
                onClose={() => setReportOpen(false)}
            />
        )}
        </>
    );
}
