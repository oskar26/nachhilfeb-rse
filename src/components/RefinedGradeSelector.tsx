import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface RefinedGradeSelectorProps {
    grade: string;
    letter: string;
    onChange: (grade: string, letter: string) => void;
    className?: string;
}

const GRADES = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];
const LETTERS = ['a', 'b', 'c', 'd'];

export function RefinedGradeSelector({ grade, letter, onChange, className }: RefinedGradeSelectorProps) {
    const [selectedGrade, setSelectedGrade] = useState(grade);
    const [selectedLetter, setSelectedLetter] = useState(letter);
    const [prevProps, setPrevProps] = useState({ grade, letter });

    // Props-Sync in der Render-Phase (kein Effect: keine kaskadierenden Renders,
    // z. B. nach Formular-Reset durch die Elternkomponente)
    if (prevProps.grade !== grade || prevProps.letter !== letter) {
        setPrevProps({ grade, letter });
        setSelectedGrade(grade);
        setSelectedLetter(letter);
    }

    const isOberstufe = ['EF', 'Q1', 'Q2'].includes(selectedGrade);

    const handleGradeClick = (g: string) => {
        if (g !== selectedGrade) {
            setSelectedGrade(g);
            setSelectedLetter(''); // Reset letter when grade changes
            onChange(g, '');
        }
    };

    const handleLetterClick = (l: string) => {
        setSelectedLetter(l);
        onChange(selectedGrade, l);
    };

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Jahrgangsstufe">
                {GRADES.map(g => {
                    const isActive = selectedGrade === g;
                    return (
                        <Button variant="unstyled" size="unstyled"
                            key={g}
                            type="button"
                            onClick={() => handleGradeClick(g)}
                            aria-pressed={isActive}
                            className={cn(
                                "flex h-11 min-w-11 items-center justify-center rounded-lg border px-3.5 text-sm font-semibold transition-colors",
                                isActive
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground"
                            )}
                        >
                            {g}
                        </Button>
                    );
                })}
            </div>

            <AnimatePresence>
                {selectedGrade && !isOberstufe && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="mb-2 ml-1 text-xs font-medium text-muted-foreground">Klasse {selectedGrade} …</p>
                        <div className="flex gap-2" role="group" aria-label="Klassenbuchstabe">
                            {LETTERS.map(l => (
                                <Button variant="unstyled" size="unstyled"
                                    key={l}
                                    type="button"
                                    onClick={() => handleLetterClick(l)}
                                    aria-pressed={selectedLetter === l}
                                    className={cn(
                                        "flex size-11 items-center justify-center rounded-lg border text-lg font-semibold uppercase transition-colors",
                                        selectedLetter === l
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {l}
                                </Button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
