import { useState, useEffect, useRef } from 'react';
import { api, getStoredUser } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import {
    MessageSquare,
    AlertTriangle,
    Download,
    Shield,
    Lock,
    ArrowLeft,
    RefreshCw,
    Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface AdminChatProps {
    userId1?: string | null;
    userId2?: string | null;
    reportId?: string | null;
    onBack?: () => void;
}

import { checkContent, loadFilterOverrides, type FilterOverrides } from '../../lib/profanity';

interface Message {
    id: string;
    request_id: string;
    sender_id: string;
    content: string;
    is_deleted: boolean;
    created_at: string;
    sender?: {
        display_name: string | null;
    } | null;
}

export default function AdminChat({ userId1, userId2, reportId, onBack }: AdminChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [granting, setGranting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [chatFound, setChatFound] = useState(true);
    const [names, setNames] = useState<{ user1: string; user2: string }>({ user1: 'Nutzer 1', user2: 'Nutzer 2' });
    const bodyRef = useRef<HTMLDivElement>(null);

    // Profanity-2.0-Training: Admin-Overrides für treffsicheres Highlight
    const [filterOverrides, setFilterOverrides] = useState<FilterOverrides>({ allow: [], block: [] });
    useEffect(() => {
        loadFilterOverrides().then(setFilterOverrides).catch(() => {});
    }, []);

    useEffect(() => {
        if (userId1 && userId2 && reportId) {
            setupAccessAndLoad();
        }
    }, [userId1, userId2, reportId]);

    useEffect(() => {
        // Nur den Chatverlauf scrollen. scrollIntoView() zog früher auch die
        // Admin-Seite nach oben und schob die Chat-Kopfzeile unter den Sticky-
        // Header – auf 390 besonders sichtbar.
        const body = bodyRef.current;
        if (!body) return;
        const reduce = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        body.scrollTo({ top: body.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    }, [messages]);

    const setupAccessAndLoad = async () => {
        setLoading(true);
        setGranting(true);
        setLoadError(null);
        try {
            const adminId = getStoredUser()?.id;
            if (!adminId) throw new Error('Nicht authentifiziert');

            // 1. Resolve names first (Shim: profiles.in → Admin-Fallback mit max. 100 Nutzern)
            const { data: usersData } = await api.admin.users(undefined, undefined, { limit: 100 });
            const allUsers: any[] = Array.isArray(usersData) ? usersData : (usersData?.data ?? []);
            const profiles = allUsers.filter((u) => [userId1, userId2].includes(u.id));

            if (profiles) {
                const u1 = profiles.find(p => p.id === userId1);
                const u2 = profiles.find(p => p.id === userId2);
                setNames({
                    user1: u1?.display_name || `${u1?.first_name} ${u1?.last_name}` || 'Nutzer 1',
                    user2: u2?.display_name || `${u2?.first_name} ${u2?.last_name}` || 'Nutzer 2'
                });
            }

            // 2. (Entfallen) Temporärer report_chat_access-Grant: hatte im Shim kein Backend-Pendant
            //    (silent no-op). Die Einsicht autorisiert der Server über die SV-Admin-Rolle.
            setGranting(false);

            // 3. Find requests/chats between these users
            //    Hinweis: Der Shim hat `.or(...)` verworfen – es kommen weiterhin nur die
            //    eigenen Anfragen des Admins zurück (Verhalten unverändert).
            const { data: requests, error: requestsError } = await api.requests.list();

            if (requestsError) throw requestsError;

            if (!requests || requests.length === 0) {
                setChatFound(false);
                setMessages([]);
                setLoading(false);
                return;
            }

            const requestIds = requests.map((r: any) => r.id);

            // 4. Fetch messages
            //    Der Shim hat `.in('request_id', requestIds)` zu einer kommagetrennten Einzel-ID
            //    zusammengezogen (messages.php vergleicht exakt) – Verhalten bleibt identisch.
            const { data: msgs, error: msgsError } = await api.messages.list(requestIds.join(','));

            if (msgsError) throw msgsError;

            // Resolve sender names locally or with fallback
            const resolvedMessages = msgs.map((m: any) => {
                const isUser1 = m.sender_id === userId1;
                return {
                    ...m,
                    sender: {
                        display_name: isUser1 ? names.user1 : names.user2
                    }
                };
            });

            setMessages(resolvedMessages || []);
            setChatFound(true);
        } catch (error: any) {
            console.error('Error loading chat for admin:', error);
            setLoadError('Fehler beim Laden des Chats: ' + error.message);
            toast.error('Fehler beim Laden des Chats: ' + error.message);
        } finally {
            setLoading(false);
            setGranting(false);
        }
    };

    const handleExport = () => {
        if (messages.length === 0) return;

        const chatLog = messages.map(m => {
            const time = new Date(m.created_at).toLocaleString('de-DE');
            const senderName = m.sender_id === userId1 ? names.user1 : names.user2;
            const content = m.is_deleted ? '[Diese Nachricht wurde gelöscht]' : m.content;
            return `[${time}] ${senderName}: ${content}`;
        }).join('\n');

        const fileContent = `SV CHAT EINSICHT (PROTOKOLL)\n` +
            `Bericht-ID: ${reportId}\n` +
            `Zeitpunkt: ${new Date().toLocaleString('de-DE')}\n` +
            `Parteien: ${names.user1} ↔ ${names.user2}\n` +
            `==========================================\n\n` +
            chatLog;

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chat_protokoll_${reportId?.slice(0, 8)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Chat-Protokoll exportiert');
    };

    // Moderations-Highlight (Anzeige only, sendseitiger Block in Chat.tsx via shared Lib)
    const hasProfanity = (content: string) => {
        return checkContent(content, filterOverrides).blocked;
    };

    if (!userId1 || !userId2 || !reportId) {
        return (
            <Card className="overflow-hidden rounded-card py-16 text-center">
                <CardContent className="mx-auto max-w-md space-y-4">
                    <div className="mx-auto grid size-16 place-items-center rounded-xl bg-destructive/10 text-destructive">
                        <Lock size={32} aria-hidden />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Kein Chat ausgewählt</h2>
                    <p className="text-sm text-muted-foreground">
                        Aus Sicherheitsgründen können Chats im Admin-Panel nicht frei durchsucht werden.
                        Bitte wähle eine aktive Meldung unter 'Meldungen' aus und klicke auf 'Chat-Einsicht öffnen'.
                    </p>
                    {onBack && (
                        <Button onClick={onBack} variant="outline" className="mt-4 h-11 gap-2 text-xs">
                            <ArrowLeft size={16} aria-hidden /> Zurück zu den Meldungen
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex h-[calc(100dvh-18rem)] min-h-[380px] flex-col overflow-hidden rounded-card md:h-[600px]">
            {/* Header */}
            <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-muted/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="icon" type="button" onClick={onBack} className="h-11 w-11 shrink-0" aria-label="Zurück zu den Meldungen">
                            <ArrowLeft size={20} aria-hidden />
                        </Button>
                    )}
                    <div className="min-w-0">
                        <div className="break-words text-sm font-semibold text-foreground">
                            {names.user1} ↔ {names.user2}
                        </div>
                        <div className="mt-0.5 break-words text-xs font-medium text-muted-foreground">
                            Meldeverfahren Einsicht • ID: {reportId.slice(0, 8)}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                        <Shield size={16} aria-hidden />
                        SV Einsicht
                    </span>
                    {messages.length > 0 && (
                        <Button onClick={handleExport} variant="outline" size="sm" className="h-11 gap-1.5 text-xs">
                            <Download size={16} aria-hidden /> Exportieren
                        </Button>
                    )}
                    <Button onClick={setupAccessAndLoad} variant="ghost" size="icon" className="h-11 w-11" aria-label="Chat aktualisieren">
                        <RefreshCw size={16} className={cn(loading && 'animate-spin')} aria-hidden />
                    </Button>
                </div>
            </div>

            {/* Chat Body */}
            <div
                ref={bodyRef}
                className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto bg-muted/20 p-4"
                role="log"
                aria-label="Chatverlauf der Meldung"
            >
                {loadError ? (
                    <div className="m-auto w-full max-w-sm">
                        <Alert variant="destructive">
                            <AlertTitle>Chat nicht verfügbar</AlertTitle>
                            <AlertDescription className="space-y-3">
                                <span className="block break-words">{loadError}</span>
                                <Button type="button" variant="outline" className="h-11" onClick={setupAccessAndLoad}>
                                    Erneut laden
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                ) : granting ? (
                    <div className="m-auto text-center">
                        <Spinner className="mx-auto size-6 text-foreground" />
                        <p className="mt-2 text-xs font-medium text-muted-foreground">Bereite Chat-Einsicht vor...</p>
                    </div>
                ) : loading ? (
                    <div className="m-auto text-center">
                        <Spinner className="mx-auto size-6 text-foreground" />
                        <p className="mt-2 text-xs text-muted-foreground">Lade Chatnachrichten...</p>
                    </div>
                ) : !chatFound ? (
                    <div className="m-auto max-w-sm space-y-2 py-20 text-center text-muted-foreground">
                        <MessageSquare size={32} className="mx-auto opacity-50" aria-hidden />
                        <p className="text-sm font-semibold">Kein Chat vorhanden</p>
                        <p className="text-xs">Die beiden Beteiligten haben bisher keine Chatnachrichten ausgetauscht.</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="m-auto max-w-sm space-y-1 text-center text-muted-foreground">
                        <MessageSquare size={32} className="mx-auto opacity-50" aria-hidden />
                        <p className="text-sm">Dieser Chat ist leer.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isUser1 = msg.sender_id === userId1;
                        const senderName = isUser1 ? names.user1 : names.user2;
                        const profanity = hasProfanity(msg.content) && !msg.is_deleted;

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    'flex max-w-[85%] flex-col gap-1 rounded-2xl border p-3 sm:max-w-[75%]',
                                    isUser1
                                        ? 'self-start border-border bg-card'
                                        : 'self-end border-border bg-muted',
                                    profanity && 'border-destructive/30 bg-destructive/10'
                                )}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <span className="break-words text-xs font-semibold text-muted-foreground">
                                        {senderName}
                                    </span>
                                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                        {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <p className={cn(
                                    'mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground',
                                    msg.is_deleted && 'italic text-muted-foreground'
                                )}>
                                    {msg.is_deleted ? (<span className="inline-flex items-center gap-1"><Ban size={16} aria-hidden /> Diese Nachricht wurde gelöscht</span>) : msg.content}
                                </p>

                                {profanity && (
                                    <div className="mt-1.5 flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                                        <AlertTriangle size={16} aria-hidden />
                                        Möglicher Regelverstoß (Beleidigung)
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </Card>
    );
}
