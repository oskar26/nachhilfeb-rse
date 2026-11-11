import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { SubjectChip, SUBJECT_CATEGORIES, type Subject } from './SubjectChip';

interface SubjectPickerDialogProps {
    open: boolean;
    onClose: () => void;
    selected: Subject[];
    onToggle: (subject: Subject) => void;
}

/**
 * Fach-Auswahl im Plakat-Stil: heller Kopf mit gelbem Akzentstreifen,
 * alle Fächer aus SUBJECT_CATEGORIES (Single Source of Truth).
 * Bereits gewählte Fächer sind ausgegraut (Entfernen läuft über die Chips im Profil).
 */
export default function SubjectPickerDialog({ open, onClose, selected, onToggle }: SubjectPickerDialogProps) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent showCloseButton={false} className="max-h-[92dvh] p-0" aria-label="Fächer auswählen">
                <DialogTitle className="sr-only">Fächer auswählen</DialogTitle>
                <DialogDescription className="sr-only">
                    Wähle die Fächer aus, für die du Nachhilfe suchst oder anbietest.
                </DialogDescription>
                <div className="max-h-[92dvh] overflow-y-auto overscroll-contain">
                    {/* Poster-Kopf */}
                    <div className="sticky top-0 z-10 border-b border-border bg-background px-5 pb-4 pt-5 text-foreground">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="font-display text-xl uppercase leading-none tracking-tight">Fach hinzufügen</h2>
                                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                    Wähle deine Fächer – bereits gewählte sind ausgegraut.
                                </p>
                            </div>
                            <Button variant="unstyled" size="unstyled"
                                type="button"
                                onClick={onClose}
                                aria-label="Fächer-Auswahl schließen"
                                className="press grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
                            >
                                <X size={18} />
                            </Button>
                        </div>
                        <div className="mt-3 h-1 w-10 rounded-full bg-primary" aria-hidden />
                    </div>

                    {/* Alle Fächer */}
                    <div className="space-y-5 px-5 py-5">
                        {SUBJECT_CATEGORIES.map((category) => (
                            <div key={category.title}>
                                <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
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
                    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] backdrop-blur">
                        <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                            {selected.length} {selected.length === 1 ? 'Fach' : 'Fächer'} gewählt
                        </p>
                        <Button size="sm" onClick={onClose} className="h-11 rounded-full px-5 font-semibold">
                            Fertig
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
