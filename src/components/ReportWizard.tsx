import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog';
import { Input } from './ui/Input';
import { toast } from 'react-hot-toast';
import { X, ShieldAlert, AlertTriangle, ChevronRight, ChevronLeft, Check, Camera } from 'lucide-react';

interface ReportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    reportedUserId?: string;
    reportedAdId?: string;
    relatedMessageIds?: string[];
}

type ReportCategory = 'profil' | 'anzeige' | 'chat' | 'datenschutz' | 'sonstiges';

export default function ReportWizard({ isOpen, onClose, reportedUserId, reportedAdId, relatedMessageIds = [] }: ReportWizardProps) {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    
    // Form States
    const [category, setCategory] = useState<ReportCategory>('anzeige');
    const [subReason, setSubReason] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'normal' | 'hoch' | 'kritisch'>('normal');
    const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
    const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
    
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const categories: { value: ReportCategory; label: string; desc: string; icon: string }[] = [
        { value: 'anzeige', label: 'Anzeige / Angebot', desc: 'Unangemessene Inhalte, falsche Angaben oder Spam in einer Anzeige.', icon: '📝' },
        { value: 'profil', label: 'Profil / Nutzer', desc: 'Falscher Name, unpassendes Profilbild oder betrügerisches Verhalten.', icon: '👤' },
        { value: 'chat', label: 'Chat / Nachricht', desc: 'Beleidigungen, Belästigungen oder Spam im Chat.', icon: '💬' },
        { value: 'datenschutz', label: 'Datenschutz', desc: 'Unerlaubte Weitergabe privater Daten oder Kontaktdaten.', icon: '🔒' },
        { value: 'sonstiges', label: 'Sonstiges', desc: 'Sonstige Regelverstöße, die nicht oben aufgeführt sind.', icon: '⚠️' }
    ];

    const subReasons: Record<ReportCategory, string[]> = {
        anzeige: ['Spam / Werbung', 'Falsche Preisangaben', 'Unangemessene Beschreibung', 'Unpassende Fächer/Klassen'],
        profil: ['Unangemessener Name', 'Anstößiges Profilbild', 'Gibt sich als jemand anderes aus', 'Kein Schüler/Lehrer am FWG'],
        chat: ['Beleidigung / Mobbing', 'Unerwünschte Annäherung / Belästigung', 'Spam / Phishing', 'Unerlaubte Zahlungsaufforderung'],
        datenschutz: ['Veröffentlichung privater Nummern', 'Fotos ohne Einwilligung', 'Moodle-Missbrauch'],
        sonstiges: ['Anderer Grund']
    };

    const handleNext = () => {
        if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            if (!subReason) {
                toast.error("Bitte wähle einen spezifischen Grund aus.");
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (description.trim().length < 15) {
                toast.error("Bitte beschreibe den Vorfall genauer (mind. 15 Zeichen).");
                return;
            }
            setStep(4);
        }
    };

    const handleBack = () => {
        setStep(prev => Math.max(1, prev - 1));
    };

    const handleAddEvidence = () => {
        if (!newEvidenceUrl.trim()) return;
        if (!newEvidenceUrl.startsWith('http://') && !newEvidenceUrl.startsWith('https://')) {
            toast.error("Bitte gib eine gültige Bild-URL ein.");
            return;
        }
        setEvidenceUrls(prev => [...prev, newEvidenceUrl.trim()]);
        setNewEvidenceUrl('');
        toast.success("Bild-Nachweis hinzugefügt!");
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from('reports').insert({
                reporter_id: user.id,
                reported_user_id: reportedUserId || null,
                reported_ad_id: reportedAdId || null,
                reason: `${category.toUpperCase()}: ${subReason}`,
                description: description.trim(),
                category: category,
                sub_reason: subReason,
                priority: priority,
                evidence: evidenceUrls,
                related_message_ids: relatedMessageIds,
                status: 'open'
            });

            if (error) {
                console.error("Error creating report:", error);
                toast.error("Meldung konnte nicht eingereicht werden.");
            } else {
                toast.success("Vielen Dank. Die SV prüft deine Meldung schnellstmöglich.");
                onClose();
                // Reset Wizard
                setStep(1);
                setCategory('anzeige');
                setSubReason('');
                setDescription('');
                setPriority('normal');
                setEvidenceUrls([]);
            }
        } catch (err) {
            console.error(err);
            toast.error("Ein unerwarteter Fehler ist aufgetreten.");
        }
        setSubmitting(false);
    };

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="relative">
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <ShieldAlert size={20} />
                        <span>Meldung einreichen (Schritt {step}/4)</span>
                    </DialogTitle>
                    <button 
                        onClick={onClose} 
                        className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-250 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </DialogHeader>

                <div className="py-4 min-h-[250px] flex flex-col justify-between">
                    {/* STEP 1: CATEGORY */}
                    {step === 1 && (
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-450 uppercase mb-2">Was möchtest du melden?</p>
                            <div className="grid gap-2">
                                {categories.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => { setCategory(c.value); setSubReason(''); }}
                                        className={`flex items-start text-left p-3 rounded-2xl border transition-all ${category === c.value ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-400' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                                    >
                                        <span className="text-2xl mr-3 mt-0.5">{c.icon}</span>
                                        <div>
                                            <p className="font-bold text-sm">{c.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SUB REASON */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-gray-500 uppercase">Wähle den genauen Grund:</p>
                            <div className="flex flex-col gap-2">
                                {subReasons[category].map(reason => (
                                    <button
                                        key={reason}
                                        onClick={() => setSubReason(reason)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border font-semibold text-sm transition-colors ${subReason === reason ? 'bg-red-500 text-white border-transparent' : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-800'}`}
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DESCRIPTION & PRIORITY */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Details zum Vorfall *</label>
                                <textarea
                                    className="w-full h-28 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm focus:outline-none focus:border-red-400 transition-colors"
                                    placeholder="Beschreibe den Vorfall so genau wie möglich. Was ist passiert? Wer war beteiligt?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    minLength={15}
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Mindestens 15 Zeichen. Aktuell: {description.length}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-2">Dringlichkeit</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['normal', 'hoch', 'kritisch'] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={`py-2 rounded-xl text-xs font-bold capitalize border transition-colors ${priority === p ? 'bg-red-500 text-white border-transparent' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: EVIDENCE / SCREENSHOTS */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-sm mb-1">Bild-Nachweise hinzufügen (Optional)</h4>
                                <p className="text-xs text-gray-450 mb-3">Du kannst URLs von Screenshots oder Belegen hochladen (z.B. Imgur/Schulcloud).</p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://imgur.com/xyz.png"
                                        value={newEvidenceUrl}
                                        onChange={e => setNewEvidenceUrl(e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                    <Button size="sm" className="h-9" onClick={handleAddEvidence}>
                                        <Camera size={14} className="mr-1" /> Hinzufügen
                                    </Button>
                                </div>
                            </div>

                            {evidenceUrls.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold uppercase text-gray-400">Hinzugefügte Nachweise ({evidenceUrls.length})</p>
                                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                        {evidenceUrls.map((url, i) => (
                                            <div key={i} className="flex items-center gap-1.5 text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 px-2 py-1 rounded-xl">
                                                <span className="truncate max-w-[120px]">{url}</span>
                                                <button onClick={() => setEvidenceUrls(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-150 dark:border-red-900/30 p-3 rounded-2xl flex gap-2 text-xs text-red-800 dark:text-red-350">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <p className="leading-relaxed">Missbrauch der Meldefunktion kann zu einer Sperre deines Kontos führen. Bitte melde nur tatsächliche Verstöße.</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-gray-150 dark:border-gray-850 pt-4 flex justify-between">
                    {step > 1 ? (
                        <Button variant="outline" size="sm" onClick={handleBack} className="rounded-full">
                            <ChevronLeft size={16} className="mr-1" /> Zurück
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step < 4 ? (
                        <Button size="sm" onClick={handleNext} className="rounded-full bg-red-500 hover:bg-red-600 text-white font-bold">
                            Weiter <ChevronRight size={16} className="ml-1" />
                        </Button>
                    ) : (
                        <Button 
                            size="sm" 
                            onClick={handleSubmit} 
                            disabled={submitting}
                            className="rounded-full bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                            {submitting ? 'Wird gesendet...' : 'Meldung abschicken'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
