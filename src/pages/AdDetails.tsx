import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { SubjectChip } from '../components/SubjectChip';
import { toast } from 'react-hot-toast';
import { ChevronLeft, MapPin, Clock, Heart, Send, CheckCircle, Phone, Mail, CalendarDays, Share2, Folder, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import ReportWizard from '../components/ReportWizard';
import ShareDialog from '../components/ShareDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/Dialog';
import { AvailabilityCalendar, emptyAvailability, countMatches, type Availability } from '../components/AvailabilityCalendar';

export default function AdDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteRecordId, setFavoriteRecordId] = useState<string | null>(null);
    const [theirAvailability, setTheirAvailability] = useState<Availability>(emptyAvailability());
    const [myAvailability, setMyAvailability] = useState<Availability>(emptyAvailability());

    // Collections states
    const [collections, setCollections] = useState<any[]>([]);
    const [showCollectionSelector, setShowCollectionSelector] = useState(false);

    // Request State
    const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected' | 'completed'>('none');
    const [sending, setSending] = useState(false);
    
    // Report & Share States
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetchAdAndStatus();
    }, [id, user]);

    async function fetchAdAndStatus() {
        setLoading(true);
        const { data: adData } = await supabase.from('ads').select('*').eq('id', id).single();

        if (adData) {
            setAd(adData);
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', adData.user_id).single();
            setProfile(prof);
            setTheirAvailability(prof?.availability || emptyAvailability());

            if (user) {
                // Load my own availability for matching
                const { data: myProf } = await supabase.from('profiles').select('availability').eq('id', user.id).single();
                setMyAvailability(myProf?.availability || emptyAvailability());

                const { data: fav } = await supabase.from('favorites').select('*').eq('user_id', user.id).eq('ad_id', id).single();
                setIsFavorite(!!fav);
                if (fav) setFavoriteRecordId(fav.id);

                // Fetch collections
                const { data: cols } = await supabase.from('favorite_collections').select('*').eq('user_id', user.id).order('name');
                if (cols) setCollections(cols);

                const { data: req } = await supabase.from('ad_requests')
                    .select('*')
                    .eq('ad_id', id)
                    .eq('requester_id', user.id)
                    .single();

                if (req) setRequestStatus(req.status);
            }
        }
        setLoading(false);
    }

    const toggleFavorite = async () => {
        if (!user || !ad) return;
        
        if ('vibrate' in navigator) navigator.vibrate([15]);

        if (isFavorite) {
            const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('ad_id', ad.id);
            if (error) {
                console.error("Error removing favorite:", error);
                toast.error("Konnte nicht von der Merkliste entfernt werden.");
            } else {
                setIsFavorite(false);
                setFavoriteRecordId(null);
                toast.success("Aus Merkliste entfernt");
            }
        } else {
            const { data, error } = await supabase.from('favorites').insert({ user_id: user.id, ad_id: ad.id }).select().single();
            if (error) {
                console.error("Error adding favorite:", error);
                toast.error("Konnte nicht zur Merkliste hinzugefügt werden.");
            } else {
                setIsFavorite(true);
                if (data) setFavoriteRecordId(data.id);
                toast.success((t) => (
                    <div className="flex items-center gap-2">
                        <span>Anzeige gespeichert!</span>
                        <button 
                            className="text-xs text-primary font-bold underline"
                            onClick={() => {
                                toast.dismiss(t.id);
                                setShowCollectionSelector(true);
                            }}
                        >
                            Verschieben
                        </button>
                    </div>
                ), { duration: 4000 });
            }
        }
    };

    const sendRequest = async () => {
        if (!user || !ad || !profile) return;
        setSending(true);
        const { error } = await supabase.from('ad_requests').insert({
            ad_id: ad.id,
            requester_id: user.id,
            owner_id: profile.id, // denormalized for RLS
            message: "Ich habe Interesse an diesem Angebot!",
            status: 'pending'
        });

        if (!error) {
            setRequestStatus('pending');
            toast.success("Anfrage gesendet!");
        } else {
            toast.error("Fehler beim Senden der Anfrage.");
        }
        setSending(false);
    };

    if (loading) return <div className="p-8 text-center">Lade Anzeige...</div>;
    if (!ad) return <div className="p-8 text-center">Anzeige nicht gefunden.</div>;

    const isOwn = user?.id === ad.user_id;

    const price = ad.price_details?.mode === 'fixed'
        ? `${ad.price_details.value}€ / ${ad.price_details.unit}`
        : (ad.price_details?.mode === 'free' ? 'Kostenlos' : 'VB');

    return (
        <div className="p-4 max-w-3xl mx-auto pb-24 space-y-6">
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:bg-transparent hover:text-primary-hover">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setIsShareOpen(true)} className="text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-full">
                        <Share2 size={20} />
                    </Button>
                    {!isOwn && (
                        <Button variant="ghost" size="icon" onClick={toggleFavorite} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full">
                            <Heart fill={isFavorite ? "currentColor" : "none"} />
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6">
                {/* Header Card */}
                <Card>
                    <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold mb-2">{ad.subjects[0]?.toUpperCase()} - {profile?.display_name || 'Nutzer'}</h1>
                                <p className="text-gray-500 text-lg">{ad.type === 'offer' ? 'Biete Nachhilfe' : 'Suche Nachhilfe'}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-primary-hover">{price}</div>
                                <div className="text-sm text-gray-400">{ad.duration_minutes?.join(', ')} min</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Meta Tags */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                            {ad.locations?.map((loc: string) => (
                                <span key={loc} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    <MapPin size={14} /> {loc}
                                </span>
                            ))}
                            <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                <Clock size={14} /> Flexibel
                            </span>
                        </div>

                        {/* Subjects */}
                        <div className="flex flex-wrap gap-2">
                            {ad.subjects?.map((s: any) => <SubjectChip key={s} subject={s} />)}
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="font-bold mb-2 text-lg">Beschreibung</h3>
                            <div
                                className="prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: ad.long_description || ad.short_description || 'Keine Beschreibung' }}
                            />
                        </div>

                        {/* Images */}
                        {ad.image_urls && ad.image_urls.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                {ad.image_urls.map((url: string, i: number) => (
                                    <img key={i} src={url} alt={`Bild ${i}`} className="rounded-lg w-full h-auto object-cover bg-gray-100 border" />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Interaction / Profile Card */}
                <Card>
                    <CardContent className="p-6">
                        <div 
                            className="flex items-center gap-4 mb-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-xl transition-colors"
                            onClick={() => navigate(`/profile/${profile?.id}`)}
                        >
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary-hover text-2xl overflow-hidden shadow-sm">
                                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : (profile?.display_name?.charAt(0) || '?')}
                            </div>
                            <div>
                                <div className="font-bold text-lg">{profile?.display_name || 'Unbekannt'}</div>
                                <div className="text-sm text-gray-500">Klasse {profile?.grade_level || '?'}</div>
                                {profile?.is_verified && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 mt-1 inline-block">Verifiziert</span>}
                            </div>
                        </div>

                        {isOwn ? (
                            <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
                                Das ist deine eigene Anzeige.
                            </div>
                        ) : (
                            <div>
                                {requestStatus === 'none' && (
                                    <Button onClick={sendRequest} disabled={sending} className="w-full text-lg py-6 bg-primary hover:bg-primary-hover text-black font-bold">
                                        <Send size={20} className="mr-2" /> Anfrage senden
                                    </Button>
                                )}
                                {requestStatus === 'pending' && (
                                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center text-yellow-800 font-medium">
                                        Anfrage gesendet. Warte auf Antwort...
                                    </div>
                                )}
                                {(requestStatus === 'accepted' || requestStatus === 'completed') && (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3 text-green-800">
                                            <CheckCircle size={24} />
                                            <div>
                                                <p className="font-bold">Anfrage akzeptiert!</p>
                                                <p className="text-sm">Hier sind die Kontaktdaten:</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {profile?.phone_number && profile?.settings?.phone_visible && (
                                                <a href={`tel:${profile.phone_number}`} className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <Phone size={20} /> {profile.phone_number}
                                                </a>
                                            )}
                                            {profile?.email && profile?.settings?.email_visible && (
                                                <a href={`mailto:${profile.email}`} className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <Mail size={20} /> {profile.email}
                                                </a>
                                            )}
                                            {(!profile?.settings?.phone_visible && !profile?.settings?.email_visible) && (
                                                <div className="p-4 bg-gray-55/50 text-gray-500 rounded-xl border dark:border-gray-800 col-span-2 text-center text-xs">
                                                    Dieser Nutzer hat seine Kontaktdaten auf privat gestellt. Bitte kontaktiere ihn direkt über den Moodle-Namen ({profile?.moodle_name || 'Kein Moodle Name angegeben'}) oder im Chat.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {requestStatus === 'rejected' && (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center text-red-800 font-medium">
                                        Anfrage wurde leider abgelehnt.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Availability Calendar */}
            {(!isOwn && (profile?.privacy_calendar === false || requestStatus === 'accepted')) && (
                <Card>
                    <CardHeader className="border-b bg-gray-50 dark:bg-gray-900/50 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarDays size={18} className="text-primary-hover" />
                                <h3 className="font-bold text-lg">Verfügbarkeit</h3>
                            </div>
                            {user && (() => {
                                const score = countMatches(myAvailability, theirAvailability);
                                return score > 0 ? (
                                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                        ✅ {score} gemeinsame Zeitslot{score !== 1 ? 's' : ''}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                        Keine Übereinstimmung
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {user ? 'Grün = eure gemeinsamen verfügbaren Zeiten' : 'Melde dich an, um deine Zeiten zu vergleichen.'}
                        </p>
                    </CardHeader>
                    <CardContent className="p-4">
                        <AvailabilityCalendar
                            availability={theirAvailability}
                            matchWith={user ? myAvailability : undefined}
                            compact={false}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Report Button */}
            {!isOwn && (
                <div className="text-center mt-12">
                    <button onClick={() => setIsReportOpen(true)} className="text-sm text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2 mx-auto">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                        Anzeige melden
                    </button>
                    <ReportWizard 
                        isOpen={isReportOpen} 
                        onClose={() => setIsReportOpen(false)} 
                        reportedAdId={ad.id} 
                        reportedUserId={ad.user_id} 
                    />
                </div>
            )}

            {/* Share Dialog */}
            <ShareDialog
                adId={ad.id}
                adTitle={ad.subjects[0]?.toUpperCase()}
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
            />

            {/* Collection Selection Dialog */}
            <Dialog open={showCollectionSelector}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="relative">
                        <DialogTitle>In Sammlung verschieben</DialogTitle>
                        <DialogDescription>
                            Wähle eine Sammlung, in die du diese Anzeige verschieben möchtest.
                        </DialogDescription>
                        <button 
                            onClick={() => setShowCollectionSelector(false)} 
                            className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 py-4">
                        <button
                            className="w-full text-left text-sm px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold flex items-center gap-2 border dark:border-gray-850 bg-gray-50 dark:bg-gray-950"
                            onClick={async () => {
                                if (favoriteRecordId) {
                                    await supabase.from('favorites').update({ collection_id: null }).eq('id', favoriteRecordId);
                                    toast.success("In Hauptliste verschoben");
                                    setShowCollectionSelector(false);
                                }
                            }}
                        >
                            <Folder size={16} /> <span>Hauptliste</span>
                        </button>
                        {collections.map(c => (
                            <button
                                key={c.id}
                                className="w-full text-left text-sm px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold flex items-center gap-2 border dark:border-gray-850 bg-gray-50 dark:bg-gray-950"
                                onClick={async () => {
                                    if (favoriteRecordId) {
                                        const { error } = await supabase.from('favorites').update({ collection_id: c.id }).eq('id', favoriteRecordId);
                                        if (!error) {
                                            toast.success(`In "${c.name}" verschoben`);
                                        } else {
                                            toast.error("Fehler beim Verschieben.");
                                        }
                                        setShowCollectionSelector(false);
                                    }
                                }}
                            >
                                <Folder size={16} style={{ color: c.color }} /> <span>{c.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end border-t pt-3">
                        <Button size="sm" variant="ghost" onClick={() => setShowCollectionSelector(false)}>Schließen</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
