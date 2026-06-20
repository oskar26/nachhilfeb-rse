import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { CheckCircle, XCircle, Phone, Mail, Star, Inbox, Search, MessageSquare } from 'lucide-react';
import { RatingDialog } from '../components/RatingDialog';
import { useNavigate } from 'react-router-dom';

export default function Requests() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [incoming, setIncoming] = useState<any[]>([]);
    const [outgoing, setOutgoing] = useState<any[]>([]);
    const [stats, setStats] = useState({ incoming: 0, outgoing: 0 });


    // Rating State
    const [ratingOpen, setRatingOpen] = useState(false);
    const [ratingUser, setRatingUser] = useState<any>(null);
    const [ratingAdId, setRatingAdId] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchRequests();
    }, [user]);

    const fetchRequests = async () => {

        // Incoming: I am the owner
        // We select the requester profile with settings
        const { data: inc } = await supabase
            .from('ad_requests')
            .select('*, requester:requester_id(id, display_name, grade_level, is_verified, avatar_url, phone_number, email, settings), ads(id, short_description)')
            .eq('owner_id', user?.id)
            .order('created_at', { ascending: false });

        // Outgoing: I am the requester
        // We select the owner profile with settings
        const { data: out } = await supabase
            .from('ad_requests')
            .select('*, owner:owner_id(id, display_name, phone_number, email, settings), ads(id, short_description)')
            .eq('requester_id', user?.id)
            .order('created_at', { ascending: false });

        if (inc) setIncoming(inc);
        if (out) setOutgoing(out);
        setStats({ incoming: inc?.filter(r => r.status === 'pending').length || 0, outgoing: 0 });
    };

    const handleStatus = async (id: string, status: 'accepted' | 'rejected') => {
        await supabase.from('ad_requests').update({ status }).eq('id', id);
        fetchRequests();
    };

    const handleComplete = (req: any) => {
        // Open Rating Dialog for the OTHER person
        if (req.requester_id === user?.id) {
            setRatingUser(req.owner);
        } else {
            setRatingUser(req.requester);
        }
        setRatingAdId(req.ads?.id);
        setRatingOpen(true);
    };

    const onRatingSubmit = async () => {
        setRatingOpen(false);
        // Optional: Refresh requests or mark as completely done logic
    }

    if (!user) return <div className="p-4">Bitte einloggen.</div>;

    return (
        <div className="p-4 max-w-3xl mx-auto pb-24 space-y-6">
            <h1 className="text-2xl font-bold">Anfragen</h1>

            <Tabs defaultValue="incoming">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="incoming">
                        Eingang
                        {stats.incoming > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{stats.incoming}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="outgoing">Gesendet</TabsTrigger>
                </TabsList>

                <TabsContent value="incoming" className="space-y-4 mt-4">
                    {incoming.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 mb-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <Inbox size={40} className="text-blue-400 dark:text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Posteingang ist leer</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">Du hast noch keine Anfragen zu deinen Anzeigen erhalten. Sobald jemand Interesse hat, taucht die Anfrage hier auf!</p>
                        </div>
                    )}
                    {incoming.map(req => (
                        <Card key={req.id}>
                            <CardHeader className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold">{req.requester?.display_name || 'Unbekannt'}</div>
                                        <div className="text-sm text-gray-500">für "{req.ads?.short_description}"</div>
                                    </div>
                                    <StatusBadge status={req.status} />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {req.message && (
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm italic">
                                        "{req.message}"
                                    </div>
                                )}

                                {req.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleStatus(req.id, 'accepted')} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                                            <CheckCircle size={16} className="mr-2" /> Akzeptieren
                                        </Button>
                                        <Button onClick={() => handleStatus(req.id, 'rejected')} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
                                            <XCircle size={16} className="mr-2" /> Ablehnen
                                        </Button>
                                    </div>
                                )}

                                {req.status === 'accepted' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {req.requester?.phone_number && req.requester?.settings?.phone_visible ? (
                                                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 rounded border border-green-200 dark:border-green-905">
                                                    <Phone size={14} /> {req.requester.phone_number}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 text-gray-500 rounded border border-gray-200 dark:border-gray-800 text-xs">
                                                    Telefonnummer privat
                                                </div>
                                            )}
                                            {req.requester?.email && req.requester?.settings?.email_visible ? (
                                                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 rounded border border-green-200 dark:border-green-905">
                                                    <Mail size={14} /> {req.requester.email}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 text-gray-500 rounded border border-gray-200 dark:border-gray-800 text-xs">
                                                    E-Mail privat
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/chat/${req.id}`)}>
                                                <MessageSquare size={14} className="mr-2" /> Chat
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleComplete(req)}>
                                                <Star size={14} className="mr-2" /> Bewerten
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="outgoing" className="space-y-4 mt-4">
                    {outgoing.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 mb-6 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                <Search size={40} className="text-green-400 dark:text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Keine laufenden Anfragen</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">Du hast noch keine offenen Anfragen an andere Personen gestellt. Schau dich im Feed um und finde den perfekten Nachhilfe-Partner!</p>
                        </div>
                    )}
                    {outgoing.map(req => (
                        <Card key={req.id}>
                            <CardHeader className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold">Anfrage an {req.owner?.display_name || 'User'}</div>
                                        <div className="text-sm text-gray-500">für "{req.ads?.short_description}"</div>
                                    </div>
                                    <StatusBadge status={req.status} />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {req.status === 'pending' && <p className="text-sm text-gray-500">Warte auf Antwort...</p>}

                                {req.status === 'rejected' && <p className="text-sm text-red-500">Anfrage wurde abgelehnt.</p>}

                                {req.status === 'accepted' && (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 rounded-lg text-sm">
                                            <strong>Kontakt freigeschaltet!</strong>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm">
                                            {req.owner?.phone_number && req.owner?.settings?.phone_visible ? (
                                                <div className="flex items-center gap-2">
                                                    <Phone size={16} /> {req.owner.phone_number}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-gray-550 dark:text-gray-400 text-xs italic">
                                                    <Phone size={16} className="text-gray-400" /> Telefonnummer privat
                                                </div>
                                            )}
                                            {req.owner?.email && req.owner?.settings?.email_visible ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail size={16} /> {req.owner.email}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-gray-550 dark:text-gray-400 text-xs italic">
                                                    <Mail size={16} className="text-gray-400" /> E-Mail privat
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/chat/${req.id}`)}>
                                                <MessageSquare size={14} className="mr-2" /> Chat
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleComplete(req)}>
                                                <Star size={14} className="mr-2" /> Bewerten
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>

            <RatingDialog
                open={ratingOpen}
                onOpenChange={setRatingOpen}
                targetUser={ratingUser}
                adId={ratingAdId}
                onSuccess={onRatingSubmit}
            />
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        pending: 'bg-yellow-100 text-yellow-800',
        accepted: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        completed: 'bg-gray-100 text-gray-800'
    };
    const labels: any = {
        pending: 'Ausstehend',
        accepted: 'Akzeptiert',
        rejected: 'Abgelehnt',
        completed: 'Erledigt'
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || styles.pending}`}>
            {labels[status] || status}
        </span>
    );
}
