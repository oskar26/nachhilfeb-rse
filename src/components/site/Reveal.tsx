import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { DISTANCE, m, SPRING } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface RevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

/* Organisches Einblenden beim ersten Sichtbarwerden. Der Viewport wird nur
   einmal beobachtet, damit die Seite beim Zurückscrollen ruhig bleibt. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
    const reduce = useReducedMotion();

    return (
        <m.div
            className={cn(className)}
            initial={reduce ? false : { opacity: 0, y: DISTANCE.reveal, scale: 0.992 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.12, margin: '0px 0px -6% 0px' }}
            transition={reduce ? { duration: 0 } : { ...SPRING.gentle, delay: delay / 1000 }}
        >
            {children}
        </m.div>
    );
}
