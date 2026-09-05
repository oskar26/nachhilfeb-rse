import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

export type Subject =
    | 'deutsch' | 'englisch' | 'franzoesisch' | 'kunst' | 'griechisch' | 'latein' | 'musik' | 'literatur' | 'kultur'
    | 'geschichte' | 'paedagogik' | 'erdkunde' | 'philosophie' | 'sowi' | 'wirtschaft_gesell' | 'wirtschaft_politik'
    | 'biologie' | 'chemie' | 'informatik' | 'mathematik' | 'physik' | 'blauer_planet'
    | 'prakt_philosophie' | 'religion' | 'sport';

const subjectColorMap: Record<Subject, string> = {
    // Aufgabenfeld 1
    deutsch: 'bg-yellow-100/90 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200 border border-yellow-200/80 dark:border-yellow-800/50',
    englisch: 'bg-blue-100/90 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/50',
    franzoesisch: 'bg-blue-100/90 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/50',
    kunst: 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-900 dark:from-pink-950/60 dark:to-purple-950/60 dark:text-pink-200 border border-pink-200/80 dark:border-pink-800/50',
    griechisch: 'bg-pink-100/90 text-pink-900 dark:bg-pink-950/60 dark:text-pink-200 border border-pink-200/80 dark:border-pink-800/50',
    latein: 'bg-pink-100/90 text-pink-900 dark:bg-pink-950/60 dark:text-pink-200 border border-pink-200/80 dark:border-pink-800/50',
    musik: 'bg-purple-100/90 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border border-purple-200/80 dark:border-purple-800/50',
    literatur: 'bg-indigo-100/90 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800/50',
    kultur: 'bg-fuchsia-100/90 text-fuchsia-900 dark:bg-fuchsia-950/60 dark:text-fuchsia-200 border border-fuchsia-200/80 dark:border-fuchsia-800/50',

    // Aufgabenfeld 2
    geschichte: 'bg-amber-100/90 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/50',
    paedagogik: 'bg-orange-100/90 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200 border border-orange-200/80 dark:border-orange-800/50',
    erdkunde: 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/50',
    philosophie: 'bg-violet-100/90 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200 border border-violet-200/80 dark:border-violet-800/50',
    sowi: 'bg-rose-100/90 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800/50',
    wirtschaft_gesell: 'bg-red-100/90 text-red-900 dark:bg-red-950/60 dark:text-red-200 border border-red-200/80 dark:border-red-800/50',
    wirtschaft_politik: 'bg-red-100/90 text-red-900 dark:bg-red-950/60 dark:text-red-200 border border-red-200/80 dark:border-red-800/50',

    // Aufgabenfeld 3
    biologie: 'bg-green-100/90 text-green-900 dark:bg-green-950/60 dark:text-green-200 border border-green-200/80 dark:border-green-800/50',
    chemie: 'bg-teal-100/90 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/50',
    informatik: 'bg-slate-100/90 text-slate-900 dark:bg-slate-800/60 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700/50',
    mathematik: 'bg-green-100/90 text-green-900 dark:bg-green-950/60 dark:text-green-200 border border-green-200/80 dark:border-green-800/50',
    physik: 'bg-cyan-100/90 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200 border border-cyan-200/80 dark:border-cyan-800/50',
    blauer_planet: 'bg-gradient-to-r from-cyan-100 to-blue-100 text-blue-900 dark:from-cyan-950/60 dark:to-blue-950/60 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/50',

    // Aufgabenfeld 4
    prakt_philosophie: 'bg-violet-100/90 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200 border border-violet-200/80 dark:border-violet-800/50',
    religion: 'bg-yellow-100/90 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200 border border-yellow-200/80 dark:border-yellow-800/50',
    sport: 'bg-zinc-100/90 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-700/50',
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
    const handleClick = () => {
        triggerHaptic('light');
        if (onClick) onClick();
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={handleClick}
            className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer select-none",
                subjectColorMap[subject],
                selected && "ring-2 ring-offset-1 ring-primary shadow-md dark:ring-offset-gray-950 font-extrabold",
                className
            )}
        >
            {subjectLabelMap[subject]}
        </motion.button>
    );
}
