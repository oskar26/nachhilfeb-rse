import * as React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {

        const variants = {
            primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg',
            secondary: 'bg-white text-gray-900 border border-transparent shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100',
            outline: 'border border-gray-200 bg-transparent hover:bg-gray-50 text-gray-900 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800',
            ghost: 'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100',
            destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-md',
        };

        const sizes = {
            sm: 'h-8 px-4 text-xs',
            md: 'h-11 px-6 py-2', /* Taller buttons */
            lg: 'h-14 px-8 text-lg',
            icon: 'h-10 w-10',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={props.disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : null}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

export { Button };
