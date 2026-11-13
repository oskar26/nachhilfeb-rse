import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
    ChevronLeft, GraduationCap,
    MessageSquare, Star,
    Calendar, Share2, Award, Loader2, UserX
} from 'lucide-react';
import { SubjectChip, subjectLabelMap } from '../components/SubjectChip';
import type { Subject } from '../components/SubjectChip';
import { sanitizeHtml } from '../lib/sanitize';
import { triggerHaptic } from '../lib/haptics';
import { cn, formatAdPrice } from '../lib/utils';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import ShareDialog from '../components/ShareDialog';
import { useAuth } from '../context/AuthContext';
import { AvailabilityCalendar, emptyAvailability, type Availability } from '../components/AvailabilityCalendar';

// MySQL liefert TINYINT(1) als 0/1; undefined gilt als sichtbar.
function isVisibleAd(ad: { is_active?: unknown; is_archived?: unknown }) {
    return ad.is_active !== false && ad.is_active !== 0 && ad.is_active !== '0'
        && ad.is_archived !== true && ad.is_archived !== 1 && ad.is_archived !== '1';
}

export default function PublicProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [ads, setAds] = useState<any[]>([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [myAvailability, setMyAvailability] = useState<Availability>(emptyAvailability());

    useEffect(() => {
        if (user) {
            api.profiles.get(user.id).then(({ data }) => {
                if (data?.availability) setMyAvailability(data.availability);
            });
        }
    }, [user]);

    async function fetchProfileAndAds(isCancelled: () => boolean) {
        setLoading(true);
        const { data: prof } = await api.profiles.get(id);
        if (isCancelled()) return;
        if (prof) {
            setProfile(prof);

            const { data: adsData } = await api.ads.list({ user_id: id, all: true });
            if (isCancelled()) return;
            // Nur aktive, nicht archivierte Anzeigen zeigen (all:true liefert sonst auch inaktive).
            if (adsData) setAds((adsData as any[]).filter(isVisibleAd));

            const { data: reviews } = await api.reviews.list({ target_user_id: id });
            if (isCancelled()) return;
            setReviewCount(reviews?.length ?? 0);
        }
        if (!isCancelled()) setLoading(false);
    }

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        fetchProfileAndAds(() => cancelled);
        return () => { cancelled = true; };
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center gap-3 p-20" role="status">
            <Loader2 className="animate-spin text-foreground" size={30} aria-hidden />
            <p className="text-xs font-semibold text-muted-foreground">Profil wird geladen…</p>
        </div>
    );
    if (!profile) return (
        <div className="mx-auto mt-10 max-w-md p-4">
            <Card className="border-border bg-card">
                <CardContent className="space-y-3 p-8 text-center">
                    <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
                        <UserX size={24} aria-hidden />
                    </div>
                    <h1 className="text-lg font-semibold text-foreground">Profil nicht gefunden</h1>
                    <p className="text-sm text-muted-foreground">Dieses Profil existiert nicht oder ist nicht mehr verfügbar.</p>
                    <Button onClick={() => navigate(-1)} className="rounded-lg">Zurück</Button>
                </CardContent>
            </Card>
        </div>
    );

    const teachingSubjects = Array.from(new Set<string>([
        ...(Array.isArray(profile.teaches_subjects) ? profile.teaches_subjects : []),
        ...ads.filter(ad => ad.type === 'offer').flatMap(ad => (ad.subjects || []) as string[])
    ])).filter((s): s is Subject => s in subjectLabelMap);

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
            className="mx-auto w-full max-w-5xl space-y-5 p-4 pb-28 sm:p-6"
        >
            <motion.div variants={itemVariants} className="flex items-center justify-between gap-2">
                <Button
                    variant="ghost"
                    onClick={() => {
                        triggerHaptic('light');
                        navigate(-1);
                    }}
                    className="-ml-2 h-11 gap-1 rounded-lg pl-2 font-semibold"
                >
                    <ChevronLeft size={20} aria-hidden /> Zurück
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        triggerHaptic('light');
                        setIsShareOpen(true);
                    }}
                    className="h-11 rounded-lg gap-1.5 border-border font-semibold"
                >
                    <Share2 size={15} className="text-foreground" />
                    <span>Profil teilen</span>
                </Button>
            </motion.div>

            {/* Profile Header */}
            <motion.div variants={itemVariants} className="relative">
                <Card className="relative overflow-hidden border-border bg-card p-0">
                    <div
                        className="h-36 bg-[linear-gradient(135deg,var(--primary-soft),var(--pastel-blue))]"
                        aria-hidden
                    />
                    <CardContent className="pt-0 px-6 sm:px-8 pb-8 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                            <div className="-mt-16 size-28 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-card p-1 sm:size-32">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted text-4xl font-semibold text-foreground">
                                        {profile.display_name?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                            <div className="text-center md:text-left pt-3 pb-1 flex-1">
                                <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-semibold tracking-tight text-foreground md:justify-start sm:text-3xl">
                                    {profile.display_name || 'FWG Nutzer'}
                                    {profile.is_verified && (
                                        <VerifiedPill />
                                    )}
                                </h1>
                                <p className="text-muted-foreground font-semibold flex items-center justify-center md:justify-start gap-2 mt-1">
                                    <GraduationCap size={18} /> Klasse {profile.grade_level || '?'}
                                </p>
                                {reviewCount > 0 && (
                                    <p className="mt-1.5 flex items-center justify-center md:justify-start gap-1.5 text-sm font-semibold text-foreground/80">
                                        <Star size={15} className="fill-primary text-foreground" aria-hidden />
                                        <span className="tabular-nums">{Number(profile.average_rating || 0).toFixed(1)}</span>
                                        <span className="text-muted-foreground font-normal">· {reviewCount} {reviewCount === 1 ? 'Bewertung' : 'Bewertungen'}</span>
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                                {profile.is_coach && (
                                    <span className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                                        <Award size={14} aria-hidden /> Schüler-Coach (5./6. Klasse)
                                    </span>
                                )}
                                {ads.length > 0 && (
                                    <Button
                                        size="sm"
                                        className="h-11 rounded-lg px-4 font-semibold"
                                        onClick={() => navigate(`/ad/${ads[0].id}`)}
                                    >
                                        <MessageSquare size={14} className="mr-1.5" /> Anzeige öffnen
                                    </Button>
                                )}
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </motion.div>

            {/* Ab md zweispaltig: links Bio/Kontakt/Statistik, rechts Verfügbarkeit + Anzeigen */}
            <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className="space-y-6 min-w-0">
                    <motion.div variants={itemVariants}>
                        <Card className="border-border bg-card p-5">
                                <div>
                                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Über mich</h3>
                                    <div
                                        className="prose dark:prose-invert max-w-none text-sm text-foreground/80 leading-relaxed bg-muted/50 p-4 rounded-2xl border border-border"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(profile.bio || '<p class="text-muted-foreground italic">Keine Biografie angegeben.</p>') }}
                                    />
                                </div>
                        </Card>
                    </motion.div>

                    {teachingSubjects.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <Card className="border-border bg-card p-5">
                                <h3 className="mb-3 text-xs font-semibold text-muted-foreground">Ich biete Nachhilfe</h3>
                                <div className="flex flex-wrap gap-2">
                                    {teachingSubjects.map(s => <SubjectChip key={s} subject={s} />)}
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    <motion.div variants={itemVariants}>
                        <Card className="border-border bg-card p-5">
                            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Statistiken</h3>
                                    <div className="divide-y divide-border">
                                        <div className="flex items-center justify-between gap-3 py-3">
                                            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Star size={14} className="text-foreground" aria-hidden /> Bewertung</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-semibold tabular-nums text-foreground">{reviewCount > 0 ? Number(profile.average_rating || 0).toFixed(1) : '-'}</span>
                                                <span className="text-xs font-semibold text-muted-foreground">({reviewCount})</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 py-3">
                                            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><MessageSquare size={14} className="text-foreground" aria-hidden /> Aktive Anzeigen</span>
                                            <span className="text-sm font-semibold text-foreground">{ads.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 py-3">
                                            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Calendar size={14} className="text-foreground" aria-hidden /> Dabei seit</span>
                                            <span className="text-sm font-semibold text-foreground">{(() => {
                                                const y = new Date(profile.created_at || '').getFullYear();
                                                return Number.isFinite(y) ? y : '—';
                                            })()}</span>
                                        </div>
                                    </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Rechte Spalte: Verfügbarkeit + Anzeigen */}
                <div className="space-y-6 min-w-0">
                    {profile.availability && (
                        <motion.div variants={itemVariants}>
                            <Card className="border-border bg-card p-5">
                                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                    <Calendar size={14} className="text-foreground" aria-hidden /> Wann hat {profile.display_name || 'dieser Nutzer'} Zeit?
                                </h3>
                                <AvailabilityCalendar
                                    availability={profile.availability}
                                    matchWith={myAvailability}
                                />
                            </Card>
                        </motion.div>
                    )}

            {/* Ads Feed */}
            <motion.div variants={itemVariants} className="space-y-4">
                <h2 className="px-1 text-xl font-semibold tracking-tight text-foreground">Aktive Anzeigen ({ads.length})</h2>
                {ads.length === 0 ? (
                    <Card className="border-2 border-border bg-muted/30 py-12 text-center text-sm text-muted-foreground shadow-none">
                        Dieser Nutzer hat aktuell keine öffentlichen Anzeigen geschaltet.
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {ads.map(ad => (
                            <Button variant="unstyled" size="unstyled" type="submit"
                                key={ad.id}
                                onClick={() => {
                                    triggerHaptic('light');
                                    navigate(`/ad/${ad.id}`);
                                }}
                                className="flex min-h-11 w-full cursor-pointer select-none flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/40 sm:p-5 md:flex-row md:items-center"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'rounded-lg border px-2.5 py-0.5 text-xs font-semibold',
                                            ad.type === 'offer' ? 'border-border bg-muted text-foreground' : 'border-border bg-muted text-muted-foreground'
                                        )}>
                                            {ad.type === 'offer' ? 'Biete Nachhilfe' : 'Suche Nachhilfe'}
                                        </span>
                                    </div>
                                    <p className="line-clamp-1 text-base font-semibold text-foreground">{ad.short_description}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ad.subjects?.map((s: Subject) => (
                                             <SubjectChip key={s} subject={s} />
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="rounded-md bg-muted px-4 py-2 text-base font-semibold tabular-nums text-foreground">
                                        {formatAdPrice(ad.price_details)}
                                    </span>
                                </div>
                            </Button>
                        ))}
                    </div>
                )}
                    </motion.div>
                </div>
            </div>

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
