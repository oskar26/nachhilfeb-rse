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
    deutsch: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200',
    englisch: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200',
    franzoesisch: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200',
    kunst: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-200',
    griechisch: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200',
    latein: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200',
    musik: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200',
    literatur: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200',
    kultur: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-200',
    geschichte: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
    paedagogik: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
    erdkunde: 'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-200',
    philosophie: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
    sowi: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200',
    wirtschaft_gesell: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200',
    wirtschaft_politik: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200',
    biologie: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-200',
    chemie: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
    informatik: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200',
    mathematik: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200',
    physik: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-200',
    blauer_planet: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200',
    prakt_philosophie: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
    religion: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
    sport: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
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
        onClick && 'min-h-11 cursor-pointer hover:-translate-y-0.5',
        tone,
        selected && 'ring-2 ring-current ring-offset-2 ring-offset-background',
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
            {label}
        </button>
    );
}
