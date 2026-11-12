import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { SubjectChip } from '../components/SubjectChip';
import { toast } from 'sonner';
import { ChevronLeft, MapPin, Clock, Heart, Send, CheckCircle, Phone, Mail, CalendarDays, Share2, Copy, Eye, Users, User, Shuffle, Flag, ShieldAlert, Lock } from 'lucide-react';
import ReportWizard from '../components/ReportWizard';
import ShareDialog from '../components/ShareDialog';
import { AvailabilityCalendar, emptyAvailability, countMatches, type Availability } from '../components/AvailabilityCalendar';
import { sanitizeHtml } from '../lib/sanitize';
import { formatAdPrice, formatHourlyFromDetails } from '../lib/utils';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import { CustomContactsList, publicCustomContacts } from '../components/CustomContacts';

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
    const canRequest = !isOwn && status === 'none';

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pb-32 sm:p-6">
            <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2 h-11 gap-1 rounded-lg pl-2 text-sm font-semibold">
                    <ChevronLeft size={20} aria-hidden /> Zurück
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" onClick={() => navigate('/create-ad', { state: { duplicateAd: ad } })} className="h-11 gap-1 rounded-lg px-3 text-xs font-semibold text-muted-foreground">
                        <Copy size={16} aria-hidden /> <span className="hidden sm:inline">Duplizieren</span><span className="sr-only sm:hidden">Duplizieren</span>
                    </Button>
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

            <div className="grid gap-6">
                {/* Header Card */}
                <Card className="border-border bg-card">
                    <CardHeader className="border-b border-border bg-muted/50">
                        <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h1 className="break-anywhere text-xl font-semibold text-foreground sm:text-2xl">{ad.subjects?.[0] || 'Nachhilfe'} - {profile?.display_name || 'Nutzer'}</h1>
                                    {profile?.is_verified && (
                                        <VerifiedPill className="shrink-0" />
                                    )}
                                </div>
                                <p className="text-muted-foreground text-lg">{ad.type === 'offer' ? 'Biete Nachhilfe' : 'Suche Nachhilfe'}</p>
                                {ad.type === 'search' && (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Lock size={12} className="shrink-0" /> Privates Gesuch – sichtbar nur für passende Anbieter und das SV-Team.
                                    </p>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-xl font-semibold text-foreground" aria-label={`Preis: ${price}`}>{price}</div>
                                {hourly && hourly !== price && (
                                    <div className="text-xs text-muted-foreground tabular-nums">≈ {hourly}</div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Meta Tags */}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {ad.locations?.map((loc: string) => (
                                <span key={loc} className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs">
                                    <MapPin size={14} aria-hidden /> {loc}
                                </span>
                            ))}
                            <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs" title={durationMeta}>
                                <Clock size={14} /> {durationMeta}
                            </span>
                            {ad.session_format && ad.session_format !== 'any' && (
                                <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs" title={ad.session_format === 'group' ? 'Kleingruppe (2–4 Schüler)' : 'Einzelunterricht'}>
                                    {ad.session_format === 'group' ? <Users size={14} /> : <User size={14} />}
                                    {ad.session_format === 'group' ? 'Kleingruppe' : 'Einzelunterricht'}
                                </span>
                            )}
                            {ad.session_format === 'any' && (
                                <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs" title="Einzel oder Kleingruppe – nach Absprache">
                                    <Shuffle size={14} /> Egal
                                </span>
                            )}
                            {(ad.view_count ?? 0) > 0 && (
                                <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs" title="So oft wurde diese Anzeige aufgerufen">
                                    <Eye size={14} /> {ad.view_count} {ad.view_count === 1 ? 'Aufruf' : 'Aufrufe'}
                                </span>
                            )}
                        </div>

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

                {/* Interaction / Profile Card */}
                <Card className="border-border bg-card">
                    <CardContent className="p-5 sm:p-6">
                        <Button variant="unstyled" size="unstyled"
                            type="button"
                            onClick={() => navigate(`/profile/${profile?.id}`)}
                            className="mb-6 flex w-full items-center gap-4 rounded-xl p-2 text-left transition-colors hover:bg-muted"
                        >
                            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-2xl font-semibold text-foreground">
                                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile?.display_name?.charAt(0) || '?')}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-lg font-semibold text-foreground">{profile?.display_name || 'Unbekannt'}</div>
                                <div className="text-sm text-muted-foreground">Klasse {profile?.grade_level || '?'}</div>
                            </div>
                        </Button>

                        {isOwn ? (
                            <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">
                                Das ist deine eigene Anzeige.
                            </div>
                        ) : (
                            <div>
                                {status === 'none' && (
                                    <div className="space-y-2">
                                        <Button
                                            onClick={sendRequest}
                                            disabled={sending}
                                            className="hidden h-14 w-full text-base font-semibold md:inline-flex"
                                        >
                                            <Send size={20} className="mr-2" /> Anfrage senden
                                            <span className="ml-2 font-semibold tabular-nums opacity-80">· {price}</span>
                                        </Button>
                                        <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                            Unverbindlich · Kontakte erst nach Annahme der Anfrage sichtbar
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
                                        <div className="flex gap-2.5 rounded-xl border border-border bg-muted/50 p-3.5 text-xs leading-relaxed text-muted-foreground">
                                            <ShieldAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                                            <p>
                                                <strong>Sicherheit geht vor:</strong> Trefft euch möglichst in der Schule,
                                                informiert eure Eltern und teilt nur Kontakte, die ihr freigegeben habt.
                                                Bei Problemen melde die Anzeige über den Button unten oder sprich das SV-Team an.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                            {profile?.phone_number && profile?.settings?.phone_visible && (
                                                <a href={`tel:${profile.phone_number}`} className="flex items-center justify-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
                                                    <Phone size={20} /> {profile.phone_number}
                                                </a>
                                            )}
                                            {profile?.email && profile?.settings?.email_visible && (
                                                <a href={`mailto:${profile.email}`} className="flex items-center justify-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
                                                    <Mail size={20} /> {profile.email}
                                                </a>
                                            )}
                                            {(!profile?.settings?.phone_visible && !profile?.settings?.email_visible && publicCustomContacts(profile?.settings?.custom_contacts).length === 0) && (
                                                <div className="p-4 bg-muted/60 text-muted-foreground rounded-xl border border-border col-span-2 text-center text-xs">
                                                    Dieser Nutzer hat seine Kontaktdaten auf privat gestellt. Bitte kontaktiere ihn direkt über den Moodle-Namen ({profile?.moodle_name || 'Kein Moodle Name angegeben'}) oder im Chat.
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
                                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                                        <CheckCircle size={12} /> {score} gemeinsame Zeitslot{score !== 1 ? 's' : ''}
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                                        Keine Übereinstimmung
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
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
                            <div className="text-sm font-semibold text-foreground truncate tabular-nums">{price}</div>
                            <div className="text-xs text-muted-foreground truncate">Unverbindlich · Kontakt nach Annahme</div>
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
