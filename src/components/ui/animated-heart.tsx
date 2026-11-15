import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';

interface AnimatedHeartProps {
    filled: boolean;
    size?: number;
    className?: string;
}

/**
 * Kleine Merkliste-Rückmeldung: Der Umriss bleibt stehen, der gefüllte
 * Herz-Zustand poppt beim Hinzufügen darüber. Bei reduzierter Bewegung
 * wechselt der Zustand ohne Skalierung.
 */
export function AnimatedHeart({ filled, size = 18, className }: AnimatedHeartProps) {
    const reduceMotion = useReducedMotion();

    return (
        <span
            aria-hidden="true"
            className={cn('relative inline-grid shrink-0 place-items-center', className)}
            style={{ width: size, height: size }}
        >
            <Heart size={size} className="absolute inset-0" fill="none" />
            <AnimatePresence initial={false}>
                {filled && (
                    <m.span
                        key="filled-heart"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.45, rotate: -14 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55, rotate: 8 }}
                        transition={reduceMotion ? { duration: 0 } : SPRING.press}
                        className="absolute inset-0 inline-flex"
                    >
                        <Heart size={size} fill="currentColor" />
                    </m.span>
                )}
            </AnimatePresence>
        </span>
    );
}
