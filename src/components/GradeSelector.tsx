import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

interface GradeSelectorProps {
    selectedGrades: string[];
    onChange: (grades: string[]) => void;
    className?: string;
}

const GRADES = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];

export function GradeSelector({ selectedGrades, onChange, className }: GradeSelectorProps) {
    const toggleGrade = (grade: string) => {
        triggerHaptic('selection');
        if (selectedGrades.includes(grade)) {
            onChange(selectedGrades.filter(g => g !== grade));
        } else {
            onChange([...selectedGrades, grade]);
        }
    };

    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            {GRADES.map(grade => {
                const isSelected = selectedGrades.includes(grade);
                return (
                    <motion.button
                        key={grade}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        onClick={() => toggleGrade(grade)}
                        className={cn(
                            "px-3.5 h-10 min-w-[2.5rem] rounded-xl flex items-center justify-center text-sm font-bold border transition-colors select-none cursor-pointer",
                            isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-yellow-500/20 font-extrabold"
                                : "bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700/80 text-gray-600 dark:text-gray-300 hover:border-primary/60 hover:text-gray-900 dark:hover:text-white"
                        )}
                        type="button"
                    >
                        {grade}
                    </motion.button>
                );
            })}
        </div>
    );
}
