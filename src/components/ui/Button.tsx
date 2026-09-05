import * as React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';
import type { HapticStyle } from '../../lib/haptics';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    hapticStyle?: HapticStyle | false;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps & HTMLMotionProps<"button">>(
    ({ className, variant = 'primary', size = 'md', isLoading, hapticStyle, children, onClick, disabled, ...props }, ref) => {

        const variants = {
            primary: 'bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-md hover:shadow-lg dark:shadow-yellow-500/10',
            secondary: 'bg-white text-gray-900 border border-gray-200/80 shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700/80 dark:text-gray-100 dark:hover:bg-gray-750',
            outline: 'border border-gray-200 bg-transparent hover:bg-gray-100/60 text-gray-900 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800/60',
            ghost: 'hover:bg-gray-100/80 hover:text-gray-900 dark:hover:bg-gray-800/80 dark:hover:text-gray-100',
            destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs gap-1.5',
            md: 'h-11 px-6 py-2 text-sm gap-2',
            lg: 'h-13 px-8 text-base gap-2.5',
            icon: 'h-10 w-10 p-0',
        };

        const isDisabled = disabled || isLoading;

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (isDisabled) return;
            if (hapticStyle !== false) {
                const style = hapticStyle ?? (variant === 'primary' || variant === 'destructive' ? 'medium' : 'light');
                triggerHaptic(style);
            }
            if (onClick) onClick(e);
        };

        return (
            <motion.button
                ref={ref}
                whileHover={isDisabled ? undefined : { scale: 1.02, y: -1 }}
                whileTap={isDisabled ? undefined : { scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={isDisabled}
                onClick={handleClick}
                {...(props as any)}
            >
                {isLoading ? (
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : null}
                {children}
            </motion.button>
        );
    }
);
Button.displayName = 'Button';

export { Button };
