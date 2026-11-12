import { Badge } from '@/components/ui/badge';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

export type Subject =
    | 'deutsch' | 'englisch' | 'franzoesisch' | 'kunst' | 'griechisch' | 'latein' | 'musik' | 'literatur' | 'kultur'
    | 'geschichte' | 'paedagogik' | 'erdkunde' | 'philosophie' | 'sowi' | 'wirtschaft_gesell' | 'wirtschaft_politik'
    | 'biologie' | 'chemie' | 'informatik' | 'mathematik' | 'physik' | 'blauer_planet'
    | 'prakt_philosophie' | 'religion' | 'sport';

// Human readable labels
export const subjectLabelMap: Record<Subject, string> = {
    // Aufgabenfeld 1
    deutsch: 'Deutsch',
    englisch: 'Englisch',
    franzoesisch: 'Französisch',
    kunst: 'Kunst',
    griechisch: 'Griechisch',
    latein: 'Latein',
    musik: 'Musik',
    literatur: 'Literatur',
    kultur: 'Kultur',
    // Aufgabenfeld 2
    geschichte: 'Geschichte',
    paedagogik: 'Pädagogik',
    erdkunde: 'Erdkunde',
    philosophie: 'Philosophie',
    sowi: 'Sozialwiss.',
    wirtschaft_gesell: 'Wi & Gesell.',
    wirtschaft_politik: 'Wi & Politik',
    // Aufgabenfeld 3
    biologie: 'Biologie',
    chemie: 'Chemie',
    informatik: 'Informatik',
    mathematik: 'Mathematik',
    physik: 'Physik',
    blauer_planet: 'Blauer Planet',
    // Aufgabenfeld 4
    prakt_philosophie: 'Prakt. Philo',
    religion: 'Religion',
    sport: 'Sport',
};

export const SUBJECT_CATEGORIES = [
    {
        title: "Sprachlich, literarisch & künstlerisch",
        subjects: ['deutsch', 'englisch', 'franzoesisch', 'kunst', 'griechisch', 'latein', 'musik', 'literatur', 'kultur'] as Subject[]
    },
    {
        title: "Geistes- & gesellschaftswissenschaftlich",
        subjects: ['geschichte', 'paedagogik', 'erdkunde', 'philosophie', 'sowi', 'wirtschaft_gesell', 'wirtschaft_politik'] as Subject[]
    },
    {
        title: "Mathematisch, naturwissenschaftlich & technisch",
        subjects: ['biologie', 'chemie', 'informatik', 'mathematik', 'physik', 'blauer_planet'] as Subject[]
    },
    {
        title: "Sonstige Fächer",
        subjects: ['prakt_philosophie', 'religion', 'sport'] as Subject[]
    }
];

interface SubjectChipProps {
    subject: Subject;
    className?: string;
    onClick?: () => void;
    selected?: boolean;
}

export function SubjectChip({ subject, className, onClick, selected }: SubjectChipProps) {
    const label = subjectLabelMap[subject] ?? subject;
    const baseCls = cn(
        'inline-flex min-h-7 select-none items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
        onClick && 'min-h-11 cursor-pointer',
        selected ? 'border-foreground bg-muted text-foreground' : 'border-border bg-card text-foreground hover:bg-muted',
        className
    );

    if (!onClick) {
        return (
            <Badge variant="outline" className={cn('cursor-default rounded-md font-medium', baseCls)}>
                {label}
            </Badge>
        );
    }

    return (
        <button
            type="button"
            onClick={() => {
                triggerHaptic('light');
                onClick();
            }}
            aria-pressed={selected}
            className={baseCls}
        >
            {label}
        </button>
    );
}
