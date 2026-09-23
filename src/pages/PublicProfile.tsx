import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { 
    ChevronLeft, GraduationCap, 
    CheckCircle, MessageSquare, Star, 
    Calendar, Share2, Award 
} from 'lucide-react';
import { SubjectChip } from '../components/SubjectChip';
import type { Subject } from '../components/SubjectChip';
import { sanitizeHtml } from '../lib/sanitize';
import { triggerHaptic } from '../lib/haptics';
import { cn, formatAdPrice } from '../lib/utils';
import ShareDialog from '../components/ShareDialog';
import { extractDominantGradient, getDefaultGradient } from '../lib/colorExtractor';
import { useAuth } from '../context/AuthContext';
import { AvailabilityCalendar, emptyAvailability, type Availability } from '../components/AvailabilityCalendar';

export default function PublicProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [ads, setAds] = useState<any[]>([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [bannerGradient, setBannerGradient] = useState<string>(getDefaultGradient());
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [myAvailability, setMyAvailability] = useState<Availability>(emptyAvailability());

    useEffect(() => {
        if (user) {
            supabase.from('profiles').select('availability').eq('id', user.id).single().then(({ data }) => {
                if (data?.availability) setMyAvailability(data.availability);
            });
        }
    }, [user]);

    async function fetchProfileAndAds() {
        setLoading(true);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (prof) {
            setProfile(prof);

            // Set or extract dynamic banner gradient (leere/weisse/transparente
            // Werte fallen auf FWG-Gold zurück, sonst bliebe der Banner unsichtbar)
            const rawBanner = (prof.banner_color || '').trim().toLowerCase();
            const isBlankBanner =
                !rawBanner ||
                rawBanner === 'transparent' ||
                rawBanner === '#ffffff' ||
                rawBanner === '#fff' ||
                rawBanner === 'white' ||
                rawBanner === 'rgba(255,255,255,1)' ||
                rawBanner === 'rgb(255,255,255)';
            if (!isBlankBanner) {
                setBannerGradient(prof.banner_color);
            } else if (prof.avatar_url) {
                extractDominantGradient(prof.avatar_url, prof.id).then(setBannerGradient);
            } else {
                setBannerGradient(getDefaultGradient()); // FWG Gold default to match avatar
            }

            const { data: adsData } = await supabase.from('ads').select('*').eq('user_id', id).eq('is_hidden', false);
            if (adsData) setAds(adsData);

            const { count } = await supabase
                .from('reviews')
                .select('*, author:author_id(display_name, avatar_url)', { count: 'exact' })
                .eq('target_user_id', id)
                .order('created_at', { ascending: false });

            if (count !== null) setReviewCount(count);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (id) fetchProfileAndAds();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-bold uppercase">Profil wird geladen...</p>
        </div>
    );
    if (!profile) return <div className="p-8 text-center text-red-500 font-bold">Profil nicht gefunden.</div>;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 25 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="p-4 max-w-3xl mx-auto pb-28 space-y-6"
        >
            <motion.div variants={itemVariants} className="flex items-center justify-between gap-2">
                <Button
                    variant="ghost"
                    onClick={() => {
                        triggerHaptic('light');
                        navigate(-1);
                    }}
                    className="pl-0 hover:bg-transparent -ml-2 rounded-full font-bold"
                >
                    <ChevronLeft className="mr-1" size={20} /> Zurück
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        triggerHaptic('light');
                        setIsShareOpen(true);
                    }}
                    className="rounded-full gap-1.5 font-bold border-gray-200 dark:border-gray-800 shadow-xs"
                >
                    <Share2 size={15} className="text-primary-hover" />
                    <span>Profil teilen</span>
                </Button>
            </motion.div>

            {/* Profile Header */}
            <motion.div variants={itemVariants} className="relative">
                <Card className="relative p-0 overflow-hidden border border-gray-200/80 dark:border-gray-800 shadow-xs bg-white dark:bg-gray-900 rounded-3xl">
                    <div className="h-36 transition-all duration-700 shadow-inner" style={{ background: bannerGradient }}></div>
                    <CardContent className="pt-0 px-6 sm:px-8 pb-8 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-6">
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white dark:bg-gray-950 p-1 shadow-md overflow-hidden border-4 border-white dark:border-gray-950 -mt-16 shrink-0">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary-hover font-black text-4xl rounded-2xl">
                                        {profile.display_name?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                            <div className="text-center md:text-left pt-3 pb-1 flex-1">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                    {profile.display_name || 'FWG Nutzer'}
                                    {profile.is_verified && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900">
                                            <CheckCircle size={12} aria-hidden="true" /> Verifiziert
                                        </span>
                                    )}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 font-semibold flex items-center justify-center md:justify-start gap-2 mt-1">
                                    <GraduationCap size={18} /> Klasse {profile.grade_level || '?'}
                                </p>
                                {reviewCount > 0 && (
                                    <p className="mt-1.5 flex items-center justify-center md:justify-start gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        <Star size={15} className="text-yellow-500 fill-yellow-500" aria-hidden="true" />
                                        <span className="tabular-nums">{Number(profile.average_rating || 0).toFixed(1)}</span>
                                        <span className="text-gray-500 dark:text-gray-400 font-normal">· {reviewCount} {reviewCount === 1 ? 'Bewertung' : 'Bewertungen'}</span>
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                                {profile.is_coach && (
                                    <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-extrabold px-3 py-1.5 rounded-full border border-amber-300/80 dark:border-amber-700/60 flex items-center gap-1.5 shadow-xs">
                                        <Award size={14} className="text-amber-600 dark:text-amber-400" /> Schüler-Coach (5./6. Klasse)
                                    </span>
                                )}
                                {ads.length > 0 && (
                                    <Button
                                        size="sm"
                                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold h-9 px-4"
                                        onClick={() => navigate(`/ad/${ads[0].id}`)}
                                    >
                                        <MessageSquare size={14} className="mr-1.5" /> Anzeige öffnen
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                            <div className="col-span-2 space-y-6">
                                <div>
                                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">Über mich</h3>
                                    <div 
                                        className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50/60 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(profile.bio || '<p class="text-gray-400 italic">Keine Biografie angegeben.</p>') }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">Statistiken</h3>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <span className="text-xs text-gray-500 font-medium flex items-center gap-2"><Star size={14} className="text-yellow-500" /> Bewertung</span>
                                            <div className="flex items-center gap-1">
                                                <span className="font-extrabold text-sm text-gray-900 dark:text-white tabular-nums">{reviewCount > 0 ? Number(profile.average_rating || 0).toFixed(1) : '-'}</span>
                                                <span className="text-xs text-gray-500 font-semibold">({reviewCount})</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <span className="text-xs text-gray-500 font-medium flex items-center gap-2"><MessageSquare size={14} className="text-blue-500" /> Aktive Anzeigen</span>
                                            <span className="font-extrabold text-sm text-gray-900 dark:text-white">{ads.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <span className="text-xs text-gray-500 font-medium flex items-center gap-2"><Calendar size={14} className="text-primary" /> Dabei seit</span>
                                            <span className="font-extrabold text-sm text-gray-900 dark:text-white">{(() => {
                                                const y = new Date(profile.created_at || '').getFullYear();
                                                return Number.isFinite(y) ? y : '—';
                                            })()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Availability Calendar (Freistunden & Zeiten) */}
                        {profile.availability && (
                            <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-primary" /> Wann hat {profile.display_name || 'dieser Nutzer'} Zeit?
                                </h3>
                                <AvailabilityCalendar
                                    availability={profile.availability}
                                    matchWith={myAvailability}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Ads Feed */}
            <motion.div variants={itemVariants} className="space-y-4">
                <h2 className="text-xl font-black text-gray-900 dark:text-white px-1 tracking-tight">Aktive Anzeigen ({ads.length})</h2>
                {ads.length === 0 ? (
                    <Card className="bg-gray-50 dark:bg-gray-900/50 border-dashed border-2 py-12 text-center text-gray-500 rounded-3xl">
                        Dieser Nutzer hat aktuell keine öffentlichen Anzeigen geschaltet.
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {ads.map(ad => (
                            <button 
                                key={ad.id}
                                onClick={() => {
                                    triggerHaptic('light');
                                    navigate(`/ad/${ad.id}`);
                                }}
                                className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-amber-400/70 dark:hover:border-amber-400/50 p-5 rounded-3xl shadow-xs transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase',
                                            ad.type === 'offer' ? 'bg-yellow-400/20 text-yellow-900 dark:text-yellow-200' : 'bg-blue-500/20 text-blue-800 dark:text-blue-300'
                                        )}>
                                            {ad.type === 'offer' ? 'Biete Nachhilfe' : 'Suche Nachhilfe'}
                                        </span>
                                    </div>
                                    <p className="font-bold text-base text-gray-900 dark:text-white line-clamp-1">{ad.short_description}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ad.subjects?.map((s: Subject) => (
                                             <SubjectChip key={s} subject={s} />
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-base font-extrabold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl">
                                        {formatAdPrice(ad.price_details)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Share Dialog */}
            <ShareDialog
                type="profile"
                profileId={profile.id}
                title={profile.display_name}
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
            />
        </motion.div>
    );
}
