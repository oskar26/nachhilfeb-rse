import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../lib/api';
import { startChatPoll } from '../lib/polling';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { prefersReducedMotion } from '../lib/motion';
import { mergeMessages, type ChatMessage } from '../lib/chat-messages';
import ReportWizard from '../components/ReportWizard';
import { blockedReason, checkContent, loadFilterOverrides, type FilterOverrides } from '../lib/profanity';
import { maybeAutoReport } from '../lib/autoreport';
import { triggerHaptic } from '../lib/haptics';
import { buildChatTimeline } from '../lib/chat-grouping';
import {
    appointmentSubjectFromRequest,
    appointmentSlotKey,
    buildAppointmentConfirmation,
    buildAppointmentDecline,
    buildAppointmentMessage,
    deriveAppointmentStatus,
    extractAppointments,
    parseAppointmentMessage,
    type AppointmentDetails,
    type AppointmentLocalStatus,
} from '../lib/chat-appointments';
import { loadChatToolSettings, saveChatToolSettings, type ChatToolSettings } from '../lib/chat-settings';
import { useIsMobile } from '@/hooks/use-mobile';
import ChatHeader, { type ChatPartner } from '../components/chat/ChatHeader';
import ChatComposer from '../components/chat/ChatComposer';
import ChatEmptyState from '../components/chat/ChatEmptyState';
import ChatToolsDialog from '../components/chat/ChatToolsDialog';
import CalendarPanel from '../components/chat/CalendarPanel';
import AppointmentDialog from '../components/chat/AppointmentDialog';
import MessageBubble from '../components/chat/MessageBubble';
import chatStyles from '../components/chat/chat-theme.module.css';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Ban } from 'lucide-react';
import { hideChatId } from '../lib/hidden-chats';

// Bestehende Importe aus der Chat-Seite bleiben gültig.
export { getHiddenChatIds, hideChatId, unhideChatId } from '../lib/hidden-chats';

interface Message extends ChatMessage {
    request_id: string;
}

interface ChatRequestInfo {
    status?: string;
    ad_title?: string | null;
    ad_subjects?: string[] | null;
    ads?: { short_description?: string | null } | null;
}

// Auf diesem Gerät verborgene Chats werden in src/lib/hidden-chats.ts verwaltet.

function requestStatusLabel(status?: string): string {
    switch (status) {
        case 'accepted': return 'Anfrage angenommen';
        case 'completed': return 'Anfrage abgeschlossen';
        case 'declined': return 'Anfrage abgelehnt';
        case 'cancelled': return 'Anfrage abgebrochen';
        case 'pending': return 'Anfrage offen';
        default: return 'Nachhilfe-Chat';
    }
}

function capitalize(value: string): string {
    return value ? `${value.charAt(0).toLocaleUpperCase('de-DE')}${value.slice(1)}` : value;
}

