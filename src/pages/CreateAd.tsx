import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useState, useEffect, useMemo, useRef, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { SubjectChip, SUBJECT_CATEGORIES, subjectLabelMap, type Subject } from '../components/SubjectChip';
import { GradeSelector } from '../components/GradeSelector';
import { RichTextEditor } from '../components/RichTextEditor';
import { ChevronLeft, ChevronRight, CheckCircle, Plus, X, Link as LinkIcon, AlertCircle, AlertTriangle, Lock, GraduationCap, Search, Users, User, Shuffle, School, Wifi, Home, MapPin, Calculator, Info, Loader2, ImagePlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { PriceTag } from '../components/ui/price-tag';
import { PRICE_GUIDELINE, PRICE_MODE_LABELS, assessPrice } from '../lib/pricing';
import { AD_IMAGE_MAX_BYTES, adImageFileProblem, compressImage } from '../lib/image';
import { MAX_AD_CUSTOM_LOCATION_LENGTH, MAX_AD_LOCATIONS, splitAdLocations } from '../lib/ad-locations';
import { useAuth } from '../context/AuthContext';
import { api, uploadAdImage } from '../lib/api';
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

// Kurze Labels nur für die sechs Stepper-Spalten (die CardTitle bleibt
// ausführlich). Bei 390 px passen so alle Schritte ohne Umbruch.
const STEP_SHORT_LABELS = ['Typ', 'Fächer', 'Ort/Zeit', 'Preis', 'Details', 'Vorschau'];

type PriceMode = 'free' | 'fixed' | 'vb';
type SessionFormat = 'single' | 'group' | 'any';
type ImageFeedback = { tone: 'success' | 'error'; message: string };
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

// Sichtbare Obergrenzen – dieselben Limits, die der Server erzwingt.
const MAX_SUBJECTS = 10;
const MAX_LOCATIONS = MAX_AD_LOCATIONS;
const MAX_DURATIONS = 6;
const MAX_IMAGES = 5;
const MAX_CUSTOM_LOCATION_LENGTH = MAX_AD_CUSTOM_LOCATION_LENGTH;

const PRESET_LOCATIONS = new Set<string>(LOCATION_GROUPS.flatMap(group => group.locations));

/**
 * Verkleinert große Bilder vor dem Upload. compressImage() liefert eine
 * Data-URL; diese wird hier ohne Netzwerkzugriff in einen echten Blob
 * umgewandelt, damit niemals eine Data-URL an die API geht.
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    const header = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    if (!header.toLowerCase().includes(';base64')) return null;
    const mimeMatch = /^data:([^;]+)/i.exec(header);
    const mime = mimeMatch?.[1] || 'image/webp';
    try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
    } catch {
        return null;
    }
}

async function prepareImageForUpload(file: File): Promise<File> {
    try {
        const dataUrl = await compressImage(file, 1600, 0.82);
        const blob = dataUrlToBlob(dataUrl);
        if (!blob || !blob.size || blob.size > AD_IMAGE_MAX_BYTES) return file;
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'anzeige-bild';
        return new File([blob], `${baseName}.${extension}`, { type: blob.type });
    } catch {
        // Original bleibt der Fallback; die Größe wurde vorher geprüft.
        return file;
    }
}

const DRAFT_KEY = 'fwg_draft_ad';
const INITIAL_FORM = {
    type: 'offer' as 'offer' | 'search',
    title: '',
    session_format: 'any' as SessionFormat,
    subjects: [] as Subject[],
    grade_levels: [] as string[],
    locations: [] as string[],
    custom_locations: [] as string[],
    new_custom_location: '',
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
    const { locations, custom_locations } = splitAdLocations(
        source?.locations,
        [],
        source?.custom_location,
        PRESET_LOCATIONS
    );

    return {
        type: source?.type === 'search' ? 'search' : 'offer',
        title: source?.title || source?.short_description || '',
        session_format: legacyFormat,
        subjects: Array.isArray(source?.subjects) ? source.subjects : [],
        grade_levels: Array.isArray(source?.grade_levels) ? source.grade_levels : [],
        locations,
        custom_locations,
        new_custom_location: '',
        duration_minutes: Array.isArray(source?.duration_minutes) && source.duration_minutes.length > 0
            ? source.duration_minutes
            : [DURATION_EGAL],
        custom_duration: '',
        price_mode: (source?.price_details?.mode || 'fixed') as PriceMode,
        price_value: source?.price_details?.value ?? '',
        price_unit: source?.price_details?.unit || '45min',
        short_description: cleanShort,
        long_description: source?.long_description || '',
        image_urls: Array.isArray(source?.image_urls) ? source.image_urls.slice(0, MAX_IMAGES) : [],
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
    const [uploadingImages, setUploadingImages] = useState<{ id: string; name: string }[]>([]);
    const [imageFeedback, setImageFeedback] = useState<ImageFeedback | null>(null);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadingCountRef = useRef(0);
    const imageUploadGenerationRef = useRef(0);

    const totalLocations = formData.locations.length + formData.custom_locations.length;

    const priceAssessment = assessPrice({
        price: formData.price_value,
        mode: formData.price_mode,
        duration: formData.price_unit,
    });
    const PriceAssessmentIcon = priceAssessment.tone === 'good'
        ? CheckCircle
        : priceAssessment.tone === 'high'
            ? AlertTriangle
            : priceAssessment.tone === 'low'
                ? Calculator
                : Info;

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
            case 0: {
                const titleLength = formData.title.trim().length;
                return titleLength >= 4 && titleLength <= 80;
            }
            case 1: return formData.subjects.length > 0 && formData.grade_levels.length > 0;
            case 2: return totalLocations > 0 && (formData.duration_minutes.length > 0 || formData.custom_duration.trim().length > 0);
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
                return formData.title.trim().length >= 4 && formData.title.trim().length <= 80
                    ? null
                    : 'Gib einen Titel mit 4 bis 80 Zeichen ein – z. B. „Mathe-Hilfe für Klasse 6“.';
            case 1:
                if (formData.subjects.length === 0) return 'Wähle mindestens 1 Fach – nutze die Suche, wenn du es nicht findest.';
                if (formData.grade_levels.length === 0) return 'Wähle mindestens 1 Klassenstufe, für die die Anzeige gilt.';
                return null;
            case 2: {
                const hasPlace = totalLocations > 0;
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
                    const restored = { ...parsed.formData };
                    // Migration alter Entwürfe: früher gab es nur einen
                    // einzelnen custom_location-String.
                    const restoredLocations = splitAdLocations(
                        restored.locations,
                        restored.custom_locations,
                        restored.custom_location,
                        PRESET_LOCATIONS
                    );
                    delete restored.custom_location;
                    setFormData(prev => ({
                        ...prev,
                        ...restored,
                        locations: restoredLocations.locations,
                        custom_locations: restoredLocations.custom_locations,
                        new_custom_location: typeof restored.new_custom_location === 'string' ? restored.new_custom_location : '',
                        image_urls: Array.isArray(restored.image_urls) ? restored.image_urls.slice(0, MAX_IMAGES) : [],
                        duration_minutes: Array.isArray(restored.duration_minutes) && restored.duration_minutes.length
                            ? restored.duration_minutes
                            : [DURATION_EGAL]
                    }));
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
        // Jeder Verwerfen-Versuch invalidiert laufende Upload-Ergebnisse. Während
        // eines Uploads wird der Reset selbst nicht ausgeführt (der Button ist
        // zusätzlich disabled); ein verspäteter Handler darf danach nichts mehr
        // in den Entwurf schreiben.
        imageUploadGenerationRef.current += 1;
        if (uploadingCountRef.current > 0 || uploadingImages.length > 0) {
            setUploadingImages([]);
            uploadingCountRef.current = 0;
            setImageFeedback(null);
            return;
        }
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch { /* ignore */ }
        setFormData({ ...INITIAL_FORM });
        setCurrentStep(0);
        setSubjectQuery('');
        setDraftSavedAt(null);
        setImageFeedback(null);
        toast.success('Entwurf verworfen – du startest mit einem leeren Formular.');
    };

    const handleNext = () => {
        if (uploadingCountRef.current > 0 || uploadingImages.length > 0) return;
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
        if (uploadingCountRef.current > 0 || uploadingImages.length > 0) return;
        triggerHaptic('selection');
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const jumpToStep = (index: number) => {
        if (uploadingCountRef.current > 0 || uploadingImages.length > 0) return;
        if (index < currentStep || isStepValid()) {
            if ('vibrate' in navigator) navigator.vibrate([15]);
            setCurrentStep(index);
        }
    };

    const handleSubmit = async () => {
        if (!user || !isVerified) return;
        if (uploadingCountRef.current > 0 || uploadingImages.length > 0) return;

        const trimmedTitle = formData.title.trim();
        if (trimmedTitle.length < 4 || trimmedTitle.length > 80) {
            triggerHaptic('error');
            toast.error('Der Titel muss zwischen 4 und 80 Zeichen lang sein.');
            return;
        }

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

        // Combine locations: Presets und eigene Orte landen gemeinsam im
        // locations-Array (max. 10). Die alte Einzelspalte custom_location
        // wird geleert, damit entfernte Orte nicht beim nächsten Bearbeiten
        // wieder auftauchen.
        const finalLocations = [...formData.locations, ...formData.custom_locations]
            .map(location => location.trim())
            .filter(Boolean)
            .filter((location, index, all) => all.indexOf(location) === index)
            .slice(0, MAX_LOCATIONS);

        // Legacy-Säuberung: Ein evtl. noch vorhandener [Kleingruppe]-Prefix gehört ins
        // session_format-Feld und nicht in den sichtbaren Text.
        const cleanShortDescription = formData.short_description.replace(/^\[Kleingruppe\]\s*/, '');

        const payload = {
            type: formData.type,
            title: trimmedTitle,
            session_format: formData.session_format,
            subjects: formData.subjects,
            grade_levels: formData.grade_levels,
            locations: finalLocations,
            custom_location: '',
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
        if (!formData.subjects.includes(s) && formData.subjects.length >= MAX_SUBJECTS) {
            triggerHaptic('error');
            toast.error('Du kannst höchstens 10 Fächer auswählen.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.includes(s)
                ? prev.subjects.filter(sub => sub !== s)
                : [...prev.subjects, s]
        }));
    };

    const toggleLocation = (loc: string) => {
        if (!formData.locations.includes(loc) && totalLocations >= MAX_LOCATIONS) {
            triggerHaptic('error');
            toast.error('Du kannst höchstens 10 Orte angeben.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            locations: prev.locations.includes(loc)
                ? prev.locations.filter(l => l !== loc)
                : [...prev.locations, loc]
        }));
    };

    const addCustomLocation = () => {
        const clean = formData.new_custom_location.trim().slice(0, MAX_CUSTOM_LOCATION_LENGTH);
        if (!clean) return;
        if (formData.custom_locations.includes(clean) || formData.locations.includes(clean)) {
            toast.error('Dieser Ort ist schon ausgewählt.');
            return;
        }
        if (totalLocations >= MAX_LOCATIONS) {
            triggerHaptic('error');
            toast.error('Du kannst höchstens 10 Orte angeben.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            custom_locations: [...prev.custom_locations, clean],
            new_custom_location: ''
        }));
    };

    const removeCustomLocation = (location: string) => {
        setFormData(prev => ({
            ...prev,
            custom_locations: prev.custom_locations.filter(l => l !== location)
        }));
    };

    const clearLocations = () => {
        setFormData(prev => ({ ...prev, locations: [], custom_locations: [], new_custom_location: '' }));
    };

    const toggleDuration = (min: number) => {
        // „Egal“ ist exklusiv: steht für „Dauer klären wir im Chat“ statt einer festen Minutenzahl.
        if (min === DURATION_EGAL) {
            setFormData(prev => {
                const hasEgal = prev.duration_minutes.includes(DURATION_EGAL);
                return { ...prev, duration_minutes: hasEgal ? [] : [DURATION_EGAL], custom_duration: '' };
            });
            return;
        }
        const withoutEgal = formData.duration_minutes.filter(m => m !== DURATION_EGAL);
        if (!withoutEgal.includes(min)) {
            // Die eigene Dauer zählt als weitere Angabe mit.
            const count = withoutEgal.length + (formData.custom_duration.trim() ? 1 : 0);
            if (count >= MAX_DURATIONS) {
                triggerHaptic('error');
                toast.error('Du kannst höchstens 6 Dauerangaben auswählen.');
                return;
            }
        }
        setFormData(prev => {
            const currentWithoutEgal = prev.duration_minutes.filter(m => m !== DURATION_EGAL);
            return {
                ...prev,
                duration_minutes: currentWithoutEgal.includes(min)
                    ? currentWithoutEgal.filter(m => m !== min)
                    : [...currentWithoutEgal, min]
            };
        });
    };

    const updateCustomDuration = (value: string) => {
        const fixedCount = formData.duration_minutes.filter(m => m !== DURATION_EGAL).length;
        if (value.trim() && !formData.custom_duration.trim() && fixedCount >= MAX_DURATIONS) {
            triggerHaptic('error');
            toast.error('Du kannst höchstens 6 Dauerangaben auswählen.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            custom_duration: value,
            duration_minutes: value.trim()
                ? prev.duration_minutes.filter(m => m !== DURATION_EGAL)
                : prev.duration_minutes
        }));
    };

    const addImageUrl = () => {
        const url = formData.new_image_url.trim();
        if (!url) return;
        if (!/^https:\/\//i.test(url)) {
            setImageFeedback({ tone: 'error', message: 'Bitte füge eine Bild-URL ein, die mit https:// beginnt.' });
            return;
        }
        if (formData.image_urls.includes(url)) {
            setImageFeedback({ tone: 'error', message: 'Dieses Bild ist schon in der Anzeige.' });
            return;
        }
        if (formData.image_urls.length + uploadingCountRef.current >= MAX_IMAGES) {
            triggerHaptic('error');
            setImageFeedback({ tone: 'error', message: 'Du kannst höchstens 5 Bilder hinzufügen.' });
            return;
        }
        setFormData(prev => ({
            ...prev,
            image_urls: [...prev.image_urls, url],
            new_image_url: ''
        }));
        setImageFeedback({ tone: 'success', message: 'Bild-URL hinzugefügt.' });
    };

    const removeImage = (index: number) => {
        setImageFeedback(null);
        setFormData(prev => ({
            ...prev,
            image_urls: prev.image_urls.filter((_, i) => i !== index)
        }));
    };

    const handleImageFiles = async (incoming: FileList | File[]) => {
        const files = Array.from(incoming);
        if (files.length === 0) return;
        const uploadGeneration = imageUploadGenerationRef.current;

        const errors: string[] = [];
        const uploadedNames: string[] = [];
        setImageFeedback(null);

        const freeSlots = MAX_IMAGES - formData.image_urls.length - uploadingCountRef.current;
        if (freeSlots <= 0) {
            triggerHaptic('error');
            setImageFeedback({ tone: 'error', message: 'Du kannst höchstens 5 Bilder hinzufügen.' });
            return;
        }
        if (files.length > freeSlots) {
            errors.push(`Es passen nur noch ${freeSlots} ${freeSlots === 1 ? 'Bild' : 'Bilder'} in die Anzeige.`);
        }

        for (const file of files.slice(0, freeSlots)) {
            if (uploadGeneration !== imageUploadGenerationRef.current) break;
            const problem = adImageFileProblem(file);
            if (problem) {
                errors.push(`${file.name}: ${problem}`);
                continue;
            }

            const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            uploadingCountRef.current += 1;
            setUploadingImages(prev => [...prev, { id: uploadId, name: file.name }]);
            try {
                const prepared = await prepareImageForUpload(file);
                const preparedProblem = adImageFileProblem(prepared);
                if (preparedProblem) throw new Error(preparedProblem);

                const { data, error } = await uploadAdImage(prepared);
                if (error || !data?.url) {
                    throw new Error(error?.message || 'Bild konnte nicht hochgeladen werden.');
                }
                if (uploadGeneration !== imageUploadGenerationRef.current) continue;
                const url = data.url;
                setFormData(prev => (
                    prev.image_urls.length >= MAX_IMAGES || prev.image_urls.includes(url)
                        ? prev
                        : { ...prev, image_urls: [...prev.image_urls, url] }
                ));
                uploadedNames.push(file.name);
            } catch (error) {
                if (uploadGeneration !== imageUploadGenerationRef.current) continue;
                const message = error instanceof Error && error.message
                    ? error.message
                    : 'Bild konnte nicht hochgeladen werden.';
                errors.push(`${file.name}: ${message}`);
            } finally {
                uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1);
                setUploadingImages(prev => prev.filter(item => item.id !== uploadId));
            }
        }

        if (uploadGeneration !== imageUploadGenerationRef.current) return;
        if (errors.length > 0) {
            setImageFeedback({ tone: 'error', message: errors.join(' ') });
        } else if (uploadedNames.length > 0) {
            setImageFeedback({
                tone: 'success',
                message: uploadedNames.length === 1
                    ? `Bild hochgeladen: ${uploadedNames[0]}`
                    : `${uploadedNames.length} Bilder hochgeladen.`
            });
        }
    };

    const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            void handleImageFiles(event.target.files);
        }
        // Gleiche Datei nach einem Fehler erneut wählbar machen.
        event.target.value = '';
    };

    const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDraggingImage(false);
        if (event.dataTransfer.files?.length) {
            void handleImageFiles(event.dataTransfer.files);
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
            <p className="text-[13px] font-semibold text-muted-foreground">Profil wird geladen…</p>
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
        <div className="mx-auto box-border w-full max-w-app min-w-0 space-y-6 overflow-visible p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:p-6 md:pb-10">
            <div className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <h1 className="min-w-0 text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
                        {editingId ? 'Anzeige bearbeiten' : 'Anzeige erstellen'}
                    </h1>
                    {!editingId && (
                        <Button variant="unstyled" size="unstyled"
                            type="button"
                            onClick={discardDraft}
                            disabled={uploadingImages.length > 0}
                            title={uploadingImages.length > 0 ? 'Bilder werden hochgeladen – bitte warten.' : 'Entwurf verwerfen'}
                            className="mt-0.5 min-h-11 shrink-0 text-[13px] font-semibold text-muted-foreground underline underline-offset-4 hover:text-destructive"
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
                                        className="absolute top-[21px] right-[calc(50%+1.5rem)] h-0.5 w-[calc(100%-3rem)] rounded-full bg-border sm:right-[calc(50%+1.75rem)] sm:w-[calc(100%-3.5rem)]"
                                    />
                                )}
                                <Button variant="unstyled" size="unstyled"
                                    type="button"
                                    onClick={() => jumpToStep(index)}
                                    disabled={uploadingImages.length > 0 || (index > currentStep && !isStepValid())}
                                    className={cn(
                                        "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.98]",
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
                                <span className={cn("mt-2 max-w-full px-0.5 text-center text-[13px] leading-tight transition-colors", isCurrent ? "font-bold text-foreground" : "text-muted-foreground")}>
                                    {STEP_SHORT_LABELS[index]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Card className="w-full min-w-0 overflow-visible border-0 bg-card shadow-soft">
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
                                            <div className="text-[13px] leading-relaxed space-y-1">
                                                <p className="font-semibold text-sm">Dein Gesuch ist privat.</p>
                                                <p>Es erscheint nicht öffentlich in der Übersicht, sondern nur bei passenden Anbietern und bei Nutzern, die diese Fächer laut Profil anbieten. Das SV-Team sieht es zur Moderation.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Unterrichts-Format: Einzel / Kleingruppe / Egal */}
                                    <div>
                                        <span className="text-sm font-medium block">Unterrichts-Format</span>
                                        <span className="text-[13px] text-muted-foreground block mb-2">Einzelunterricht, Kleingruppe (2 bis 4 Schüler) oder nach Absprache?</span>
                                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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
                                                            "relative flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-center font-semibold transition-colors sm:min-h-20 sm:px-2 sm:py-3",
                                                            active ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                                                        )}
                                                    >
                                                        {active && <CheckCircle size={14} className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2" aria-hidden />}
                                                        <Icon className="size-4 shrink-0 sm:size-[18px]" />
                                                        <span className="text-[13px] leading-tight sm:text-sm">{f.title}</span>
                                                        <span className="hidden text-[13px] font-normal opacity-80 sm:block">{f.hint}</span>
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-baseline justify-between gap-3 mb-2">
                                            <Label htmlFor="ad-title" className="text-sm font-medium">Titel der Anzeige</Label>
                                            <span className="text-[13px] text-muted-foreground shrink-0">4–80 Zeichen</span>
                                        </div>
                                        <Input
                                            id="ad-title"
                                            placeholder="z. B. Mathe-Hilfe für Klasse 6 gesucht!"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="text-base sm:text-lg"
                                            maxLength={80}
                                        />
                                        <p className="text-[13px] text-muted-foreground mt-1.5">Der Titel erscheint auf der Detailseite und in deiner Merkliste. In der Übersicht siehst du zusätzlich Fach und Anzeigename.</p>
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
                                    <span className="text-[13px] text-muted-foreground shrink-0" aria-live="polite">
                                        {formData.subjects.length > 0
                                            ? `${formData.subjects.length}/${MAX_SUBJECTS} gewählt`
                                            : subjectQuery.trim()
                                                ? `${subjectMatchCount} von 25 Fächern`
                                                : '25 Fächer in 4 Gruppen'}
                                    </span>
                                </div>
                                <p className="text-[13px] text-muted-foreground mb-3">Wähle mindestens ein Fach. Tippe zum Filtern, statt lange zu scrollen.</p>
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
                                            className="text-[13px] font-semibold underline underline-offset-4 hover:text-foreground"
                                        >
                                            Suche zurücksetzen
                                        </Button>
                                    </div>
                                ) : (
                                <div className="space-y-4">
                                    {filteredSubjectGroups.map(category => (
                                        <div key={category.title} className="rounded-xl bg-muted/40 p-4">
                                            <h4 className="mb-3 text-[13px] font-semibold text-muted-foreground">{category.title}</h4>
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
                                    <p className="text-[13px] text-muted-foreground mt-3">
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
                                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                                    <Label className="text-sm font-medium">Wo findet die Nachhilfe statt?</Label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[13px] tabular-nums text-muted-foreground" aria-live="polite">
                                            {totalLocations}/{MAX_LOCATIONS} Orte
                                        </span>
                                        {totalLocations > 0 && (
                                            <Button variant="unstyled" size="unstyled"
                                                type="button"
                                                onClick={clearLocations}
                                                className="min-h-11 shrink-0 text-[13px] font-semibold text-muted-foreground underline underline-offset-4 hover:text-destructive"
                                            >
                                                Auswahl löschen
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">Wähle alle Orte, die für dich passen. Mehrfachauswahl ist möglich.</p>
                                <div className="space-y-4">
                                    {LOCATION_GROUPS.map(group => {
                                        const GroupIcon = group.title === 'In der Schule' ? School : group.title === 'Online' ? Wifi : group.title === 'Außerhalb (öffentlich)' ? MapPin : Home;
                                        const selectedInGroup = group.locations.filter(l => formData.locations.includes(l)).length;
                                        return (
                                            <div key={group.title}>
                                                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
                                                    <GroupIcon size={13} aria-hidden /> {group.title}
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
                                                                    "min-h-11 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                                                                    active
                                                                        ? "border-primary bg-primary-soft text-primary-soft-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
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

                                <div className="mt-4 space-y-2">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <Label htmlFor="custom-location" className="text-[13px] font-semibold text-muted-foreground">Eigene Orte (optional)</Label>
                                        <span className="text-[13px] text-muted-foreground">max. 120 Zeichen</span>
                                    </div>
                                    <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
                                        <div className="relative min-w-0 flex-1">
                                            <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                            <Input
                                                id="custom-location"
                                                placeholder="z. B. Stadtbibliothek am Neumarkt …"
                                                value={formData.new_custom_location}
                                                onChange={e => setFormData(prev => ({ ...prev, new_custom_location: e.target.value }))}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addCustomLocation();
                                                    }
                                                }}
                                                className="min-w-0 pl-9"
                                                maxLength={MAX_CUSTOM_LOCATION_LENGTH}
                                                autoComplete="off"
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={addCustomLocation}
                                            disabled={!formData.new_custom_location.trim() || totalLocations >= MAX_LOCATIONS}
                                            className="h-11 w-full shrink-0 gap-1.5 rounded-lg px-4 text-[13px] font-semibold min-[420px]:w-auto"
                                        >
                                            <Plus size={16} aria-hidden /> Hinzufügen
                                        </Button>
                                    </div>
                                    {formData.custom_locations.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {formData.custom_locations.map(location => (
                                                <span key={location} className="inline-flex min-h-11 max-w-full min-w-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary-soft pl-3 pr-1 text-[13px] font-medium text-primary-soft-foreground">
                                                    <span className="min-w-0 max-w-full break-words text-left" title={location}>{location}</span>
                                                    <Button variant="unstyled" size="unstyled"
                                                        type="button"
                                                        onClick={() => removeCustomLocation(location)}
                                                        className="grid size-11 shrink-0 place-items-center rounded-lg text-primary-soft-foreground hover:bg-destructive/10 hover:text-destructive"
                                                        aria-label={`Eigenen Ort ${location} entfernen`}
                                                    >
                                                        <X size={15} aria-hidden />
                                                    </Button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[13px] leading-relaxed text-muted-foreground">Eigene Orte zählen zu den maximal 10 Orten.</p>
                                </div>

                                {totalLocations > 0 && (
                                    <p className="mt-2 max-w-full min-w-0 break-words text-[13px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]" aria-live="polite">
                                        Ausgewählt: {[...formData.locations, ...formData.custom_locations].join(' • ')}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm font-medium mb-1 block">Wie lange dauert eine Einheit?</Label>
                                <p className="text-[13px] text-muted-foreground mb-3">Standard ist „Egal / nach Absprache“. Ihr klärt die Dauer dann im Chat. Feste Minuten sind exklusiv dazu. Maximal {MAX_DURATIONS} Dauerangaben, die eigene Dauer zählt mit.</p>
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
                                    <Label htmlFor="custom-duration" className="text-[13px] font-semibold text-muted-foreground">Andere Dauer in Minuten (optional, ersetzt „Egal“)</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            id="custom-duration"
                                            type="number"
                                            min={5}
                                            max={480}
                                            placeholder="z. B. 50"
                                            value={formData.custom_duration}
                                            onChange={e => updateCustomDuration(e.target.value)}
                                            className="max-w-[170px]"
                                        />
                                        <span className="text-[13px] text-muted-foreground">Minuten, 5–480</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Pricing */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {([
                                    { value: 'fixed', hint: 'Fester Preis pro Einheit' },
                                    { value: 'vb', hint: 'Preis wird besprochen' },
                                    { value: 'free', hint: 'Ehrenamtlich helfen' },
                                ] as const).map(option => {
                                    const active = formData.price_mode === option.value;
                                    return (
                                        <Button variant="unstyled" size="unstyled"
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, price_mode: option.value })}
                                            aria-pressed={active}
                                            className={cn(
                                                "relative !flex min-h-16 w-full !items-start !justify-start rounded-xl border p-4 pr-10 !text-left transition-colors",
                                                active
                                                    ? "border-primary bg-primary-soft text-primary-soft-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                                                    : "border-border hover:border-primary/40"
                                            )}
                                        >
                                            <span className="flex min-w-0 flex-col items-start">
                                                <span className="font-semibold">{PRICE_MODE_LABELS[option.value]}</span>
                                                <span className="mt-0.5 text-[13px] leading-snug opacity-75">{option.hint}</span>
                                            </span>
                                            {active && <CheckCircle size={16} className="absolute right-3 top-3" aria-hidden />}
                                        </Button>
                                    );
                                })}
                            </div>

                            <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-muted/50 p-4">
                                <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                                <div>
                                    <p className="text-[13px] font-semibold text-foreground">Preis-Richtwert</p>
                                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                                        {PRICE_GUIDELINE.shortCopy}. Du legst den Preis selbst fest.
                                    </p>
                                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                                        Die Bezahlung erfolgt privat zwischen dir und der Nachhilfelehrkraft. Die Plattform ist kein Zahlungsdienstleister, wickelt keine Zahlungen ab und behält keine Provision ein.
                                    </p>
                                </div>
                            </div>

                            {formData.price_mode === 'fixed' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="relative w-full min-w-0 sm:w-40">
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                step="0.5"
                                                aria-label="Preis in Euro"
                                                placeholder="0.00"
                                                value={formData.price_value}
                                                onChange={e => setFormData({ ...formData, price_value: e.target.value })}
                                                className="min-w-0 pl-8"
                                            />
                                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                                        </div>
                                        <span className="text-[13px] text-muted-foreground">pro</span>
                                        <NativeSelect
                                            className="w-full min-w-0 sm:w-auto"
                                            aria-label="Preiseinheit"
                                            value={formData.price_unit}
                                            onChange={e => setFormData({ ...formData, price_unit: e.target.value })}
                                        >
                                            <option value="45min">45 min (Schulstunde)</option>
                                            <option value="60min">60 min (Stunde)</option>
                                            <option value="90min">90 min</option>
                                        </NativeSelect>
                                    </div>
                                    {/* Quick Select */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[13px] font-medium text-muted-foreground">Schnellwahl:</span>
                                        {[6, 8, 10, 12, 15].map(p => (
                                            <Button variant="unstyled" size="unstyled"
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, price_value: p }))}
                                                aria-pressed={Number(formData.price_value) === p}
                                                className={cn(
                                                    "min-h-11 rounded-lg border px-3 py-1 text-[13px] font-semibold transition-colors",
                                                    Number(formData.price_value) === p
                                                        ? "border-primary bg-primary-soft text-primary-soft-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                                                        : "border-transparent bg-muted text-foreground/80 hover:border-ring/40"
                                                )}
                                            >
                                                {p} €
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div
                                aria-live="polite"
                                aria-atomic="true"
                                className={cn(
                                    "rounded-2xl border p-4",
                                    priceAssessment.tone === 'good'
                                        ? 'border-pastel-mint bg-pastel-mint text-pastel-mint-foreground'
                                        : priceAssessment.tone === 'high'
                                            ? 'border-pastel-orange bg-pastel-orange text-pastel-orange-foreground'
                                            : priceAssessment.tone === 'low'
                                                ? 'border-pastel-blue bg-pastel-blue text-pastel-blue-foreground'
                                                : priceAssessment.tone === 'free'
                                                    ? 'border-pastel-yellow bg-pastel-yellow text-pastel-yellow-foreground'
                                                    : priceAssessment.tone === 'vb'
                                                        ? 'border-pastel-blue bg-pastel-blue text-pastel-blue-foreground'
                                                        : 'border-border bg-muted text-foreground'
                                )}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                                        <PriceAssessmentIcon size={16} aria-hidden />
                                        Preis-Check: {priceAssessment.title}
                                    </span>
                                    {priceAssessment.hourlyLabel && (
                                        <span className="text-[15px] font-bold tabular-nums">{priceAssessment.hourlyLabel}</span>
                                    )}
                                </div>
                                <p className="mt-1.5 text-[13px] leading-relaxed">{priceAssessment.detail}</p>
                                <p className="mt-2 border-t border-current/20 pt-2 text-[13px] leading-relaxed">
                                    {priceAssessment.basis}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Details */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-baseline justify-between gap-3 mb-2">
                                    <Label htmlFor="short-description" className="text-sm font-medium">Kurzbeschreibung (für die Übersicht)</Label>
                                    <span className="text-[13px] text-muted-foreground shrink-0">11–100 Zeichen</span>
                                </div>
                                <Input
                                    id="short-description"
                                    maxLength={100}
                                    placeholder="Ein Satz, der dein Angebot zusammenfasst."
                                    value={formData.short_description}
                                    onChange={e => setFormData({ ...formData, short_description: e.target.value })}
                                />
                                <span className="text-[13px] text-muted-foreground float-right mt-1">{formData.short_description.trim().length}/100 · mind. 11</span>
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
                                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <ImagePlus size={16} aria-hidden /> Bilder
                                    </Label>
                                    <span className="text-[13px] tabular-nums text-muted-foreground" aria-live="polite">
                                        {formData.image_urls.length}/{MAX_IMAGES} Bilder
                                        {uploadingImages.length > 0 ? ` · ${uploadingImages.length} im Upload` : ''}
                                    </span>
                                </div>
                                <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
                                    Lade bis zu 5 Bilder hoch (JPEG, PNG oder WebP, je max. 5 MB) oder füge eine https-Bild-URL ein.
                                    Hochgeladene Bilder werden vor dem Senden verkleinert.
                                </p>

                                {/* Dauerhaft gemountete Live-Regionen: Screenreader
                                    hören Erfolg/Fehler auch dann, wenn der sichtbare
                                    Block erst nachträglich erscheint. */}
                                <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                                    {imageFeedback?.tone === 'success' ? imageFeedback.message : ''}
                                </div>
                                <div className="sr-only" role="alert" aria-atomic="true">
                                    {imageFeedback?.tone === 'error' ? imageFeedback.message : ''}
                                </div>

                                <div className="space-y-3">
                                    <input
                                        ref={fileInputRef}
                                        id="ad-image-input"
                                        type="file"
                                        aria-label="Bilder auswählen"
                                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                        multiple
                                        className="sr-only"
                                        onChange={handleImageInputChange}
                                    />
                                    <div
                                        onDragOver={event => { event.preventDefault(); setIsDraggingImage(true); }}
                                        onDragLeave={() => setIsDraggingImage(false)}
                                        onDrop={handleImageDrop}
                                        className={cn(
                                            "flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-colors sm:p-5",
                                            isDraggingImage
                                                ? "border-primary bg-primary-soft/50"
                                                : "border-border bg-muted/30"
                                        )}
                                    >
                                        <ImagePlus size={20} className="text-muted-foreground" aria-hidden />
                                        <Button
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={formData.image_urls.length + uploadingImages.length >= MAX_IMAGES}
                                            className="h-11 rounded-lg px-4 text-[13px] font-semibold"
                                        >
                                            Bilder auswählen
                                        </Button>
                                        <p className="text-[13px] text-muted-foreground">oder Dateien hierher ziehen</p>
                                    </div>

                                    {imageFeedback?.tone === 'success' && (
                                        <p className="rounded-xl border border-border bg-pastel-mint px-3 py-2 text-[13px] font-medium text-pastel-mint-foreground">
                                            {imageFeedback.message}
                                        </p>
                                    )}
                                    {imageFeedback?.tone === 'error' && (
                                        <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-[13px] font-medium leading-relaxed text-destructive">
                                            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
                                            <span>{imageFeedback.message}</span>
                                        </div>
                                    )}

                                    {(formData.image_urls.length > 0 || uploadingImages.length > 0) && (
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {formData.image_urls.map((url, idx) => (
                                                <div key={`${url}-${idx}`} className="relative overflow-hidden rounded-xl border border-border bg-muted">
                                                    <img
                                                        src={url}
                                                        alt={`Bild ${idx + 1} der Anzeige`}
                                                        loading="lazy"
                                                        className="aspect-[4/3] w-full object-cover"
                                                    />
                                                    <Button variant="unstyled" size="unstyled"
                                                        type="button"
                                                        onClick={() => removeImage(idx)}
                                                        aria-label={`Bild ${idx + 1} entfernen`}
                                                        className="absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-lg bg-card/95 text-destructive shadow-soft hover:bg-card"
                                                    >
                                                        <X size={16} aria-hidden />
                                                    </Button>
                                                </div>
                                            ))}
                                            {uploadingImages.map(item => (
                                                <div key={item.id} className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 p-3 text-center" role="status">
                                                    <Loader2 size={20} className="animate-spin text-muted-foreground" aria-hidden />
                                                    <span className="w-full truncate text-[13px] font-medium text-muted-foreground">{item.name}</span>
                                                    <span className="h-1.5 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-label={`${item.name} wird hochgeladen`}>
                                                        <span className="block h-full w-1/2 animate-pulse rounded-full bg-primary" />
                                                    </span>
                                                    <span className="sr-only">Wird hochgeladen …</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <Input
                                                aria-label="Bild-URL"
                                                placeholder="https://example.com/bild.jpg"
                                                value={formData.new_image_url}
                                                onChange={e => setFormData({ ...formData, new_image_url: e.target.value })}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addImageUrl();
                                                    }
                                                }}
                                                className="min-w-0 flex-1"
                                                autoComplete="off"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={addImageUrl}
                                                disabled={!formData.new_image_url.trim()}
                                                className="h-11 w-full shrink-0 gap-1.5 rounded-lg px-4 text-[13px] font-semibold sm:w-auto"
                                            >
                                                <Plus size={16} aria-hidden /> URL hinzufügen
                                            </Button>
                                        </div>
                                        <p className="flex items-start gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
                                            <LinkIcon size={14} className="mt-0.5 shrink-0" aria-hidden />
                                            URL-Fallback: Nutze eine direkte https-Bildadresse, wenn der Upload auf dem Server nicht verfügbar ist.
                                        </p>
                                    </div>
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
                                        <PriceTag
                                            layout="stacked"
                                            price={formData.price_value}
                                            mode={formData.price_mode}
                                            duration={formData.price_unit}
                                        />
                                        <span className="rounded-lg bg-muted px-3 py-1 text-sm font-semibold text-foreground/80">
                                            {formData.session_format === 'single' ? 'Einzelunterricht' : formData.session_format === 'group' ? 'Kleingruppe' : 'Format: Egal'}
                                        </span>
                                        {formData.subjects.map(s => <SubjectChip key={s} subject={s} />)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {[ ...formData.locations, ...formData.custom_locations ].join(' • ') || 'Kein Ort gewählt'}
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
                <CardFooter className="flex flex-col gap-3 rounded-b-card border-t border-border bg-card p-4 sm:p-6 md:sticky md:bottom-0 md:z-10 md:bg-card md:pb-6">
                    {uploadingImages.length > 0 && (
                        <p className="w-full rounded-xl bg-pastel-blue px-4 py-2.5 text-[13px] font-semibold leading-relaxed text-pastel-blue-foreground" role="status">
                            Bilder werden hochgeladen …
                        </p>
                    )}
                    {!isStepValid() && stepHint && currentStep < STEPS.length - 1 && (
                        <p className="w-full rounded-xl bg-pastel-blue px-4 py-2.5 text-[13px] font-semibold leading-relaxed text-pastel-blue-foreground" role="status">
                            Noch offen: {stepHint}
                        </p>
                    )}
                    <div className="flex w-full flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0 || uploadingImages.length > 0} className="w-full px-3 sm:w-auto sm:px-4">
                            <ChevronLeft size={16} className="mr-1 shrink-0 sm:mr-2" /> Zurück
                        </Button>

                        {currentStep === STEPS.length - 1 ? (
                            <Button onClick={handleSubmit} disabled={isSubmitting || uploadingImages.length > 0} isLoading={isSubmitting} className="w-full px-4 font-semibold sm:w-auto sm:px-5">
                                {isSubmitting
                                    ? (editingId ? 'Änderungen werden gespeichert' : 'Anzeige wird veröffentlicht')
                                    : (editingId ? 'Änderungen speichern' : 'Anzeige veröffentlichen')}
                                <CheckCircle size={16} className="ml-1 shrink-0 sm:ml-2" aria-hidden />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleNext}
                                disabled={!isStepValid() || uploadingImages.length > 0}
                                title={uploadingImages.length > 0 ? 'Bilder werden hochgeladen …' : (!isStepValid() && stepHint ? stepHint : 'Weiter zum nächsten Schritt')}
                                className="w-full px-4 sm:w-auto sm:px-5"
                            >
                                Weiter <ChevronRight size={16} className="ml-1 shrink-0 sm:ml-2" />
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
