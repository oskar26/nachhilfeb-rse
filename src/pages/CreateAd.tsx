import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { SubjectChip, SUBJECT_CATEGORIES, subjectLabelMap, type Subject } from '../components/SubjectChip';
import { GradeSelector } from '../components/GradeSelector';
import { RichTextEditor } from '../components/RichTextEditor';
import { ChevronLeft, ChevronRight, CheckCircle, Plus, X, Link as LinkIcon, AlertCircle, Lock, GraduationCap, Search, Users, User, Shuffle, School, Wifi, Home, MapPin, Calculator, Info, Loader2 } from 'lucide-react';
import { cn, formatAdPrice } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { sanitizeHtml } from '../lib/sanitize';
import { triggerHaptic } from '../lib/haptics';

const STEPS = [
    'Typ & Titel',
    'Fächer & Stufen',
    'Ort & Zeit',
    'Preis',
    'Details & Bilder',
    'Vorschau'
];

type PriceMode = 'free' | 'fixed' | 'vb';
type SessionFormat = 'single' | 'group' | 'any';
const SESSION_FORMATS: { value: SessionFormat; title: string; hint: string }[] = [
    { value: 'single', title: 'Einzelunterricht', hint: 'Nur du + Tutor' },
    { value: 'group', title: 'Kleingruppe', hint: '2–4 Schüler' },
    { value: 'any', title: 'Egal', hint: 'Beides möglich' },
];
type LocationPreset = 'Bibliothek' | 'Schule' | 'Mensa' | 'SV-Raum' | 'Glaskasten' | 'Oberes Foyer' | 'Vor der Aula' | 'Unteres Foyer' | 'Schulhof' | 'Aula' | 'Pausenhalle' | 'Selbstlernzentrum' | 'Lernbüro' | 'Schulgarten' | 'Stadtbibliothek' | 'Café' | 'Online' | 'Bei dir' | 'Bei mir';
// Orte sind inhaltlich unverändert (Backend-kompatibel), nur gruppiert dargestellt.
const LOCATION_GROUPS: { title: string; locations: LocationPreset[] }[] = [
    { title: 'In der Schule', locations: ['Bibliothek', 'Mensa', 'SV-Raum', 'Glaskasten', 'Oberes Foyer', 'Unteres Foyer', 'Vor der Aula', 'Aula', 'Pausenhalle', 'Selbstlernzentrum', 'Lernbüro', 'Schulhof', 'Schulgarten', 'Schule'] },
    { title: 'Außerhalb (öffentlich)', locations: ['Stadtbibliothek', 'Café'] },
    { title: 'Online', locations: ['Online'] },
    { title: 'Bei dir oder bei mir', locations: ['Bei dir', 'Bei mir'] },
];

const DURATION_PRESETS = [30, 45, 60, 90];
const DURATION_EGAL = 0; // 0 = „Egal / nach Absprache“ (wird so im Feed angezeigt)

const DRAFT_KEY = 'fwg_draft_ad';
const INITIAL_FORM = {
    type: 'offer' as 'offer' | 'search',
    title: '',
    session_format: 'any' as SessionFormat,
    subjects: [] as Subject[],
    grade_levels: [] as string[],
    locations: [] as string[],
    custom_location: '',
    duration_minutes: [DURATION_EGAL] as number[],
    custom_duration: '',
    price_mode: 'fixed' as PriceMode,
    price_value: '' as string | number,
    price_unit: '45min',
    short_description: '',
    long_description: '',
    image_urls: [] as string[],
    new_image_url: ''
};

// Gemeinsame Abbildung für „Duplizieren“ und „Bearbeiten“: eine Quelle für die
// Formularfelder, damit beide Einstiege dieselben Daten sehen.
interface EditableAd {
    id?: string;
    type?: string | null;
    title?: string | null;
    short_description?: string | null;
    session_format?: string | null;
    subjects?: Subject[];
    grade_levels?: string[];
    locations?: string[];
    custom_location?: string | null;
    duration_minutes?: number[];
    price_details?: {
        mode?: PriceMode;
        value?: string | number;
        unit?: string;
    } | null;
    long_description?: string | null;
    image_urls?: string[];
    is_active?: boolean;
}

function adToFormData(source: EditableAd | null | undefined): typeof INITIAL_FORM {
    const rawShort: string = source?.short_description || '';
    const legacyGroup = rawShort.startsWith('[Kleingruppe] ');
    const cleanShort = legacyGroup ? rawShort.replace(/^\[Kleingruppe\]\s*/, '') : rawShort;
    const legacyFormat: SessionFormat = source?.session_format === 'single' || source?.session_format === 'group' || source?.session_format === 'any'
        ? source.session_format
        : (legacyGroup ? 'group' : 'any');

    return {
        type: source?.type === 'search' ? 'search' : 'offer',
        title: source?.title || source?.short_description || '',
        session_format: legacyFormat,
        subjects: Array.isArray(source?.subjects) ? source.subjects : [],
        grade_levels: Array.isArray(source?.grade_levels) ? source.grade_levels : [],
        locations: Array.isArray(source?.locations) ? source.locations : [],
        custom_location: typeof source?.custom_location === 'string' ? source.custom_location : '',
        duration_minutes: Array.isArray(source?.duration_minutes) && source.duration_minutes.length > 0
            ? source.duration_minutes
            : [DURATION_EGAL],
        custom_duration: '',
        price_mode: (source?.price_details?.mode || 'fixed') as PriceMode,
        price_value: source?.price_details?.value ?? '',
        price_unit: source?.price_details?.unit || '45min',
        short_description: cleanShort,
        long_description: source?.long_description || '',
        image_urls: Array.isArray(source?.image_urls) ? source.image_urls : [],
        new_image_url: ''
    };
}

