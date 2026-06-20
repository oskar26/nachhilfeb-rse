import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { 
    ChevronLeft, GraduationCap, 
    CheckCircle, MessageSquare, Star, 
    MapPin, Calendar, ShieldCheck 
} from 'lucide-react';
import { SubjectChip } from '../components/SubjectChip';
import type { Subject } from '../components/SubjectChip';
import { cn } from '../lib/utils';

export default function PublicProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [ads, setAds] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchProfileAndAds();
    }, [id]);

    async function fetchProfileAndAds() {
        setLoading(true);
        // Fetch Profile
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (prof) {
            setProfile(prof);
            // Fetch Ads
            const { data: adsData } = await supabase.from('ads').select('*').eq('user_id', id).eq('is_hidden', false);
            if (adsData) setAds(adsData);

            // Fetch Reviews
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

    if (loading) return <div className="p-8 text-center">Profil wird geladen...</div>;
    if (!profile) return <div className="p-8 text-center text-red-500">Profil nicht gefunden.</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto pb-24 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:bg-transparent -ml-2">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>
            </div>

            {/* Profile Header */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-3xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <Card className="relative p-0 overflow-hidden border-none shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <div className="h-32 bg-gradient-to-r from-primary to-blue-600"></div>
                    <CardContent className="pt-0 px-8 pb-8 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-6">
                            <div className="w-32 h-32 rounded-3xl bg-white dark:bg-gray-800 p-1 shadow-lg overflow-hidden border-4 border-white dark:border-gray-800">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary-hover font-bold text-4xl rounded-2xl">
                                        {profile.display_name?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                            <div className="text-center md:text-left pb-2 flex-1">
                                <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
                                    {profile.display_name || 'Anonymer Nutzer'}
                                    {profile.is_verified && <ShieldCheck className="text-blue-500" size={24} />}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center md:justify-start gap-2 mt-1">
                                    <GraduationCap size={18} /> Klasse {profile.grade_level || '?'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {profile.is_verified && (
                                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800/50 flex items-center gap-1.5 shadow-sm">
                                        <CheckCircle size={14} /> Geprüft & Verifiziert
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 pt-6 border-t dark:border-gray-800">
                            <div className="col-span-2 space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Über mich</h3>
                                    <div 
                                        className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: profile.bio || '<p class="text-gray-400 italic">Keine Biografie angegeben.</p>' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Statistiken</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border dark:border-gray-800">
                                            <span className="text-xs text-gray-500 flex items-center gap-2"><Star size={14} className="text-yellow-500" /> Bewertung</span>
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold">{reviewCount > 0 ? Number(profile.average_rating || 0).toFixed(1) : '-'}</span>
                                                <span className="text-[10px] text-gray-400">({reviewCount})</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border dark:border-gray-800">
                                            <span className="text-xs text-gray-500 flex items-center gap-2"><MessageSquare size={14} className="text-blue-500" /> Anzeigen</span>
                                            <span className="font-bold">{ads.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border dark:border-gray-800">
                                            <span className="text-xs text-gray-500 flex items-center gap-2"><Calendar size={14} className="text-primary" /> Dabei seit</span>
                                            <span className="font-bold">{new Date(profile.created_at).getFullYear()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Ads Feed */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold px-1">Aktive Anzeigen ({ads.length})</h2>
                {ads.length === 0 ? (
                    <Card className="bg-gray-50 dark:bg-gray-900 border-dashed border-2 py-12 text-center text-gray-500">
                        Dieser Nutzer hat aktuell keine Anzeigen geschaltet.
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {ads.map(ad => (
                            <button 
                                key={ad.id}
                                onClick={() => navigate(`/ad/${ad.id}`)}
                                className="w-full text-left bg-white dark:bg-gray-900 border dark:border-gray-800 p-5 rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                            ad.type === 'offer' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                        )}>
                                            {ad.type === 'offer' ? 'Bietet' : 'Sucht'}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {ad.subjects?.map((s: string) => <SubjectChip key={s} subject={s as Subject} className="scale-75 origin-left" />)}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold line-clamp-1">{ad.short_description}</h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        {ad.locations?.map((l: string) => <span key={l} className="flex items-center gap-1"><MapPin size={12} /> {l}</span>)}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-lg font-bold text-primary-hover">
                                        {ad.price_details?.mode === 'free' ? 'Kostenlos' : `${ad.price_details?.value}€/${ad.price_details?.unit}`}
                                    </div>
                                    <div className="text-[10px] text-gray-400">{ad.duration_minutes?.join(', ')} min</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Reviews Section */}
            <div className="space-y-4 pt-4">
                <h2 className="text-2xl font-bold px-1">Bewertungen ({reviewCount})</h2>
                {reviews.length === 0 ? (
                    <Card className="bg-gray-50 dark:bg-gray-900 border-dashed border-2 py-12 text-center text-gray-500">
                        Noch keine Bewertungen vorhanden.
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {reviews.map(review => (
                            <Card key={review.id} className="border-none shadow-sm bg-white dark:bg-gray-900 rounded-2xl">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                                                {review.author?.avatar_url ? <img src={review.author?.avatar_url} className="w-full h-full object-cover" /> : (review.author?.display_name?.charAt(0) || '?')}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm">{review.author?.display_name || 'Gelöschter Nutzer'}</div>
                                                <div className="text-[10px] text-gray-400">{new Date(review.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5 text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full border border-yellow-100 dark:border-yellow-800/50">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} size={12} fill={star <= review.rating ? "currentColor" : "none"} className={star <= review.rating ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{review.comment || <span className="italic text-gray-400">Kein Text zur Bewertung hinterlassen.</span>}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
