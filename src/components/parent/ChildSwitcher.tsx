import { Plus, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';
import type { ChildView } from './types';

/**
 * Kind-Leiste über dem Leitstand. Bei genau einem Kind ein ruhiger Steckbrief-
 * Streifen, bei mehreren Kindern ein umschaltbarer Tab-Riegel mit Avataren.
 */
export function ChildSwitcher({
    children: kids,
    activeId,
    onSelect,
    onAdd
}: {
    children: ChildView[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onAdd: () => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {kids.map((k) => {
                const active = k.profile.id === activeId;
                const name = k.profile.display_name || k.profile.full_name || 'Kind';
                return (
                    <button
                        key={k.linkId}
                        type="button"
                        onClick={() => {
                            triggerHaptic('light');
                            onSelect(k.profile.id);
                        }}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                            'press flex min-h-11 items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-colors',
                            active
                                ? 'border-gray-950 bg-gray-950 text-white dark:border-primary dark:bg-primary dark:text-black'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        )}
                    >
                        <Avatar url={k.profile.avatar_url} name={name} size="sm" />
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-bold leading-tight">{name}</span>
                            <span className={cn(
                                'block truncate text-[10px] font-semibold uppercase tracking-wide',
                                active ? 'text-white/60 dark:text-black/60' : 'text-gray-400 dark:text-gray-500'
                            )}>
                                {gradeLabel(k)}
                            </span>
                        </span>
                        {active && <Check size={15} className="ml-1 shrink-0 opacity-80" aria-hidden />}
                    </button>
                );
            })}

            <button
                type="button"
                onClick={() => {
                    triggerHaptic('light');
                    onAdd();
                }}
                className="press flex min-h-11 items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-3.5 py-2 text-sm font-bold text-gray-600 hover:border-primary hover:text-gray-950 dark:border-gray-700 dark:text-gray-300 dark:hover:border-primary dark:hover:text-white"
            >
                <Plus size={16} aria-hidden />
                Kind verknüpfen
            </button>
        </div>
    );
}

export function Avatar({
    url,
    name,
    size = 'md',
    className
}: {
    url?: string | null;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const dims = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-12 w-12 text-base';
    const initial = (name || '?').trim().charAt(0).toUpperCase();
    return (
        <span className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300', dims, className)}>
            {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
                <span aria-hidden>{initial}</span>
            )}
        </span>
    );
}

function gradeLabel(k: ChildView): string {
    const g = k.profile.grade_level;
    const c = k.profile.class_letter;
    if (!g) return 'Klassenstufe offen';
    return c ? `Klasse ${g}${c}` : `Klassenstufe ${g}`;
}
