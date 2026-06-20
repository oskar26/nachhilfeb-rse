import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { SubjectChip, SUBJECT_CATEGORIES, type Subject } from '../components/SubjectChip';
import { GradeSelector } from '../components/GradeSelector';
import { RichTextEditor } from '../components/RichTextEditor';
import { ChevronLeft, ChevronRight, CheckCircle, Plus, X, Link as LinkIcon, AlertCircle, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const STEPS = [
    'Typ & Titel',
    'Fächer & Stufen',
    'Ort & Zeit',
    'Preis',
    'Details & Bilder',
    'Vorschau'
];

type PriceMode = 'free' | 'fixed' | 'vb' | 'custom';
type LocationPreset = 'Bibliothek' | 'Schule' | 'Mensa' | 'SV-Raum' | 'Glaskasten' | 'Oberes Foyer' | 'Vor der Aula' | 'Unteres Foyer' | 'Schulhof' | 'Online' | 'Bei dir' | 'Bei mir';
const LOCATIONS: LocationPreset[] = ['Bibliothek', 'Schule', 'Mensa', 'SV-Raum', 'Glaskasten', 'Oberes Foyer', 'Vor der Aula', 'Unteres Foyer', 'Schulhof', 'Online', 'Bei dir', 'Bei mir'];

const DURATIONS = [0, 15, 30, 45, 60, 90, 120, 180];

export default function CreateAd() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [promoCode, setPromoCode] = useState('');

    // Form Data
    const [formData, setFormData] = useState({
        type: 'offer' as 'offer' | 'search',
        title: '',
        subjects: [] as Subject[],
        grade_levels: [] as string[],

        locations: [] as string[],
        custom_location: '',

        duration_minutes: [] as number[],
        custom_duration: '',

        price_mode: 'fixed' as PriceMode,
        price_value: '' as string | number, // number or string for input
        price_unit: '45min', // default base

        short_description: '',
        long_description: '',

        image_urls: [] as string[],
        new_image_url: ''
    });

    useEffect(() => {
        if (user) {
            checkVerification();
        }
    }, [user]);

    async function checkVerification() {
        const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
        if (data) {
            setProfile(data);
            setIsVerified(data.is_verified);
        }
        setLoadingProfile(false);
    }

    // Effect: Auto-set grade if type is search
    useEffect(() => {
        if (formData.type === 'search' && profile?.grade_level) {
            setFormData(prev => ({ ...prev, grade_levels: [profile.grade_level] }));
        }
    }, [formData.type, profile]);


    const handleNext = () => {
        if ('vibrate' in navigator) navigator.vibrate([20]);
        if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if ('vibrate' in navigator) navigator.vibrate([20]);
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
        let finalDurations = [...formData.duration_minutes];
        if (formData.custom_duration) {
            const custom = parseInt(formData.custom_duration);
            if (!isNaN(custom)) finalDurations.push(custom);
        }

        // Combine locations
        let finalLocations = [...formData.locations];
        if (formData.custom_location) {
            finalLocations.push(formData.custom_location);
        }

        const isBoosted = promoCode.trim().toUpperCase() === 'BANANE';
        const boostedUntil = isBoosted ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null;

        const { error } = await supabase.from('ads').insert({
            user_id: user.id,
            type: formData.type,
            subjects: formData.subjects,
            grade_levels: formData.grade_levels,
            locations: finalLocations,
            price_details: priceDetails,
            duration_minutes: finalDurations,
            short_description: formData.short_description,
            long_description: formData.long_description,
            image_urls: formData.image_urls,
            is_active: true,
            boosted: isBoosted,
            boosted_until: boostedUntil,
            promo_code_used: isBoosted ? 'BANANE' : null
        });

        setIsSubmitting(false);

        if (error) {
            console.error(error);
            toast.error("Fehler beim Erstellen der Anzeige: " + error.message);
        } else {
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
        setFormData(prev => ({
            ...prev,
            duration_minutes: prev.duration_minutes.includes(min)
                ? prev.duration_minutes.filter(m => m !== min)
                : [...prev.duration_minutes, min]
        }));
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

    // Validation
    const isStepValid = () => {
        switch (currentStep) {
            case 0: return formData.title.length > 3;
            case 1: return formData.subjects.length > 0 && formData.grade_levels.length > 0;
            case 2: return (formData.locations.length > 0 || formData.custom_location.length > 0) && (formData.duration_minutes.length > 0 || formData.custom_duration.length > 0);
            case 3:
                if (formData.price_mode === 'free' || formData.price_mode === 'vb') return true;
                return Number(formData.price_value) > 0; // fixed needs value
            case 4: return formData.short_description.length > 10;
            default: return true;
        }
    };

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
        <div className="p-4 max-w-3xl mx-auto pb-24">
            <h1 className="text-2xl font-bold mb-6">Anzeige aufgeben</h1>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 overflow-x-auto relative">
                {/* Connecting Line (behind) */}
                <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-800 -z-10" />

                {STEPS.map((step, index) => (
                    <div key={index} className="flex flex-col items-center min-w-[60px] bg-white dark:bg-gray-950 px-1 z-0">
                        <button 
                            onClick={() => jumpToStep(index)}
                            disabled={index > currentStep && !isStepValid()}
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white dark:ring-gray-950 transition-all",
                                index <= currentStep
                                    ? "bg-primary text-primary-foreground hover:scale-110 cursor-pointer"
                                    : "bg-gray-200 text-gray-500 dark:bg-gray-800 cursor-not-allowed opacity-50"
                            )}
                        >
                            {index + 1}
                        </button>
                        <span className="text-[10px] mt-1 text-gray-500 font-medium">{step}</span>
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{STEPS[currentStep]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 min-h-[300px]">

                    {/* Step 0: Type & Title */}
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'offer' })}
                                    className={cn(
                                        "flex-1 py-4 px-2 text-center rounded-xl border-2 transition-all font-semibold",
                                        formData.type === 'offer' ? "border-primary bg-primary/10 text-primary-hover" : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700"
                                    )}
                                >
                                    Ich biete Nachhilfe 🎓
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'search' })}
                                    className={cn(
                                        "flex-1 py-4 px-2 text-center rounded-xl border-2 transition-all font-semibold",
                                        formData.type === 'search' ? "border-secondary bg-secondary/10 text-secondary" : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700"
                                    )}
                                >
                                    Ich suche Nachhilfe 🔍
                                </button>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Titel der Anzeige</label>
                                <Input
                                    placeholder="z.B. Mathe Held für Unterstufe gesucht!"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    autoFocus
                                    className="text-lg py-6"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 1: Subjects & Grades */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-medium mb-4 block">Welche Fächer?</label>
                                <div className="space-y-6">
                                    {SUBJECT_CATEGORIES.map(category => (
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
                                <label className="text-sm font-medium mb-2 block">Wo findet es statt?</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {LOCATIONS.map(loc => (
                                        <button
                                            key={loc}
                                            onClick={() => toggleLocation(loc)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-sm border transition-colors",
                                                formData.locations.includes(loc)
                                                    ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black"
                                                    : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                            )}
                                        >
                                            {loc}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        placeholder="Oder eigener Ort..."
                                        value={formData.custom_location}
                                        onChange={e => setFormData({ ...formData, custom_location: e.target.value })}
                                        className="max-w-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Dauer (Minuten)</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {DURATIONS.map(dur => (
                                        <button
                                            key={dur}
                                            onClick={() => toggleDuration(dur)}
                                            className={cn(
                                                "w-12 h-12 rounded-lg text-sm font-medium border flex items-center justify-center transition-all",
                                                formData.duration_minutes.includes(dur)
                                                    ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                            )}
                                        >
                                            {dur === 0 ? 'Individuell / Egal' : `${dur} min`}
                                        </button>
                                    ))}
                                </div>
                                <Input
                                    type="number"
                                    placeholder="Andere Dauer (min)"
                                    value={formData.custom_duration}
                                    onChange={e => setFormData({ ...formData, custom_duration: e.target.value })}
                                    className="max-w-[150px]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Pricing */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFormData({ ...formData, price_mode: 'fixed' })}
                                    className={cn("p-4 border rounded-xl text-left hover:border-primary transition-all", formData.price_mode === 'fixed' && "border-primary bg-primary/5 ring-1 ring-primary")}
                                >
                                    <span className="block font-bold">Festpreis</span>
                                    <span className="text-xs text-gray-500">Euro pro Einheit</span>
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, price_mode: 'vb' })}
                                    className={cn("p-4 border rounded-xl text-left hover:border-primary transition-all", formData.price_mode === 'vb' && "border-primary bg-primary/5 ring-1 ring-primary")}
                                >
                                    <span className="block font-bold">Verhandlungsbasis (VB)</span>
                                    <span className="text-xs text-gray-500">Preis wird besprochen</span>
                                </button>
                                <button
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
                                    <div className="flex gap-2">
                                        {[5, 8, 10, 12, 15].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setFormData(prev => ({ ...prev, price_value: p }))}
                                                className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 dark:bg-gray-800"
                                            >
                                                {p}€
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Details */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Kurzbeschreibung (für den Feed)</label>
                                <Input
                                    maxLength={100}
                                    placeholder="Kurzer Teaser (max 100 Zeichen)..."
                                    value={formData.short_description}
                                    onChange={e => setFormData({ ...formData, short_description: e.target.value })}
                                />
                                <span className="text-xs text-gray-400 float-right mt-1">{formData.short_description.length}/100</span>
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
                                        <span className="px-3 py-1 bg-primary text-black rounded-full text-sm font-bold">
                                            {formData.price_mode === 'fixed' ? `${formData.price_value}€ / ${formData.price_unit}` : (formData.price_mode === 'free' ? 'Kostenlos' : 'VB')}
                                        </span>
                                        {formData.subjects.map(s => <SubjectChip key={s} subject={s} />)}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300">{formData.short_description}</p>
                                </div>
                                <div className="p-6 prose dark:prose-invert max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: formData.long_description || '<p class="text-gray-400 italic">Keine Beschreibung</p>' }} />

                                    {formData.image_urls.length > 0 && (
                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                            {formData.image_urls.map((url, i) => (
                                                <img key={i} src={url} className="rounded-lg w-full h-48 object-cover bg-gray-100" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500 block">Aktionscode (Optional)</label>
                                <Input
                                    placeholder="Falls vorhanden, gib hier deinen Aktionscode ein..."
                                    value={promoCode}
                                    onChange={e => setPromoCode(e.target.value)}
                                    className="max-w-xs border-dashed"
                                />
                            </div>
                        </div>
                    )}

                </CardContent>
                <CardFooter className="flex justify-between border-t pt-6">
                    <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
                        <ChevronLeft size={16} className="mr-2" /> Zurück
                    </Button>

                    {currentStep === STEPS.length - 1 ? (
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20">
                            {isSubmitting ? 'Wird veröffentlicht...' : 'Jetzt veröffentlichen'} <CheckCircle size={16} className="ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleNext} disabled={!isStepValid()}>
                            Weiter <ChevronRight size={16} className="ml-2" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
