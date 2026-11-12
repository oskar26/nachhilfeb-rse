import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { startChatPoll } from '../lib/polling';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ChevronLeft, Send, Trash2, Check, CheckCheck, Pencil, MoreVertical, Ban, Calendar, CalendarDays, Download, EyeOff, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import ReportWizard from '../components/ReportWizard';
import { downloadICSFile } from '../lib/calendar';
import { blockedReason, checkContent, loadFilterOverrides, type FilterOverrides } from '../lib/profanity';
import { maybeAutoReport } from '../lib/autoreport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

interface Message {
    id: string;
    request_id: string;
    sender_id: string;
    content: string;
    is_deleted: boolean;
    read_at: string | null;
    created_at: string;
    edited_at?: string | null;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

        const formattedContent = `TERMIN-VEREINBARUNG\nFach: ${appSubject}\nDatum: ${appDate}\nUhrzeit: ${appTime} Uhr (45 Min)\nOrt: FWG Bibliothek / Schulgelände`;

        const { error } = await api.messages.send(requestId, formattedContent);

        if (error) {
            toast.error('Fehler beim Termin-Vorschlagen.');
        } else {
            toast.success('Terminvorschlag im Chat gesendet!');
            setAppointmentModalOpen(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

        // Fetch messages (der Server markiert empfangene Nachrichten beim GET serverseitig als gelesen)
        const { data: msgs } = await api.messages.list(requestId);

        if (msgs) {
            setMessages(msgs);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!user || !requestId) return;
        fetchData();

        // Live-Updates: kurzes Polling ersetzt den früheren Supabase-Realtime-Kanal.
        const stopPolling = startChatPoll(requestId, (newMsg: Message) => {
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        });

        return stopPolling;
    }, [user, requestId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !requestId) return;

        const check = checkContent(newMessage, filterOverrides);
        if (check.blocked) {
            toast.error(blockedReason(newMessage, filterOverrides) ?? 'Diese Nachricht wurde vom Inhaltsfilter blockiert.', { duration: 6000 });
            void maybeAutoReport(check, newMessage, { category: 'chat', reportedUserId: user.id, place: 'Chat' });
            return;
        }

        const msgContent = newMessage;
        setNewMessage(''); // optimistic clear

        const { error } = await api.messages.send(requestId, msgContent);

        if (error) {
            toast.error('Fehler beim Senden.');
            console.error(error);
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

    const handleBlockUser = async () => {
        if (!otherUserId || !user) return;
        setConfirmDialog({
            title: 'Chat verbergen?',
            description: `${otherUser?.display_name || 'Diesen Nutzer'} Chat verbergen? Der Chat wird auf diesem Gerät verborgen. Zum Schutz aller bleibt der Verlauf für die SV-Moderation gespeichert.`,
            confirmLabel: 'Chat verbergen',
            onConfirm: () => {
                // Kein Backend-Endpunkt für Nutzer-Blocks: Das Blockieren verbirgt den Chat nur auf diesem Gerät.
                if (requestId) hideChatId(requestId);
                toast.success('Chat auf diesem Gerät verborgen.');
                navigate('/requests');
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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8" role="status">
            <div className="size-8 animate-spin rounded-lg border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Lade Chat…</p>
        </div>
    );

    return (
        <>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
            {/* Header */}
            <header className="flex shrink-0 items-center gap-0.5 border-b border-border bg-card/95 p-1.5 backdrop-blur md:gap-1 md:p-2">
                <Button variant="ghost" size="icon" onClick={() => navigate('/requests')} className="size-11 shrink-0 rounded-lg" aria-label="Zurück zu den Anfragen">
                    <ChevronLeft size={20} aria-hidden />
                </Button>
                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-0.5">
                    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-sm font-semibold text-foreground">
                        {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" /> : (otherUser?.display_name?.charAt(0) || '?')}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight text-foreground">{otherUser?.display_name || 'Unbekannt'}</p>
                        <p className="text-xs text-muted-foreground">Chat</p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAppointmentModalOpen(true)}
                    className="size-11 shrink-0 rounded-lg"
                    title="Termin für Nachhilfestunde vereinbaren"
                    aria-label="Termin vereinbaren"
                >
                    <Calendar size={19} aria-hidden />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setReportOpen(true)}
                    title="Nutzer melden"
                    aria-label="Nutzer melden"
                    className="size-11 shrink-0 rounded-lg text-destructive hover:bg-destructive/10"
                >
                    <Flag size={19} aria-hidden />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        aria-label="Weitere Optionen"
                        className="grid size-11 shrink-0 place-items-center rounded-lg text-foreground transition-colors hover:bg-muted"
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleBlockUser} className="min-h-11 gap-2.5 px-3">
                            <Ban size={16} aria-hidden /> Chat verbergen
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={hideChatAndLeave} className="min-h-11 gap-2.5 px-3">
                            <EyeOff size={16} aria-hidden /> Chat verbergen und verlassen
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            {/* Messages Area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-3 py-4 sm:px-4">
                {messages.length === 0 ? (
                    <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 text-center text-xs leading-relaxed text-muted-foreground">
                        Hier beginnt euer Chat. Deine Nachrichten werden über eine verschlüsselte Verbindung (HTTPS) übertragen und auf Servern in Deutschland gespeichert. Bitte achte auf unsere <a href="#/nutzungsbedingungen" className="font-semibold text-foreground underline underline-offset-4">Nutzungsbedingungen</a>.
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === user?.id;
                        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isEditing = editingId === msg.id;

                        // Show date divider if day changed
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                        return (
                            <div key={msg.id} className="flex flex-col">
                                {showDate && (
                                    <div className="my-3 text-center">
                                        <span className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                            {new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' })}
                                        </span>
                                    </div>
                                )}
                                <div className={cn("relative flex max-w-[85%]", isMe ? "self-end" : "self-start")}>
                                    <div
                                        className={cn(
                                            "relative min-w-20 break-words rounded-xl px-3 py-2 text-sm leading-relaxed",
                                            isMe
                                                ? "rounded-br-md bg-foreground text-background"
                                                : "rounded-bl-md bg-muted text-foreground",
                                            msg.is_deleted && "italic opacity-70"
                                        )}
                                    >
                                        {msg.is_deleted ? (
                                            <span className="flex items-center gap-1 text-xs opacity-70"><Ban size={12} aria-hidden /> Nachricht auf diesem Gerät ausgeblendet.</span>
                                        ) : isEditing ? (
                                            <div className="min-w-[200px] space-y-2">
                                                <Textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                                                    className="min-h-20 w-full resize-none bg-card text-sm text-foreground"
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-1.5">
                                                    <Button variant="outline" size="sm" type="button" onClick={cancelEditing} className="h-11 rounded-lg bg-card px-4 text-xs text-foreground">
                                                        Abbrechen
                                                    </Button>
                                                    <Button size="sm" type="button" onClick={() => saveEdit(msg.id)} className="h-11 rounded-lg px-4 text-xs font-semibold">
                                                        Speichern
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="whitespace-pre-wrap">{msg.content}</div>
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
                                                        className="mt-2 h-11 gap-1.5 rounded-lg bg-card px-3 text-xs font-semibold text-foreground"
                                                    >
                                                        <Download size={14} aria-hidden /> In Kalender speichern (.ics)
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {!isEditing && (
                                            <div className={cn("mt-1 flex items-center justify-end gap-1", isMe ? "text-background/75" : "text-muted-foreground")}>
                                                {msg.edited_at && !msg.is_deleted && (
                                                    <span className="text-xs italic leading-none">(bearbeitet)</span>
                                                )}
                                                <span className="ml-1 text-xs leading-none tabular-nums">{time}</span>
                                                {isMe && !msg.is_deleted && (
                                                    <span className="ml-0.5">
                                                        {msg.read_at ? <CheckCheck size={14} aria-hidden /> : <Check size={14} aria-hidden />}
                                                    </span>
                                                )}
                                                {isMe && !msg.is_deleted && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger aria-label="Nachricht bearbeiten oder ausblenden" className="-my-2 -mr-2 ml-0.5 grid size-11 place-items-center rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10">
                                                            <MoreVertical size={14} aria-hidden />
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
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 border-t border-border bg-card p-2 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                <form onSubmit={sendMessage} className="flex items-end gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Nachricht schreiben"
                        className="h-11 flex-1 rounded-xl text-base"
                        autoComplete="off"
                        aria-label="Nachricht schreiben"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="size-11 shrink-0 rounded-lg"
                        disabled={!newMessage.trim()}
                        aria-label="Nachricht senden"
                    >
                        <Send size={18} className="ml-0.5" aria-hidden />
                    </Button>
                </form>
            </div>
        </div>

        {/* Appointment Booking Modal */}
        <Dialog open={appointmentModalOpen} onOpenChange={setAppointmentModalOpen}>
            <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto rounded-xl sm:max-w-md">
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
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-foreground/80">Uhrzeit</Label>
                            <Input
                                type="time"
                                value={appTime}
                                onChange={e => setAppTime(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => setAppointmentModalOpen(false)} className="h-11 rounded-lg">Abbrechen</Button>
                        <Button type="submit" className="h-11 rounded-lg font-semibold">Termin vorschlagen</Button>
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
                onClose={() => setReportOpen(false)}
            />
        )}
        </>
    );
}
