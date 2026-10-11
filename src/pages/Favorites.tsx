import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Trash2, Heart, ExternalLink, Share2, type LucideIcon } from 'lucide-react';
import { SubjectChip } from '../components/SubjectChip';
import ShareDialog from '../components/ShareDialog';
import { toast } from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { formatAdPrice } from '../lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../lib/utils';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

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
    const reduceMotion = useReducedMotion();

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
                const mapped: FavoriteAd[] = data.map((f: any) => {
                    const adData = f.ads || f;
                    const profileData = adData.profiles || {
                        display_name: adData.display_name || 'FWG Nutzer',
                        grade_level: adData.user_grade || adData.grade_level
                    };

                    return {
                        id: f.id || f.ad_id,
                        ad_id: f.ad_id || f.id,
                        ads: {
                            ...adData,
                            title: adData.title || adData.short_description || 'Nachhilfeanzeige',
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
        <div className="space-y-5">

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Merkliste wird geladen">
                    <FavoriteSkeleton />
                    <FavoriteSkeleton />
                    <FavoriteSkeleton />
                    <FavoriteSkeleton />
                </div>
            ) : error ? (
                <StampState
                    icon={Heart}
                    tone="error"
                    title="Gespeicherte Anzeigen konnten nicht geladen werden"
                    text={apiErrorMessage(error, 'Prüfe deine Internetverbindung und versuche es erneut.')}
                    action={<Button onClick={() => fetchFavorites()} className="h-11 rounded-full bg-primary px-6 font-black text-gray-950 hover:bg-primary-hover">Erneut versuchen</Button>}
                />
            ) : favorites.length === 0 ? (
                <StampState
                    icon={Heart}
                    title="Hier ist noch nichts"
                    text="Füge Angebote aus dem Feed hinzu, indem du auf das Herz-Symbol klickst."
                    action={<Button onClick={() => navigate('/')} className="h-11 rounded-full bg-primary px-6 font-black text-gray-950 hover:bg-primary-hover">Jetzt stöbern</Button>}
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {favorites.map((fav, index) => {
                        const ad = fav.ads;
                        return (
                            <motion.article
                                key={fav.id}
                                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: EASE_OUT, delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.3) }}
                                className="relative flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                            >
                                <header className="flex items-start justify-between gap-2 px-5 pt-5">
                                    <div className="min-w-0">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <h3 className="truncate font-display text-lg uppercase leading-none tracking-tight text-gray-950 dark:text-gray-50">
                                                {ad.profiles?.display_name || 'Unbekannt'}
                                            </h3>
                                            <span className={cn(
                                                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                                                ad.type === 'offer' ? 'bg-gray-950 text-primary dark:bg-black' : 'bg-blue-700 text-white'
                                            )}>
                                                {ad.type === 'offer' ? 'Biete' : 'Suche'}
                                            </span>
                                        </div>
                                        <p className="mt-2 font-mono text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                                            {ad.profiles?.grade_level ? (
                                                ['EF', 'Q1', 'Q2'].includes(ad.profiles.grade_level)
                                                    ? `Stufe ${ad.profiles.grade_level}`
                                                    : `Klasse ${ad.profiles.grade_level}`
                                            ) : 'Klasse --'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        {/* Share Button */}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-10 w-10 rounded-full text-gray-400 hover:text-primary"
                                            onClick={(e) => { e.stopPropagation(); setSharingAd({ id: ad.id, title: ad.title }); }}
                                            title="Anzeige teilen"
                                        >
                                            <Share2 size={15} />
                                        </Button>

                                        {/* Delete Button */}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-10 w-10 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(ad.id); }}
                                            title="Aus Merkliste entfernen"
                                        >
                                            <Trash2 size={15} />
                                        </Button>
                                    </div>
                                </header>
                                <span className="mx-5 mt-3 block h-1 w-10 rounded-full bg-primary" aria-hidden />
                                <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
                                    <h4 className="line-clamp-1 text-sm font-bold text-gray-800 dark:text-gray-100">{ad.title}</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ad.subjects.map((s: any) => <SubjectChip key={s} subject={s} />)}
                                    </div>
                                    <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{ad.short_description}</p>

                                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-gray-200 pt-3 dark:border-gray-800">
                                        <span className="font-mono text-sm font-black tabular-nums text-gray-950 dark:text-gray-50">
                                            {formatAdPrice(ad.price_details)}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-10 rounded-full px-3 text-[11px] font-black text-primary-hover hover:underline dark:text-primary"
                                            onClick={() => navigate(`/ad/${ad.id}`)}
                                        >
                                            <span>Ansehen</span>
                                            <ExternalLink size={11} />
                                        </Button>
                                    </div>
                                </div>
                            </motion.article>
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

/** Gestempelte Hinweis-Karte: Stempel-Ring, „Leer“-Stempel, gelber Akzentstreifen. */
function StampState({ icon: Icon, title, text, action, tone = 'neutral' }: { icon: LucideIcon; title: string; text: ReactNode; action: ReactNode; tone?: 'neutral' | 'error' }) {
    const reduceMotion = useReducedMotion();
    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            role={tone === 'error' ? 'alert' : undefined}
            className="relative overflow-hidden rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-12 text-center shadow-soft dark:border-gray-700 dark:bg-gray-900/70 sm:py-14"
        >
            <span className={cn(
                'stamp-ring mx-auto grid h-16 w-16 -rotate-6 place-items-center rounded-full',
                tone === 'error' ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'
            )} aria-hidden>
                <Icon size={26} />
            </span>
            <span className={cn(
                'mt-5 inline-block -rotate-3 rounded-lg border-2 border-dashed px-3 py-1 font-display text-[10px] uppercase tracking-[0.3em]',
                tone === 'error'
                    ? 'border-red-200 text-red-400 dark:border-red-900/60 dark:text-red-500'
                    : 'border-gray-300 text-gray-400 dark:border-gray-700 dark:text-gray-500'
            )}>
                {tone === 'error' ? 'Fehler' : 'Leer'}
            </span>
            <h3 className="mt-4 font-display text-xl uppercase tracking-tight text-gray-950 dark:text-gray-50">{title}</h3>
            <span className="mx-auto mt-3 block h-1 w-10 rounded-full bg-primary" aria-hidden />
            <p className="mx-auto mt-3 max-w-sm text-sm text-gray-500 dark:text-gray-400">{text}</p>
            <div className="mt-6 flex justify-center">{action}</div>
        </motion.div>
    );
}

/** Skelett in Kartuschen-Form für das Merklisten-Grid. */
function FavoriteSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-gray-200/80 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="h-4 w-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                </div>
                <div className="h-8 w-16 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 h-1 w-10 rounded-full bg-primary/40" />
            <div className="mt-4 space-y-2.5">
                <div className="h-4 w-3/5 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-gray-200 pt-3 dark:border-gray-800">
                <div className="h-4 w-24 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-4 w-16 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
    );
}
