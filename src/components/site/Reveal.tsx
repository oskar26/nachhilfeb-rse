import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { DISTANCE, m, PAGE_ENTER } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface RevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

/* Sanftes Einblenden beim ersten Sichtbarwerden. Motion respektiert
   prefers-reduced-motion über MotionConfig; der Viewport wird nur einmal
   beobachtet. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
    const reduce = useReducedMotion();

    return (
        <m.div
            className={cn(className)}
            initial={reduce ? false : { opacity: 0, y: DISTANCE.enter }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.08, margin: '0px 0px -8% 0px' }}
            transition={{ ...PAGE_ENTER, delay: delay / 1000 }}
        >
            {children}
        </m.div>
    );
}
