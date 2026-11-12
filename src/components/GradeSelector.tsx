import { Button } from '@/components/ui/button';
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
        <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label="Klassenstufen">
            {GRADES.map(grade => {
                const isSelected = selectedGrades.includes(grade);
                return (
                    <Button
                        key={grade}
                        variant="unstyled"
                        size="unstyled"
                        hapticStyle={false}
                        onClick={() => toggleGrade(grade)}
                        aria-pressed={isSelected}
                        className={cn(
                            "flex h-12 min-w-12 select-none items-center justify-center rounded-full border px-3.5 text-sm font-semibold transition-colors",
                            isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground"
                        )}
                        type="button"
                    >
                        {grade}
                    </Button>
                );
            })}
        </div>
    );
}