export default function Chat() {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isMobile = useIsMobile();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<ChatPartner | null>(null);
    const [requestInfo, setRequestInfo] = useState<ChatRequestInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [quickSendingId, setQuickSendingId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatSurfaceRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<HTMLTextAreaElement>(null);
    const forceScrollRef = useRef(false);
    const previousMessageCountRef = useRef(0);
    const nearBottomRef = useRef(true);
    const loadedRequestIdRef = useRef<string | null>(null);

    // Lokale Bearbeitungen und lokal ausgeblendete Nachrichten überleben das
    // 2-Sekunden-Polling. Das Backend hat dafür keine Endpunkte; nach einem
    // Neuladen kommt der Serverstand wieder.
    const [localEdits, setLocalEdits] = useState<Record<string, { content: string; edited_at: string }>>({});
    const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(() => new Set());

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
    const [appointmentSeed, setAppointmentSeed] = useState<Partial<AppointmentDetails> | null>(null);
    const [appointmentDialogKey, setAppointmentDialogKey] = useState(0);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [toolsOpen, setToolsOpen] = useState(false);

    // Lokale Chat-Werkzeuge: reine UI-Schalter, keine Backend-Features.
    const [tools, setTools] = useState<ChatToolSettings>(() => loadChatToolSettings());

    const updateTools = (next: ChatToolSettings) => {
        setTools(next);
        saveChatToolSettings(next);
    };

    useEffect(() => {
        if (!tools.calendar) setCalendarOpen(false);
    }, [tools.calendar]);

    useEffect(() => {
        if (!tools.appointments) setAppointmentModalOpen(false);
    }, [tools.appointments]);

    const displayedMessages = useMemo(() => messages
        .filter((message) => !hiddenMessageIds.has(message.id))
        .map((message) => {
            const localEdit = localEdits[message.id];
            return localEdit ? { ...message, ...localEdit } : message;
        }), [messages, hiddenMessageIds, localEdits]);

    const timeline = useMemo(() => buildChatTimeline(displayedMessages), [displayedMessages]);
    const appointments = useMemo(() => extractAppointments(displayedMessages), [displayedMessages]);
    const appointmentStatusById = useMemo(() => {
        const statusBySlot = new Map(appointments.map((entry) => [appointmentSlotKey(entry.details), entry.status]));
        const result = new Map<string, AppointmentLocalStatus>();
        for (const message of displayedMessages) {
            const details = parseAppointmentMessage(message.content);
            if (!details) continue;
            result.set(
                message.id,
                statusBySlot.get(appointmentSlotKey(details)) ?? deriveAppointmentStatus(message.id, displayedMessages)
            );
        }
        return result;
    }, [appointments, displayedMessages]);

    const defaultAppointmentSubject = useMemo(
        () => appointmentSubjectFromRequest(requestInfo?.ad_subjects),
        [requestInfo]
    );

    const statusText = useMemo(() => {
        const status = requestStatusLabel(requestInfo?.status);
        const subject = requestInfo?.ads?.short_description?.trim()
            || requestInfo?.ad_title?.trim()
            || (requestInfo?.ad_subjects?.[0] ? capitalize(requestInfo.ad_subjects[0]) : '');
        return subject ? `${subject} · ${status}` : status;
    }, [requestInfo]);

    const openAppointmentDialog = (seed?: Partial<AppointmentDetails> | null) => {
        setAppointmentSeed(seed ?? null);
        setAppointmentDialogKey((key) => key + 1);
        setAppointmentModalOpen(true);
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
            navigate('/chats');
            return;
        }
        // Fetch request info to get other user id
        const { data: request } = await api.requests.get(requestId);
        if (!request) {
            navigate('/chats');
            return;
        }

        const requestRecord = request as ChatRequestInfo & { requester_id?: string; owner_id?: string };
        setRequestInfo(requestRecord);
        const otherId = requestRecord.requester_id === user?.id ? requestRecord.owner_id : requestRecord.requester_id;
        if (!otherId) {
            navigate('/chats');
            return;
        }
        const { data: profile } = await api.profiles.get(otherId);
        setOtherUser(profile as ChatPartner);
        setOtherUserId(otherId);

        // Blockstatus laden (andere Seite kann den Nutzer blockiert haben)
        setIsBlockLoading(true);
        try {
            const { data: blockStatus } = await api.blocks.status(otherId);
            setIsBlocked(!!blockStatus?.blocked);
        } catch (e) {
            console.error('Blockstatus konnte nicht geladen werden:', e);
        } finally {
            setIsBlockLoading(false);
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
    // vorherige Unterhaltung gescrollt war. Lokale Overlays gelten nur für die
    // Unterhaltung, in der sie entstanden sind.
    useEffect(() => {
        previousMessageCountRef.current = 0;
        nearBottomRef.current = true;
        forceScrollRef.current = true;
        loadedRequestIdRef.current = null;
        setLocalEdits({});
        setHiddenMessageIds(new Set());
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

    const sendTextMessage = async (content: string): Promise<boolean> => {
        if (!requestId || !user) return false;
        if (isBlocked) {
            toast.error('Du kannst diesem Nutzer keine Nachrichten senden.');
            return false;
        }

        const check = checkContent(content, filterOverrides);
        if (check.blocked) {
            toast.error(blockedReason(content, filterOverrides) ?? 'Diese Nachricht wurde vom Inhaltsfilter blockiert.', { duration: 6000 });
            void maybeAutoReport(check, content, { category: 'chat', reportedUserId: user.id, place: 'Chat' });
            return false;
        }

        const { error } = await api.messages.send(requestId, content);
        if (error) {
            toast.error(error.status === 403
                ? 'Du kannst diesem Nutzer keine Nachrichten senden.'
                : 'Fehler beim Senden.');
            console.error(error);
            return false;
        }

        // Eigene Nachricht soll auch dann unten erscheinen, wenn man
        // vorher hochgescrollt war.
        forceScrollRef.current = true;
        triggerHaptic('light');
        return true;
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !user || !requestId || isSending) return;

        const content = newMessage;
        setIsSending(true);
        setNewMessage(''); // optimistic clear

        const sent = await sendTextMessage(content);
        if (!sent) setNewMessage(content);
        setIsSending(false);
    };

    const handleStarter = (text: string) => {
        triggerHaptic('selection');
        setNewMessage(text);
        window.requestAnimationFrame(() => composerRef.current?.focus());
    };

    const handleQuickMessage = async (messageId: string, text: string) => {
        if (quickSendingId) return;
        setQuickSendingId(messageId);
        const sent = await sendTextMessage(text);
        setQuickSendingId(null);
        if (sent) toast.success('Als Nachricht gesendet.', { duration: 1600 });
    };

    const handleAcceptAppointment = async (messageId: string, details: AppointmentDetails) => {
        if (quickSendingId) return;
        setQuickSendingId(messageId);
        const sent = await sendTextMessage(buildAppointmentConfirmation(details));
        setQuickSendingId(null);
        if (sent) toast.success('Antwort gesendet.');
    };

    const handleDeclineAppointment = async (messageId: string, details: AppointmentDetails) => {
        if (quickSendingId) return;
        setQuickSendingId(messageId);
        const sent = await sendTextMessage(buildAppointmentDecline(details));
        setQuickSendingId(null);
        if (sent) toast.success('Absage gesendet.');
    };

    const handleCreateAppointment = async (details: AppointmentDetails): Promise<boolean> => {
        if (!tools.appointments) {
            toast.error('Terminvorschläge sind in den Chat-Werkzeugen ausgeschaltet.');
            return false;
        }
        const sent = await sendTextMessage(buildAppointmentMessage(details));
        if (sent) toast.success('Terminvorschlag im Chat gesendet!');
        return sent;
    };

    const handleGoToMessage = (messageId: string) => {
        setCalendarOpen(false);
        window.setTimeout(() => {
            const element = chatSurfaceRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
            element?.scrollIntoView({
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                block: 'center',
            });
        }, 80);
    };

    const deleteMessage = (msgId: string) => {
        triggerHaptic('light');
        setConfirmDialog({
            title: 'Nachricht ausblenden?',
            description: 'Möchtest du diese Nachricht auf diesem Gerät ausblenden? Nach einem Neuladen ist sie wieder sichtbar.',
            confirmLabel: 'Ausblenden',
            onConfirm: () => {
                // Kein Backend-Endpunkt zum Ändern von Nachrichten: Das Löschen bleibt lokal
                // sichtbar und ist nach dem Neuladen wieder da.
                setHiddenMessageIds(prev => new Set(prev).add(msgId));
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
                navigate('/chats');
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
            navigate('/chats');
            return;
        }
        setConfirmDialog({
            title: 'Chat verbergen?',
            description: 'Chat auf diesem Gerät verbergen? Deine Anfrage bleibt bestehen, der Verlauf bleibt für die SV-Moderation gespeichert.',
            confirmLabel: 'Chat verbergen',
            onConfirm: () => {
                hideChatId(requestId);
                toast.success('Chat auf diesem Gerät verborgen. Über „Verborgene Chats einblenden“ auf der Anfragen-Seite holst du ihn zurück.');
                navigate('/chats');
            },
        });
    };

    const startEditing = (msg: Message) => {
        triggerHaptic('light');
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

        // Kein Backend-Endpunkt zum Ändern von Nachrichten: Die Bearbeitung bleibt lokal
        // sichtbar. Der Poll überschreibt sie dank localEdits nicht mehr nach 2 Sekunden.
        setLocalEdits(prev => ({
            ...prev,
            [msgId]: { content: trimmed, edited_at: new Date().toISOString() },
        }));
        setEditingId(null);
        setEditContent('');
        triggerHaptic('light');
    };

    if (loading) return (
        <div
            className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', chatStyles.surface)}
            role="status"
            aria-label="Chat wird geladen"
        >
            <div className={cn('shrink-0 pt-[max(0.5rem,env(safe-area-inset-top,0px))]', chatStyles.header)}>
                <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-3 pb-3">
                    <Skeleton className="size-11 rounded-full" />
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-32 rounded-full" />
                        <Skeleton className="h-3 w-24 rounded-full" />
                    </div>
                </div>
            </div>
            <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 p-4">
                <Skeleton className="mx-auto h-7 w-40 rounded-full" />
                <Skeleton className="h-16 w-3/4 rounded-[18px] bg-chat-other" />
                <Skeleton className="ml-auto h-14 w-2/3 rounded-[18px] bg-chat-own" />
                <Skeleton className="h-20 w-4/5 rounded-[18px] bg-chat-other" />
                <Skeleton className="ml-auto h-12 w-1/2 rounded-[18px] bg-chat-own" />
            </div>
        </div>
    );

    return (
        <>
            <div className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden', chatStyles.surface)}>
                <ChatHeader
                    otherUser={otherUser}
                    statusText={statusText}
                    isBlocked={isBlocked}
                    isBlockLoading={isBlockLoading}
                    hasOtherUser={!!otherUserId}
                    calendarOpen={calendarOpen}
                    showAppointments={tools.appointments}
                    showCalendar={tools.calendar}
                    onBack={() => navigate('/chats')}
                    onToggleCalendar={() => setCalendarOpen((open) => !open)}
                    onOpenAppointment={() => openAppointmentDialog({ subject: defaultAppointmentSubject })}
                    onOpenTools={() => setToolsOpen(true)}
                    onReport={() => setReportOpen(true)}
                    onToggleBlock={handleToggleBlock}
                    onHideChat={handleHideChat}
                    onHideAndLeave={hideChatAndLeave}
                />

                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <div className="flex min-w-0 flex-1 flex-col">
                        {/* Messages Area */}
                        <div
                            ref={chatSurfaceRef}
                            onScroll={() => { nearBottomRef.current = isNearBottom(); }}
                            role="log"
                            aria-live="polite"
                            aria-relevant="additions"
                            aria-label="Chatverlauf"
                            className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-4 sm:px-6', chatStyles.scroller)}
                        >
                            {displayedMessages.length === 0 ? (
                                <ChatEmptyState
                                    otherName={otherUser?.display_name}
                                    showStarters={tools.quickReplies}
                                    onStarter={handleStarter}
                                />
                            ) : (
                                <div className="mx-auto w-full max-w-3xl">
                                    {timeline.map((row) => (
                                        <Fragment key={row.message.id}>
                                            {row.showDateSeparator && (
                                                <div className="flex justify-center py-3">
                                                    <span className={cn('rounded-full px-3.5 py-1.5 text-xs font-medium text-chat-meta', chatStyles.dateChip)}>
                                                        {row.dateLabel}
                                                    </span>
                                                </div>
                                            )}
                                            <div data-message-id={row.message.id} className={cn('flex', row.isFirstInGroup ? 'mt-3' : 'mt-0.5')}>
                                                <MessageBubble
                                                    message={row.message}
                                                    isMe={row.message.sender_id === user?.id}
                                                    isFirstInGroup={row.isFirstInGroup}
                                                    isLastInGroup={row.isLastInGroup}
                                                    otherUser={otherUser}
                                                    editing={editingId === row.message.id}
                                                    editContent={editContent}
                                                    onEditContentChange={setEditContent}
                                                    onStartEdit={() => startEditing(row.message)}
                                                    onCancelEdit={cancelEditing}
                                                    onSaveEdit={() => { void saveEdit(row.message.id); }}
                                                    onDelete={() => deleteMessage(row.message.id)}
                                                    onQuickMessage={(text) => { void handleQuickMessage(row.message.id, text); }}
                                                    onAcceptAppointment={(details) => { void handleAcceptAppointment(row.message.id, details); }}
                                                    onDeclineAppointment={(details) => { void handleDeclineAppointment(row.message.id, details); }}
                                                    onCounterAppointment={(details) => openAppointmentDialog(details)}
                                                    appointmentStatus={appointmentStatusById.get(row.message.id) ?? 'proposed'}
                                                    showAppointments={tools.appointments}
                                                    showCalendar={tools.calendar}
                                                    showQuickReplies={tools.quickReplies}
                                                    quickBusy={quickSendingId === row.message.id}
                                                />
                                            </div>
                                        </Fragment>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {isBlocked && (
                            <div className="shrink-0 px-2 sm:px-4">
                                <div className="mx-auto flex max-w-3xl items-start gap-2 rounded-2xl border border-border bg-chat-other/95 px-3 py-2.5 text-[13px] leading-relaxed text-chat-meta shadow-soft" role="status">
                                    <Ban size={15} className="mt-0.5 shrink-0" aria-hidden />
                                    Du hast diesen Nutzer blockiert. Du kannst die Blockierung im Menü aufheben.
                                </div>
                            </div>
                        )}

                        <ChatComposer
                            value={newMessage}
                            onChange={setNewMessage}
                            onSend={() => { void sendMessage(); }}
                            onOpenAppointment={() => openAppointmentDialog({ subject: defaultAppointmentSubject })}
                            onHideChat={handleHideChat}
                            isBlocked={isBlocked}
                            isSending={isSending}
                            showAppointments={tools.appointments}
                            showEmojiPicker={tools.emojiPicker}
                            inputRef={composerRef}
                        />
                    </div>

                    {!isMobile && tools.calendar && (
                        <CalendarPanel
                            variant="desktop"
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                            appointments={appointments}
                            otherName={otherUser?.display_name}
                            canCreateAppointment={tools.appointments}
                            onNewAppointment={() => openAppointmentDialog({ subject: defaultAppointmentSubject })}
                            onGoToMessage={handleGoToMessage}
                        />
                    )}
                </div>

                {isMobile && tools.calendar && (
                    <CalendarPanel
                        variant="mobile"
                        open={calendarOpen}
                        onOpenChange={setCalendarOpen}
                        appointments={appointments}
                        otherName={otherUser?.display_name}
                        canCreateAppointment={tools.appointments}
                        onNewAppointment={() => openAppointmentDialog({ subject: defaultAppointmentSubject })}
                        onGoToMessage={handleGoToMessage}
                    />
                )}
            </div>

            <ChatToolsDialog
                open={toolsOpen}
                onOpenChange={setToolsOpen}
                settings={tools}
                onChange={updateTools}
            />

            {/* Appointment Booking Modal */}
            <AppointmentDialog
                key={appointmentDialogKey}
                open={appointmentModalOpen}
                onOpenChange={setAppointmentModalOpen}
                otherName={otherUser?.display_name}
                initial={appointmentSeed}
                onSend={handleCreateAppointment}
            />

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
