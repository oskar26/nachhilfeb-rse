import { cn } from '../lib/utils';

interface GradeSelectorProps {
    selectedGrades: string[];
    onChange: (grades: string[]) => void;
    className?: string;
}

const GRADES = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];

export function GradeSelector({ selectedGrades, onChange, className }: GradeSelectorProps) {
    const toggleGrade = (grade: string) => {
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
                    <button
                        key={grade}
                        onClick={() => toggleGrade(grade)}
                        className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border transition-all",
                            isSelected
                                ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md" // Yellow when selected
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary"
                        )}
                        type="button"
                    >
                        {grade}
                    </button>
                );
            })}
        </div>
    );
}
