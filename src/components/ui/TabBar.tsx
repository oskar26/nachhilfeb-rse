import { useRef, type ComponentType, type KeyboardEvent } from 'react';
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
 * Gemeinsame Tab-Leiste (A1): gleich breite Spalten per CSS-Grid, aktiver
 * Zustand als reine Farbfläche – keine `layoutId`-Pille, damit beim Wechsel
 * nichts flackert oder springt. Zähler-Badges haben eine Mindestbreite.
 * Pfeiltasten/Home/End bewegen den Fokus (Roving Tabindex).
 */
export function TabBar<T extends string = string>({ items, value, onChange, ariaLabel, className, idPrefix }: TabBarProps<T>) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
        tabRefs.current[nextIndex]?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={cn(
                'grid w-full gap-1 rounded-2xl border border-gray-200/60 bg-white p-1 shadow-sm dark:border-gray-800/80 dark:bg-gray-900 sm:p-1.5',
                className
            )}
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
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
                            'flex min-h-[40px] min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5 text-xs font-bold transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:focus-visible:ring-primary sm:px-2 sm:text-sm',
                            isActive
                                ? 'bg-primary text-amber-950'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                        )}
                    >
                        {Icon && <Icon aria-hidden="true" size={16} className={cn('shrink-0', !isActive && 'text-gray-400')} />}
                        <span className="truncate">{item.label}</span>
                        {typeof item.count === 'number' && item.count > 0 && (
                            <span
                                className={cn(
                                    'inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums',
                                    isActive ? 'bg-black/15 text-amber-950' : 'bg-red-500 text-white'
                                )}
                            >
                                {item.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
