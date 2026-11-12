import { Check } from 'lucide-react';
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

const SUBJECT_TONES: Record<Subject, string> = {
    deutsch: 'bg-pastel-violet text-pastel-violet-foreground',
    englisch: 'bg-pastel-blue text-pastel-blue-foreground',
    franzoesisch: 'bg-pastel-blue text-pastel-blue-foreground',
    kunst: 'bg-pastel-rose text-pastel-rose-foreground',
    griechisch: 'bg-pastel-blue text-pastel-blue-foreground',
    latein: 'bg-pastel-teal text-pastel-teal-foreground',
    musik: 'bg-pastel-violet text-pastel-violet-foreground',
    literatur: 'bg-pastel-violet text-pastel-violet-foreground',
    kultur: 'bg-pastel-rose text-pastel-rose-foreground',
    geschichte: 'bg-pastel-orange text-pastel-orange-foreground',
    paedagogik: 'bg-pastel-orange text-pastel-orange-foreground',
    erdkunde: 'bg-pastel-mint text-pastel-mint-foreground',
    philosophie: 'bg-pastel-gray text-pastel-gray-foreground',
    sowi: 'bg-pastel-teal text-pastel-teal-foreground',
    wirtschaft_gesell: 'bg-pastel-blue text-pastel-blue-foreground',
    wirtschaft_politik: 'bg-pastel-blue text-pastel-blue-foreground',
    biologie: 'bg-pastel-mint text-pastel-mint-foreground',
    chemie: 'bg-pastel-mint text-pastel-mint-foreground',
    informatik: 'bg-pastel-teal text-pastel-teal-foreground',
    mathematik: 'bg-pastel-rose text-pastel-rose-foreground',
    physik: 'bg-pastel-teal text-pastel-teal-foreground',
    blauer_planet: 'bg-pastel-blue text-pastel-blue-foreground',
    prakt_philosophie: 'bg-pastel-gray text-pastel-gray-foreground',
    religion: 'bg-pastel-gray text-pastel-gray-foreground',
    sport: 'bg-pastel-gray text-pastel-gray-foreground',
};

interface SubjectChipProps {
    subject: Subject;
    className?: string;
    onClick?: () => void;
    selected?: boolean;
}

export function SubjectChip({ subject, className, onClick, selected }: SubjectChipProps) {
    const label = subjectLabelMap[subject] ?? subject;
    const tone = SUBJECT_TONES[subject] ?? SUBJECT_TONES.sport;
    const baseCls = cn(
        'inline-flex min-h-7 select-none items-center gap-1 rounded-full border border-transparent px-3 py-1 text-xs font-semibold transition-[background-color,border-color,box-shadow,transform] duration-150',
        onClick && 'min-h-12 cursor-pointer hover:-translate-y-0.5',
        tone,
        selected && 'border-2 border-primary bg-primary-soft text-primary-soft-foreground',
        className
    );

    if (!onClick) {
        return (
            <Badge variant="outline" className={cn('h-auto cursor-default border-transparent font-semibold', baseCls)}>
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
            {selected && <Check size={13} aria-hidden />}
            {label}
        </button>
    );
}
