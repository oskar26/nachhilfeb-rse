import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface SocialFilterOption {
    key: string;
    label: string;
    count?: number;
}

interface SocialFilterPillsProps {
    options: SocialFilterOption[];
    value: string;
    onChange: (key: string) => void;
    ariaLabel: string;
}

/**
 * Typ-Filter als helle Pills mit Zählern. Die aktive Pille trägt den gelben
 * Akzent als gleitendes layoutId-Element – der eine Umschalt-Moment der Seite.
 */
export function SocialFilterPills({ options, value, onChange, ariaLabel }: SocialFilterPillsProps) {
    const reduceMotion = useReducedMotion();
    return (
        <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
            {options.map(option => {
                const isActive = option.key === value;
                return (
                    <button
                        key={option.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                            if (!isActive) onChange(option.key);
                        }}
                        className={cn(
                            'relative inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
                            isActive
                                ? 'border-primary text-black'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                        )}
                    >
                        {isActive && (
                            <motion.span
                                layoutId="social-filter-pill"
                                className="absolute inset-0 rounded-full bg-primary"
                                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                                aria-hidden
                            />
                        )}
                        <span className="relative z-10">{option.label}</span>
                        {typeof option.count === 'number' && (
                            <span
                                className={cn(
                                    'relative z-10 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-black leading-none tabular-nums',
                                    isActive ? 'bg-white text-amber-950' : 'bg-primary text-amber-950'
                                )}
                            >
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
