import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { DISTANCE, m, SPRING } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * Einheitlicher Auftritt für öffentliche Seiten. Der Header bleibt stehen,
 * nur der Seiteninhalt gleitet kurz nach oben und blendet ein.
 */
export function PageEnter({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const reduce = useReducedMotion();

    return (
        <m.div
            className={cn(className)}
            initial={reduce ? false : { opacity: 0, y: DISTANCE.page }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : SPRING.settle}
        >
            {children}
        </m.div>
    );
}
