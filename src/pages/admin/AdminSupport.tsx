import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { 
    Search, Bug, Lightbulb, MessageCircle, Send, Loader2, 
    ChevronLeft, CheckCircle, Clock, AlertCircle, X, Filter, RefreshCw 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

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

export default function AdminSupport() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Active ticket view
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newReply, setNewReply] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data: ticketsData, error } = await supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Resolve user names
            if (ticketsData && ticketsData.length > 0) {
                const userIds = Array.from(new Set(ticketsData.map(t => t.user_id)));
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, display_name, first_name, last_name, email')
                    .in('id', userIds);

                const profileMap = new Map(profiles?.map(p => [p.id, p]));
                const enriched = ticketsData.map(t => {
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
            toast.error('Tickets konnten nicht geladen werden.');
        } finally {
            setLoading(false);
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

    const handleSendReply = async () => {
        if (!newReply.trim() || !activeTicket) return;
        setSendingReply(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Nicht eingeloggt');

            const { error } = await supabase.from('support_messages').insert({
                ticket_id: activeTicket.id,
                sender_id: user.id,
                content: newReply.trim(),
                is_admin_reply: true,
            });

            if (error) throw error;

            // Auto-set status to in_progress if it was open
            if (activeTicket.status === 'open') {
                await supabase
                    .from('support_tickets')
                    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
                    .eq('id', activeTicket.id);
                setActiveTicket({ ...activeTicket, status: 'in_progress' });
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
            const { error } = await supabase
                .from('support_tickets')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            if (error) throw error;
            toast.success(`Status auf "${status}" geändert`);

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
        if (type === 'bug') return <Bug size={14} className="text-red-500" />;
        if (type === 'feature') return <Lightbulb size={14} className="text-amber-500" />;
        return <MessageCircle size={14} className="text-blue-500" />;
    };

    const statusBadge = (status: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            open: { label: 'Offen', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
            in_progress: { label: 'In Bearbeitung', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
            resolved: { label: 'Gelöst', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
            closed: { label: 'Geschlossen', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
        };
        const s = map[status] || map.open;
        return <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase', s.cls)}>{s.label}</span>;
    };

    // Detail view for a ticket
    if (activeTicket) {
        return (
            <div className="space-y-4 animate-in fade-in duration-200">
                {/* Back button and header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => setActiveTicket(null)} className="rounded-xl gap-1.5 text-sm">
                        <ChevronLeft size={18} /> Zurück
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {typeIcon(activeTicket.type)}
                            <h2 className="font-extrabold text-lg truncate">{activeTicket.title}</h2>
                            {statusBadge(activeTicket.status)}
                        </div>
                        <p className="text-xs text-gray-500">
                            Von {activeTicket.user_name} ({activeTicket.user_email}) · {new Date(activeTicket.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Ticket details card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Description & Device Info */}
                    <div className="lg:col-span-1 space-y-3">
                        <Card className="rounded-2xl">
                            <CardContent className="p-4 space-y-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Beschreibung</p>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{activeTicket.description}</p>
                                </div>

                                {activeTicket.device_info && Object.keys(activeTicket.device_info).length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Geräteinformationen</p>
                                        <div className="text-xs text-gray-500 space-y-0.5">
                                            {activeTicket.device_info.device && <p>Gerät: {activeTicket.device_info.device}</p>}
                                            {activeTicket.device_info.os && <p>OS: {activeTicket.device_info.os}</p>}
                                            {activeTicket.device_info.browser && <p>Browser: {activeTicket.device_info.browser}</p>}
                                            {activeTicket.device_info.screenWidth && <p>Bildschirm: {activeTicket.device_info.screenWidth}×{activeTicket.device_info.screenHeight}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Status changer */}
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">Status ändern</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['open', 'in_progress', 'resolved', 'closed'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => updateTicketStatus(activeTicket.id, status)}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                                                    activeTicket.status === status
                                                        ? 'bg-primary text-black border-primary'
                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                )}
                                            >
                                                {status === 'open' ? 'Offen' : status === 'in_progress' ? 'In Bearbeitung' : status === 'resolved' ? 'Gelöst' : 'Geschlossen'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Chat */}
                    <div className="lg:col-span-2">
                        <Card className="rounded-2xl flex flex-col h-[500px]">
                            <div className="px-4 py-3 border-b dark:border-gray-800 flex items-center gap-2 shrink-0">
                                <MessageCircle size={16} className="text-blue-500" />
                                <span className="text-sm font-bold">Chat-Verlauf</span>
                                <span className="text-xs text-gray-400">({messages.length} Nachrichten)</span>
                            </div>

                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
                                {messages.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-12">Noch keine Chat-Nachrichten.</p>
                                ) : (
                                    messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                                                msg.is_admin_reply
                                                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 ml-auto'
                                                    : 'bg-gray-100 dark:bg-gray-800 mr-auto'
                                            )}
                                        >
                                            <p className="text-[10px] font-bold text-gray-400 mb-0.5">
                                                {msg.is_admin_reply ? '🛡️ Admin-Antwort' : `👤 ${activeTicket.user_name}`}
                                            </p>
                                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                                            <p className="text-[10px] text-gray-400 text-right mt-1">
                                                {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </CardContent>

                            <div className="border-t dark:border-gray-800 p-3 flex gap-2 shrink-0">
                                <Input
                                    value={newReply}
                                    onChange={e => setNewReply(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                                    placeholder="Admin-Antwort schreiben..."
                                    className="rounded-xl"
                                />
                                <Button
                                    onClick={handleSendReply}
                                    disabled={!newReply.trim() || sendingReply}
                                    className="rounded-xl bg-primary text-black font-bold gap-1.5 shrink-0"
                                >
                                    {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats row */}
            <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center gap-2">
                    <AlertCircle size={16} className="text-blue-500" />
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{openCount} offene Tickets</span>
                </div>
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{inProgressCount} in Bearbeitung</span>
                </div>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-2xl flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{tickets.length} gesamt</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        placeholder="Tickets suchen nach Titel, Beschreibung, Nutzer..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 rounded-2xl"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="h-11 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none"
                >
                    <option value="all">Alle Typen</option>
                    <option value="bug">🐛 Bugs</option>
                    <option value="feature">💡 Features</option>
                    <option value="support">💬 Support</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="h-11 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none"
                >
                    <option value="all">Alle Status</option>
                    <option value="open">Offen</option>
                    <option value="in_progress">In Bearbeitung</option>
                    <option value="resolved">Gelöst</option>
                    <option value="closed">Geschlossen</option>
                </select>
                <Button onClick={fetchTickets} variant="ghost" className="h-11 w-11 p-0 rounded-2xl shrink-0" title="Aktualisieren">
                    <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
                </Button>
            </div>

            {/* Ticket list */}
            {loading ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 font-medium">Lade Tickets...</p>
                </div>
            ) : filteredTickets.length === 0 ? (
                <div className="py-20 text-center space-y-3 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl">
                    <MessageCircle size={48} className="mx-auto text-gray-300" />
                    <p className="text-gray-500 font-medium text-lg">Keine Tickets gefunden</p>
                    <p className="text-gray-400 text-xs">Passe deine Filter an oder warte auf neue Anfragen.</p>
                </div>
            ) : (
                <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="divide-y dark:divide-gray-800">
                            {filteredTickets.map(ticket => (
                                <button
                                    key={ticket.id}
                                    onClick={() => openTicket(ticket)}
                                    className="w-full p-5 flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors text-left cursor-pointer"
                                >
                                    <div className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                                        ticket.type === 'bug' ? 'bg-red-100 dark:bg-red-900/30' : ticket.type === 'feature' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                                    )}>
                                        {typeIcon(ticket.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm truncate">{ticket.title}</p>
                                            {statusBadge(ticket.status)}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{ticket.description}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {ticket.user_name} · {new Date(ticket.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
