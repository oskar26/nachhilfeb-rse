import { X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/Dialog';
import { Button } from './ui/Button';
import { SubjectChip, SUBJECT_CATEGORIES, type Subject } from './SubjectChip';

interface SubjectPickerDialogProps {
    open: boolean;
    onClose: () => void;
    selected: Subject[];
    onToggle: (subject: Subject) => void;
}

/**
 * Fach-Auswahl im Plakat-Stil: schwarzer Kopf mit gelbem Akzentstreifen,
 * alle Fächer aus SUBJECT_CATEGORIES (Single Source of Truth).
 * Bereits gewählte Fächer sind ausgegraut (Entfernen läuft über die Chips im Profil).
 */
export default function SubjectPickerDialog({ open, onClose, selected, onToggle }: SubjectPickerDialogProps) {
    return (
        <Dialog open={open} onClose={onClose} ariaLabel="Fächer auswählen">
            <DialogContent className="p-0">
                <div className="max-h-[75vh] overflow-y-auto overscroll-contain">
                    {/* Poster-Kopf */}
                    <div className="sticky top-0 z-10 bg-gray-950 dark:bg-black poster-grain px-5 pb-4 pt-5 text-white">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="font-display text-xl uppercase leading-none tracking-tight">Fach hinzufügen</h2>
                                <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                                    Wähle deine Fächer – bereits gewählte sind ausgegraut.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Fächer-Auswahl schließen"
                                className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="mt-3 h-1 w-10 rounded-full bg-primary" aria-hidden />
                    </div>

                    {/* Alle Fächer */}
                    <div className="space-y-5 px-5 py-5">
                        {SUBJECT_CATEGORIES.map((category) => (
                            <div key={category.title}>
                                <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {category.title}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {category.subjects.map((subject) => {
                                        const isSelected = selected.includes(subject);
                                        if (isSelected) {
                                            return (
                                                <span
                                                    key={subject}
                                                    className="inline-flex opacity-40 grayscale"
                                                    aria-disabled="true"
                                                    title="Bereits gewählt"
                                                >
                                                    <SubjectChip subject={subject} />
                                                </span>
                                            );
                                        }
                                        return (
                                            <SubjectChip
                                                key={subject}
                                                subject={subject}
                                                onClick={() => onToggle(subject)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fußzeile */}
                    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-gray-100 bg-white/95 px-5 py-3.5 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                            {selected.length} {selected.length === 1 ? 'Fach' : 'Fächer'} gewählt
                        </p>
                        <Button size="sm" onClick={onClose} className="h-10 rounded-full px-5 font-bold">
                            Fertig
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
