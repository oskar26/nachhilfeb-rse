import { NativeSelect } from '@/components/ui/native-select';
import { useState, useEffect, useRef } from 'react';
import { api, getStoredUser } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import {
    Search, Bug, Lightbulb, MessageCircle, Send,
    ChevronLeft, Clock, AlertCircle, RefreshCw, Shield, User
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { blockedReason, checkContent, loadFilterOverrides, type FilterOverrides } from '../../lib/profanity';
import { maybeAutoReport } from '../../lib/autoreport';

interface Ticket {
    id: string;
    user_id: string;
    type: 'bug' | 'feature' | 'support';
    title: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: string;
    device_info: any;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    user_name?: string;
    user_email?: string;
}

interface Message {
    id: string;
    ticket_id: string;
    sender_id: string;
    content: string;
    is_admin_reply: boolean;
    created_at: string;
}

const STATUS_TEXT: Record<string, string> = {
    open: 'Offen',
    in_progress: 'In Bearbeitung',
    resolved: 'Gelöst',
    closed: 'Geschlossen',
};

export default function AdminSupport() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Active ticket view
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [newReply, setNewReply] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Profanity-2.0-Training: Admin-Overrides einmalig laden
    const [filterOverrides, setFilterOverrides] = useState<FilterOverrides>({ allow: [], block: [] });
    useEffect(() => {
        loadFilterOverrides().then(setFilterOverrides).catch(() => {});
    }, []);

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchTickets = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const { data: ticketsData, error } = await api.support.listTickets();

            if (error) throw error;

            // Resolve user names
            if (ticketsData && ticketsData.length > 0) {
                const userIds = Array.from(new Set(ticketsData.map((t: any) => t.user_id)));
                // Shim-Äquivalent zu profiles.in(...): Admin-Fallback (max. 100 Nutzer).
                // listTickets bettet nur user_name (ohne E-Mail) ein, die Detailansicht zeigt aber beides.
                const { data: usersData } = await api.admin.users(undefined, undefined, { limit: 100 });
                const allUsers: any[] = Array.isArray(usersData) ? usersData : (usersData?.data ?? []);
                const profiles = allUsers.filter((u) => userIds.includes(u.id));

                const profileMap = new Map(profiles?.map(p => [p.id, p]));
                const enriched = ticketsData.map((t: any) => {
                    const prof = profileMap.get(t.user_id);
                    return {
                        ...t,
                        user_name: prof?.display_name || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Unbekannt',
                        user_email: prof?.email || '',
                    } as Ticket;
                });
                setTickets(enriched);
            } else {
                setTickets([]);
            }
        } catch (err: any) {
            console.error('Error fetching tickets:', err);
            setLoadError('Tickets konnten nicht geladen werden.');
            toast.error('Tickets konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (ticketId: string) => {
        setMessagesError(null);
        try {
            // support_messages hatte im Shim keinen Select (immer leer); getTicket liefert die eingebetteten Nachrichten.
            const { data, error } = await api.support.getTicket(ticketId);

            if (error) throw error;
            setMessages(data?.messages || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setMessages([]);
            setMessagesError('Chat-Verlauf konnte nicht geladen werden.');
        }
    };

    const handleSendReply = async () => {
        if (!newReply.trim() || !activeTicket) return;
        const replyCheck = checkContent(newReply, filterOverrides);
        if (replyCheck.blocked) {
            toast.error(blockedReason(newReply, filterOverrides) ?? 'Diese Nachricht wurde vom Inhaltsfilter blockiert.', { duration: 6000 });
            void maybeAutoReport(replyCheck, newReply, { category: 'sonstiges', place: 'Support-Antwort (SV)' });
            return;
        }
        setSendingReply(true);
        try {
            if (!getStoredUser()) throw new Error('Nicht eingeloggt');

            const { error } = await api.support.sendMessage(activeTicket.id, newReply.trim());

            if (error) throw error;

            // Auto-set status to in_progress if it was open
            if (activeTicket.status === 'open') {
                await api.support.updateStatus(activeTicket.id, 'in_progress');
                setActiveTicket({ ...activeTicket, status: 'in_progress' });
                window.dispatchEvent(new Event('admin:counts-refresh'));
            }

            setNewReply('');
            fetchMessages(activeTicket.id);
            toast.success('Antwort gesendet');
        } catch (err: any) {
            toast.error('Fehler: ' + err.message);
        } finally {
            setSendingReply(false);
        }
    };

    const updateTicketStatus = async (ticketId: string, status: string) => {
        try {
            const { error } = await api.support.updateStatus(ticketId, status);

            if (error) throw error;
            toast.success(`Status auf "${STATUS_TEXT[status] || status}" geändert`);
            window.dispatchEvent(new Event('admin:counts-refresh'));

            if (activeTicket?.id === ticketId) {
                setActiveTicket({ ...activeTicket, status: status as any });
            }
            fetchTickets();
        } catch (err: any) {
            toast.error('Status-Fehler: ' + err.message);
        }
    };

    const openTicket = (ticket: Ticket) => {
        setActiveTicket(ticket);
        fetchMessages(ticket.id);
    };

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            (t.user_name || '').toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'all' || t.type === filterType;
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    const openCount = tickets.filter(t => t.status === 'open').length;
    const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

    const typeIcon = (type: string) => {
        if (type === 'bug') return <Bug size={16} className="text-destructive" aria-hidden />;
        if (type === 'feature') return <Lightbulb size={16} className="text-amber-600 dark:text-amber-400" aria-hidden />;
        return <MessageCircle size={16} className="text-muted-foreground" aria-hidden />;
    };

    const statusBadge = (status: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            open: { label: 'Offen', cls: 'bg-destructive/10 text-destructive' },
            in_progress: { label: 'In Bearbeitung', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
            resolved: { label: 'Gelöst', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
            closed: { label: 'Geschlossen', cls: 'bg-muted text-muted-foreground' },
        };
        const s = map[status] || map.open;
        return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', s.cls)}>{s.label}</span>;
    };

    // Detail view for a ticket
    if (activeTicket) {
        return (
            <div className="space-y-4">
                {/* Back button and header */}
                <div className="flex flex-col gap-2">
                    <Button variant="ghost" onClick={() => setActiveTicket(null)} className="-ml-2 h-11 w-fit gap-1.5 px-2 text-sm">
                        <ChevronLeft size={20} aria-hidden /> Zurück
                    </Button>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-2">
                            <span className="mt-1 shrink-0">{typeIcon(activeTicket.type)}</span>
                            <div className="min-w-0">
                                <h2 className="break-words text-lg font-semibold text-foreground">{activeTicket.title}</h2>
                                <p className="mt-0.5 break-words text-xs text-muted-foreground">
                                    Von {activeTicket.user_name} ({activeTicket.user_email}) · {new Date(activeTicket.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0">{statusBadge(activeTicket.status)}</div>
                    </div>
                </div>

                {/* Ticket details card */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Left: Description & Device Info */}
                    <div className="space-y-3 lg:col-span-1">
                        <Card className="shadow-soft">
                            <CardContent className="space-y-3 p-4">
                                <div>
                                    <p className="mb-1 text-xs font-medium text-muted-foreground">Beschreibung</p>
                                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">{activeTicket.description}</p>
                                </div>

                                {activeTicket.device_info && Object.keys(activeTicket.device_info).length > 0 && (
                                    <div>
                                        <p className="mb-1 text-xs font-medium text-muted-foreground">Geräteinformationen</p>
                                        <div className="space-y-0.5 break-words text-xs text-muted-foreground">
                                            {activeTicket.device_info.device && <p>Gerät: {activeTicket.device_info.device}</p>}
                                            {activeTicket.device_info.os && <p>OS: {activeTicket.device_info.os}</p>}
                                            {activeTicket.device_info.browser && <p>Browser: {activeTicket.device_info.browser}</p>}
                                            {activeTicket.device_info.screenWidth && <p>Bildschirm: {activeTicket.device_info.screenWidth}×{activeTicket.device_info.screenHeight}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Status changer */}
                                <div>
                                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Status ändern</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['open', 'in_progress', 'resolved', 'closed'].map(status => (
                                            <Button
                                                key={status}
                                                type="button"
                                                variant={activeTicket.status === status ? 'primary' : 'outline'}
                                                aria-pressed={activeTicket.status === status}
                                                onClick={() => updateTicketStatus(activeTicket.id, status)}
                                                className="h-11 px-3 text-xs"
                                            >
                                                {STATUS_TEXT[status] || status}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Chat */}
                    <div className="lg:col-span-2">
                        <Card className="flex h-[min(70dvh,560px)] min-h-[380px] flex-col shadow-soft lg:h-[520px]">
                            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
                                <MessageCircle size={16} className="text-muted-foreground" aria-hidden />
                                <span className="text-sm font-semibold">Chat-Verlauf</span>
                                <span className="text-xs text-muted-foreground">({messages.length} Nachrichten)</span>
                            </div>

                            <CardContent className="flex-1 space-y-2 overflow-y-auto p-4">
                                {messagesError ? (
                                    <div className="py-8 text-center">
                                        <p className="text-sm text-destructive">{messagesError}</p>
                                        <Button type="button" variant="outline" className="mt-3 h-11" onClick={() => fetchMessages(activeTicket.id)}>
                                            Erneut laden
                                        </Button>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <p className="py-12 text-center text-xs text-muted-foreground">Noch keine Chat-Nachrichten.</p>
                                ) : (
                                    messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                'max-w-[85%] rounded-2xl border px-4 py-2.5 text-sm sm:max-w-[80%]',
                                                msg.is_admin_reply
                                                    ? 'ml-auto border-primary/20 bg-primary/10'
                                                    : 'mr-auto border-border bg-muted'
                                            )}
                                        >
                                            <p className="mb-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                                {msg.is_admin_reply ? (<><Shield size={16} aria-hidden /> Admin-Antwort</>) : (<><User size={16} aria-hidden /> {activeTicket.user_name}</>)}
                                            </p>
                                            <p className="whitespace-pre-wrap break-words text-foreground">{msg.content}</p>
                                            <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                                                {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </CardContent>

                            <div className="flex shrink-0 gap-2 border-t border-border p-3">
                                <Input
                                    value={newReply}
                                    onChange={e => setNewReply(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                                    placeholder="Admin-Antwort schreiben..."
                                    className="h-11"
                                    aria-label="Admin-Antwort"
                                />
                                <Button
                                    onClick={handleSendReply}
                                    disabled={!newReply.trim() || sendingReply}
                                    size="icon"
                                    className="h-11 w-11 shrink-0"
                                    aria-label="Antwort senden"
                                    title="Antwort senden"
                                >
                                    {sendingReply ? <Spinner /> : <Send size={16} aria-hidden />}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // Ticket list view
    return (
        <div className="space-y-6">
            {/* Stats row */}
            <div className="flex flex-wrap gap-2">
                <div className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-2',
                    openCount > 0 ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-muted/50'
                )}>
                    <AlertCircle size={16} className={openCount > 0 ? 'text-destructive' : 'text-muted-foreground'} aria-hidden />
                    <span className={cn('text-sm font-medium', openCount > 0 ? 'text-destructive' : 'text-foreground')}>{openCount} offene Tickets</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-2">
                    <Clock size={16} className="text-amber-600 dark:text-amber-400" aria-hidden />
                    <span className="text-sm font-medium text-foreground">{inProgressCount} in Bearbeitung</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-2">
                    <span className="text-sm font-medium text-foreground">{tickets.length} gesamt</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
                <div className="relative w-full 2xl:max-w-md">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} aria-hidden />
                    <Input
                        placeholder="Tickets suchen nach Titel, Beschreibung, Nutzer..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-11 pl-11"
                        aria-label="Tickets durchsuchen"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <NativeSelect
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        wrapperClassName="w-full sm:w-40"
                        className="w-full"
                        aria-label="Nach Typ filtern"
                    >
                        <option value="all">Alle Typen</option>
                        <option value="bug">Bugs</option>
                        <option value="feature">Features</option>
                        <option value="support">Support</option>
                    </NativeSelect>
                    <NativeSelect
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        wrapperClassName="w-full sm:w-44"
                        className="w-full"
                        aria-label="Nach Status filtern"
                    >
                        <option value="all">Alle Status</option>
                        <option value="open">Offen</option>
                        <option value="in_progress">In Bearbeitung</option>
                        <option value="resolved">Gelöst</option>
                        <option value="closed">Geschlossen</option>
                    </NativeSelect>
                    <Button onClick={fetchTickets} variant="ghost" size="icon" className="h-11 w-11 shrink-0" title="Aktualisieren" aria-label="Tickets aktualisieren">
                        <RefreshCw size={16} className={cn(loading && 'animate-spin')} aria-hidden />
                    </Button>
                </div>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Tickets nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={fetchTickets}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Ticket list */}
            {loadError ? null : loading ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
                    <Spinner className="size-6 text-brand-ink dark:text-primary" />
                    <p className="text-sm text-muted-foreground">Lade Tickets...</p>
                </div>
            ) : filteredTickets.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card px-4 py-16 text-center">
                    <MessageCircle size={32} className="mx-auto text-muted-foreground" aria-hidden />
                    <p className="mt-3 text-base font-medium text-foreground">Keine Tickets gefunden</p>
                    <p className="mt-1 text-xs text-muted-foreground">Passe deine Filter an oder warte auf neue Anfragen.</p>
                </div>
            ) : (
                <Card className="shadow-soft">
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {filteredTickets.map(ticket => (
                                <Button
                                    variant="unstyled"
                                    size="unstyled"
                                    type="button"
                                    key={ticket.id}
                                    onClick={() => openTicket(ticket)}
                                    className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                                        {typeIcon(ticket.type)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="break-words text-sm font-semibold text-foreground">{ticket.title}</p>
                                            {statusBadge(ticket.status)}
                                        </div>
                                        <p className="mt-0.5 break-words text-xs text-muted-foreground">{ticket.description}</p>
                                        <p className="mt-1 break-words text-xs text-muted-foreground">
                                            {ticket.user_name} · {new Date(ticket.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
