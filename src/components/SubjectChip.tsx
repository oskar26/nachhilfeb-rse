import { Button } from '@/components/ui/button';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

export type Subject =
    | 'deutsch' | 'englisch' | 'franzoesisch' | 'kunst' | 'griechisch' | 'latein' | 'musik' | 'literatur' | 'kultur'
    | 'geschichte' | 'paedagogik' | 'erdkunde' | 'philosophie' | 'sowi' | 'wirtschaft_gesell' | 'wirtschaft_politik'
    | 'biologie' | 'chemie' | 'informatik' | 'mathematik' | 'physik' | 'blauer_planet'
    | 'prakt_philosophie' | 'religion' | 'sport';

const subjectColorMap: Record<Subject, string> = {
    // Aufgabenfeld 1 — jede Sprache/Kunst eigene, gedämpfte Datenfarbe
    deutsch: 'bg-yellow-100/80 text-yellow-900 border-yellow-200/70 dark:bg-yellow-950/50 dark:text-yellow-200 dark:border-yellow-800/50',
    englisch: 'bg-blue-100/80 text-blue-900 border-blue-200/70 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800/50',
    franzoesisch: 'bg-sky-100/80 text-sky-900 border-sky-200/70 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800/50',
    kunst: 'bg-pink-100/80 text-pink-900 border-pink-200/70 dark:bg-pink-950/50 dark:text-pink-200 dark:border-pink-800/50',
    griechisch: 'bg-pink-100/80 text-pink-900 border-pink-200/70 dark:bg-pink-950/50 dark:text-pink-200 dark:border-pink-800/50',
    latein: 'bg-stone-200/80 text-stone-900 border-stone-300/70 dark:bg-stone-800/50 dark:text-stone-200 dark:border-stone-700/50',
    musik: 'bg-purple-100/80 text-purple-900 border-purple-200/70 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800/50',
    literatur: 'bg-indigo-100/80 text-indigo-900 border-indigo-200/70 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800/50',
    kultur: 'bg-fuchsia-100/80 text-fuchsia-900 border-fuchsia-200/70 dark:bg-fuchsia-950/50 dark:text-fuchsia-200 dark:border-fuchsia-800/50',

    // Aufgabenfeld 2
    geschichte: 'bg-amber-100/80 text-amber-900 border-amber-200/70 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/50',
    paedagogik: 'bg-orange-100/80 text-orange-900 border-orange-200/70 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800/50',
    erdkunde: 'bg-emerald-100/80 text-emerald-900 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800/50',
    philosophie: 'bg-violet-100/80 text-violet-900 border-violet-200/70 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800/50',
    sowi: 'bg-rose-100/80 text-rose-900 border-rose-200/70 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800/50',
    wirtschaft_gesell: 'bg-stone-100/80 text-stone-900 border-stone-300/70 dark:bg-stone-800/50 dark:text-stone-200 dark:border-stone-700/50',
    wirtschaft_politik: 'bg-stone-100/80 text-stone-900 border-stone-300/70 dark:bg-stone-800/50 dark:text-stone-200 dark:border-stone-700/50',

    // Aufgabenfeld 3
    biologie: 'bg-green-100/80 text-green-900 border-green-200/70 dark:bg-green-950/50 dark:text-green-200 dark:border-green-800/50',
    chemie: 'bg-teal-100/80 text-teal-900 border-teal-200/70 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800/50',
    informatik: 'bg-stone-200/80 text-stone-900 border-stone-300/70 dark:bg-stone-800/50 dark:text-stone-200 dark:border-stone-700/50',
    mathematik: 'bg-red-100/80 text-red-900 border-red-200/70 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800/50',
    physik: 'bg-cyan-100/80 text-cyan-900 border-cyan-200/70 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-800/50',
    blauer_planet: 'bg-cyan-100/80 text-cyan-900 border-cyan-200/70 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-800/50',

    // Aufgabenfeld 4
    prakt_philosophie: 'bg-violet-200/80 text-violet-950 border-violet-300/70 dark:bg-violet-900/50 dark:text-violet-200 dark:border-violet-700/50',
    religion: 'bg-amber-200/80 text-amber-950 border-amber-300/70 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700/50',
    sport: 'bg-stone-100/80 text-stone-900 border-stone-300/70 dark:bg-stone-800/50 dark:text-stone-200 dark:border-stone-700/50',
};

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
    const baseCls = cn(
        "inline-flex select-none items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors",
        onClick ? "min-h-11 py-1.5" : "min-h-7 py-1",
        subjectColorMap[subject] ?? 'border-border bg-muted text-muted-foreground',
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        className
    );

    if (!onClick) {
        return (
            <span className={cn(baseCls, "cursor-default")}>
                {subjectLabelMap[subject] ?? subject}
            </span>
        );
    }

    const handleClick = () => {
        triggerHaptic('light');
        onClick();
    };

    return (
        <Button
            variant="unstyled"
            size="unstyled"
            hapticStyle={false}
            type="button"
            onClick={handleClick}
            aria-pressed={selected}
            className={cn(baseCls, "cursor-pointer")}
        >
            {subjectLabelMap[subject]}
        </Button>
    );
}
