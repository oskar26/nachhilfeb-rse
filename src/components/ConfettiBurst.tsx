import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';

// Plakat-Palette: Gelb, Schwarz, Papier, Blau, Grün, Lila
const CONFETTI_COLORS = ['#FACC15', '#09090b', '#faf7ef', '#1d4ed8', '#16a34a', '#9333ae'];

// Deterministischer Pseudo-Zufall (rein, stabil über Renders).
const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
};

interface ConfettiParticle {
    id: number;
    x: number;
    y: number;
    rotate: number;
    delay: number;
    duration: number;
    color: string;
    width: number;
    height: number;
    round: boolean;
}

/**
 * Kleiner Konfetti-Burst ohne Dependency (framer-motion only).
 * Rein dekorativ: pointer-events-none, aria-hidden, reduziert Bewegung komplett.
 * Wird per Portal in document.body gerendert, damit kein transformierter
 * Vorfahre die fixed-Positionierung verschieben kann (gleiches Muster wie Dialog).
 */
export default function ConfettiBurst() {
    const reduceMotion = useReducedMotion();

    const particles = useMemo<ConfettiParticle[]>(() => {
        const count = 26;
        return Array.from({ length: count }, (_, i) => {
            const r = (offset: number) => pseudoRandom(i * 8 + offset);
            const angle = (Math.PI * 2 * i) / count + r(1) * 0.6;
            const distance = 90 + r(2) * 150;
            return {
                id: i,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance - 60,
                rotate: (r(3) - 0.5) * 720,
                delay: r(4) * 0.12,
                duration: 1 + r(5) * 0.4,
                color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                width: 6 + r(6) * 6,
                height: 4 + r(7) * 5,
                round: r(8) > 0.7,
            };
        });
    }, []);

    if (reduceMotion || typeof document === 'undefined') return null;

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden="true" data-testid="confetti-burst">
            <div className="absolute left-1/2 top-[38%]">
                {particles.map(p => (
                    <motion.span
                        key={p.id}
                        className="absolute block"
                        style={{
                            width: p.width,
                            height: p.height,
                            backgroundColor: p.color,
                            borderRadius: p.round ? '9999px' : '2px',
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.9 }}
                        transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
                    />
                ))}
            </div>
        </div>,
        document.body
    );
}
