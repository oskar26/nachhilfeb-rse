import * as React from 'react';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    haptic?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, haptic = true, onFocus, ...props }, ref) => {
        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            if (haptic) {
                triggerHaptic('light');
            }
            if (onFocus) onFocus(e);
        };

        return (
            <input
                type={type}
                className={cn(
                    'flex h-11 w-full rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700/80 dark:bg-gray-800/80 dark:text-gray-50 dark:placeholder:text-gray-500 dark:focus-visible:border-primary dark:focus-visible:ring-primary/40',
                    className
                )}
                ref={ref}
                onFocus={handleFocus}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

export { Input };
