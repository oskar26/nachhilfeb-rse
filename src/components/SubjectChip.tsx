import { cn } from '../lib/utils';

// Mapping local simplified names to Tailwind config token keys or hex values
// Ideally we utilize the tailwind config classes like 'bg-subject-deutsch'.
// But for dynamic mapping, we might need a lookup or explicit class strings if they are not safe-listed.
// Since Tailwind scans files, constructing "bg-subject-${subject}" works only if the full string exists somewhere.
// Safest is a map object.

export type Subject =
    | 'deutsch' | 'englisch' | 'franzoesisch' | 'kunst' | 'griechisch' | 'latein' | 'musik' | 'literatur' | 'kultur'
    | 'geschichte' | 'paedagogik' | 'erdkunde' | 'philosophie' | 'sowi' | 'wirtschaft_gesell' | 'wirtschaft_politik'
    | 'biologie' | 'chemie' | 'informatik' | 'mathematik' | 'physik' | 'blauer_planet'
    | 'prakt_philosophie' | 'religion' | 'sport';

const subjectColorMap: Record<Subject, string> = {
    // Aufgabenfeld 1
    deutsch: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800/50',
    englisch: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800/50',
    franzoesisch: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800/50',
    kunst: 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 dark:from-pink-900/50 dark:to-purple-900/50 dark:text-pink-200 border border-pink-200 dark:border-pink-800/50',
    griechisch: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200 border border-pink-200 dark:border-pink-800/50',
    latein: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200 border border-pink-200 dark:border-pink-800/50',
    musik: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border border-purple-200 dark:border-purple-800/50',
    literatur: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/50',
    kultur: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200 border border-fuchsia-200 dark:border-fuchsia-800/50',

    // Aufgabenfeld 2
    geschichte: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50',
    paedagogik: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border border-orange-200 dark:border-orange-800/50',
    erdkunde: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/50',
    philosophie: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border border-violet-200 dark:border-violet-800/50',
    sowi: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-200 dark:border-rose-800/50',
    wirtschaft_gesell: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border border-red-200 dark:border-red-800/50',
    wirtschaft_politik: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border border-red-200 dark:border-red-800/50',

    // Aufgabenfeld 3
    biologie: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border border-green-200 dark:border-green-800/50',
    chemie: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200 border border-teal-200 dark:border-teal-800/50',
    informatik: 'bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-200 border border-slate-300 dark:border-slate-700/50',
    mathematik: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border border-green-200 dark:border-green-800/50',
    physik: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800/50',
    blauer_planet: 'bg-gradient-to-r from-cyan-100 to-blue-100 text-blue-800 dark:from-cyan-900/50 dark:to-blue-900/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800/50',

    // Aufgabenfeld 4
    prakt_philosophie: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border border-violet-200 dark:border-violet-800/50',
    religion: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800/50',
    sport: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700/50',
};

// Human readable labels
const subjectLabelMap: Record<Subject, string> = {
    // Aufgabenfeld 1
    deutsch: 'Deutsch',
    englisch: 'Englisch 🇬🇧',
    franzoesisch: 'Französisch 🇫🇷',
    kunst: 'Kunst 🎨',
    griechisch: 'Griechisch',
    latein: 'Latein',
    musik: 'Musik 🎵',
    literatur: 'Literatur',
    kultur: 'Kultur',
    // Aufgabenfeld 2
    geschichte: 'Geschichte',
    paedagogik: 'Pädagogik',
    erdkunde: 'Erdkunde 🌍',
    philosophie: 'Philosophie',
    sowi: 'Sozialwiss.',
    wirtschaft_gesell: 'Wi & Gesell.',
    wirtschaft_politik: 'Wi & Politik',
    // Aufgabenfeld 3
    biologie: 'Biologie 🧬',
    chemie: 'Chemie 🧪',
    informatik: 'Informatik 💻',
    mathematik: 'Mathematik 📐',
    physik: 'Physik ⚡',
    blauer_planet: 'Blauer Planet 🌎',
    // Aufgabenfeld 4
    prakt_philosophie: 'Prakt. Philo',
    religion: 'Religion',
    sport: 'Sport ⚽',
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
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95",
                subjectColorMap[subject],
                selected && "ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-100",
                className
            )}
        >
            {subjectLabelMap[subject]}
        </button>
    );
}