export default function CreateAd() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const editAd = location.state?.editAd ?? null;
    const editingId: string | null = editAd?.id ?? null;
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Form Data
    const [formData, setFormData] = useState({ ...INITIAL_FORM });
    const [subjectQuery, setSubjectQuery] = useState('');
    const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
    const [draftRestored, setDraftRestored] = useState(false);

    const getEffectiveHourlyRate = () => {
        if (formData.price_mode !== 'fixed' || !formData.price_value) {
            return null;
        }
        const val = Number(formData.price_value);
        if (isNaN(val) || val <= 0) return null;
        const minutes = formData.price_unit === '45min' ? 45 : formData.price_unit === '60min' ? 60 : formData.price_unit === '90min' ? 90 : 60;
        const hourly = (val / minutes) * 60;
        return {
            hourly,
            minutes,
            formatted: hourly.toFixed(2)
        };
    };
    const effectiveHourly = getEffectiveHourlyRate();

    useEffect(() => {
        const template = location.state?.editAd || location.state?.duplicateAd;
        if (!template) return;
        setFormData(adToFormData(template));
        if (location.state?.duplicateAd && !location.state?.editAd) {
            toast.success("Daten aus Vorlage/Duplikat übernommen!");
        }
    }, [location.state]);

    async function checkVerification() {
        const { data } = await api.profiles.get(user?.id);
        if (data) {
            setProfile(data);
            setIsVerified(!!data.is_verified);
        }
        setLoadingProfile(false);
    }

    useEffect(() => {
        if (user) {
            checkVerification();
        }
    }, [user]);

    // Effect: Auto-set grade if type is search
    useEffect(() => {
        if (formData.type === 'search' && profile?.grade_level) {
            setFormData(prev => ({ ...prev, grade_levels: [profile.grade_level] }));
        }
    }, [formData.type, profile]);


    // Validation
    const isStepValid = () => {
        switch (currentStep) {
            case 0: return formData.title.trim().length > 3;
            case 1: return formData.subjects.length > 0 && formData.grade_levels.length > 0;
            case 2: return (formData.locations.length > 0 || formData.custom_location.trim().length > 0) && (formData.duration_minutes.length > 0 || formData.custom_duration.trim().length > 0);
            case 3:
                if (formData.price_mode === 'free' || formData.price_mode === 'vb') return true;
                return Number(formData.price_value) > 0; // fixed needs value
            case 4: return formData.short_description.trim().length > 10;
            default: return true;
        }
    };

    // Konkreter Hinweis pro Schritt: sagt, was fehlt und wie es weitergeht.
    const getStepHint = (step: number = currentStep): string | null => {
        switch (step) {
            case 0:
                return formData.title.trim().length > 3
                    ? null
                    : 'Gib einen Titel mit mindestens 4 Zeichen ein – z. B. „Mathe-Hilfe für Klasse 6“.';
            case 1:
                if (formData.subjects.length === 0) return 'Wähle mindestens 1 Fach – nutze die Suche, wenn du es nicht findest.';
                if (formData.grade_levels.length === 0) return 'Wähle mindestens 1 Klassenstufe, für die die Anzeige gilt.';
                return null;
            case 2: {
                const hasPlace = formData.locations.length > 0 || formData.custom_location.trim().length > 0;
                const hasDuration = formData.duration_minutes.length > 0 || formData.custom_duration.trim().length > 0;
                if (!hasPlace) return 'Wähle mindestens 1 Ort oder trage einen eigenen Ort ein.';
                if (!hasDuration) return 'Wähle eine Dauer oder „Egal / nach Absprache“, wenn ihr das im Chat klärt.';
                return null;
            }
            case 3:
                if (formData.price_mode === 'fixed' && !(Number(formData.price_value) > 0))
                    return 'Gib einen Preis über 0 € ein – oder wähle „Verhandlungsbasis“ bzw. „Kostenlos“.';
                return null;
            case 4:
                return formData.short_description.trim().length > 10
                    ? null
                    : 'Schreibe eine Kurzbeschreibung mit mindestens 11 Zeichen (max. 100). So erscheinen deine ersten Worte in der Übersicht.';
            default:
                return null;
        }
    };
    const stepHint = getStepHint();

    // Entwurf aus localStorage wiederherstellen (einmalig; Duplikat-/Bearbeiten-Vorlage hat Vorrang).
    useEffect(() => {
        if (location.state?.duplicateAd || location.state?.editAd) {
            setDraftRestored(true);
            return;
        }
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && parsed.formData) {
                    setFormData(prev => ({ ...prev, ...parsed.formData, duration_minutes: parsed.formData.duration_minutes?.length ? parsed.formData.duration_minutes : [DURATION_EGAL] }));
                    if (typeof parsed.currentStep === 'number' && parsed.currentStep >= 0 && parsed.currentStep < STEPS.length) {
                        setCurrentStep(parsed.currentStep);
                    }
                    if (typeof parsed.savedAt === 'string') setDraftSavedAt(parsed.savedAt);
                    toast.success('Entwurf wiederhergestellt – du machst weiter, wo du aufgehört hast.');
                }
            }
        } catch {
            // Kaputter Entwurf blockiert nie den Start.
        } finally {
            setDraftRestored(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Entwurf automatisch speichern (fwg_draft_ad). Beim Bearbeiten nicht:
    // sonst überschreibt die Änderung den vorhandenen Neu-Anzeige-Entwurf.
    useEffect(() => {
        if (!draftRestored || editingId) return;
        try {
            const savedAt = new Date().toISOString();
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, currentStep, savedAt }));
            setDraftSavedAt(savedAt);
        } catch {
            // Voller/blockierter Storage darf den Flow nie stoppen.
        }
    }, [formData, currentStep, draftRestored, editingId]);

    const discardDraft = () => {
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch { /* ignore */ }
        setFormData({ ...INITIAL_FORM });
        setCurrentStep(0);
        setSubjectQuery('');
        setDraftSavedAt(null);
        toast.success('Entwurf verworfen – du startest mit einem leeren Formular.');
    };

    const handleNext = () => {
        const hint = getStepHint();
        if (hint) {
            triggerHaptic('error');
            toast.error(hint);
            return;
        }
        triggerHaptic('selection');
        if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        triggerHaptic('selection');
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const jumpToStep = (index: number) => {
        if (index < currentStep || isStepValid()) {
            if ('vibrate' in navigator) navigator.vibrate([15]);
            setCurrentStep(index);
        }
    };

    const handleSubmit = async () => {
        if (!user || !isVerified) return;
        setIsSubmitting(true);

        // Prepare Price JSON
        const priceDetails = {
            mode: formData.price_mode,
            value: formData.price_mode === 'free' ? 0 : Number(formData.price_value),
            unit: formData.price_unit
        };

        // Combine custom duration if any
        const finalDurations = [...formData.duration_minutes];
        if (formData.custom_duration) {
            const custom = parseInt(formData.custom_duration);
            if (!isNaN(custom)) finalDurations.push(custom);
        }

        // Combine locations
        const finalLocations = [...formData.locations];
        if (formData.custom_location) {
            finalLocations.push(formData.custom_location);
        }

        // Legacy-Säuberung: Ein evtl. noch vorhandener [Kleingruppe]-Prefix gehört ins
        // session_format-Feld und nicht in den sichtbaren Text.
        const cleanShortDescription = formData.short_description.replace(/^\[Kleingruppe\]\s*/, '');

        const payload = {
            type: formData.type,
            session_format: formData.session_format,
            subjects: formData.subjects,
            grade_levels: formData.grade_levels,
            locations: finalLocations,
            price_details: priceDetails,
            duration_minutes: finalDurations,
            short_description: cleanShortDescription,
            long_description: formData.long_description,
            image_urls: formData.image_urls,
        };

        const { error } = editingId
            ? await api.ads.update(editingId, {
                ...payload,
                // Pausierte Anzeigen bleiben beim Bearbeiten pausiert.
                is_active: editAd?.is_active ?? true,
            })
            : await api.ads.create({
                ...payload,
                user_id: user.id,
                is_active: true,
                boosted: false,
                boosted_until: null,
                promo_code_used: null,
            });

        setIsSubmitting(false);

        if (error) {
            console.error(error);
            toast.error(editingId
                ? "Fehler beim Aktualisieren der Anzeige: " + error.message
                : "Fehler beim Erstellen der Anzeige: " + error.message);
        } else if (editingId) {
            toast.success("Anzeige erfolgreich aktualisiert!");
            navigate(`/ad/${editingId}`);
        } else {
            try {
                localStorage.removeItem(DRAFT_KEY);
            } catch { /* ignore */ }
            setDraftSavedAt(null);
            toast.success("Anzeige erfolgreich erstellt!");
            navigate('/');
        }
    };

    // Helper Toggles
    const toggleSubject = (s: Subject) => {
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.includes(s)
                ? prev.subjects.filter(sub => sub !== s)
                : [...prev.subjects, s]
        }));
    };

    const toggleLocation = (loc: string) => {
        setFormData(prev => ({
            ...prev,
            locations: prev.locations.includes(loc)
                ? prev.locations.filter(l => l !== loc)
                : [...prev.locations, loc]
        }));
    };

    const toggleDuration = (min: number) => {
        setFormData(prev => {
            // „Egal“ ist exklusiv: steht für „Dauer klären wir im Chat“ statt einer festen Minutenzahl.
            if (min === DURATION_EGAL) {
                const hasEgal = prev.duration_minutes.includes(DURATION_EGAL);
                return { ...prev, duration_minutes: hasEgal ? [] : [DURATION_EGAL], custom_duration: '' };
            }
            const withoutEgal = prev.duration_minutes.filter(m => m !== DURATION_EGAL);
            return {
                ...prev,
                duration_minutes: withoutEgal.includes(min)
                    ? withoutEgal.filter(m => m !== min)
                    : [...withoutEgal, min]
            };
        });
    };

    const addImageUrl = () => {
        if (formData.new_image_url && formData.new_image_url.startsWith('http')) {
            setFormData(prev => ({
                ...prev,
                image_urls: [...prev.image_urls, prev.new_image_url],
                new_image_url: ''
            }));
        }
    };

    const filteredSubjectGroups = useMemo(() => {
        const q = subjectQuery.trim().toLowerCase();
        if (!q) return SUBJECT_CATEGORIES;
        return SUBJECT_CATEGORIES.map(category => ({
            ...category,
            subjects: category.subjects.filter(s =>
                s.toLowerCase().includes(q) || (subjectLabelMap[s] ?? '').toLowerCase().includes(q)
            )
        })).filter(category => category.subjects.length > 0);
    }, [subjectQuery]);

    const subjectMatchCount = useMemo(
        () => filteredSubjectGroups.reduce((n, g) => n + g.subjects.length, 0),
        [filteredSubjectGroups]
    );

    if (loadingProfile) return (
        <div className="flex flex-col items-center justify-center gap-3 p-20" role="status">
            <Loader2 className="animate-spin text-muted-foreground" size={32} aria-hidden />
            <p className="text-xs font-semibold text-muted-foreground">Profil wird geladen…</p>
        </div>
    );

    if (!isVerified) {
        return (
            <div className="mx-auto mt-10 max-w-lg p-4">
                <Card className="border-destructive/25 bg-destructive/5">
                    <CardContent className="space-y-4 p-6 text-center">
                        <div className="mx-auto grid size-14 place-items-center rounded-lg bg-destructive/10 text-destructive">
                            <Lock size={24} aria-hidden />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">Verifizierung notwendig</h2>
                        <p className="text-sm text-muted-foreground">
                            Du musst dich im SV-Raum verifizieren lassen, um Anzeigen erstellen zu können.
                        </p>
                        <Button onClick={() => navigate('/profile')} variant="outline" className="w-full">Zum Profil</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="mx-auto box-border w-full max-w-app min-w-0 space-y-6 overflow-x-clip p-4 pb-32 sm:p-6 sm:pb-36">
            <div className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <h1 className="min-w-0 text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
                        {editingId ? 'Anzeige bearbeiten' : 'Anzeige erstellen'}
                    </h1>
                    {!editingId && (
                        <Button variant="unstyled" size="unstyled"
                            type="button"
                            onClick={discardDraft}
                            className="mt-0.5 min-h-11 shrink-0 text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-destructive"
                        >
                            Entwurf verwerfen
                        </Button>
                    )}
                </div>
                <p className="text-[15px] leading-relaxed text-muted-foreground" aria-live="polite">
                    {editingId ? (
                        'Deine Änderungen werden direkt an der Anzeige gespeichert. Ein vorhandener Entwurf für eine neue Anzeige bleibt unberührt.'
                    ) : (
                        <>
                            Entwurf wird automatisch auf diesem Gerät gespeichert
                            {draftSavedAt ? ` · Stand ${new Date(draftSavedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                            . Er verschwindet nach dem Veröffentlichen.
                        </>
                    )}
                </p>
            </div>

            {/* Stepper */}
            <div className="rounded-card bg-card p-4 shadow-soft sm:p-6">
                <div className="flex items-start">
                    {STEPS.map((step, index) => {
                        const isCurrent = index === currentStep;
                        const isCompleted = index < currentStep;
                        return (
                            <div key={index} className="relative flex min-w-0 flex-1 flex-col items-center">
                                {index > 0 && (
                                    <span
                                        aria-hidden
                                        className="absolute top-5 right-[calc(50%+1.5rem)] h-0.5 w-[calc(100%-3rem)] rounded-full bg-border sm:right-[calc(50%+1.75rem)] sm:w-[calc(100%-3.5rem)]"
                                    />
                                )}
                                <Button variant="unstyled" size="unstyled"
                                    type="button"
                                    onClick={() => jumpToStep(index)}
                                    disabled={index > currentStep && !isStepValid()}
                                    className={cn(
                                        "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.98] sm:size-11",
                                        isCurrent
                                            ? "bg-primary text-primary-foreground shadow-soft"
                                            : isCompleted
                                                ? "bg-pastel-mint text-pastel-mint-foreground"
                                                : "cursor-not-allowed bg-muted text-muted-foreground"
                                    )}
                                    title={step}
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    {isCompleted ? <CheckCircle size={16} aria-hidden /> : index + 1}
                                </Button>
                                <span className={cn("mt-2 max-w-full px-0.5 text-center text-[11px] leading-tight transition-colors sm:text-xs", isCurrent ? "font-bold text-foreground" : "text-muted-foreground")}>
                                    {step}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Card className="w-full min-w-0 overflow-hidden border-0 bg-card shadow-soft">
                <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
                    <CardTitle className="text-lg font-extrabold sm:text-xl">{STEPS[currentStep]}</CardTitle>
                </CardHeader>
                <CardContent className="min-h-[280px] space-y-6 p-4 pt-4 sm:p-6 sm:pt-4">

                    {/* Step 0: Type & Title */}
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Button variant="unstyled" size="unstyled"
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'offer' })}
                                            className={cn(
                                                "flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-center font-semibold transition-colors",
                                                formData.type === 'offer' ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                                            )}
                                        >
                                            <GraduationCap size={18} className="shrink-0" />
                                            <span>Ich biete Nachhilfe</span>
                                            {formData.type === 'offer' && <CheckCircle size={16} className="shrink-0" aria-hidden />}
                                        </Button>
                                        <Button variant="unstyled" size="unstyled"
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'search' })}
                                            className={cn(
                                                "flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-center font-semibold transition-colors",
                                                formData.type === 'search' ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                                            )}
                                        >
                                            <Search size={18} className="shrink-0" />
                                            <span>Ich suche Nachhilfe</span>
                                            {formData.type === 'search' && <CheckCircle size={16} className="shrink-0" aria-hidden />}
                                        </Button>
                                    </div>

                                    {formData.type === 'search' && (
                                        <div className="border border-border bg-muted rounded-2xl p-4 flex gap-3 text-foreground/80">
                                            <Lock size={18} className="shrink-0 mt-0.5 text-muted-foreground" />
                                            <div className="text-xs leading-relaxed space-y-1">
                                                <p className="font-semibold text-sm">Dein Gesuch ist privat.</p>
                                                <p>Es erscheint nicht öffentlich in der Übersicht, sondern nur bei passenden Anbietern und bei Nutzern, die diese Fächer laut Profil anbieten. Das SV-Team sieht es zur Moderation.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Unterrichts-Format: Einzel / Kleingruppe / Egal */}
                                    <div>
                                        <span className="text-sm font-medium block">Unterrichts-Format</span>
                                        <span className="text-xs text-muted-foreground block mb-2">Einzelunterricht, Kleingruppe (2 bis 4 Schüler) oder nach Absprache?</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {SESSION_FORMATS.map(f => {
                                                const Icon = f.value === 'single' ? User : f.value === 'group' ? Users : Shuffle;
                                                const active = formData.session_format === f.value;
                                                return (
                                                    <Button variant="unstyled" size="unstyled"
                                                        key={f.value}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, session_format: f.value })}
                                                        aria-pressed={active}
                                                        className={cn(
                                                            "relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-center font-semibold transition-colors",
                                                            active ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                                                        )}
                                                    >
                                                        {active && <CheckCircle size={14} className="absolute right-2 top-2" aria-hidden />}
                                                        <Icon size={18} className="shrink-0" />
                                                        <span className="text-xs sm:text-sm">{f.title}</span>
                                                        <span className="text-xs font-normal opacity-80">{f.hint}</span>
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-baseline justify-between gap-3 mb-2">
                                            <Label htmlFor="ad-title" className="text-sm font-medium">Titel der Anzeige</Label>
                                            <span className="text-xs text-muted-foreground shrink-0">Mind. 4 Zeichen</span>
                                        </div>
                                        <Input
                                            id="ad-title"
                                            placeholder="z. B. Mathe-Hilfe für Klasse 6 gesucht!"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="text-base sm:text-lg"
                                            maxLength={80}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1.5">So erscheint deine Anzeige in der Übersicht. Fach und Klasse im Titel helfen beim Finden.</p>
                                    </div>
                            </>
                        </div>
                    )}

                    {/* Step 1: Subjects & Grades */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-baseline justify-between gap-3 mb-2">
                                    <Label htmlFor="subject-search" className="text-sm font-medium">Welche Fächer?</Label>
                                    <span className="text-xs text-muted-foreground shrink-0" aria-live="polite">
                                        {formData.subjects.length > 0
                                            ? `${formData.subjects.length} gewählt`
                                            : subjectQuery.trim()
                                                ? `${subjectMatchCount} von 25 Fächern`
                                                : '25 Fächer in 4 Gruppen'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">Wähle mindestens ein Fach. Tippe zum Filtern, statt lange zu scrollen.</p>
                                <div className="relative mb-4">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="subject-search"
                                        placeholder="Fach suchen – z. B. Mathe …"
                                        value={subjectQuery}
                                        onChange={e => setSubjectQuery(e.target.value)}
                                        className="pl-10"
                                        autoComplete="off"
                                    />
                                    {subjectQuery && (
                                        <Button variant="unstyled" size="unstyled"
                                            type="button"
                                            onClick={() => setSubjectQuery('')}
                                            className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                            aria-label="Fächersuche löschen"
                                        >
                                            <X size={15} />
                                        </Button>
                                    )}
                                </div>
                                {subjectMatchCount === 0 ? (
                                    <div className="p-4 rounded-xl border border-border text-sm text-muted-foreground text-center space-y-2">
                                        <p>Kein Fach gefunden für „{subjectQuery.trim()}“.</p>
                                        <Button variant="unstyled" size="unstyled"
                                            type="button"
                                            onClick={() => setSubjectQuery('')}
                                            className="text-xs font-semibold underline underline-offset-4 hover:text-foreground"
                                        >
                                            Suche zurücksetzen
                                        </Button>
                                    </div>
                                ) : (
                                <div className="space-y-4">
                                    {filteredSubjectGroups.map(category => (
                                        <div key={category.title} className="rounded-xl bg-muted/40 p-4">
                                            <h4 className="mb-3 text-xs font-semibold text-muted-foreground">{category.title}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {category.subjects.map(s => (
                                                    <SubjectChip
                                                        key={s}
                                                        subject={s}
                                                        selected={formData.subjects.includes(s)}
                                                        onClick={() => toggleSubject(s)}
                                                        className="cursor-pointer"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}
                                {formData.subjects.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-3">
                                        Ausgewählt: {formData.subjects.map(s => subjectLabelMap[s] ?? s).join(' • ')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label className="text-sm font-medium mb-3 block">Für welche Klassenstufen? (Mehrfachauswahl)</Label>
                                {formData.type === 'search' ? (
                                    <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                                        Automatisch ausgewählt: Klasse {profile.grade_level} (Dein Jahrgang)
                                    </div>
                                ) : (
                                    <GradeSelector
                                        selectedGrades={formData.grade_levels}
                                        onChange={(grades) => setFormData({ ...formData, grade_levels: grades })}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Location & Duration */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-baseline justify-between gap-3 mb-1">
                                    <Label className="text-sm font-medium">Wo findet die Nachhilfe statt?</Label>
                                    {(formData.locations.length > 0 || formData.custom_location.trim()) && (
                                        <Button variant="unstyled" size="unstyled"
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, locations: [], custom_location: '' }))}
                                            className="min-h-11 shrink-0 text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-destructive"
                                        >
                                            Auswahl löschen
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">Wähle alle Orte, die für dich passen. Mehrfachauswahl ist möglich.</p>
                                <div className="space-y-4">
                                    {LOCATION_GROUPS.map(group => {
                                        const GroupIcon = group.title === 'In der Schule' ? School : group.title === 'Online' ? Wifi : group.title === 'Außerhalb (öffentlich)' ? MapPin : Home;
                                        const selectedInGroup = group.locations.filter(l => formData.locations.includes(l)).length;
                                        return (
                                            <div key={group.title}>
                                                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                                    <GroupIcon size={13} /> {group.title}
                                                    <span className="font-medium normal-case tracking-normal opacity-70">
                                                        · {group.locations.length} Orte{selectedInGroup > 0 ? `, ${selectedInGroup} gewählt` : ''}
                                                    </span>
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.locations.map(loc => {
                                                        const active = formData.locations.includes(loc);
                                                        return (
                                                            <Button variant="unstyled" size="unstyled"
                                                                key={loc}
                                                                type="button"
                                                                onClick={() => toggleLocation(loc)}
                                                                aria-pressed={active}
                                                                className={cn(
                                                                    "px-3.5 min-h-[44px] py-2 rounded-lg text-sm border transition-colors font-medium",
                                                                    active
                                                                        ? "border-2 border-primary bg-primary-soft text-primary-soft-foreground"
                                                                        : "border-border bg-card text-foreground/80 hover:bg-muted"
                                                                )}
                                                            >
                                                                {loc}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 space-y-1.5">
                                    <Label htmlFor="custom-location" className="text-xs font-semibold text-muted-foreground">Eigener Ort (optional)</Label>
                                    <div className="flex gap-2 items-center">
                                        <MapPin size={15} className="text-muted-foreground shrink-0" aria-hidden="true" />
                                        <Input
                                            id="custom-location"
                                            placeholder="z. B. Stadtbibliothek am Neumarkt …"
                                            value={formData.custom_location}
                                            onChange={e => setFormData({ ...formData, custom_location: e.target.value })}
                                            className="max-w-xs"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                {(formData.locations.length > 0 || formData.custom_location.trim()) && (
                                    <p className="text-xs text-muted-foreground mt-2" aria-live="polite">
                                        Ausgewählt ({formData.locations.length + (formData.custom_location.trim() ? 1 : 0)}): {[ ...formData.locations, ...(formData.custom_location.trim() ? [formData.custom_location.trim()] : []) ].join(' • ')}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm font-medium mb-1 block">Wie lange dauert eine Einheit?</Label>
                                <p className="text-xs text-muted-foreground mb-3">Standard ist „Egal / nach Absprache“. Ihr klärt die Dauer dann im Chat. Feste Minuten sind exklusiv dazu.</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {DURATION_PRESETS.map(dur => {
                                        const active = formData.duration_minutes.includes(dur);
                                        return (
                                            <Button variant="unstyled" size="unstyled"
                                                key={dur}
                                                type="button"
                                                onClick={() => toggleDuration(dur)}
                                                aria-pressed={active}
                                                className={cn(
                                                    "min-w-16 px-4 h-12 rounded-xl text-sm font-semibold border flex items-center justify-center transition-colors",
                                                    active
                                                        ? "border-primary bg-primary-soft text-primary-soft-foreground"
                                                        : "border-border bg-card text-foreground/80 hover:border-ring/40"
                                                )}
                                            >
                                                {dur} Min.
                                            </Button>
                                        );
                                    })}
                                    <Button variant="unstyled" size="unstyled"
                                        type="button"
                                        onClick={() => toggleDuration(DURATION_EGAL)}
                                        aria-pressed={formData.duration_minutes.includes(DURATION_EGAL)}
                                        className={cn(
                                            "px-4 h-12 rounded-xl text-sm font-semibold border flex items-center justify-center transition-colors",
                                            formData.duration_minutes.includes(DURATION_EGAL)
                                                ? "border-primary bg-primary-soft text-primary-soft-foreground"
                                                : "border-border bg-card text-foreground/80 hover:border-ring/40"
                                        )}
                                    >
                                        Egal / nach Absprache
                                    </Button>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="custom-duration" className="text-xs font-semibold text-muted-foreground">Andere Dauer in Minuten (optional, ersetzt „Egal“)</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            id="custom-duration"
                                            type="number"
                                            min={5}
                                            max={480}
                                            placeholder="z. B. 50"
                                            value={formData.custom_duration}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                custom_duration: e.target.value,
                                                duration_minutes: e.target.value.trim()
                                                    ? prev.duration_minutes.filter(m => m !== DURATION_EGAL)
                                                    : prev.duration_minutes
                                            }))}
                                            className="max-w-[170px]"
                                        />
                                        <span className="text-xs text-muted-foreground">Minuten, 5–480</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Pricing */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Button variant="unstyled" size="unstyled"
                                    type="button"
                                    onClick={() => setFormData({ ...formData, price_mode: 'fixed' })}
                                    className={cn("relative rounded-xl border-2 p-4 text-left transition-colors", formData.price_mode === 'fixed' ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border hover:border-primary/40")}
                                >
                                    <span className="block font-semibold">Festpreis</span>
                                    <span className="text-xs opacity-75">Euro pro Einheit</span>
                                    {formData.price_mode === 'fixed' && <CheckCircle size={16} className="absolute right-3 top-3" aria-hidden />}
                                </Button>
                                <Button variant="unstyled" size="unstyled"
                                    type="button"
                                    onClick={() => setFormData({ ...formData, price_mode: 'vb' })}
                                    className={cn("relative rounded-xl border-2 p-4 text-left transition-colors", formData.price_mode === 'vb' ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border hover:border-primary/40")}
                                >
                                    <span className="block font-semibold">Verhandlungsbasis (VB)</span>
                                    <span className="text-xs opacity-75">Preis wird besprochen</span>
                                    {formData.price_mode === 'vb' && <CheckCircle size={16} className="absolute right-3 top-3" aria-hidden />}
                                </Button>
                                <Button variant="unstyled" size="unstyled"
                                    type="button"
                                    onClick={() => setFormData({ ...formData, price_mode: 'free' })}
                                    className={cn("relative rounded-xl border-2 p-4 text-left transition-colors", formData.price_mode === 'free' ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border hover:border-primary/40")}
                                >
                                    <span className="block font-semibold">Kostenlos</span>
                                    <span className="text-xs opacity-75">Ehrenamtlich helfen</span>
                                    {formData.price_mode === 'free' && <CheckCircle size={16} className="absolute right-3 top-3" aria-hidden />}
                                </Button>
                            </div>

                            {formData.price_mode === 'fixed' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex gap-4 items-center">
                                        <div className="relative w-32">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={formData.price_value}
                                                onChange={e => setFormData({ ...formData, price_value: e.target.value })}
                                                className="pl-8"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                                        </div>
                                        <span className="text-muted-foreground">pro</span>
                                        <NativeSelect
                                            className="w-full sm:w-auto"
                                            value={formData.price_unit}
                                            onChange={e => setFormData({ ...formData, price_unit: e.target.value })}
                                        >
                                            <option value="45min">45 min (Schulstunde)</option>
                                            <option value="60min">60 min (Stunde)</option>
                                            <option value="90min">90 min</option>
                                        </NativeSelect>
                                    </div>
                                    {/* Quick Select */}
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <span className="text-xs text-muted-foreground font-medium">Schnellwahl:</span>
                                        {[6, 8, 10, 12, 15].map(p => (
                                            <Button variant="unstyled" size="unstyled"
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, price_value: p }))}
                                                className={cn(
                                                    "min-h-11 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors",
                                                    Number(formData.price_value) === p
                                                        ? "border-primary bg-primary-soft text-primary-soft-foreground"
                                                        : "bg-muted text-foreground/80 border-transparent hover:border-ring/40"
                                                )}
                                            >
                                                {p}€
                                            </Button>
                                        ))}
                                    </div>

                                    {/* Effective Hourly Rate & FWG Benchmark Advice */}
                                    {effectiveHourly && (
                                        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3 mt-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                    <Calculator size={15} className="text-muted-foreground" />
                                                    <span>Effektiver Stundenlohn (60 Min.):</span>
                                                </div>
                                                <span className="font-semibold tabular-nums text-sm text-foreground">
                                                    {effectiveHourly.formatted} € / 60 Min.
                                                </span>
                                            </div>

                                            {effectiveHourly.hourly >= 9 && effectiveHourly.hourly <= 14 && (
                                                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-2.5 text-xs font-semibold text-foreground/80">
                                                    <CheckCircle size={15} className="shrink-0 text-muted-foreground" aria-hidden />
                                                    <span>Richtwert am FWG: ca. 12 € pro Stunde. Der Preis ist individuell anpassbar.</span>
                                                </div>
                                            )}

                                            {effectiveHourly.hourly < 9 && (
                                                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs font-semibold text-muted-foreground">
                                                    <Info size={15} className="shrink-0 text-muted-foreground" aria-hidden />
                                                    <span>Unter dem Richtwert von ca. 12 € pro Stunde.</span>
                                                </div>
                                            )}

                                            {effectiveHourly.hourly > 14 && effectiveHourly.hourly <= 18 && (
                                                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs font-semibold text-foreground/80">
                                                    <Info size={15} className="shrink-0 text-muted-foreground" aria-hidden />
                                                    <span>Etwas über dem FWG-Richtwert von ca. 12 € pro Stunde.</span>
                                                </div>
                                            )}

                                            {effectiveHourly.hourly > 18 && (
                                                <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-2.5 text-xs font-semibold text-destructive">
                                                    <AlertCircle size={15} className="shrink-0" aria-hidden />
                                                    <span>Deutlich über dem FWG-Richtwert. Bitte prüfe, ob der Preis so gemeint ist.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.price_mode === 'free' && (
                                <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted p-4 text-xs font-medium text-foreground/80 animate-in fade-in">
                                    <CheckCircle size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                                    <span>Du bietest die Nachhilfe kostenlos an.</span>
                                </div>
                            )}

                            {formData.price_mode === 'vb' && (
                                <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted p-4 text-xs font-medium text-foreground/80 animate-in fade-in">
                                    <Info size={16} className="text-muted-foreground shrink-0" />
                                    <span>Richtwert am FWG: ca. 12 € pro Stunde. Der Preis ist individuell anpassbar.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Details */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-baseline justify-between gap-3 mb-2">
                                    <Label htmlFor="short-description" className="text-sm font-medium">Kurzbeschreibung (für die Übersicht)</Label>
                                    <span className="text-xs text-muted-foreground shrink-0">11–100 Zeichen</span>
                                </div>
                                <Input
                                    id="short-description"
                                    maxLength={100}
                                    placeholder="Ein Satz, der dein Angebot zusammenfasst."
                                    value={formData.short_description}
                                    onChange={e => setFormData({ ...formData, short_description: e.target.value })}
                                />
                                <span className="text-xs text-muted-foreground float-right mt-1">{formData.short_description.trim().length}/100 · mind. 11</span>
                            </div>

                            <div className="clear-both pt-4">
                                <Label className="text-sm font-medium mb-2 block">Ausführliche Beschreibung</Label>
                                <RichTextEditor
                                    value={formData.long_description}
                                    onChange={(html) => setFormData({ ...formData, long_description: html })}
                                    placeholder="Beschreibe dein Angebot genau..."
                                    className="min-h-[200px]"
                                />
                            </div>

                            <div className="pt-4">
                                <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                                    <LinkIcon size={16} /> Bild-Adressen (URLs)
                                </Label>
                                <div className="space-y-2">
                                    {formData.image_urls.map((url, idx) => (
                                        <div key={idx} className="flex items-center gap-2 rounded-xl bg-muted/50 p-2 text-sm">
                                            <img src={url} alt="" className="size-10 shrink-0 rounded-lg bg-border object-cover" />
                                            <span className="flex-1 truncate">{url}</span>
                                            <Button variant="unstyled" size="unstyled" type="button" onClick={() => setFormData(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx) }))} aria-label="Bild entfernen" className="grid size-11 shrink-0 place-items-center rounded-lg text-destructive hover:bg-destructive/10">
                                                <X size={16} aria-hidden />
                                            </Button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://example.com/image.jpg"
                                            value={formData.new_image_url}
                                            onChange={e => setFormData({ ...formData, new_image_url: e.target.value })}
                                        />
                                        <Button variant="outline" onClick={addImageUrl} disabled={!formData.new_image_url}>
                                            <Plus size={16} />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Empfehlung: Nutze kostenlose Image-Hoster (z.B. Imgur, Unsplash), da wir keine direkten Uploads hosten.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Preview */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <div className="mb-6 flex gap-3 rounded-2xl border border-border bg-muted p-4 text-sm text-foreground/80">
                                <AlertCircle className="shrink-0 text-muted-foreground" aria-hidden />
                                <div>
                                    <p className="font-semibold">{formData.type === 'search' ? 'Gesuch prüfen' : 'Anzeige prüfen'}</p>
                                    {formData.type === 'search' ? (
                                        <p>Nach dem Veröffentlichen sehen es nur passende Anbieter sowie das SV-Team zur Moderation.</p>
                                    ) : (
                                        <p>Bitte überprüfe deine Angaben. Nach dem Veröffentlichen ist die Anzeige sofort sichtbar.</p>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                                <div className="border-b border-border bg-muted/50 p-5 sm:p-6">
                                    <h2 className="mb-2 break-anywhere text-2xl font-semibold">{formData.title}</h2>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="px-3 py-1 bg-foreground text-background rounded-lg text-sm font-semibold tabular-nums">
                                            {formatAdPrice({
                                                mode: formData.price_mode,
                                                value: Number(formData.price_value) || 0,
                                                unit: formData.price_unit,
                                            })}
                                        </span>
                                        <span className="rounded-lg bg-muted px-3 py-1 text-sm font-semibold text-foreground/80">
                                            {formData.session_format === 'single' ? 'Einzelunterricht' : formData.session_format === 'group' ? 'Kleingruppe' : 'Format: Egal'}
                                        </span>
                                        {formData.subjects.map(s => <SubjectChip key={s} subject={s} />)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {[ ...formData.locations, ...(formData.custom_location ? [formData.custom_location] : []) ].join(' • ') || 'Kein Ort gewählt'}
                                        {'  ·  '}
                                        {(() => {
                                            const all = [...formData.duration_minutes, ...(formData.custom_duration ? [Number(formData.custom_duration)] : [])].filter(n => !isNaN(n));
                                            if (all.length === 0) return 'Keine Dauer gewählt';
                                            return all.map(d => d === 0 ? 'Dauer: Egal' : `${d} Min.`).join(' • ');
                                        })()}
                                    </p>
                                    <p className="text-muted-foreground mt-2">{formData.short_description}</p>
                                </div>
                                <div className="prose max-w-none p-5 dark:prose-invert sm:p-6">
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.long_description || '<p class="text-muted-foreground italic">Keine Beschreibung</p>') }} />

                                    {formData.image_urls.length > 0 && (
                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                            {formData.image_urls.map((url, i) => (
                                                <img key={i} src={url} className="rounded-lg w-full h-48 object-cover bg-muted" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                </CardContent>
                <CardFooter className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-2 rounded-b-card bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_-24px_rgba(16,24,40,0.45)] backdrop-blur-md sm:p-6 sm:pb-6 md:bottom-0">
                    {!isStepValid() && stepHint && currentStep < STEPS.length - 1 && (
                        <p className="w-full rounded-full bg-pastel-blue px-4 py-2.5 text-xs font-semibold text-pastel-blue-foreground" role="status">
                            Noch offen: {stepHint}
                        </p>
                    )}
                    <div className="flex flex-row justify-between items-center w-full gap-2">
                    <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0} className="px-3 sm:px-4">
                        <ChevronLeft size={16} className="mr-1 sm:mr-2 shrink-0" /> Zurück
                    </Button>

                    {currentStep === STEPS.length - 1 ? (
                        <Button onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting} className="px-4 font-semibold sm:px-5">
                            {isSubmitting
                                ? (editingId ? 'Änderungen werden gespeichert' : 'Anzeige wird veröffentlicht')
                                : (editingId ? 'Änderungen speichern' : 'Anzeige veröffentlichen')}
                            <CheckCircle size={16} className="ml-1 shrink-0 sm:ml-2" aria-hidden />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            title={!isStepValid() && stepHint ? stepHint : 'Weiter zum nächsten Schritt'}
                            className="px-4 sm:px-5"
                        >
                            Weiter <ChevronRight size={16} className="ml-1 sm:ml-2 shrink-0" />
                        </Button>
                    )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
