import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import {
    MessageSquare,
    AlertTriangle,
    Download,
    Shield,
    Lock,
    User,
    ArrowLeft,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface AdminChatProps {
    userId1?: string | null;
    userId2?: string | null;
    reportId?: string | null;
    onBack?: () => void;
}

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

const PROFANITY_LIST = [
    'hurensohn', 'arschloch', 'bastard', 'bitch', 'fotze', 
    'wichser', 'missgeburt', 'schlampe', 'nigger', 'fick', 
    'ficken', 'slut', 'whore', 'cunt', 'dick', 'cock', 
    'pussy', 'asshole', 'motherfucker', 'spasti', 'spast'
];

export default function AdminChat({ userId1, userId2, reportId, onBack }: AdminChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [granting, setGranting] = useState(false);
    const [chatFound, setChatFound] = useState(true);
    const [names, setNames] = useState<{ user1: string; user2: string }>({ user1: 'Nutzer 1', user2: 'Nutzer 2' });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (userId1 && userId2 && reportId) {
            setupAccessAndLoad();
        }
    }, [userId1, userId2, reportId]);

    useEffect(() => {
        // Auto scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const setupAccessAndLoad = async () => {
        setLoading(true);
        setGranting(true);
        try {
            const adminId = (await supabase.auth.getUser()).data.user?.id;
            if (!adminId) throw new Error('Nicht authentifiziert');

            // 1. Resolve names first
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, first_name, last_name')
                .in('id', [userId1, userId2]);

            if (profiles) {
                const u1 = profiles.find(p => p.id === userId1);
                const u2 = profiles.find(p => p.id === userId2);
                setNames({
                    user1: u1?.display_name || `${u1?.first_name} ${u1?.last_name}` || 'Nutzer 1',
                    user2: u2?.display_name || `${u2?.first_name} ${u2?.last_name}` || 'Nutzer 2'
                });
            }

            // 2. Insert temporary chat access grant for RLS compliance
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
            const { error: grantError } = await supabase
                .from('report_chat_access')
                .insert({
                    report_id: reportId,
                    admin_id: adminId,
                    chat_user_ids: [userId1, userId2],
                    expires_at: expiresAt
                });

            // If table or schema doesn't exist yet, we catch the error but still try to proceed
            if (grantError && grantError.code !== 'P0001') {
                console.warn('Could not insert report_chat_access grant:', grantError.message);
            }
            setGranting(false);

            // 3. Find requests/chats between these users
            const { data: requests, error: requestsError } = await supabase
                .from('ad_requests')
                .select('id')
                .or(`and(requester_id.eq.${userId1},owner_id.eq.${userId2}),and(requester_id.eq.${userId2},owner_id.eq.${userId1})`);

            if (requestsError) throw requestsError;

            if (!requests || requests.length === 0) {
                setChatFound(false);
                setMessages([]);
                setLoading(false);
                return;
            }

            const requestIds = requests.map(r => r.id);

            // 4. Fetch messages
            const { data: msgs, error: msgsError } = await supabase
                .from('messages')
                .select(`
                    id, request_id, sender_id, content, is_deleted, created_at
                `)
                .in('request_id', requestIds)
                .order('created_at', { ascending: true });

            if (msgsError) throw msgsError;

            // Resolve sender names locally or with fallback
            const resolvedMessages = msgs.map(m => {
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
            const content = m.is_deleted ? '🚫 Diese Nachricht wurde gelöscht' : m.content;
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

    const hasProfanity = (content: string) => {
        return PROFANITY_LIST.some(word => content.toLowerCase().includes(word));
    };

    if (!userId1 || !userId2 || !reportId) {
        return (
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden py-16 text-center">
                <CardContent className="space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Kein Chat ausgewählt</h2>
                    <p className="text-gray-500 text-sm">
                        Aus Sicherheitsgründen können Chats im Admin-Panel nicht frei durchsucht werden. 
                        Bitte wähle eine aktive Meldung unter 'Meldungen' aus und klicke auf 'Chat-Einsicht öffnen'.
                    </p>
                    {onBack && (
                        <Button onClick={onBack} variant="outline" className="rounded-2xl gap-2 mt-4 text-xs font-bold">
                            <ArrowLeft size={14} /> Zurück zu den Meldungen
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border-b dark:border-gray-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <div className="font-bold text-sm text-gray-800 dark:text-gray-200">
                            {names.user1} ↔ {names.user2}
                        </div>
                        <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            Meldeverfahren Einsicht • ID: {reportId.slice(0, 8)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-100 dark:bg-red-950/30 dark:text-red-400 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                        <Shield size={12} />
                        SV Einsicht
                    </span>
                    {messages.length > 0 && (
                        <Button onClick={handleExport} variant="outline" size="sm" className="h-8 rounded-lg gap-1.5 text-xs">
                            <Download size={12} /> Exportieren
                        </Button>
                    )}
                    <Button onClick={setupAccessAndLoad} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                        <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-950/40 overflow-y-auto space-y-4 min-h-0 flex flex-col">
                {granting ? (
                    <div className="m-auto text-center space-y-2">
                        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs text-gray-400 font-medium">Fordere temporäre RLS-Einsichtsrechte an...</p>
                    </div>
                ) : loading ? (
                    <div className="m-auto text-center space-y-2">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs text-gray-400">Lade Chatnachrichten...</p>
                    </div>
                ) : !chatFound ? (
                    <div className="m-auto text-center max-w-sm space-y-2 text-gray-400 py-20">
                        <MessageSquare size={32} className="mx-auto opacity-50" />
                        <p className="text-sm font-bold">Kein Chat vorhanden</p>
                        <p className="text-xs">Die beiden Beteiligten haben bisher keine Chatnachrichten ausgetauscht.</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="m-auto text-center max-w-sm space-y-1 text-gray-400">
                        <MessageSquare size={32} className="mx-auto opacity-50" />
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
                                    'flex flex-col gap-1 max-w-[75%] p-3 rounded-2xl shadow-sm border dark:border-gray-800 transition-colors',
                                    isUser1 
                                        ? 'self-start bg-white dark:bg-gray-900' 
                                        : 'self-end bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/50',
                                    profanity && 'bg-red-50/80 border-red-200 dark:bg-red-950/20 dark:border-red-900/40'
                                )}
                            >
                                <div className="flex justify-between items-center gap-4">
                                    <span className="font-extrabold text-[10px] text-gray-400">
                                        {senderName}
                                    </span>
                                    <span className="text-[9px] text-gray-400">
                                        {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                
                                <p className={cn(
                                    'text-sm text-gray-800 dark:text-gray-200 mt-0.5 break-words whitespace-pre-wrap',
                                    msg.is_deleted && 'text-gray-400 italic'
                                )}>
                                    {msg.is_deleted ? '🚫 Diese Nachricht wurde gelöscht' : msg.content}
                                </p>

                                {profanity && (
                                    <div className="flex items-center gap-1 mt-1.5 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                                        <AlertTriangle size={10} />
                                        Möglicher Regelverstoß (Beleidigung)
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
        </Card>
    );
}
