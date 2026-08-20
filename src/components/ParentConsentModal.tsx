import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { ShieldCheck, Printer, CheckCircle2, Award, Calendar, User, FileText } from 'lucide-react';

interface ParentConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    childName: string;
    parentName: string;
    gradeLevel?: string | null;
    linkedDate?: string;
}

export default function ParentConsentModal({
    isOpen,
    onClose,
    childName,
    parentName,
    gradeLevel,
    linkedDate
}: ParentConsentModalProps) {
    const handlePrint = () => {
        window.print();
    };

    const formattedDate = linkedDate
        ? new Date(linkedDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('de-DE');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="rounded-3xl max-w-lg bg-white dark:bg-gray-900 border dark:border-gray-800 shadow-2xl print:shadow-none print:border-none print:w-full">
                <DialogHeader className="text-center space-y-2 border-b dark:border-gray-800 pb-4">
                    <div className="flex justify-center items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-hover">
                        <Award size={16} /> Friedrich-Wilhelm-Gymnasium Köln
                    </div>
                    <DialogTitle className="text-xl font-black">
                        Einverständniserklärung der Erziehungsberechtigten
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-500">
                        Offizieller Nachweis für die Teilnahme an der FWG Nachhilfebörse v2
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4 print:py-0">
                    {/* Verification Stamp / Seal */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/10 p-4 rounded-2xl border border-green-200 dark:border-green-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <div className="font-bold text-xs text-green-900 dark:text-green-300">Digital Bestätigt & Verknüpft</div>
                                <div className="text-[10px] text-green-700 dark:text-green-400">Status: Aktiv im FWG-System</div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-400 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-green-100 dark:border-green-900/30">
                            FWG-SEC-{new Date().getFullYear()}
                        </span>
                    </div>

                    {/* Parties details grid */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 bg-gray-50 dark:bg-gray-950 rounded-2xl border dark:border-gray-800 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-gray-400 block flex items-center gap-1">
                                <User size={12} /> Erziehungsberechtigte(r)
                            </span>
                            <span className="font-bold text-sm block text-gray-800 dark:text-gray-200">{parentName || 'Elternteil'}</span>
                        </div>

                        <div className="p-3.5 bg-gray-50 dark:bg-gray-950 rounded-2xl border dark:border-gray-800 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-gray-400 block flex items-center gap-1">
                                <FileText size={12} /> Schüler(in)
                            </span>
                            <span className="font-bold text-sm block text-gray-800 dark:text-gray-200">{childName || 'Schüler'}</span>
                            <span className="text-[10px] text-gray-400 block">Klasse/Stufe: {gradeLevel || '--'}</span>
                        </div>
                    </div>

                    {/* Declaration text */}
                    <div className="space-y-3 bg-gray-50/50 dark:bg-gray-950/50 p-4 rounded-2xl border dark:border-gray-800 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                        <p>
                            Hiermit wird bestätigt, dass das Schülerkonto von <strong>{childName}</strong> mit dem Elternkonto von <strong>{parentName}</strong> verknüpft wurde.
                        </p>
                        <p>
                            Der Erziehungsberechtigte ist damit einverstanden, dass das Kind über die schulinterne Plattform <strong>FWG Nachhilfebörse v2</strong> Nachhilfestunden anbietet oder in Anspruch nimmt.
                        </p>
                        <div className="flex items-center gap-2 pt-2 border-t dark:border-gray-800 text-[10px] text-gray-400 font-semibold">
                            <Calendar size={12} /> Verknüpfungsdatum: {formattedDate}
                        </div>
                    </div>
                </div>

                {/* Footer Controls (Hidden in print) */}
                <div className="flex gap-2 pt-2 print:hidden">
                    <Button onClick={handlePrint} variant="outline" className="flex-1 rounded-2xl h-11 font-bold gap-2 text-xs">
                        <Printer size={16} /> Drucken / PDF
                    </Button>
                    <Button onClick={onClose} className="rounded-2xl h-11 px-6 font-bold text-xs bg-primary text-black">
                        Schließen
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
