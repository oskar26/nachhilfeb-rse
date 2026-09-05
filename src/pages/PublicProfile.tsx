import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { 
    ChevronLeft, GraduationCap, 
    CheckCircle, MessageSquare, Star, 
    Calendar, ShieldCheck, Share2 
} from 'lucide-react';
import { SubjectChip } from '../components/SubjectChip';
import type { Subject } from '../components/SubjectChip';
import { sanitizeHtml } from '../lib/sanitize';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import ShareDialog from '../components/ShareDialog';
import { extractDominantGradient, getRandomGradient } from '../lib/colorExtractor';

export default function PublicProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [ads, setAds] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [bannerGradient, setBannerGradient] = useState<string>('linear-gradient(135deg, #f59e0b 0%, #eab308 100%)');
    const [isShareOpen, setIsShareOpen] = useState(false);

    useEffect(() => {
        if (id) fetchProfileAndAds();
    }, [id]);

    async function fetchProfileAndAds() {
        setLoading(true);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (prof) {
            setProfile(prof);

            // Set or extract dynamic banner gradient
            if (prof.banner_color) {
                setBannerGradient(prof.banner_color);
            } else if (prof.avatar_url) {
                extractDominantGradient(prof.avatar_url, prof.id).then(setBannerGradient);
            } else {
                setBannerGradient(getRandomGradient(prof.id));
            }

            const { data: adsData } = await supabase.from('ads').select('*').eq('user_id', id).eq('is_hidden', false);
            if (adsData) setAds(adsData);

            const { data: reviewsData, count } = await supabase
                .from('reviews')
                .select('*, author:author_id(display_name, avatar_url)', { count: 'exact' })
                .eq('target_user_id', id)
                .order('created_at', { ascending: false });
            
            if (reviewsData) setReviews(reviewsData);
            if (count !== null) setReviewCount(count);
        }
        setLoading(false);
    }

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
            className="p-4 max-w-4xl mx-auto pb-28 space-y-6"
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
            <motion.div variants={itemVariants} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-yellow-500/30 rounded-3xl blur-md opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <Card className="relative p-0 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-soft bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-3xl">
                    <div className="h-32 transition-all duration-700 shadow-inner" style={{ background: bannerGradient }}></div>
                    <CardContent className="pt-0 px-8 pb-8 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-6">
                            <div className="w-32 h-32 rounded-3xl bg-white dark:bg-gray-950 p-1 shadow-xl overflow-hidden border-4 border-white dark:border-gray-950">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary-hover font-black text-4xl rounded-2xl">
                                        {profile.display_name?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                            <div className="text-center md:text-left pb-2 flex-1">
                                <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
                                    {profile.display_name || 'FWG Nutzer'}
                                    {profile.is_verified && <ShieldCheck className="text-blue-500" size={24} />}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 font-semibold flex items-center justify-center md:justify-start gap-2 mt-1">
                                    <GraduationCap size={18} /> Klasse {profile.grade_level || '?'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {profile.is_verified && (
                                    <span className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 text-xs font-bold px-3.5 py-1.5 rounded-full border border-green-200 dark:border-green-800/60 flex items-center gap-1.5 shadow-xs">
                                        <CheckCircle size={14} /> Geprüft & Verifiziert
                                    </span>
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
                                                <span className="font-extrabold text-sm text-gray-900 dark:text-white">{reviewCount > 0 ? Number(profile.average_rating || 0).toFixed(1) : '-'}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">({reviewCount})</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <span className="text-xs text-gray-500 font-medium flex items-center gap-2"><MessageSquare size={14} className="text-blue-500" /> Aktive Anzeigen</span>
                                            <span className="font-extrabold text-sm text-gray-900 dark:text-white">{ads.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <span className="text-xs text-gray-500 font-medium flex items-center gap-2"><Calendar size={14} className="text-primary" /> Dabei seit</span>
                                            <span className="font-extrabold text-sm text-gray-900 dark:text-white">{new Date(profile.created_at).getFullYear()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                    <div className="grid gap-4">
                        {ads.map(ad => (
                            <motion.button 
                                key={ad.id}
                                whileHover={{ y: -3, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => {
                                    triggerHaptic('light');
                                    navigate(`/ad/${ad.id}`);
                                }}
                                className="w-full text-left bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-soft hover:shadow-lg transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none"
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
                                        {ad.price_details?.mode === 'free' ? 'Kostenlos' : `${ad.price_details?.value}€/h`}
                                    </span>
                                </div>
                            </motion.button>
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
