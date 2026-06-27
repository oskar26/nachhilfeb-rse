import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Trash2, Heart, ExternalLink, Share2 } from 'lucide-react';
import { SubjectChip } from '../components/SubjectChip';
import ShareDialog from '../components/ShareDialog';
import { toast } from 'react-hot-toast';

interface FavoriteAd {
    id: string;
    ad_id: string;
    ads: {
        id: string;
        title: string;
        type: 'offer' | 'search';
        subjects: string[];
        grade_levels: string[];
        short_description: string;
        price_details: any;
        profiles?: {
            display_name: string;
            grade_level: string;
        }
    }
}

export default function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [favorites, setFavorites] = useState<FavoriteAd[]>([]);
    const [loading, setLoading] = useState(true);

    // Share Dialog States
    const [sharingAd, setSharingAd] = useState<{ id: string; title: string } | null>(null);

    useEffect(() => {
        if (user) {
            fetchFavorites();
        }
    }, [user]);

    const fetchFavorites = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('*, ads(*)')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching favorites:', error);
                toast.error("Gespeicherte Anzeigen konnten nicht geladen werden.");
            } else if (data) {
                // Fetch profiles of ad owners manually to avoid deep nesting issues
                const adOwnerIds = Array.from(new Set(data.filter(f => f.ads).map(f => f.ads.user_id)));
                
                let profileMap = new Map();
                if (adOwnerIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, display_name, grade_level')
                        .in('id', adOwnerIds);
                    profileMap = new Map(profiles?.map(p => [p.id, p]));
                }

                const mapped: FavoriteAd[] = data.map((f: any) => ({
                    id: f.id,
                    ad_id: f.ad_id,
                    ads: f.ads ? {
                        ...f.ads,
                        profiles: profileMap.get(f.ads.user_id)
                    } : null
                })).filter(f => f.ads !== null); // Filter deleted ads

                setFavorites(mapped);
            }
        } catch (err) {
            console.error('Catch error fetching favorites:', err);
        }
        setLoading(false);
    };

    const handleRemoveFavorite = async (adId: string) => {
        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user?.id)
                .eq('ad_id', adId);

            if (!error) {
                setFavorites(prev => prev.filter(f => f.ad_id !== adId));
                toast.success("Aus Merkliste entfernt");
            } else {
                toast.error("Fehler beim Entfernen.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (!user) return <div className="p-4 text-center py-20">Bitte logge dich ein, um deine Merkliste zu sehen.</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto pb-24 space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Heart className="text-red-500" fill="currentColor" size={24} /> Merkliste
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Deine gespeicherten Nachhilfeanzeigen auf einen Blick
                </p>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500 animate-pulse">Lade gespeicherte Anzeigen...</div>
            ) : favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                    <div className="w-20 h-20 mb-6 rounded-full bg-gray-50 dark:bg-gray-850 flex items-center justify-center">
                        <Heart size={36} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Hier ist noch nichts</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                        Füge Angebote aus dem Feed hinzu, indem du auf das Herz-Symbol klickst.
                    </p>
                    <Button onClick={() => navigate('/')} className="rounded-full shadow-md">Jetzt stöbern</Button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {favorites.map((fav) => {
                        const ad = fav.ads;
                        return (
                            <Card
                                key={fav.id}
                                className="overflow-hidden hover:shadow-md transition-shadow relative border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 flex flex-col justify-between"
                            >
                                <CardHeader className="p-4 bg-gray-50/30 dark:bg-gray-850/30 border-b border-gray-100 dark:border-gray-800 flex flex-row justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-base line-clamp-1">{ad.profiles?.display_name || 'Unbekannt'}</h3>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${ad.type === 'offer' ? 'bg-primary/20 text-primary-hover dark:text-primary' : 'bg-secondary/20 text-secondary'}`}>
                                                {ad.type === 'offer' ? 'Biete' : 'Suche'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5 font-medium">
                                            {ad.profiles?.grade_level ? (
                                                ['EF', 'Q1', 'Q2'].includes(ad.profiles.grade_level)
                                                    ? `Stufe ${ad.profiles.grade_level}`
                                                    : `Klasse ${ad.profiles.grade_level}`
                                            ) : 'Klasse --'}
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {/* Share Button */}
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-7 w-7 text-gray-400 hover:text-primary rounded-lg shrink-0"
                                            onClick={(e) => { e.stopPropagation(); setSharingAd({ id: ad.id, title: ad.title }); }}
                                            title="Anzeige teilen"
                                        >
                                            <Share2 size={13} />
                                        </Button>

                                        {/* Delete Button */}
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg shrink-0" 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(ad.id); }}
                                            title="Aus Merkliste entfernen"
                                        >
                                            <Trash2 size={13} />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex flex-col gap-3 flex-1 justify-between">
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 line-clamp-1">{ad.title}</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {ad.subjects.map((s: any) => <SubjectChip key={s} subject={s} />)}
                                        </div>
                                        <p className="text-xs line-clamp-2 text-gray-600 dark:text-gray-400">{ad.short_description}</p>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mt-3 border-t pt-2.5 border-gray-150 dark:border-gray-800">
                                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                                            {ad.price_details?.mode === 'free' ? 'Kostenlos' : (ad.price_details?.mode === 'vb' ? 'VB' : `${ad.price_details?.value}€ / Std`)}
                                        </span>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="text-[11px] h-7 text-primary font-bold hover:underline gap-1 rounded-lg px-2"
                                            onClick={() => navigate(`/ad/${ad.id}`)}
                                        >
                                            <span>Ansehen</span>
                                            <ExternalLink size={10} />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Share Dialog */}
            {sharingAd && (
                <ShareDialog
                    adId={sharingAd.id}
                    adTitle={sharingAd.title}
                    isOpen={sharingAd !== null}
                    onClose={() => setSharingAd(null)}
                />
            )}
        </div>
    );
}
