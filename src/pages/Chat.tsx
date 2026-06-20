import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ChevronLeft, Send, Trash2, Check, CheckCheck, Pencil, MoreVertical, ShieldAlert, Ban } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import ReportWizard from '../components/ReportWizard';

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

const PROFANITY_LIST = [
    'hurensohn', 'arschloch', 'bastard', 'bitch', 'fotze', 'wichser', 'missgeburt', 
    'schlampe', 'nigger', 'fick', 'ficken', 'slut', 'whore', 'cunt', 'dick', 'cock', 'pussy',
    'asshole', 'motherfucker', 'spasti', 'spast'
];

function containsProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    return PROFANITY_LIST.some(word => lowerText.includes(word));
}

export default function Chat() {
    const { requestId } = useParams();
    const navigate = useNavigate();
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
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Report/Block state
    const [reportOpen, setReportOpen] = useState(false);
    const [otherUserId, setOtherUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !requestId) return;
        fetchData();
        
        // Subscription for real-time messages
        const channel = supabase
            .channel(`chat_${requestId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new as Message;
                    setMessages(prev => [...prev, newMsg]);
                    
                    // If we receive a message from the other person while in chat, mark it as read
                    if (newMsg.sender_id !== user.id && !newMsg.read_at) {
                        markAsRead(newMsg.id);
                    }
                } else if (payload.eventType === 'UPDATE') {
                    setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, requestId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Close menu on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchData = async () => {
        setLoading(true);
        // Fetch request info to get other user id
        const { data: request } = await supabase.from('ad_requests').select('*').eq('id', requestId).single();
        if (!request) {
            navigate('/requests');
            return;
        }

        const otherId = request.requester_id === user?.id ? request.owner_id : request.requester_id;
        const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', otherId).single();
        setOtherUser(profile);
        setOtherUserId(otherId);

        // Fetch messages
        const { data: msgs } = await supabase.from('messages')
            .select('*')
            .eq('request_id', requestId)
            .order('created_at', { ascending: true });
        
        if (msgs) {
            setMessages(msgs);
            // Mark unread messages as read
            const unreadIds = msgs.filter(m => m.sender_id !== user?.id && !m.read_at).map(m => m.id);
            if (unreadIds.length > 0) {
                unreadIds.forEach(id => markAsRead(id));
            }
        }
        setLoading(false);
    };

    const markAsRead = async (messageId: string) => {
        await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', messageId);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !requestId) return;

        if (containsProfanity(newMessage)) {
            toast.error('Deine Nachricht enthält unangemessene Ausdrücke. Bitte formuliere sie um.');
            return;
        }

        const msgContent = newMessage;
        setNewMessage(''); // optimistic clear

        const { error } = await supabase.from('messages').insert({
            request_id: requestId,
            sender_id: user.id,
            content: msgContent
        });

        if (error) {
            toast.error('Fehler beim Senden.');
            console.error(error);
        }
    };

    const deleteMessage = async (msgId: string) => {
        if (!window.confirm('Möchtest du diese Nachricht wirklich löschen?')) return;
        const { error } = await supabase.from('messages').update({ is_deleted: true }).eq('id', msgId);
        if (error) toast.error('Fehler beim Löschen.');
    };

    const handleBlockUser = async () => {
        if (!otherUserId || !user) return;
        setMenuOpen(false);
        // Insert into user_blocks if table exists, otherwise show info
        const { error } = await supabase.from('user_blocks').insert({
            blocker_id: user.id,
            blocked_id: otherUserId
        });
        if (error) {
            // Table may not exist yet – show guidance
            toast('Bitte melde diesen Nutzer, um ihn zu blockieren. Die Blockier-Funktion ist noch in Einrichtung.', { icon: 'ℹ️', duration: 5000 });
        } else {
            toast.success(`${otherUser?.display_name || 'Nutzer'} wurde blockiert. Du wirst keine Nachrichten mehr von dieser Person sehen.`);
        }
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

        if (containsProfanity(trimmed)) {
            toast.error('Deine Nachricht enthält unangemessene Ausdrücke. Bitte formuliere sie um.');
            return;
        }

        const { error } = await supabase.from('messages').update({ 
            content: trimmed,
            edited_at: new Date().toISOString()
        }).eq('id', msgId);

        if (error) {
            toast.error('Fehler beim Bearbeiten.');
        } else {
            // Optimistic update
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: trimmed, edited_at: new Date().toISOString() } : m));
        }
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

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Lade Chat...</div>;

    return (
        <>
        <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-2rem)] max-w-2xl mx-auto bg-gray-50 dark:bg-[#111b21] md:rounded-3xl md:overflow-hidden md:border border-gray-200 dark:border-gray-700/50 shadow-xl">
            {/* Header */}
            <div className="bg-white dark:bg-[#202c33] border-b border-gray-200 dark:border-[#2a3942] p-3 px-2 flex items-center gap-2 shrink-0 sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={() => navigate('/requests')} className="rounded-full shrink-0 hover:bg-gray-100 dark:hover:bg-[#2a3942]">
                    <ChevronLeft />
                </Button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary-hover overflow-hidden shadow-sm shrink-0">
                        {otherUser?.avatar_url ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" /> : (otherUser?.display_name?.charAt(0) || '?')}
                    </div>
                    <div className="font-semibold text-[17px] leading-tight truncate">{otherUser?.display_name || 'Unbekannt'}</div>
                </div>
                
                {/* 3-dot menu */}
                <div className="relative" ref={menuRef}>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setMenuOpen(!menuOpen)} 
                        className="rounded-full shrink-0 hover:bg-gray-100 dark:hover:bg-[#2a3942]"
                    >
                        <MoreVertical size={20} />
                    </Button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#233138] rounded-xl shadow-xl border border-gray-200 dark:border-[#2a3942] py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <button 
                                onClick={() => {
                                    setMenuOpen(false);
                                    setReportOpen(true);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2a3942] text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
                            >
                                <ShieldAlert size={15} className="text-orange-500" />
                                Nutzer melden
                            </button>
                            <button 
                                onClick={handleBlockUser}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2a3942] text-orange-600 dark:text-orange-400 transition-colors flex items-center gap-2"
                            >
                                <Ban size={15} />
                                Nutzer blockieren
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-[#2a3942] my-1" />
                            <button 
                                onClick={() => {
                                    setMenuOpen(false);
                                    toast('Bitte kontaktiere die SV, um den Chat löschen zu lassen.', { icon: 'ℹ️' });
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2a3942] text-red-600 dark:text-red-400 transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={15} />
                                Chat löschen
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-[#efeae2] dark:bg-[#0b141a]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                {messages.length === 0 ? (
                    <div className="text-center p-4 bg-[#fcf4cb]/90 dark:bg-[#1d2e2f] text-[#54656f] dark:text-[#8696a0] text-xs rounded-lg max-w-sm mx-auto shadow-sm">
                        Hier beginnt euer Chat. Die Nachrichten sind sicher verschlüsselt. Bitte achte auf unsere <a href="/nutzungsbedingungen" className="underline">Nutzungsbedingungen</a>.
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
                                    <div className="text-center my-3">
                                        <span className="text-[11px] font-medium uppercase tracking-wide text-[#54656f] dark:text-[#8696a0] bg-white/80 dark:bg-[#182229] px-3 py-1.5 rounded-lg shadow-sm">
                                            {new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' })}
                                        </span>
                                    </div>
                                )}
                                <div className={cn("flex max-w-[85%] relative group", isMe ? "self-end" : "self-start")}>
                                    <div 
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg shadow-sm text-[14.5px] leading-relaxed break-words relative min-w-[80px]",
                                            isMe 
                                                ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-[4px]" 
                                                : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-[4px]",
                                            msg.is_deleted && "italic opacity-70"
                                        )}
                                    >
                                        {msg.is_deleted ? (
                                            <span className="flex items-center gap-1 text-xs text-[#8696a0]">🚫 Diese Nachricht wurde gelöscht.</span>
                                        ) : isEditing ? (
                                            <div className="space-y-2 min-w-[200px]">
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                                                    className="w-full bg-white/80 dark:bg-[#2a3942] border border-gray-300 dark:border-[#3b4a54] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className="flex gap-1.5 justify-end">
                                                    <button 
                                                        onClick={cancelEditing}
                                                        className="px-3 py-1 text-xs rounded-md bg-gray-200 dark:bg-[#3b4a54] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4a5b67] transition-colors"
                                                    >
                                                        Abbrechen
                                                    </button>
                                                    <button 
                                                        onClick={() => saveEdit(msg.id)}
                                                        className="px-3 py-1 text-xs rounded-md bg-primary text-black font-medium hover:bg-primary-hover transition-colors"
                                                    >
                                                        Speichern
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        )}
                                        
                                        {!isEditing && (
                                            <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                                                {msg.edited_at && !msg.is_deleted && (
                                                    <span className="text-[10px] text-[#667781] dark:text-[#8696a0] italic leading-none">(bearbeitet)</span>
                                                )}
                                                <span className="text-[11px] text-[#667781] dark:text-[#8696a0] leading-none ml-1">{time}</span>
                                                {isMe && !msg.is_deleted && (
                                                    <span className={cn("text-[12px] -mt-0.5 ml-0.5", msg.read_at ? "text-[#53bdeb]" : "text-[#8696a0]")}>
                                                        {msg.read_at ? <CheckCheck size={15} /> : <Check size={15} />}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Action buttons on hover - only for own non-deleted, non-editing messages */}
                                    {isMe && !msg.is_deleted && !isEditing && (
                                        <div className="absolute top-0 -left-[68px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <button 
                                                onClick={() => startEditing(msg)}
                                                className="p-1.5 bg-white dark:bg-[#233138] text-[#54656f] dark:text-[#aebac1] rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-[#2a3942] transition-colors"
                                                title="Bearbeiten"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button 
                                                onClick={() => deleteMessage(msg.id)}
                                                className="p-1.5 bg-white dark:bg-[#233138] text-red-500 dark:text-red-400 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Löschen"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-2 px-3 flex items-end gap-2 shrink-0 pb-safe border-t border-gray-200/50 dark:border-[#2a3942]">
                <form onSubmit={sendMessage} className="flex-1 flex gap-2 items-end">
                    <div className="flex-1 relative">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Nachricht schreiben..."
                            className="bg-white dark:bg-[#2a3942] border-none rounded-xl h-11 px-4 shadow-sm text-[15px] placeholder:text-[#8696a0] focus-visible:ring-1 focus-visible:ring-primary/30"
                            autoComplete="off"
                        />
                    </div>
                    <Button 
                        type="submit" 
                        size="icon" 
                        className={cn(
                            "rounded-full w-11 h-11 shrink-0 transition-all duration-200",
                            newMessage.trim() 
                                ? "bg-[#00a884] hover:bg-[#008f72] text-white scale-100 shadow-md" 
                                : "bg-gray-300 dark:bg-[#3b4a54] text-gray-500 dark:text-[#8696a0] scale-95"
                        )}
                        disabled={!newMessage.trim()}
                    >
                        <Send size={18} className="ml-0.5" />
                    </Button>
                </form>
            </div>
        </div>

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
