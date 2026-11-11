import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { X, ShieldAlert, AlertTriangle, ChevronRight, ChevronLeft, Camera, FileText, User, MessageCircle, Lock, Flag, type LucideIcon } from 'lucide-react';

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

    const categories: { value: ReportCategory; label: string; desc: string; icon: LucideIcon }[] = [
        { value: 'anzeige', label: 'Anzeige / Angebot', desc: 'Unangemessene Inhalte, falsche Angaben oder Spam in einer Anzeige.', icon: FileText },
        { value: 'profil', label: 'Profil / Nutzer', desc: 'Falscher Name, unpassendes Profilbild oder betrügerisches Verhalten.', icon: User },
        { value: 'chat', label: 'Chat / Nachricht', desc: 'Beleidigungen, Belästigungen oder Spam im Chat.', icon: MessageCircle },
        { value: 'datenschutz', label: 'Datenschutz', desc: 'Unerlaubte Weitergabe privater Daten oder Kontaktdaten.', icon: Lock },
        { value: 'sonstiges', label: 'Sonstiges', desc: 'Sonstige Regelverstöße, die nicht oben aufgeführt sind.', icon: Flag }
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
            const { error } = await api.reports.create({
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
                toast.success("Vielen Dank. Die SV prüft deine Meldung.");
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
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent showCloseButton={false} className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
                <DialogHeader className="relative">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-destructive">
                        <ShieldAlert size={20} />
                        <span>Meldung einreichen (Schritt {step}/4)</span>
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Meldung mit Kategorie, Grund, Beschreibung und optionalen Nachweisen einreichen.
                    </DialogDescription>
                    <Button variant="unstyled" size="unstyled" type="button"
                        onClick={onClose}
                        aria-label="Meldung schließen"
                        className="absolute right-0 top-0 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X size={18} aria-hidden />
                    </Button>
                </DialogHeader>

                <div className="py-4 min-h-[250px] flex flex-col justify-between">
                    {/* STEP 1: CATEGORY */}
                    {step === 1 && (
                        <div className="space-y-3">
                            <p className="mb-2 text-sm font-semibold text-muted-foreground">Was möchtest du melden?</p>
                            <div className="grid gap-2">
                                {categories.map(c => (
                                    <Button variant="unstyled" size="unstyled" type="button"
                                        key={c.value}
                                        onClick={() => { setCategory(c.value); setSubReason(''); }}
                                        className={`flex min-h-11 items-start rounded-xl border p-3 text-left transition-colors ${category === c.value ? 'border-destructive/50 bg-destructive/5 ring-1 ring-destructive/40' : 'border-border hover:bg-muted/60'}`}
                                    >
                                        <span className="mr-3 mt-0.5 text-destructive"><c.icon size={22} aria-hidden /></span>
                                        <div>
                                            <p className="font-semibold text-sm">{c.label}</p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SUB REASON */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-muted-foreground">Wähle den genauen Grund:</p>
                            <div className="flex flex-col gap-2">
                                {subReasons[category].map(reason => (
                                    <Button variant="unstyled" size="unstyled" type="button"
                                        key={reason}
                                        onClick={() => setSubReason(reason)}
                                        className={`min-h-11 w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${subReason === reason ? 'border-transparent bg-destructive text-destructive-foreground' : 'border-border bg-muted/40 hover:bg-muted'}`}
                                    >
                                        {reason}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DESCRIPTION & PRIORITY */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-1 block text-xs font-semibold text-foreground/80">Details zum Vorfall *</Label>
                                <Textarea
                                    className="min-h-28 w-full resize-none bg-muted/40"
                                    placeholder="Beschreibe den Vorfall so genau wie möglich. Was ist passiert? Wer war beteiligt?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    minLength={15}
                                    required
                                />
                                <p className="mt-1 text-xs text-muted-foreground">Mindestens 15 Zeichen. Aktuell: {description.length}</p>
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-foreground/80">Dringlichkeit</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['normal', 'hoch', 'kritisch'] as const).map(p => (
                                        <Button variant="unstyled" size="unstyled"
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={`min-h-11 rounded-xl border py-2 text-xs font-semibold capitalize transition-colors ${priority === p ? 'border-transparent bg-destructive text-destructive-foreground' : 'border-border bg-muted/40 hover:bg-muted'}`}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: EVIDENCE / SCREENSHOTS */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="mb-1 text-sm font-semibold">Bild-Nachweise hinzufügen (Optional)</h4>
                                <p className="mb-3 text-xs text-muted-foreground">Du kannst URLs von Screenshots oder Belegen hochladen (z.B. Imgur/Schulcloud).</p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://imgur.com/xyz.png"
                                        value={newEvidenceUrl}
                                        onChange={e => setNewEvidenceUrl(e.target.value)}
                                        className="h-11 text-xs"
                                    />
                                    <Button size="sm" className="h-11" onClick={handleAddEvidence}>
                                        <Camera size={14} className="mr-1" /> Hinzufügen
                                    </Button>
                                </div>
                            </div>

                            {evidenceUrls.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground">Hinzugefügte Nachweise ({evidenceUrls.length})</p>
                                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                        {evidenceUrls.map((url, i) => (
                                            <div key={i} className="flex items-center gap-1.5 rounded-xl border border-destructive/25 bg-destructive/5 px-2 py-1 text-xs text-destructive">
                                                <span className="truncate max-w-[120px]">{url}</span>
                                                <Button variant="unstyled" size="unstyled" type="button" onClick={() => setEvidenceUrls(prev => prev.filter((_, idx) => idx !== i))} aria-label="Nachweis entfernen" className="grid size-11 place-items-center rounded-full text-destructive hover:bg-destructive/10">
                                                    <X size={14} aria-hidden />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                                <p className="leading-relaxed">Missbrauch der Meldefunktion kann zu einer Sperre deines Kontos führen. Bitte melde nur tatsächliche Verstöße.</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="sticky bottom-0 flex justify-between border-t border-border bg-popover pt-4">
                    {step > 1 ? (
                        <Button variant="outline" size="sm" onClick={handleBack} className="h-11 rounded-full px-4">
                            <ChevronLeft size={16} className="mr-1" /> Zurück
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step < 4 ? (
                        <Button size="sm" onClick={handleNext} className="h-11 rounded-full bg-destructive px-5 font-semibold text-destructive-foreground hover:bg-destructive/90">
                            Weiter <ChevronRight size={16} className="ml-1" />
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="h-11 rounded-full bg-destructive px-5 font-semibold text-destructive-foreground hover:bg-destructive/90"
                        >
                            {submitting ? 'Wird gesendet...' : 'Meldung abschicken'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
