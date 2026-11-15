import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
    X, Bug, Lightbulb, MessageCircle, Send, Loader2,
    CheckCircle, ChevronLeft, Smartphone, Monitor, Globe, Shield, Zap, Flag
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { blockedReason, checkContent, loadFilterOverrides, type FilterOverrides } from '../lib/profanity';
import { maybeAutoReport } from '../lib/autoreport';
import ReportWizard from './ReportWizard';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TicketType = 'bug' | 'feature' | 'support';
type ModalView = 'menu' | 'form' | 'chat' | 'success';

interface SupportMessage {
    id: string;
    content: string;
    sender_id: string;
    is_admin_reply: boolean;
    created_at: string;
}

interface SupportTicket {
    id: string;
    type: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Unbekannt';
    let os = 'Unbekannt';
    let browser = 'Unbekannt';

    // OS
    if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    // Device
    if (/Mobile|Android|iPhone/i.test(ua)) device = 'Smartphone';
    else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';
    else device = 'Desktop';

    // Browser
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Edg/i.test(ua)) browser = 'Edge';

    return { device, os, browser, ua, screenWidth: window.innerWidth, screenHeight: window.innerHeight };
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
    const { user } = useAuth();
    const [view, setView] = useState<ModalView>('menu');
    const [ticketType, setTicketType] = useState<TicketType>('bug');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Chat state
    const [chatTickets, setChatTickets] = useState<SupportTicket[]>([]);
    const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const [startingDirectChat, setStartingDirectChat] = useState(false);
    const [showReportWizard, setShowReportWizard] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Profanity-2.0-Training: Admin-Overrides einmalig laden
    const [filterOverrides, setFilterOverrides] = useState<FilterOverrides>({ allow: [], block: [] });
    useEffect(() => {
        loadFilterOverrides().then(setFilterOverrides).catch(() => {});
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setView('menu');
            setTitle('');
            setDescription('');
            setActiveTicket(null);
            setShowReportWizard(false);
        }
    }, [isOpen]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmitTicket = async () => {
        if (!title.trim() || !description.trim()) {
            toast.error('Bitte Titel und Beschreibung ausfüllen.');
            return;
        }
        const ticketCheck = checkContent(title + '\n' + description, filterOverrides);
        if (ticketCheck.blocked) {
            toast.error(blockedReason(title + '\n' + description, filterOverrides) ?? 'Dieser Text wurde vom Inhaltsfilter blockiert.', { duration: 6000 });
            void maybeAutoReport(ticketCheck, title + '\n' + description, { category: 'sonstiges', reportedUserId: user?.id ?? null, place: 'Support-Ticket' });
            return;
        }
        if (!user) return;

        setSubmitting(true);
        try {
            const deviceInfo = getDeviceInfo();
            const payload = {
                user_id: user.id,
                type: ticketType,
                title: title.trim(),
                description: description.trim(),
                device_info: deviceInfo,
            };
            const { error } = await api.support.createTicket(payload);

            if (error) throw error;

            triggerHaptic('success');
            setView('success');
            setTitle('');
            setDescription('');
        } catch (err: any) {
            toast.error('Fehler: ' + (err.message || 'Unbekannter Fehler'));
        } finally {
            setSubmitting(false);
        }
    };

    const fetchChatTickets = async () => {
        if (!user) return;
        setLoadingChat(true);
        try {
            const { data, error } = await api.support.listTickets();

            if (error) throw error;
            setChatTickets(data || []);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            setChatTickets([]);
        } finally {
            setLoadingChat(false);
        }
    };

    const fetchMessages = async (ticketId: string) => {
        try {
            const { data, error } = await api.support.getTicket(ticketId);

            if (error) throw error;
            setMessages(data?.messages || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setMessages([]);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeTicket || !user) return;
        // Direkt-Chat-Fallback: Falls das Ticket nur lokal existiert (tmp-*),
        // erst das echte Ticket vom Server holen – sonst schlägt der FK-Check fehl.
        let ticketId = activeTicket.id;
        if (ticketId.startsWith('tmp-')) {
            try {
                const { data } = await api.support.listTickets();
                const real = (data?.[0] as SupportTicket | undefined) ?? null;
                if (!real) {
                    toast.error('Chat konnte nicht angelegt werden. Bitte schließe das Fenster und versuche es erneut.');
                    return;
                }
                setActiveTicket(real);
                ticketId = real.id;
            } catch {
                toast.error('Chat konnte nicht angelegt werden. Bitte versuche es erneut.');
                return;
            }
        }
        const msgCheck = checkContent(newMessage, filterOverrides);
        if (msgCheck.blocked) {
            toast.error(blockedReason(newMessage, filterOverrides) ?? 'Diese Nachricht wurde vom Inhaltsfilter blockiert.', { duration: 6000 });
            void maybeAutoReport(msgCheck, newMessage, { category: 'sonstiges', reportedUserId: user?.id ?? null, place: 'Nachrichten' });
            return;
        }
        try {
            const { error } = await api.support.sendMessage(ticketId, newMessage.trim());

            if (error) throw error;

            triggerHaptic('light');
            setNewMessage('');
            fetchMessages(ticketId);
        } catch {
            toast.error('Nachricht konnte nicht gesendet werden.');
        }
    };

    const openChatView = () => {
        setView('chat');
        fetchChatTickets();
    };

    // Direkt-Chat ohne Ticket-Pflicht: Ticket wird automatisch angelegt und sofort geöffnet
    const handleStartDirectChat = async () => {
        if (!user || startingDirectChat) return;
        setStartingDirectChat(true);
        try {
            const payload = {
                user_id: user.id,
                type: 'support',
                title: 'Direkte Nachrichten',
                description: 'Direkt aus dem Hilfefenster gestartete Nachricht.',
            };
            const { error } = await api.support.createTicket(payload);
            if (error) throw error;

            // Neuestes Ticket des Nutzers laden und direkt öffnen
            const { data, error: listError } = await api.support.listTickets();
            if (listError) throw listError;

            const ticket = (data?.[0] as SupportTicket) || {
                id: `tmp-${Date.now()}`,
                type: 'support',
                title: 'Direkte Nachrichten',
                description: 'Direkt aus dem Hilfefenster gestartete Nachricht.',
                status: 'open',
                created_at: new Date().toISOString(),
            };
            triggerHaptic('success');
            setActiveTicket(ticket);
            setMessages([]);
            setView('chat');
            if (!ticket.id.startsWith('tmp-')) {
                fetchMessages(ticket.id);
            }
        } catch (err: any) {
            toast.error('Direkt-Chat konnte nicht gestartet werden: ' + (err.message || 'Fehler'));
        } finally {
            setStartingDirectChat(false);
        }
    };

    const openTicketChat = (ticket: SupportTicket) => {
        setActiveTicket(ticket);
        fetchMessages(ticket.id);
    };

    // Einmal pro Öffnen berechnen, nicht bei jedem Render (Vermeidung von Jank + unnötiger Arbeit).
    const deviceInfo = useMemo(() => getDeviceInfo(), [isOpen]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent
                showCloseButton={false}
                className="bottom-0 left-0 right-0 top-auto max-h-[92dvh] max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-b-none rounded-t-3xl border border-border p-0 shadow-overlay sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
            >
                <DialogDescription className="sr-only">
                    Support, Fehlermeldungen und Nachrichten an das SV-Team.
                </DialogDescription>
                <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden bg-card pb-[env(safe-area-inset-bottom,0px)]">
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            {view !== 'menu' && (
                                <Button variant="unstyled" size="unstyled" type="button"
                                    onClick={() => {
                                        if (activeTicket) {
                                            setActiveTicket(null);
                                        } else {
                                            setView('menu');
                                        }
                                    }}
                                    aria-label="Zurück"
                                    className="-ml-2 grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <ChevronLeft size={20} aria-hidden />
                                </Button>
                            )}
                            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-1.5">
                                {view === 'menu' && 'Hilfe'}
                                {view === 'form' && (ticketType === 'bug' ? <><Bug size={18} className="inline" /> Fehler melden</> : <><Lightbulb size={18} className="inline" /> Verbesserung vorschlagen</>)}
                                {view === 'chat' && (activeTicket ? activeTicket.title : <><MessageCircle size={18} className="inline" /> Nachrichten</>)}
                                {view === 'success' && <><CheckCircle size={18} className="inline text-foreground" /> Eingereicht!</>}
                            </DialogTitle>
                        </div>
                        <Button variant="unstyled" size="unstyled" type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-muted-foreground transition-colors hover:bg-muted"
                        >
                            <X size={20} />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                        {/* Menu View */}
                        {view === 'menu' && (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Wie können wir dir helfen? Wähle eine Option:
                                </p>

                                <Button variant="unstyled" size="unstyled" type="button"
                                    onClick={() => { setTicketType('bug'); setView('form'); triggerHaptic('light'); }}
                                    className="group flex min-h-16 w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
                                >
                                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                                        <Bug size={22} className="" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Fehler melden</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Etwas funktioniert nicht richtig? Lass es uns wissen.</p>
                                    </div>
                                </Button>

                                <Button variant="unstyled" size="unstyled" type="button"
                                    onClick={() => { setTicketType('feature'); setView('form'); triggerHaptic('light'); }}
                                    className="group flex min-h-16 w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
                                >
                                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                                        <Lightbulb size={22} className="" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Verbesserung vorschlagen</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Hast du eine Idee für eine Verbesserung?</p>
                                    </div>
                                </Button>

                                <Button variant="unstyled" size="unstyled" type="button"
                                    onClick={() => { openChatView(); triggerHaptic('light'); }}
                                    className="group flex min-h-16 w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
                                >
                                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                                        <MessageCircle size={22} className="" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Nachrichten</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Bisherige Anfragen ansehen und weiterschreiben.</p>
                                    </div>
                                </Button>

                                <Button variant="unstyled" size="unstyled" type="button"
                                    onClick={() => { handleStartDirectChat(); }}
                                    disabled={startingDirectChat}
                                    className="w-full flex items-center gap-4 p-4 border border-border bg-card text-left transition-colors hover:bg-muted group cursor-pointer rounded-xl disabled:opacity-60"
                                >
                                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                                        {startingDirectChat ? <Loader2 size={22} className=" animate-spin" /> : <Zap size={22} className="" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Direkt schreiben</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Schreibe direkt an das SV-Team. Du brauchst kein Formular.</p>
                                    </div>
                                </Button>

                                <Button variant="unstyled" size="unstyled" type="button"
                                    onClick={() => { setShowReportWizard(true); triggerHaptic('light'); }}
                                    className="group flex min-h-16 w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
                                >
                                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                                        <Flag size={22} className="" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Inhalt melden</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Anzeige, Profil, Chat oder Datenschutzverstoß melden.</p>
                                    </div>
                                </Button>
                            </div>
                        )}

                        {/* Form View */}
                        {view === 'form' && (
                            <div className="space-y-5">
                                {/* Auto-detected Device Info */}
                                <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground">Automatisch erkannt</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="flex items-center gap-1 text-xs bg-card px-2 py-0.5 rounded-lg border border-border text-muted-foreground">
                                            <Smartphone size={12} /> {deviceInfo.device}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs bg-card px-2 py-0.5 rounded-lg border border-border text-muted-foreground">
                                            <Monitor size={12} /> {deviceInfo.os}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs bg-card px-2 py-0.5 rounded-lg border border-border text-muted-foreground">
                                            <Globe size={12} /> {deviceInfo.browser}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {deviceInfo.screenWidth}×{deviceInfo.screenHeight}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/80">Titel *</Label>
                                    <Input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder={ticketType === 'bug' ? 'z.B. Anzeige lädt nicht auf dem Handy' : 'z.B. Dunkelmodus für den Chat'}
                                        className="w-full"
                                        maxLength={120}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/80">
                                        {ticketType === 'bug' ? 'Was ist passiert? *' : 'Beschreibe deine Idee *'}
                                    </Label>
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder={ticketType === 'bug' 
                                            ? 'Beschreibe den Fehler so genau wie möglich...\n\nWas hast du getan?\nWas hätte passieren sollen?\nWas ist stattdessen passiert?' 
                                            : 'Beschreibe deine gewünschte Verbesserung...\n\nWas soll es können?\nWarum wäre es nützlich?'}
                                        className="min-h-36 w-full resize-none"
                                        maxLength={2000}
                                    />
                                    <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleSubmitTicket}
                                    disabled={submitting || !title.trim() || !description.trim()}
                                    isLoading={submitting}
                                    className="h-11 w-full gap-2 rounded-full text-sm font-semibold"
                                >
                                    <Send size={16} aria-hidden /> Absenden
                                </Button>
                            </div>
                        )}

                        {/* Chat View */}
                        {view === 'chat' && !activeTicket && (
                            <div className="space-y-3">
                                {loadingChat ? (
                                    <div className="flex flex-col items-center gap-3 py-12">
                                        <Loader2 size={24} className="text-primary animate-spin" />
                                        <p className="text-sm text-muted-foreground">Anfragen werden geladen...</p>
                                    </div>
                                ) : chatTickets.length === 0 ? (
                                    <div className="py-12 text-center space-y-3">
                                        <MessageCircle size={40} className="mx-auto text-muted-foreground/60" />
                                        <p className="text-sm text-muted-foreground font-medium">Noch keine Anfragen.</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Erstelle eine Anfrage, um ein Gespräch mit dem SV-Team zu beginnen.</p>
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            onClick={() => setView('menu')}
                                            className="min-h-11 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
                                        >
                                            Neue Anfrage erstellen
                                        </Button>
                                    </div>
                                ) : (
                                    chatTickets.map(ticket => (
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            key={ticket.id}
                                            onClick={() => openTicketChat(ticket)}
                                            className="w-full flex items-start gap-3 p-4 rounded-xl border border-border bg-card text-left transition-colors hover:bg-muted cursor-pointer"
                                        >
                                            <div className={cn(
                                                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg',
                                                'bg-muted text-foreground'
                                            )}>
                                                {ticket.type === 'bug' ? <Bug size={18} /> : ticket.type === 'feature' ? <Lightbulb size={18} /> : <MessageCircle size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm text-foreground truncate">{ticket.title}</p>
                                                    <span className={cn(
                                                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                                                        ticket.status === 'open' ? 'bg-muted text-foreground'
                                                            : ticket.status === 'in_progress' ? 'bg-muted text-foreground/80'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        {ticket.status === 'open' ? 'Offen' : ticket.status === 'in_progress' ? 'In Bearbeitung' : ticket.status === 'resolved' ? 'Gelöst' : 'Geschlossen'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.description}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(ticket.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </Button>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Active Chat Thread */}
                        {view === 'chat' && activeTicket && (
                            <div className="space-y-3">
                                {/* Ticket info */}
                                <div className="space-y-1 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                                    <p><span className="font-semibold">Typ:</span> {activeTicket.type === 'bug' ? 'Bug' : activeTicket.type === 'feature' ? 'Feature' : 'Support'}</p>
                                    <p><span className="font-semibold">Status:</span> {activeTicket.status}</p>
                                    <p className="text-muted-foreground line-clamp-2">{activeTicket.description}</p>
                                </div>

                                {/* Messages */}
                                <div className="space-y-2 min-h-[120px]">
                                    {messages.length === 0 && (
                                        <p className="text-center text-xs text-muted-foreground py-8">Noch keine Nachrichten. Schreib dem Support-Team!</p>
                                    )}
                                    {messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
                                                msg.is_admin_reply
                                                    ? 'mr-auto border border-border bg-muted'
                                                    : 'ml-auto bg-muted'
                                            )}
                                        >
                                            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                                                {msg.is_admin_reply ? (<span className="inline-flex items-center gap-1"><Shield size={12} /> SV Admin</span>) : 'Du'}
                                            </p>
                                            <p className="whitespace-pre-wrap text-foreground">{msg.content}</p>
                                            <p className="text-xs text-muted-foreground text-right mt-1">
                                                {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                            </div>
                        )}

                        {/* Success View */}
                        {view === 'success' && (
                            <div className="py-8 text-center space-y-4">
                                <div className="mx-auto grid size-16 place-items-center rounded-lg bg-muted text-foreground">
                                    <CheckCircle size={32} aria-hidden />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Anfrage gesendet.</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    Deine Anfrage wurde an das SV-Team gesendet.
                                    Du kannst den Status in den Nachrichten verfolgen.
                                </p>
                                <div className="flex gap-2 justify-center pt-2">
                                    <Button variant="unstyled" size="unstyled" type="button"
                                        onClick={() => { openChatView(); }}
                                        className="min-h-11 rounded-lg bg-muted px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted/70"
                                    >
                                        Zu den Nachrichten
                                    </Button>
                                    <Button variant="unstyled" size="unstyled" type="button"
                                        onClick={onClose}
                                        className="min-h-11 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                                    >
                                        Schließen
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat input footer */}
                    {view === 'chat' && activeTicket && (
                        <div className="shrink-0 border-t border-border bg-muted/30 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:p-4">
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Nachricht an das SV-Team..."
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    aria-label="Nachricht senden"
                                    className="size-11 shrink-0 rounded-full"
                                >
                                    <Send size={18} aria-hidden />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <ReportWizard isOpen={showReportWizard} onClose={() => setShowReportWizard(false)} />
            </DialogContent>
        </Dialog>
    );
}
