import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ChipIcon = ComponentType<{ size?: number | string; className?: string }>;

/**
 * Typ-Punkt-Chip: helle Pille mit farbigem Punkt für die Strom-Kategorie
 * (Anfrage eingehend/ausgehend, Match, Merkliste).
 */
export function TypeChip({ label, dotClass, icon: Icon }: { label: string; dotClass: string; icon?: ChipIcon }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} aria-hidden />
            {Icon && <Icon size={12} className="shrink-0" aria-hidden />}
            <span className="truncate">{label}</span>
        </span>
    );
}

/**
 * Status-Chip: helle Pille mit farbigem Punkt (gelb offen, grün läuft,
 * rot abgelehnt, grau erledigt/gemerkt).
 */
export function StatusChip({ label, dotClass }: { label: string; dotClass: string }) {
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} aria-hidden />
            {label}
        </span>
    );
}

/** Helle Kartusche im Feed-Stil: weiß, 1px graue Kante, weicher Schatten. */
export function StreamCardShell({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <article className={cn(
            'flex min-w-0 flex-col rounded-3xl border border-gray-200 bg-white p-4 shadow-soft transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-5 lg:p-6',
            className
        )}>
            {children}
        </article>
    );
}
