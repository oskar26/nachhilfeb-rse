import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { SubjectChip, SUBJECT_CATEGORIES, subjectLabelMap, type Subject } from '../components/SubjectChip';
import { GradeSelector } from '../components/GradeSelector';
import { RichTextEditor } from '../components/RichTextEditor';
import { ChevronLeft, ChevronRight, CheckCircle, Plus, X, Link as LinkIcon, AlertCircle, Lock, GraduationCap, Search, Users, User, Shuffle, School, Wifi, Home, MapPin, Calculator, Info } from 'lucide-react';
import { cn, formatAdPrice } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
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

export default function CreateAd() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [children, setChildren] = useState<any[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string>('');

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
        if (location.state?.duplicateAd) {
            const d = location.state.duplicateAd;
            // Legacy-Daten säubern: Der alte [Kleingruppe]-Prefix im Titel wird ins Format-Feld überführt.
            const rawShort: string = d.short_description || '';
            const legacyGroup = rawShort.startsWith('[Kleingruppe] ');
            const cleanShort = legacyGroup ? rawShort.replace(/^\[Kleingruppe\]\s*/, '') : rawShort;
            const legacyFormat = d.session_format === 'single' || d.session_format === 'group' || d.session_format === 'any'
                ? d.session_format
                : (legacyGroup ? 'group' : 'any');
            setFormData({
                type: d.type || 'offer',
                title: d.short_description || '',
                session_format: legacyFormat,
                subjects: d.subjects || [],
                grade_levels: d.grade_levels || [],
                locations: d.locations || [],
                custom_location: '',
                duration_minutes: d.duration_minutes?.length ? d.duration_minutes : [DURATION_EGAL],
                custom_duration: '',
                price_mode: d.price_details?.mode || 'fixed',
                price_value: d.price_details?.value ?? '',
                price_unit: d.price_details?.unit || '45min',
                short_description: cleanShort,
                long_description: d.long_description || '',
                image_urls: d.image_urls || [],
                new_image_url: ''
            });
            toast.success("Daten aus Vorlage/Duplikat übernommen!");
        }
    }, [location.state]);

    async function checkVerification() {
        const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
        if (data) {
            setProfile(data);
            setIsVerified(data.role === 'parent' ? true : data.is_verified);

            if (data.role === 'parent') {
                const { data: links } = await supabase
                    .from('parent_links')
                    .select('*, child:child_id(id, display_name, first_name, last_name, grade_level)')
                    .eq('parent_id', user?.id)
                    .eq('status', 'active');

                if (links && links.length > 0) {
                    const childList = links.map((l: any) => l.child).filter(c => c !== null);
                    setChildren(childList);
                    setSelectedChildId(childList[0].id);
                }
            }
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
                    : 'Schreibe einen Feed-Teaser mit mindestens 11 Zeichen (max. 100) – so erscheinen deine ersten Worte im Feed.';
            default:
                return null;
        }
    };
    const stepHint = getStepHint();

    // Entwurf aus localStorage wiederherstellen (einmalig; Duplikat-Vorlage hat Vorrang).
    useEffect(() => {
        if (location.state?.duplicateAd) {
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
                    if (typeof parsed.selectedChildId === 'string') setSelectedChildId(parsed.selectedChildId);
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

    // Entwurf automatisch speichern (fwg_draft_ad).
    useEffect(() => {
        if (!draftRestored) return;
        try {
            const savedAt = new Date().toISOString();
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, currentStep, selectedChildId, savedAt }));
            setDraftSavedAt(savedAt);
        } catch {
            // Voller/blockierter Storage darf den Flow nie stoppen.
        }
    }, [formData, currentStep, selectedChildId, draftRestored]);

    const discardDraft = () => {
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch { /* ignore */ }
        setFormData({ ...INITIAL_FORM });
        setSelectedChildId(children[0]?.id ?? '');
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

        const effectiveUserId = profile?.role === 'parent' && selectedChildId ? selectedChildId : user.id;

        const { error } = await supabase.from('ads').insert({
            user_id: effectiveUserId,
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
            is_active: true,
            boosted: false,
            boosted_until: null,
            promo_code_used: null
        });

        setIsSubmitting(false);

        if (error) {
            console.error(error);
            toast.error("Fehler beim Erstellen der Anzeige: " + error.message);
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

    if (loadingProfile) return <div className="p-10 text-center">Laden...</div>;

    if (!isVerified) {
        return (
            <div className="p-4 max-w-lg mx-auto mt-10">
                <Card className="border-red-200 bg-red-50 dark:bg-warning-bgDark dark:border-warning-bgDark shadow-soft">
                    <CardContent className="p-6 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 dark:bg-black/20 dark:text-warning-textDark">
                            <Lock size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-red-800 dark:text-warning-textDark">Verifizierung notwendig</h2>
                        <p className="text-sm text-red-700 dark:text-warning-textDark opacity-90">
                            Du musst dich im SV-Raum verifizieren lassen, um Anzeigen erstellen zu können.
                        </p>
                        <Button onClick={() => navigate('/profile')} variant="outline" className="w-full dark:border-warning-textDark/20 dark:text-warning-textDark hover:dark:bg-warning-textDark/10">Zum Profil</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-24 min-w-0 box-border overflow-x-hidden">
            <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-2xl font-bold">Anzeige aufgeben</h1>
                <button
                    type="button"
                    onClick={discardDraft}
                    className="text-xs font-semibold text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline underline-offset-4 shrink-0 mt-1.5"
                >
                    Entwurf verwerfen
                </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 sm:mb-6" aria-live="polite">
                Entwurf wird automatisch auf diesem Gerät gespeichert
                {draftSavedAt ? ` · Stand ${new Date(draftSavedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                . Er verschwindet nach dem Veröffentlichen.
            </p>

            {/* Stepper */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border dark:border-gray-800 mb-6">
                {/* Mobile Stepper (< sm) */}
                <div className="sm:hidden space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-primary font-black uppercase tracking-wider">Schritt {currentStep + 1} von {STEPS.length}</span>
                        <span className="text-gray-900 dark:text-white font-extrabold truncate ml-2">{STEPS[currentStep]}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-primary h-full transition-all duration-300 rounded-full"
                            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                        {STEPS.map((step, index) => {
                            const isCurrent = index === currentStep;
                            const isCompleted = index < currentStep;
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => jumpToStep(index)}
                                    disabled={index > currentStep && !isStepValid()}
                                    className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                                        isCurrent
                                            ? "bg-primary text-black font-black scale-110 shadow-xs ring-2 ring-primary/30"
                                            : isCompleted
                                                ? "bg-green-500 text-white cursor-pointer"
                                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed opacity-60"
                                    )}
                                    title={step}
                                >
                                    {isCompleted ? <CheckCircle size={12} /> : index + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Desktop Stepper (sm and up) */}
                <div className="hidden sm:block overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[500px] relative px-4">
                        {/* Connecting Line */}
                        <div className="absolute top-4 left-8 right-8 h-0.5 bg-gray-100 dark:bg-gray-800 z-0" />
                        
                        {STEPS.map((step, index) => {
                            const isCurrent = index === currentStep;
                            const isCompleted = index < currentStep;
                            return (
                                <div key={index} className="flex flex-col items-center z-10">
                                    <button 
                                        type="button"
                                        onClick={() => jumpToStep(index)}
                                        disabled={index > currentStep && !isStepValid()}
                                        className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white dark:ring-gray-900 transition-all",
                                            isCurrent
                                                ? "bg-primary text-black scale-110 shadow-md"
                                                : isCompleted
                                                    ? "bg-green-500 text-white cursor-pointer"
                                                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed opacity-60"
                                        )}
                                    >
                                        {isCompleted ? <CheckCircle size={14} /> : index + 1}
                                    </button>
                                    <span className={cn("text-[10px] mt-1.5 font-medium transition-colors whitespace-nowrap", isCurrent ? "text-gray-900 dark:text-white font-bold" : "text-gray-400")}>{step}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Card className="w-full min-w-0 overflow-hidden">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl">{STEPS[currentStep]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 min-h-[280px] p-4 sm:p-6">

                    {/* Step 0: Type & Title */}
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            {profile?.role === 'parent' && (
                                <div className="bg-primary/10 border border-primary/20 p-4 sm:p-5 rounded-2xl space-y-3">
                                    <h4 className="font-bold text-sm text-primary-hover">Anzeige für Ihr Kind erstellen</h4>
                                    {children.length === 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500">Sie haben noch kein Schülerkonto mit Ihrem Eltern-Account verknüpft.</p>
                                            <Button size="sm" onClick={() => navigate('/parent-dashboard')} className="rounded-xl font-bold">Kind jetzt verknüpfen</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-500 ml-1">Kind auswählen</label>
                                            <select
                                                value={selectedChildId}
                                                onChange={e => setSelectedChildId(e.target.value)}
                                                className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 font-semibold text-sm"
                                            >
                                                {children.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.display_name || `${c.first_name} ${c.last_name}`} (Klasse/Stufe {c.grade_level})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {profile?.role === 'parent' && children.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm font-semibold">
                                    Bitte verknüpfen Sie ein Kind, um fortzufahren.
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'offer' })}
                                            className={cn(
                                                "py-3.5 px-4 text-center rounded-xl border-2 transition-all font-semibold flex items-center justify-center gap-2",
                                                formData.type === 'offer' ? "border-primary bg-primary/10 text-primary-hover shadow-xs" : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700"
                                            )}
                                        >
                                            <GraduationCap size={18} className="shrink-0" />
                                            <span>Ich biete Nachhilfe</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'search' })}
                                            className={cn(
                                                "py-3.5 px-4 text-center rounded-xl border-2 transition-all font-semibold flex items-center justify-center gap-2",
                                                formData.type === 'search' ? "border-secondary bg-secondary/10 text-secondary shadow-xs" : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700"
                                            )}
                                        >
                                            <Search size={18} className="shrink-0" />
                                            <span>Ich suche Nachhilfe</span>
                                        </button>
                                    </div>
                                    
                                    {/* Unterrichts-Format: Einzel / Kleingruppe / Egal */}
                                    <div>
                                        <span className="text-sm font-medium block">Unterrichts-Format</span>
                                        <span className="text-[11px] text-gray-500 block mb-2">Einzelnachhilfe, Kleingruppe (2–4 Schüler) oder flexibel?</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {SESSION_FORMATS.map(f => {
                                                const Icon = f.value === 'single' ? User : f.value === 'group' ? Users : Shuffle;
                                                const active = formData.session_format === f.value;
                                                return (
                                                    <button
                                                        key={f.value}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, session_format: f.value })}
                                                        aria-pressed={active}
                                                        className={cn(
                                                            "py-3 px-2 text-center rounded-xl border-2 transition-all font-semibold flex flex-col items-center justify-center gap-1",
                                                            active ? "border-primary bg-primary/10 text-primary-hover shadow-xs" : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                                                        )}
                                                    >
                                                        <Icon size={18} className="shrink-0" />
                                                        <span className="text-xs sm:text-sm">{f.title}</span>
                                                        <span className="text-[10px] font-normal opacity-80">{f.hint}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-baseline justify-between gap-3 mb-2">
                                            <label htmlFor="ad-title" className="text-sm font-medium">Titel der Anzeige</label>
                                            <span className="text-[11px] text-gray-500 shrink-0">Mind. 4 Zeichen</span>
                                        </div>
                                        <Input
                                            id="ad-title"
                                            placeholder="z. B. Mathe-Hilfe für Klasse 6 gesucht!"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            autoFocus
                                            className="text-base sm:text-lg py-5 sm:py-6"
                                            maxLength={80}
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1.5">So erscheint deine Anzeige im Feed. Fach und Klasse im Titel helfen beim Finden.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 1: Subjects & Grades */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-baseline justify-between gap-3 mb-2">
                                    <label htmlFor="subject-search" className="text-sm font-medium">Welche Fächer?</label>
                                    <span className="text-[11px] text-gray-500 shrink-0" aria-live="polite">
                                        {formData.subjects.length > 0
                                            ? `${formData.subjects.length} gewählt`
                                            : subjectQuery.trim()
                                                ? `${subjectMatchCount} von 25 Fächern`
                                                : '25 Fächer in 4 Gruppen'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mb-3">Mindestens 1 Fach wählen. Tippe zum Filtern, statt lange zu scrollen.</p>
                                <div className="relative mb-4">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <Input
                                        id="subject-search"
                                        placeholder="Fach suchen – z. B. Mathe …"
                                        value={subjectQuery}
                                        onChange={e => setSubjectQuery(e.target.value)}
                                        className="pl-10"
                                        autoComplete="off"
                                    />
                                    {subjectQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSubjectQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            aria-label="Fächersuche löschen"
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>
                                {subjectMatchCount === 0 ? (
                                    <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 text-center space-y-2">
                                        <p>Kein Fach gefunden für „{subjectQuery.trim()}“.</p>
                                        <button
                                            type="button"
                                            onClick={() => setSubjectQuery('')}
                                            className="text-xs font-bold underline underline-offset-4 hover:text-gray-900 dark:hover:text-white"
                                        >
                                            Suche zurücksetzen
                                        </button>
                                    </div>
                                ) : (
                                <div className="space-y-4">
                                    {filteredSubjectGroups.map(category => (
                                        <div key={category.title} className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{category.title}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {category.subjects.map(s => (
                                                    <SubjectChip
                                                        key={s}
                                                        subject={s}
                                                        selected={formData.subjects.includes(s)}
                                                        onClick={() => toggleSubject(s)}
                                                        className="cursor-pointer hover:shadow-md"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}
                                {formData.subjects.length > 0 && (
                                    <p className="text-[11px] text-gray-500 mt-3">
                                        Ausgewählt: {formData.subjects.map(s => subjectLabelMap[s] ?? s).join(' • ')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-3 block">Für welche Klassenstufen? (Mehrfachauswahl)</label>
                                {formData.type === 'search' ? (
                                    <div className="bg-gray-100 p-3 rounded text-sm text-gray-500">
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
                                    <label className="text-sm font-medium">Wo findet die Nachhilfe statt?</label>
                                    {(formData.locations.length > 0 || formData.custom_location.trim()) && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, locations: [], custom_location: '' }))}
                                            className="text-[11px] font-bold text-gray-400 hover:text-red-600 underline underline-offset-4 shrink-0"
                                        >
                                            Auswahl löschen
                                        </button>
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-500 mb-3">Wähle alle Orte, die für dich passen. 19 Orte in 4 Gruppen, Mehrfachauswahl möglich.</p>
                                <div className="space-y-4">
                                    {LOCATION_GROUPS.map(group => {
                                        const GroupIcon = group.title === 'In der Schule' ? School : group.title === 'Online' ? Wifi : group.title === 'Außerhalb (öffentlich)' ? MapPin : Home;
                                        const selectedInGroup = group.locations.filter(l => formData.locations.includes(l)).length;
                                        return (
                                            <div key={group.title}>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                                                    <GroupIcon size={13} /> {group.title}
                                                    <span className="font-medium normal-case tracking-normal opacity-70">
                                                        · {group.locations.length} Orte{selectedInGroup > 0 ? `, ${selectedInGroup} gewählt` : ''}
                                                    </span>
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.locations.map(loc => {
                                                        const active = formData.locations.includes(loc);
                                                        return (
                                                            <button
                                                                key={loc}
                                                                type="button"
                                                                onClick={() => toggleLocation(loc)}
                                                                aria-pressed={active}
                                                                className={cn(
                                                                    "px-3.5 min-h-[44px] py-2 rounded-full text-sm border transition-colors font-medium",
                                                                    active
                                                                        ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black"
                                                                        : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                                                )}
                                                            >
                                                                {loc}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 space-y-1.5">
                                    <label htmlFor="custom-location" className="text-xs font-semibold text-gray-600 dark:text-gray-300">Eigener Ort (optional)</label>
                                    <div className="flex gap-2 items-center">
                                        <MapPin size={15} className="text-gray-400 shrink-0" aria-hidden="true" />
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
                                    <p className="text-[11px] text-gray-500 mt-2" aria-live="polite">
                                        Ausgewählt ({formData.locations.length + (formData.custom_location.trim() ? 1 : 0)}): {[ ...formData.locations, ...(formData.custom_location.trim() ? [formData.custom_location.trim()] : []) ].join(' • ')}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Wie lange dauert eine Einheit?</label>
                                <p className="text-[11px] text-gray-500 mb-3">Standard ist „Egal / nach Absprache“. Ihr klärt die Dauer dann im Chat. Feste Minuten sind exklusiv dazu.</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {DURATION_PRESETS.map(dur => {
                                        const active = formData.duration_minutes.includes(dur);
                                        return (
                                            <button
                                                key={dur}
                                                type="button"
                                                onClick={() => toggleDuration(dur)}
                                                aria-pressed={active}
                                                className={cn(
                                                    "min-w-16 px-4 h-12 rounded-xl text-sm font-semibold border flex items-center justify-center transition-all",
                                                    active
                                                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                )}
                                            >
                                                {dur} Min.
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => toggleDuration(DURATION_EGAL)}
                                        aria-pressed={formData.duration_minutes.includes(DURATION_EGAL)}
                                        className={cn(
                                            "px-4 h-12 rounded-xl text-sm font-semibold border flex items-center justify-center transition-all",
                                            formData.duration_minutes.includes(DURATION_EGAL)
                                                ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                        )}
                                    >
                                        Egal / nach Absprache
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="custom-duration" className="text-xs font-semibold text-gray-600 dark:text-gray-300">Andere Dauer in Minuten (optional, ersetzt „Egal“)</label>
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
                                        <span className="text-[11px] text-gray-500">Minuten, 5–480</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Pricing */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, price_mode: 'fixed' })}
                                    className={cn("p-4 border rounded-xl text-left hover:border-primary transition-all", formData.price_mode === 'fixed' && "border-primary bg-primary/5 ring-1 ring-primary")}
                                >
                                    <span className="block font-bold">Festpreis</span>
                                    <span className="text-xs text-gray-500">Euro pro Einheit</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, price_mode: 'vb' })}
                                    className={cn("p-4 border rounded-xl text-left hover:border-primary transition-all", formData.price_mode === 'vb' && "border-primary bg-primary/5 ring-1 ring-primary")}
                                >
                                    <span className="block font-bold">Verhandlungsbasis (VB)</span>
                                    <span className="text-xs text-gray-500">Preis wird besprochen</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, price_mode: 'free' })}
                                    className={cn("p-4 border rounded-xl text-left hover:border-primary transition-all", formData.price_mode === 'free' && "border-primary bg-primary/5 ring-1 ring-primary")}
                                >
                                    <span className="block font-bold">Kostenlos</span>
                                    <span className="text-xs text-gray-500">Ehrenamtlich helfen</span>
                                </button>
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
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                                        </div>
                                        <span className="text-gray-500">pro</span>
                                        <select
                                            className="bg-transparent border rounded-md p-2 text-sm"
                                            value={formData.price_unit}
                                            onChange={e => setFormData({ ...formData, price_unit: e.target.value })}
                                        >
                                            <option value="45min">45 min (Schulstunde)</option>
                                            <option value="60min">60 min (Stunde)</option>
                                            <option value="90min">90 min</option>
                                        </select>
                                    </div>
                                    {/* Quick Select */}
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <span className="text-xs text-gray-500 font-medium">Schnellwahl:</span>
                                        {[6, 8, 10, 12, 15].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, price_value: p }))}
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                                                    Number(formData.price_value) === p
                                                        ? "bg-primary text-black border-primary"
                                                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                                                )}
                                            >
                                                {p}€
                                            </button>
                                        ))}
                                    </div>

                                    {/* Effective Hourly Rate & FWG Benchmark Advice */}
                                    {effectiveHourly && (
                                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3 mt-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                    <Calculator size={15} className="text-gray-400" />
                                                    <span>Effektiver Stundenlohn (60 Min.):</span>
                                                </div>
                                                <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                                                    {effectiveHourly.formatted} € / 60 Min.
                                                </span>
                                            </div>

                                            {effectiveHourly.hourly >= 9 && effectiveHourly.hourly <= 14 && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                                                    <CheckCircle size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                    <span>Faire Preisempfehlung: ca. 10–12 € pro 45–60 Min Richtwert am FWG</span>
                                                </div>
                                            )}

                                            {effectiveHourly.hourly < 9 && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 p-2.5 rounded-xl border border-sky-200 dark:border-sky-800/60">
                                                    <Info size={15} className="shrink-0 text-sky-600 dark:text-sky-400" />
                                                    <span>Sehr günstig: unter dem Richtwert ca. 10–12 € pro 45–60 Min</span>
                                                </div>
                                            )}

                                            {effectiveHourly.hourly > 14 && effectiveHourly.hourly <= 18 && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                                                    <Info size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                                                    <span>Etwas über dem Durchschnitt. FWG-Richtwert: ca. 10–12 € pro 45–60 Min</span>
                                                </div>
                                            )}

                                            {effectiveHourly.hourly > 18 && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800/60">
                                                    <AlertCircle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                                                    <span>Relativ hoch für Schüler-Nachhilfe. Erlaubt, aber prüfe bitte, ob das beabsichtigt ist</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.price_mode === 'free' && (
                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium animate-in fade-in">
                                    <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>Toll! Ehrenamtliche Nachhilfe stärkt den Zusammenhalt am FWG.</span>
                                </div>
                            )}

                            {formData.price_mode === 'vb' && (
                                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300 font-medium animate-in fade-in">
                                    <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span>Tipp zur Orientierung: Am FWG sind ca. 10–12 € pro 45–60 Min ein beliebter und erprobter Richtwert.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Details */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-baseline justify-between gap-3 mb-2">
                                    <label htmlFor="short-description" className="text-sm font-medium">Kurzbeschreibung (für den Feed)</label>
                                    <span className="text-[11px] text-gray-500 shrink-0">11–100 Zeichen</span>
                                </div>
                                <Input
                                    id="short-description"
                                    maxLength={100}
                                    placeholder="Ein Satz, der Lust aufs Antippen macht …"
                                    value={formData.short_description}
                                    onChange={e => setFormData({ ...formData, short_description: e.target.value })}
                                />
                                <span className="text-xs text-gray-400 float-right mt-1">{formData.short_description.trim().length}/100 · mind. 11</span>
                            </div>

                            <div className="clear-both pt-4">
                                <label className="text-sm font-medium mb-2 block">Ausführliche Beschreibung</label>
                                <RichTextEditor
                                    value={formData.long_description}
                                    onChange={(html) => setFormData({ ...formData, long_description: html })}
                                    placeholder="Beschreibe dein Angebot genau..."
                                    className="min-h-[200px]"
                                />
                            </div>

                            <div className="pt-4">
                                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                                    <LinkIcon size={16} /> Bild-Adressen (URLs)
                                </label>
                                <div className="space-y-2">
                                    {formData.image_urls.map((url, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900 p-2 rounded text-sm break-all">
                                            <img src={url} alt="" className="w-8 h-8 rounded object-cover bg-gray-200" />
                                            <span className="flex-1 truncate">{url}</span>
                                            <button onClick={() => setFormData(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx) }))}>
                                                <X size={16} className="text-red-500" />
                                            </button>
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
                                    <p className="text-[10px] text-gray-400">
                                        Empfehlung: Nutze kostenlose Image-Hoster (z.B. Imgur, Unsplash), da wir keine direkten Uploads hosten.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Preview */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3 text-yellow-800 text-sm mb-6">
                                <AlertCircle className="shrink-0" />
                                <div>
                                    <p className="font-bold">Fast fertig!</p>
                                    <p>Bitte überprüfe deine Angaben. Nach dem Veröffentlichen ist die Anzeige sofort sichtbar.</p>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-50 dark:bg-gray-900 p-6 border-b">
                                    <h2 className="text-2xl font-bold mb-2">{formData.title}</h2>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="px-3 py-1 bg-primary text-black rounded-full text-sm font-bold tabular-nums">
                                            {formatAdPrice({
                                                mode: formData.price_mode,
                                                value: Number(formData.price_value) || 0,
                                                unit: formData.price_unit,
                                            })}
                                        </span>
                                        <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm font-semibold">
                                            {formData.session_format === 'single' ? 'Einzelunterricht' : formData.session_format === 'group' ? 'Kleingruppe' : 'Format: Egal'}
                                        </span>
                                        {formData.subjects.map(s => <SubjectChip key={s} subject={s} />)}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {[ ...formData.locations, ...(formData.custom_location ? [formData.custom_location] : []) ].join(' • ') || 'Kein Ort gewählt'}
                                        {'  ·  '}
                                        {(() => {
                                            const all = [...formData.duration_minutes, ...(formData.custom_duration ? [Number(formData.custom_duration)] : [])].filter(n => !isNaN(n));
                                            if (all.length === 0) return 'Keine Dauer gewählt';
                                            return all.map(d => d === 0 ? 'Dauer: Egal' : `${d} Min.`).join(' • ');
                                        })()}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300 mt-2">{formData.short_description}</p>
                                </div>
                                <div className="p-6 prose dark:prose-invert max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.long_description || '<p class="text-gray-400 italic">Keine Beschreibung</p>') }} />

                                    {formData.image_urls.length > 0 && (
                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                            {formData.image_urls.map((url, i) => (
                                                <img key={i} src={url} className="rounded-lg w-full h-48 object-cover bg-gray-100" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                </CardContent>
                <CardFooter className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 sm:pt-6 p-4 sm:p-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-b-3xl shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.15)]">
                    {!isStepValid() && stepHint && currentStep < STEPS.length - 1 && (
                        <p className="w-full text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-3 py-2" role="status">
                            Noch offen: {stepHint}
                        </p>
                    )}
                    <div className="flex flex-row justify-between items-center w-full gap-2">
                    <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0} className="px-3 sm:px-4">
                        <ChevronLeft size={16} className="mr-1 sm:mr-2 shrink-0" /> Zurück
                    </Button>

                    {currentStep === STEPS.length - 1 ? (
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-4 sm:px-5 shadow-lg shadow-primary/25">
                            {isSubmitting ? 'Wird veröffentlicht...' : 'Jetzt veröffentlichen'} <CheckCircle size={16} className="ml-1 sm:ml-2 shrink-0" />
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
