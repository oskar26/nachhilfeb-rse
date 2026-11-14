import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { SubjectChip, subjectLabelMap, type Subject } from '../components/SubjectChip';
import { toast } from 'sonner';
import { ChevronLeft, MapPin, Clock, Heart, Send, CheckCircle, Phone, Mail, CalendarDays, Share2, Copy, Eye, Users, User, Shuffle, Flag, ShieldAlert, Lock, Pencil, Pause, Play, Trash2, GraduationCap } from 'lucide-react';
import ReportWizard from '../components/ReportWizard';
import ShareDialog from '../components/ShareDialog';
import { AvailabilityCalendar, emptyAvailability, countMatches, type Availability } from '../components/AvailabilityCalendar';
import { sanitizeHtml } from '../lib/sanitize';
import { formatGradeLabel, formatGradeRange } from '../lib/matching';
import { cn, formatAdPrice, formatHourlyFromDetails } from '../lib/utils';
import { PriceTag } from '../components/ui/price-tag';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import { CustomContactsList, publicCustomContacts } from '../components/CustomContacts';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';

export default function AdDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [adError, setAdError] = useState<{ status?: number; message?: string } | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [theirAvailability, setTheirAvailability] = useState<Availability>(emptyAvailability());
    const [myAvailability, setMyAvailability] = useState<Availability>(emptyAvailability());

    // Request State
    const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected' | 'completed'>('none');
    const [sending, setSending] = useState(false);
    
    // Report & Share States
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activePending, setActivePending] = useState(false);
    const trackedViewForRef = useRef<string | null>(null);

    async function fetchAdAndStatus() {
        setLoading(true);
        const { data: adData, error: loadError } = await api.ads.get(id!);
        setAdError(adData ? null : loadError);

        if (adData) {
            setAd(adData);
            // Aufruf anonym zählen (einmal pro Anzeigen-Besuch, auch im StrictMode)
            if (trackedViewForRef.current !== adData.id) {
                trackedViewForRef.current = adData.id;
                api.ads.trackView(adData.id);
            }
            const { data: prof } = await api.profiles.get(adData.user_id);
            setProfile(prof);
            setTheirAvailability(prof?.availability || emptyAvailability());

            if (user) {
                // Load my own availability for matching
                const { data: myProf } = await api.profiles.get(user.id);
                setMyAvailability(myProf?.availability || emptyAvailability());
                const { data: fav } = await api.favorites.list();
                setIsFavorite(!!fav);

                const { data: reqList } = await api.requests.list();
                const req = (reqList || []).find((r: any) => r.requester_id === user.id && r.ad_id === id);

                if (req && typeof req.status === 'string') setRequestStatus(req.status as typeof requestStatus);
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        if (!id) return;
        fetchAdAndStatus();
    }, [id, user]);

    const toggleFavorite = async () => {
        if (!user || !ad) return;
        
        if ('vibrate' in navigator) navigator.vibrate([15]);

        if (isFavorite) {
            const { error } = await api.favorites.toggle(ad.id);
            if (error) {
                console.error("Error removing favorite:", error);
                toast.error("Konnte nicht von der Merkliste entfernt werden.");
            } else {
                setIsFavorite(false);
                toast.success("Aus Merkliste entfernt");
            }
        } else {
            const { error } = await api.favorites.toggle(ad.id);
            if (error) {
                console.error("Error adding favorite:", error);
                toast.error("Konnte nicht zur Merkliste hinzugefügt werden.");
            } else {
                setIsFavorite(true);
                toast.success("In Merkliste gespeichert!");
            }
        }
    };

    const sendRequest = async () => {
        if (!user || !ad || !profile) return;
        setSending(true);
        const { error } = await api.requests.create({
            ad_id: ad.id,
            requester_id: user.id,
            owner_id: profile.id, // denormalized for RLS
            message: "Ich habe Interesse an diesem Angebot!",
            status: 'pending'
        } as any);

        if (!error) {
            setRequestStatus('pending');
            toast.success("Anfrage gesendet!");
        } else {
            toast.error("Fehler beim Senden der Anfrage.");
        }
        setSending(false);
    };

    if (loading) return (
        <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6" role="status" aria-label="Anzeige wird geladen">
            <div className="h-11 w-28 animate-pulse rounded-lg bg-muted" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
    );
    if (!ad) {
        const unavailable = adError?.status === 403 || adError?.status === 404;
        return (
            <div className="mx-auto mt-10 max-w-md p-4">
                <Card className="border-border bg-card ">
                    <CardContent className="space-y-3 p-8 text-center">
                        <div className="mx-auto grid size-14 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <Lock size={22} aria-hidden />
                        </div>
                        <h1 className="text-lg font-semibold text-foreground">
                            {unavailable ? 'Anzeige nicht verfügbar' : 'Anzeige nicht gefunden'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {unavailable
                                ? 'Diese Anzeige ist privat, nicht mehr aktiv oder für dich nicht freigeschaltet.'
                                : 'Diese Anzeige existiert nicht oder wurde entfernt.'}
                        </p>
                        <Button onClick={() => navigate(-1)} className="rounded-lg">Zurück</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isOwn = user?.id === ad.user_id;

    const price = formatAdPrice(ad.price_details);
    const hourly = formatHourlyFromDetails(ad.price_details);
    const durations = (ad.duration_minutes || []).filter((d: number) => typeof d === 'number');
    const hasFlexible = durations.some((d: number) => d === 0);
    const concreteDurations = durations.filter((d: number) => d > 0);
    const durationMeta = concreteDurations.length > 0
        ? concreteDurations.map((d: number) => `${d} Min`).join(' · ') + (hasFlexible ? ' · nach Absprache' : '')
        : 'Egal · nach Absprache';

    const status: typeof requestStatus = requestStatus === 'pending' || requestStatus === 'accepted' || requestStatus === 'rejected' || requestStatus === 'completed'
        ? requestStatus
        : 'none';
    const canRequest = !isOwn
        && status === 'none'
        && ad.is_active !== false
        && ad.is_archived !== true;
    const isPaused = !isOwn && !ad.is_active;

    const subjectNames = (ad.subjects || []).map((subject: Subject) => subjectLabelMap[subject] ?? subject);
    const generatedHeading = `${subjectNames[0] || 'Nachhilfe'} - ${profile?.display_name || 'Nutzer'}`;
    const ownTitle = (typeof ad.title === 'string' && ad.title.trim())
        || (typeof ad.short_description === 'string' && ad.short_description.trim())
        || '';
    const heading = ownTitle || generatedHeading;
    const gradeRange = formatGradeRange(ad.grade_levels);

    const openEditor = () => navigate('/create-ad', { state: { editAd: ad } });

    const handleToggleActive = async () => {
        if (!ad) return;
        const nextActive = !ad.is_active;
        setActivePending(true);
        const { error } = await api.ads.update(ad.id, { is_active: nextActive });
        setActivePending(false);
        if (error) {
            toast.error(nextActive ? 'Anzeige konnte nicht aktiviert werden.' : 'Anzeige konnte nicht pausiert werden.');
            return;
        }
        setAd((previous: Record<string, unknown> | null) => (previous ? { ...previous, is_active: nextActive } : previous));
        toast.success(nextActive ? 'Anzeige aktiviert.' : 'Anzeige pausiert.');
    };

    const handleDelete = async () => {
        if (!ad) return;
        setDeleting(true);
        const { error } = await api.ads.delete(ad.id);
        if (error) {
            setDeleting(false);
            setDeleteOpen(false);
            toast.error('Anzeige konnte nicht gelöscht werden. Bitte versuche es erneut.');
            return;
        }
        setDeleting(false);
        setDeleteOpen(false);
        toast.success('Anzeige gelöscht.');
        navigate('/');
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pb-32 sm:p-6">
            <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2 h-11 gap-1 rounded-lg pl-2 text-sm font-semibold">
                    <ChevronLeft size={20} aria-hidden /> Zurück
                </Button>
                <div className="flex items-center gap-1">
                    {isOwn && (
                        <Button variant="ghost" onClick={() => navigate('/create-ad', { state: { duplicateAd: ad } })} className="h-11 gap-1 rounded-lg px-3 text-[13px] font-semibold text-muted-foreground">
                            <Copy size={16} aria-hidden /> <span className="hidden sm:inline">Duplizieren</span><span className="sr-only sm:hidden">Duplizieren</span>
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setIsShareOpen(true)} className="size-11 rounded-lg text-muted-foreground" aria-label="Anzeige teilen">
                        <Share2 size={20} aria-hidden />
                    </Button>
                    {!isOwn && (
                        <Button variant="ghost" size="icon" onClick={toggleFavorite} className={`size-11 rounded-lg hover:bg-destructive/10 ${isFavorite ? 'text-destructive' : 'text-muted-foreground'}`} aria-label={isFavorite ? 'Aus Merkliste entfernen' : 'Zur Merkliste hinzufügen'} aria-pressed={isFavorite}>
                            <Heart fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
                        </Button>
                    )}
                </div>
            </div>

            {isOwn && !ad.is_active && (
                <div role="status" className="flex flex-col gap-3 rounded-card border border-border bg-pastel-yellow p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2.5">
                        <Pause size={18} className="mt-0.5 shrink-0 text-pastel-yellow-foreground" aria-hidden />
                        <div>
                            <p className="text-[15px] font-semibold text-pastel-yellow-foreground">Deine Anzeige ist pausiert.</p>
                            <p className="mt-0.5 text-[13px] text-pastel-yellow-foreground">Sie erscheint nicht in Übersicht und Suche. Direkte Links bleiben erreichbar.</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleToggleActive} isLoading={activePending} className="h-11 shrink-0 rounded-lg px-4 text-[13px] font-semibold">
                        <Play size={15} aria-hidden /> Aktivieren
                    </Button>
                </div>
            )}

            {isPaused && (
                <div role="status" className="flex items-start gap-2.5 rounded-card border border-border bg-pastel-yellow p-4">
                    <Pause size={18} className="mt-0.5 shrink-0 text-pastel-yellow-foreground" aria-hidden />
                    <div>
                        <p className="text-[15px] font-semibold text-pastel-yellow-foreground">Diese Anzeige ist pausiert.</p>
                        <p className="mt-0.5 text-[13px] text-pastel-yellow-foreground">Der Anbieter hat die Anzeige vorübergehend deaktiviert. Eine Anfrage ist derzeit nicht möglich.</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6">
                {/* Header Card: Titel, Preis und Ort/Raum/Zeit liegen auf einer
                    durchgehenden Fläche – kein grauer Streifen dazwischen. */}
                <Card className="border-border bg-card">
                    <CardHeader className="space-y-4 p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <h1 className={cn('break-anywhere text-xl font-semibold text-foreground sm:text-2xl', !ownTitle && 'capitalize')}>{heading}</h1>
                                    {profile?.is_verified && (
                                        <VerifiedPill className="shrink-0" />
                                    )}
                                </div>
                                <p className="text-[15px] leading-relaxed text-muted-foreground">
                                    {ad.type === 'offer' ? 'Biete Nachhilfe' : 'Suche Nachhilfe'}
                                    {subjectNames.length > 0 && <> · {subjectNames.join(', ')}</>}
                                    {profile?.display_name && <> · von {profile.display_name}</>}
                                </p>
                                {ad.type === 'search' && (
                                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                                        <Lock size={12} className="shrink-0" /> Privates Gesuch – sichtbar nur für passende Anbieter und das SV-Team.
                                    </p>
                                )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                                <PriceTag
                                    layout="stacked"
                                    price={ad.price_details?.value}
                                    mode={ad.price_details?.mode}
                                    duration={ad.price_details?.unit}
                                />
                                {hourly && hourly !== price && (
                                    <span className="text-[13px] tabular-nums text-muted-foreground">≈ {hourly}</span>
                                )}
                            </div>
                        </div>

                        {/* Meta Tags: Ort, Dauer, Format und Aufrufe gehören zur
                            Kopffläche und werden nicht durch eine Trennlinie geteilt. */}
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {gradeRange && (
                                <span className="flex items-center gap-1 rounded-lg bg-pastel-mint px-2.5 py-1 text-[13px] font-semibold text-pastel-mint-foreground">
                                    <GraduationCap size={14} aria-hidden /> für {gradeRange}
                                </span>
                            )}
                            {ad.locations?.map((loc: string) => (
                                <span key={loc} title={loc} className="flex max-w-full min-w-0 items-center gap-1 break-words rounded-lg bg-muted px-2.5 py-1 text-[13px]">
                                    <MapPin size={14} className="shrink-0" aria-hidden /> <span className="min-w-0 break-words">{loc}</span>
                                </span>
                            ))}
                            <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[13px]" title={durationMeta}>
                                <Clock size={14} aria-hidden /> {durationMeta}
                            </span>
                            {ad.session_format && ad.session_format !== 'any' && (
                                <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[13px]" title={ad.session_format === 'group' ? 'Kleingruppe (2–4 Schüler)' : 'Einzelunterricht'}>
                                    {ad.session_format === 'group' ? <Users size={14} aria-hidden /> : <User size={14} aria-hidden />}
                                    {ad.session_format === 'group' ? 'Kleingruppe' : 'Einzelunterricht'}
                                </span>
                            )}
                            {ad.session_format === 'any' && (
                                <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[13px]" title="Einzel oder Kleingruppe – nach Absprache">
                                    <Shuffle size={14} aria-hidden /> Egal
                                </span>
                            )}
                            {(ad.view_count ?? 0) > 0 && (
                                <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[13px]" title="So oft wurde diese Anzeige aufgerufen">
                                    <Eye size={14} aria-hidden /> {ad.view_count} {ad.view_count === 1 ? 'Aufruf' : 'Aufrufe'}
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 p-4 pt-0 sm:p-6 sm:pt-0">
                        {/* Subjects */}
                        <div className="flex flex-wrap gap-2">
                            {ad.subjects?.map((s: any) => <SubjectChip key={s} subject={s} />)}
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="mb-2 text-lg font-semibold text-foreground">Beschreibung</h3>
                            <div
                                className="prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(ad.long_description || ad.short_description || 'Keine Beschreibung') }}
                            />
                        </div>

                        {/* Images */}
                        {ad.image_urls && ad.image_urls.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                {ad.image_urls.map((url: string, i: number) => (
                                    <img key={i} src={url} alt={`Bild ${i}`} className="rounded-lg w-full h-auto object-cover bg-muted border" />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Interaction / Profile Card: Desktop teilt Profil links und
                    Anfrage/Verwaltung rechts; mobil bleibt beides gestapelt. */}
                <Card className="border-border bg-card">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-6">
                            <Button variant="unstyled" size="unstyled"
                                type="button"
                                onClick={() => navigate(`/profile/${profile?.id}`)}
                                className="flex min-w-0 items-center gap-4 rounded-xl p-2 text-left transition-colors hover:bg-muted md:flex-1"
                            >
                                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-2xl font-semibold text-foreground">
                                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile?.display_name?.charAt(0) || '?')}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-lg font-semibold text-foreground">{profile?.display_name || 'Unbekannt'}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Anbieter:in{profile?.grade_level ? ` · ${formatGradeLabel(profile.grade_level)}` : ''}
                                    </div>
                                    <div className="text-[13px] text-muted-foreground">Profil ansehen</div>
                                </div>
                            </Button>

                            <div className={cn(
                                'min-w-0',
                                isOwn
                                    ? 'md:w-[25rem] md:shrink-0 md:border-l md:border-border md:pl-6'
                                    : 'md:w-[20rem] md:shrink-0 md:border-l md:border-border md:pl-6'
                            )}>
                                {isOwn ? (
                                    <div className="space-y-3">
                                        <div className="rounded-xl bg-muted p-3 text-[13px] text-muted-foreground sm:text-center">
                                            Das ist deine eigene Anzeige. Du kannst sie jederzeit verwalten.
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-3">
                                            <Button variant="outline" onClick={openEditor} className="h-11 gap-1.5 rounded-lg px-3 text-[13px] font-semibold">
                                                <Pencil size={15} aria-hidden /> Bearbeiten
                                            </Button>
                                            <Button variant="outline" onClick={handleToggleActive} isLoading={activePending} className="h-11 gap-1.5 rounded-lg px-3 text-[13px] font-semibold">
                                                {ad.is_active ? <><Pause size={15} aria-hidden /> Pausieren</> : <><Play size={15} aria-hidden /> Aktivieren</>}
                                            </Button>
                                            <Button variant="outline" onClick={() => setDeleteOpen(true)} className="h-11 gap-1.5 rounded-lg border-destructive/25 px-3 text-[13px] font-semibold text-destructive hover:bg-destructive/10">
                                                <Trash2 size={15} aria-hidden /> Löschen
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {canRequest && (
                                            <div className="space-y-2">
                                                <Button
                                                    onClick={sendRequest}
                                                    disabled={sending}
                                                    className="hidden h-14 w-full text-base font-semibold md:inline-flex"
                                                >
                                                    <Send size={20} className="mr-2" /> Anfrage senden
                                                </Button>
                                                <p className="text-center text-[13px] leading-relaxed text-muted-foreground md:text-left">
                                                    Unverbindlich · Kontakte erst nach Annahme sichtbar
                                                </p>
                                            </div>
                                        )}
                                        {status === 'pending' && (
                                            <div className="rounded-xl border border-border bg-muted p-4 text-center font-medium text-foreground/80">
                                                Anfrage gesendet. Warte auf Antwort.
                                            </div>
                                        )}
                                        {(status === 'accepted' || status === 'completed') && (
                                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                                                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-4 text-foreground/80">
                                                    <CheckCircle size={24} />
                                                    <div>
                                                        <p className="font-semibold">Anfrage akzeptiert!</p>
                                                        <p className="text-sm">Hier sind die Kontaktdaten:</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2.5 rounded-xl border border-border bg-muted/50 p-3.5 text-[13px] leading-relaxed text-muted-foreground">
                                                    <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                                    <p>
                                                        <strong>Sicherheit geht vor:</strong> Trefft euch möglichst in der Schule,
                                                        informiert eure Eltern und teilt nur Kontakte, die ihr freigegeben habt.
                                                        Bei Problemen melde die Anzeige über den Button unten oder sprich das SV-Team an.
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {profile?.phone_number && profile?.settings?.phone_visible && (
                                                        <a href={`tel:${profile.phone_number}`} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-[13px] transition-colors hover:bg-muted">
                                                            <Phone size={20} /> {profile.phone_number}
                                                        </a>
                                                    )}
                                                    {profile?.email && profile?.settings?.email_visible && (
                                                        <a href={`mailto:${profile.email}`} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-[13px] transition-colors hover:bg-muted">
                                                            <Mail size={20} /> {profile.email}
                                                        </a>
                                                    )}
                                                    {(!profile?.settings?.phone_visible && !profile?.settings?.email_visible && publicCustomContacts(profile?.settings?.custom_contacts).length === 0) && (
                                                        <div className="rounded-xl border border-border bg-muted/60 p-4 text-center text-[13px] text-muted-foreground">
                                                            Dieser Nutzer hat seine Kontaktdaten auf privat gestellt. Schreibe ihm direkt im Chat.
                                                        </div>
                                                    )}
                                                </div>
                                                <CustomContactsList contacts={profile?.settings?.custom_contacts} />
                                            </div>
                                        )}
                                        {status === 'rejected' && (
                                            <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-center font-medium text-destructive">
                                                Anfrage wurde leider abgelehnt.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Availability Calendar */}
            {(!isOwn && (profile?.privacy_calendar === false || status === 'accepted')) && (
                <Card className="border-border bg-card">
                    <CardHeader className="border-b border-border bg-muted/50 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarDays size={18} className="text-foreground" />
                                <h3 className="font-semibold text-lg">Verfügbarkeit</h3>
                            </div>
                            {user && (() => {
                                const score = countMatches(myAvailability, theirAvailability);
                                return score > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[13px] font-semibold text-foreground">
                                        <CheckCircle size={12} /> {score} gemeinsame Zeitslot{score !== 1 ? 's' : ''}
                                    </span>
                                ) : (
                                    <span className="rounded-lg bg-muted px-2 py-1 text-[13px] text-muted-foreground">
                                        Keine Übereinstimmung
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="mt-1 text-[13px] text-muted-foreground">
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
                    <Button
                        variant="outline"
                        onClick={() => setIsReportOpen(true)}
                        className="h-11 rounded-lg border-destructive/25 font-semibold text-destructive hover:bg-destructive/10"
                    >
                        <Flag size={15} /> Anzeige melden
                    </Button>
                    <ReportWizard 
                        isOpen={isReportOpen} 
                        onClose={() => setIsReportOpen(false)} 
                        reportedAdId={ad.id} 
                        reportedUserId={ad.user_id} 
                    />
                </div>
            )}

            {isOwn && (
                <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Anzeige wirklich löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Die Anzeige wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" isLoading={deleting} onClick={() => { void handleDelete(); }}>
                                Löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Share Dialog */}
            <ShareDialog
                adId={ad.id}
                adTitle={ad.subjects?.[0]}
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
            />

            {/* Sticky conversion bar (I2): CTA + price stay reachable while scrolling */}
            {canRequest && (
                <div className="fixed left-0 right-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-40 px-4 md:hidden">
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-overlay">
                        <div className="min-w-0 flex-1 pl-1">
                            <PriceTag
                                layout="inline"
                                price={ad.price_details?.value}
                                mode={ad.price_details?.mode}
                                duration={ad.price_details?.unit}
                            />
                            <div className="mt-1 text-[13px] text-muted-foreground truncate">Unverbindlich</div>
                        </div>
                        <Button
                            onClick={sendRequest}
                            disabled={sending}
                            className="h-12 shrink-0 rounded-lg px-5 font-semibold"
                            aria-describedby="request-safety-line"
                        >
                            <Send size={18} className="mr-2" /> Anfrage senden
                        </Button>
                    </div>
                    <span id="request-safety-line" className="sr-only">Unverbindlich. Kontaktdaten werden erst nach Annahme der Anfrage sichtbar.</span>
                </div>
            )}
        </div>
    );
}
