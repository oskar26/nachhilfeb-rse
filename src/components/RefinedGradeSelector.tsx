import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface RefinedGradeSelectorProps {
    grade: string;
    letter: string;
    onChange: (grade: string, letter: string) => void;
    className?: string;
}

const GRADES = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];
const LETTERS = ['a', 'b', 'c', 'd', 'e'];

export function RefinedGradeSelector({ grade, letter, onChange, className }: RefinedGradeSelectorProps) {
    const [selectedGrade, setSelectedGrade] = useState(grade);
    const [selectedLetter, setSelectedLetter] = useState(letter);

    // Sync external props if they change
    useEffect(() => {
        setSelectedGrade(grade);
        setSelectedLetter(letter);
    }, [grade, letter]);

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
            <div className="flex flex-wrap gap-2">
                {GRADES.map(g => {
                    const isActive = selectedGrade === g;
                    return (
                        <button
                            key={g}
                            type="button"
                            onClick={() => handleGradeClick(g)}
                            className={cn(
                                "px-3.5 h-10 min-w-[2.5rem] rounded-2xl flex items-center justify-center text-sm font-bold border transition-all duration-300",
                                isActive
                                    ? "bg-primary text-black border-primary ring-2 ring-primary ring-offset-2 scale-105"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-primary hover:text-primary"
                            )}
                        >
                            {g}
                        </button>
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
                        <p className="text-xs text-gray-400 mb-2 font-medium uppercase ml-1">Klasse {selectedGrade}...</p>
                        <div className="flex gap-2">
                            {LETTERS.map(l => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => handleLetterClick(l)}
                                    className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold border transition-colors uppercase",
                                        selectedLetter === l
                                            ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                                            : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
