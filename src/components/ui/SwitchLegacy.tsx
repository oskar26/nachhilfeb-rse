import * as React from 'react';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';

interface SwitchProps {
    checked: boolean;
    onChange: () => void;
    /** Screenreader-Label; wird visuell versteckt. */
    label: string;
    disabled?: boolean;
    className?: string;
}

/**
 * Reiner CSS-Switch (A3): bewusst ohne framer-motion `layout`, weil dessen
 * automatisch geschriebener Transform die Tailwind-`translate-x-*`-Klasse
 * überschreibt und der Knopf dann nicht sichtbar wandert.
 */
export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => {
                if (disabled) return;
                triggerHaptic('selection');
                onChange();
            }}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 select-none disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700',
                className
            )}
        >
            <span className="sr-only">{label}</span>
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out',
                    checked ? 'translate-x-5' : 'translate-x-0'
                )}
            />
        </button>
    );
}
