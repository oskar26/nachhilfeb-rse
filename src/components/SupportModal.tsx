import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Bug, Lightbulb, MessageCircle, Send, Loader2, 
    CheckCircle, ChevronLeft, Smartphone, Monitor, Globe 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

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
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setView('menu');
            setTitle('');
            setDescription('');
            setActiveTicket(null);
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
        if (!user) return;

        setSubmitting(true);
        try {
            const deviceInfo = getDeviceInfo();
            const { error } = await supabase.from('support_tickets').insert({
                user_id: user.id,
                type: ticketType,
                title: title.trim(),
                description: description.trim(),
                device_info: deviceInfo,
            });

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
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

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
            const { data, error } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setMessages([]);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeTicket || !user) return;
        try {
            const { error } = await supabase.from('support_messages').insert({
                ticket_id: activeTicket.id,
                sender_id: user.id,
                content: newMessage.trim(),
                is_admin_reply: false,
            });

            if (error) throw error;

            triggerHaptic('light');
            setNewMessage('');
            fetchMessages(activeTicket.id);
        } catch (err: any) {
            toast.error('Nachricht konnte nicht gesendet werden.');
        }
    };

    const openChatView = () => {
        setView('chat');
        fetchChatTickets();
    };

    const openTicketChat = (ticket: SupportTicket) => {
        setActiveTicket(ticket);
        fetchMessages(ticket.id);
    };

    const deviceInfo = getDeviceInfo();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 shrink-0">
                        <div className="flex items-center gap-2">
                            {view !== 'menu' && (
                                <button
                                    onClick={() => {
                                        if (activeTicket) {
                                            setActiveTicket(null);
                                        } else {
                                            setView('menu');
                                        }
                                    }}
                                    className="text-gray-400 hover:text-gray-600 p-1 -ml-1"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                {view === 'menu' && 'Hilfe & Support'}
                                {view === 'form' && (ticketType === 'bug' ? '🐛 Bug melden' : '💡 Feature vorschlagen')}
                                {view === 'chat' && (activeTicket ? activeTicket.title : '💬 Support-Chat')}
                                {view === 'success' && '✅ Eingereicht!'}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Menu View */}
                        {view === 'menu' && (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Wie können wir dir helfen? Wähle eine Option:
                                </p>

                                <button
                                    onClick={() => { setTicketType('bug'); setView('form'); triggerHaptic('light'); }}
                                    className="w-full flex items-center gap-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-left hover:bg-red-100/60 dark:hover:bg-red-950/30 transition-all group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                                        <Bug size={22} className="text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-sm text-gray-900 dark:text-white">Bug melden</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Etwas funktioniert nicht richtig? Lass es uns wissen.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => { setTicketType('feature'); setView('form'); triggerHaptic('light'); }}
                                    className="w-full flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-left hover:bg-amber-100/60 dark:hover:bg-amber-950/30 transition-all group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                        <Lightbulb size={22} className="text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-sm text-gray-900 dark:text-white">Feature vorschlagen</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Hast du eine Idee für ein neues Feature?</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => { openChatView(); triggerHaptic('light'); }}
                                    className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-left hover:bg-blue-100/60 dark:hover:bg-blue-950/30 transition-all group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <MessageCircle size={22} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-sm text-gray-900 dark:text-white">Support-Chat</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Schreib direkt mit dem SV-Admin-Team.</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Form View */}
                        {view === 'form' && (
                            <div className="space-y-5">
                                {/* Auto-detected Device Info */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Automatisch erkannt</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                            <Smartphone size={12} /> {deviceInfo.device}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                            <Monitor size={12} /> {deviceInfo.os}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                            <Globe size={12} /> {deviceInfo.browser}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {deviceInfo.screenWidth}×{deviceInfo.screenHeight}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titel *</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder={ticketType === 'bug' ? 'z.B. Anzeige lädt nicht auf dem Handy' : 'z.B. Dunkelmodus für den Chat'}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
                                        maxLength={120}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {ticketType === 'bug' ? 'Was ist passiert? *' : 'Beschreibe deine Idee *'}
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder={ticketType === 'bug' 
                                            ? 'Beschreibe den Fehler so genau wie möglich...\n\nWas hast du getan?\nWas hätte passieren sollen?\nWas ist stattdessen passiert?' 
                                            : 'Beschreibe dein gewünschtes Feature...\n\nWas soll es können?\nWarum wäre es nützlich?'}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white min-h-[140px] resize-none"
                                        maxLength={2000}
                                    />
                                    <p className="text-[10px] text-gray-400 text-right">{description.length}/2000</p>
                                </div>

                                <button
                                    onClick={handleSubmitTicket}
                                    disabled={submitting || !title.trim() || !description.trim()}
                                    className={cn(
                                        'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer',
                                        submitting || !title.trim() || !description.trim()
                                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                            : 'bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm'
                                    )}
                                >
                                    {submitting ? (
                                        <><Loader2 size={16} className="animate-spin" /> Wird gesendet...</>
                                    ) : (
                                        <><Send size={16} /> Absenden</>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Chat View */}
                        {view === 'chat' && !activeTicket && (
                            <div className="space-y-3">
                                {loadingChat ? (
                                    <div className="py-12 flex flex-col items-center gap-3">
                                        <Loader2 size={24} className="text-primary animate-spin" />
                                        <p className="text-sm text-gray-400">Lade Tickets...</p>
                                    </div>
                                ) : chatTickets.length === 0 ? (
                                    <div className="py-12 text-center space-y-3">
                                        <MessageCircle size={40} className="mx-auto text-gray-300" />
                                        <p className="text-sm text-gray-500 font-medium">Noch keine Tickets vorhanden.</p>
                                        <p className="text-xs text-gray-400">Erstelle ein Bug-Report oder Feature-Request, um einen Support-Thread zu starten.</p>
                                        <button
                                            onClick={() => setView('menu')}
                                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold transition-all"
                                        >
                                            Neues Ticket erstellen
                                        </button>
                                    </div>
                                ) : (
                                    chatTickets.map(ticket => (
                                        <button
                                            key={ticket.id}
                                            onClick={() => openTicketChat(ticket)}
                                            className="w-full flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                                        >
                                            <div className={cn(
                                                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg',
                                                ticket.type === 'bug' ? 'bg-red-100 dark:bg-red-900/30' : ticket.type === 'feature' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                                            )}>
                                                {ticket.type === 'bug' ? '🐛' : ticket.type === 'feature' ? '💡' : '💬'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
                                                    <span className={cn(
                                                        'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0',
                                                        ticket.status === 'open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                            : ticket.status === 'in_progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                    )}>
                                                        {ticket.status === 'open' ? 'Offen' : ticket.status === 'in_progress' ? 'In Bearbeitung' : ticket.status === 'resolved' ? 'Gelöst' : 'Geschlossen'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{ticket.description}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {new Date(ticket.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Active Chat Thread */}
                        {view === 'chat' && activeTicket && (
                            <div className="space-y-3">
                                {/* Ticket info */}
                                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-3 border dark:border-gray-800 text-xs text-gray-500 space-y-1">
                                    <p><span className="font-bold">Typ:</span> {activeTicket.type === 'bug' ? '🐛 Bug' : activeTicket.type === 'feature' ? '💡 Feature' : '💬 Support'}</p>
                                    <p><span className="font-bold">Status:</span> {activeTicket.status}</p>
                                    <p className="text-gray-400 line-clamp-2">{activeTicket.description}</p>
                                </div>

                                {/* Messages */}
                                <div className="space-y-2 min-h-[120px]">
                                    {messages.length === 0 && (
                                        <p className="text-center text-xs text-gray-400 py-8">Noch keine Nachrichten. Schreib dem Support-Team!</p>
                                    )}
                                    {messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                                                msg.is_admin_reply
                                                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 mr-auto'
                                                    : 'bg-primary/15 dark:bg-primary/10 ml-auto'
                                            )}
                                        >
                                            <p className="text-[10px] font-bold text-gray-400 mb-0.5">
                                                {msg.is_admin_reply ? '🛡️ SV Admin' : 'Du'}
                                            </p>
                                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                                            <p className="text-[10px] text-gray-400 text-right mt-1">
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
                                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                                    <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Erfolgreich eingereicht!</h3>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                    Dein {ticketType === 'bug' ? 'Bug-Report' : 'Feature-Request'} wurde an das SV-Team gesendet. 
                                    Du kannst den Status im Support-Chat verfolgen.
                                </p>
                                <div className="flex gap-2 justify-center pt-2">
                                    <button
                                        onClick={() => { openChatView(); }}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-all"
                                    >
                                        Zum Support-Chat
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold transition-all"
                                    >
                                        Schließen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat input footer */}
                    {view === 'chat' && activeTicket && (
                        <div className="border-t dark:border-gray-800 p-4 shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Nachricht an SV-Team..."
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    className={cn(
                                        'p-2.5 rounded-xl transition-all',
                                        newMessage.trim()
                                            ? 'bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer'
                                            : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    )}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
