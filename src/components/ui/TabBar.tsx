import { useId, useRef, type ComponentType, type KeyboardEvent } from 'react';
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
 * Helle Pillen-Tab-Leiste im Feed-Stil: inaktive Pills weiß mit grauer Kante,
 * aktive Pill gelb (bg-primary) mit schwarzem Text – analog zu den Feed-Filter-Pills.
 * Zähler-Badges wie activeFilterCount im Feed. Icons + gleich breite Spalten per
 * CSS-Grid; ab 6 Einträgen wird horizontal scrollbar-frei gescrollt statt gequetscht
 * (Eltern-Leitstand: 7 Tabs). Pfeiltasten/Home/End bewegen den Fokus (Roving
 * Tabindex) — API unverändert.
 */
export function TabBar<T extends string = string>({ items, value, onChange, ariaLabel, className, idPrefix }: TabBarProps<T>) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const groupId = useId();
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
                'relative w-full min-w-0',
                scrollable ? 'no-scrollbar flex gap-2 overflow-x-auto pb-1' : 'grid gap-2',
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
                        id={idPrefix ? `${idPrefix}-tab-${item.key}` : `${groupId}-tab-${item.key}`}
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
                            'relative flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 sm:text-sm',
                            scrollable ? 'shrink-0 whitespace-nowrap px-4' : 'min-w-0',
                            isActive
                                ? 'bg-primary text-black border-primary shadow-sm font-bold dark:bg-primary dark:text-black dark:border-primary'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800 dark:hover:text-gray-200'
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-1.5">
                            {Icon && (
                                <Icon
                                    aria-hidden
                                    size={16}
                                    className={cn('shrink-0', isActive ? 'text-black dark:text-black' : 'text-gray-400 dark:text-gray-500')}
                                />
                            )}
                            <span className={scrollable ? undefined : 'truncate'}>{item.label}</span>
                            {typeof item.count === 'number' && item.count > 0 && (
                                <span
                                    className={cn(
                                        'inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none tabular-nums',
                                        isActive ? 'bg-white text-amber-950' : 'bg-primary text-amber-950'
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
