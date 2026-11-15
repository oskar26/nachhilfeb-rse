import { useRef, type KeyboardEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { triggerHaptic } from '../../lib/haptics';
import { m, SPRING } from '../../lib/motion';
import { cn } from '../../lib/utils';
import {
    SOCIAL_FILTER_PANEL_ID,
    nextFilterIndex,
    socialFilterTabId,
} from './filterNavigation';

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
    className?: string;
}

/**
 * Mobile Social switcher: four equal segments whose single yellow surface
 * glides between them. Labels stay on one line and the count sits underneath,
 * so the whole control fits from 360px without horizontal scrolling.
 * Desktop keeps the sidebar navigation.
 */
export function SocialFilterPills({ options, value, onChange, ariaLabel, className }: SocialFilterPillsProps) {
    const reduceMotion = useReducedMotion();
    const tabRefs = useRef<Array<HTMLElement | null>>([]);

    const activate = (key: string) => {
        if (key === value) return;
        triggerHaptic('selection');
        onChange(key);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
        const nextIndex = nextFilterIndex(index, options.length, event.key);
        if (nextIndex === null) return;
        event.preventDefault();
        activate(options[nextIndex].key);
        tabRefs.current[nextIndex]?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            aria-orientation="horizontal"
            className={cn(
                'grid min-h-12 grid-cols-4 gap-0.5 rounded-full border border-border bg-card p-1 shadow-soft',
                className
            )}
        >
            {options.map((option, index) => {
                const isActive = option.key === value;
                return (
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        key={option.key}
                        ref={element => { tabRefs.current[index] = element; }}
                        id={socialFilterTabId(option.key)}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        aria-controls={SOCIAL_FILTER_PANEL_ID}
                        tabIndex={isActive ? 0 : -1}
                        hapticStyle={false}
                        onClick={() => activate(option.key)}
                        onKeyDown={event => handleKeyDown(event, index)}
                        className={cn(
                            'relative isolate flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 py-1 text-[13px] font-semibold leading-none tracking-[-0.02em] transition-colors',
                            isActive
                                ? 'text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                    >
                        {isActive && (
                            <m.span
                                aria-hidden
                                layoutId={reduceMotion ? undefined : 'social-filter-active'}
                                initial={false}
                                transition={reduceMotion ? { duration: 0 } : SPRING.settle}
                                className="absolute inset-0 -z-10 rounded-full bg-primary shadow-soft"
                            />
                        )}
                        <span className="relative z-10 max-w-full truncate whitespace-nowrap">{option.label}</span>
                        {typeof option.count === 'number' && (
                            <span
                                className={cn(
                                    'relative z-10 text-[13px] font-bold leading-none tabular-nums',
                                    isActive ? 'text-primary-foreground/75' : 'text-muted-foreground'
                                )}
                            >
                                {option.count}
                                <span className="sr-only"> Einträge</span>
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    );
}
