import { useId, useRef, type ComponentType, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';

type TabIcon = ComponentType<{ size?: number | string; className?: string }>;

export interface TabBarItem<T extends string = string> {
    key: T;
    label: string;
    /** Optionaler Zähler; rendert ein Badge mit fester Mindestbreite (kein Springen). */
    count?: number;
    /** Optionales Icon links vom Label. */
    icon?: TabIcon;
}

interface TabBarProps<T extends string = string> {
    items: TabBarItem<T>[];
    value: T;
    onChange: (value: T) => void;
    ariaLabel?: string;
    className?: string;
    /** Optionales id-Präfix für role=tab/aria-controls (z. B. "social" -> "social-tab-requests"). */
    idPrefix?: string;
}

/**
 * Plakat-Tab-Leiste (Redesign): schwarze Segment-Pille mit gelbem Aktiv-Segment.
 * Der Aktiv-Zustand wandert als framer-motion-`layoutId`-Fläche (pro Instanz
 * eindeutig via useId) — kein Flackern, kein Springen. Icons + Zähler-Badges,
 * gleich breite Spalten per CSS-Grid; ab 6 Einträgen wird horizontal
 * scrollbar-frei gescrollt statt gequetscht (Eltern-Leitstand: 7 Tabs).
 * Pfeiltasten/Home/End bewegen den Fokus (Roving Tabindex) — API unverändert.
 */
export function TabBar<T extends string = string>({ items, value, onChange, ariaLabel, className, idPrefix }: TabBarProps<T>) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const indicatorId = `tab-indicator-${useId()}`;
    const reduceMotion = useReducedMotion();
    const scrollable = items.length > 5;

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number;
        switch (event.key) {
            case 'ArrowRight':
                nextIndex = (index + 1) % items.length;
                break;
            case 'ArrowLeft':
                nextIndex = (index - 1 + items.length) % items.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = items.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        const nextKey = items[nextIndex].key;
        if (nextKey !== value) {
            triggerHaptic('selection');
            onChange(nextKey);
        }
        const next = tabRefs.current[nextIndex];
        next?.focus();
        if (scrollable) next?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={cn(
                'relative w-full rounded-2xl border border-black/70 bg-gray-950 p-1 shadow-soft dark:border-white/10 dark:bg-gray-900 sm:p-1.5',
                scrollable ? 'no-scrollbar flex gap-1 overflow-x-auto' : 'grid gap-1',
                className
            )}
            style={scrollable ? undefined : { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
            {items.map((item, index) => {
                const isActive = item.key === value;
                const Icon = item.icon;
                return (
                    <button
                        key={item.key}
                        ref={element => { tabRefs.current[index] = element; }}
                        type="button"
                        role="tab"
                        id={idPrefix ? `${idPrefix}-tab-${item.key}` : undefined}
                        aria-selected={isActive}
                        aria-controls={idPrefix ? `${idPrefix}-tabpanel-${item.key}` : undefined}
                        tabIndex={isActive ? 0 : -1}
                        onKeyDown={event => handleKeyDown(event, index)}
                        onClick={() => {
                            if (isActive) return;
                            triggerHaptic('selection');
                            onChange(item.key);
                        }}
                        className={cn(
                            'relative flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 dark:focus-visible:ring-offset-gray-900 sm:text-sm',
                            scrollable ? 'shrink-0 whitespace-nowrap px-3.5' : 'min-w-0',
                            isActive ? 'text-gray-950' : 'text-gray-400 hover:text-white'
                        )}
                    >
                        {isActive && (
                            <motion.span
                                layoutId={indicatorId}
                                className="absolute inset-0 rounded-xl bg-primary"
                                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}
                                aria-hidden
                            />
                        )}
                        <span className="relative z-10 flex min-w-0 items-center gap-1.5">
                            {Icon && <Icon aria-hidden size={16} className={cn('shrink-0', isActive ? 'text-gray-950' : 'text-gray-500')} />}
                            <span className={scrollable ? undefined : 'truncate'}>{item.label}</span>
                            {typeof item.count === 'number' && item.count > 0 && (
                                <span
                                    className={cn(
                                        'inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums',
                                        isActive ? 'bg-gray-950/15 text-gray-950' : 'bg-primary/20 text-primary'
                                    )}
                                >
                                    {item.count}
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
