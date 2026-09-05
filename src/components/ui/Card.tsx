import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
    haptic?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, interactive, haptic = true, onClick, ...props }, ref) => {
        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
            if (interactive && haptic) {
                triggerHaptic('light');
            }
            if (onClick) onClick(e);
        };

        const cardContent = (
            <div
                ref={ref}
                className={cn(
                    'rounded-2xl border border-gray-100 bg-white/90 shadow-soft text-gray-950 transition-all dark:bg-gray-900/70 dark:border-gray-800/80 dark:text-gray-50 dark:shadow-none',
                    interactive && 'cursor-pointer hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700/80',
                    className
                )}
                onClick={handleClick}
                {...props}
            />
        );

        if (interactive) {
            return (
                <motion.div
                    whileHover={{ y: -3, transition: { duration: 0.2, ease: "easeOut" } }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                    {cardContent}
                </motion.div>
            );
        }

        return cardContent;
    }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            'text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100',
            className
        )}
        {...props}
    />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-gray-500 dark:text-gray-400 leading-relaxed', className)}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center p-6 pt-0', className)}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
