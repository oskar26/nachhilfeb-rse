import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Heart, ExternalLink, Share2, GraduationCap, User } from 'lucide-react';
import { SubjectChip, type Subject } from '../components/SubjectChip';
import ShareDialog from '../components/ShareDialog';
import { toast } from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { formatAdPrice, type PriceDetails } from '../lib/utils';
import { EmptyState } from '../components/social/EmptyState';

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
        price_details?: PriceDetails | null;
        profiles?: {
            display_name: string;
            grade_level: string;
        }
    }
}

function gradeLabel(grade?: string | null): string {
    if (!grade) return 'Klasse ?';
    return ['EF', 'Q1', 'Q2'].includes(grade) ? `Stufe ${grade}` : `Klasse ${grade}`;
}

export default function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [favorites, setFavorites] = useState<FavoriteAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);

    // Share Dialog States
    const [sharingAd, setSharingAd] = useState<{ id: string; title: string } | null>(null);

    const fetchFavorites = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('*, ads(*)')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching favorites:', error);
                setError(error);
            } else if (data) {
                const mapped: FavoriteAd[] = data.map((f: {
                    id?: string;
                    ad_id?: string;
                    ads?: Record<string, unknown> | null;
                    display_name?: string;
                    user_grade?: string;
                    grade_level?: string;
                }) => {
                    const adData = (f.ads || f) as Record<string, unknown>;
                    const profileData = (adData.profiles as FavoriteAd['ads']['profiles']) || {
                        display_name: (adData.display_name as string) || 'FWG Nutzer',
                        grade_level: (adData.user_grade as string) || (adData.grade_level as string)
                    };

                    return {
                        id: f.id || f.ad_id || '',
                        ad_id: f.ad_id || f.id || '',
                        ads: {
                            ...(adData as unknown as FavoriteAd['ads']),
                            title: (adData.title as string) || (adData.short_description as string) || 'Nachhilfeanzeige',
                            profiles: profileData
                        }
                    };
                }).filter(f => f.ads && (f.ads.short_description || f.ads.title));

                setFavorites(mapped);
            }
        } catch (err) {
            console.error('Catch error fetching favorites:', err);
            setError(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchFavorites();
        }
    }, [user]);

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

    if (!user) return <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 p-8 text-center text-sm font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">Bitte logge dich ein, um deine Merkliste zu sehen.</div>;

    return (
        <div className="min-w-0 space-y-5">
            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Merkliste wird geladen">
                    <FavoriteSkeleton />
                    <FavoriteSkeleton />
                    <FavoriteSkeleton />
                    <FavoriteSkeleton />
                </div>
            ) : error ? (
                <EmptyState
                    icon={Heart}
                    tone="error"
                    title="Gespeicherte Anzeigen konnten nicht geladen werden"
                    text={apiErrorMessage(error, 'Prüfe deine Internetverbindung und versuche es erneut.')}
                    action={<Button onClick={() => fetchFavorites()} className="h-11 rounded-full bg-primary px-6 font-bold text-black">Erneut versuchen</Button>}
                />
            ) : favorites.length === 0 ? (
                <EmptyState
                    icon={Heart}
                    title="Hier ist noch nichts"
                    text="Füge Angebote aus dem Feed hinzu, indem du auf das Herz-Symbol klickst."
                    action={<Button onClick={() => navigate('/')} className="h-11 rounded-full bg-primary px-6 font-bold text-black">Jetzt stöbern</Button>}
                />
            ) : (
                <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {favorites.map(fav => {
                        const ad = fav.ads;
                        return (
                            <article
                                key={fav.id}
                                className="flex min-w-0 flex-col rounded-3xl border border-gray-200 bg-white p-4 shadow-soft transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span
                                        className={
                                            ad.type === 'offer'
                                                ? 'inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-black'
                                                : 'inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                        }
                                    >
                                        {ad.type === 'offer' ? <GraduationCap size={13} aria-hidden /> : <User size={13} aria-hidden />}
                                        {ad.type === 'offer' ? 'Biete' : 'Suche'}
                                    </span>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-11 w-11 shrink-0 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                        onClick={(e) => { e.stopPropagation(); setSharingAd({ id: ad.id, title: ad.title }); }}
                                        title="Anzeige teilen"
                                        aria-label="Anzeige teilen"
                                    >
                                        <Share2 size={16} />
                                    </Button>
                                </div>

                                <h3 className="mt-3 truncate text-base font-bold text-gray-900 dark:text-white">{ad.title}</h3>
                                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <GraduationCap size={13} aria-hidden />
                                    {ad.profiles?.display_name ? `${ad.profiles.display_name} · ` : ''}
                                    {gradeLabel(ad.profiles?.grade_level)}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {ad.subjects.map((s: string) => <SubjectChip key={s} subject={s as Subject} />)}
                                </div>
                                <p className="mt-3 text-sm text-gray-700 line-clamp-2 dark:text-gray-300">{ad.short_description}</p>

                                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                                    <span className="font-mono text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                                        {formatAdPrice(ad.price_details)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            className="h-11 rounded-full border-gray-200 bg-white px-4 font-bold text-gray-600 hover:text-red-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                            onClick={() => handleRemoveFavorite(ad.id)}
                                        >
                                            Entfernen
                                        </Button>
                                        <Button
                                            className="h-11 rounded-full bg-primary px-4 font-bold text-black"
                                            onClick={() => navigate(`/ad/${ad.id}`)}
                                        >
                                            Ansehen <ExternalLink size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </article>
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

/** Helles Karten-Skelett für das Merklisten-Grid. */
function FavoriteSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-gray-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
                <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 w-11 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 space-y-2.5">
                <div className="h-4 w-3/5 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-2/5 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
                <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <div className="h-4 w-20 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 w-32 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
    );
}
