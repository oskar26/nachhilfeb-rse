import { motion, useReducedMotion } from 'framer-motion';
import { Smartphone, DoorOpen, BadgeCheck, KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* Single Source of Truth für die Schüler-Verifizierung (beschlossene Wahrheit
   laut DESIGN.md-Nachträgen): 3 Schritte im Schulhof-Ton, OHNE Code.
   Anmelden → im SV-Raum melden (wörtliche Rede) → freigeschaltet = verifiziert.
   Copy ist wörtlich aus den bisherigen Seiten übernommen, nichts erfunden. */

const easeOut = [0.16, 1, 0.3, 1] as const;

export type VerifyTone = 'du' | 'sie';
export type VerifyVariant = 'spotlight' | 'chips' | 'rows' | 'rows-dark';

interface VerifyStep {
    icon: LucideIcon;
    title: string;
    text: string;
}

const STEPS_DU: VerifyStep[] = [
    { icon: Smartphone, title: 'Melde dich an', text: 'Account anlegen — dauert keine große Pause.' },
    { icon: DoorOpen, title: 'Komm in den SV-Raum', text: 'Sag einfach: „Hey, ich habe mich angemeldet, ich möchte mich verifizieren lassen."' },
    { icon: BadgeCheck, title: 'Wir schalten dich frei — du bist verifiziert.', text: 'Erst dann kannst du Anzeigen erstellen und Kontakt aufnehmen.' },
];

const STEPS_SIE: VerifyStep[] = [
    { icon: Smartphone, title: 'Anmelden', text: 'Ihr Kind erstellt seinen Account in der App.' },
    { icon: DoorOpen, title: 'Im SV-Raum melden', text: 'Ihr Kind sagt dem SV-Team: „Ich möchte mich verifizieren lassen."' },
    { icon: BadgeCheck, title: 'Freigeschaltet = verifiziert', text: 'Erst dann kann Ihr Kind Anzeigen erstellen und Kontakt aufnehmen.' },
];

export interface VerifyStepsProps {
    /* Tonfall: 'du' für Schüler-Seiten, 'sie' für den Eltern-Leitfaden. */
    tone?: VerifyTone;
    /* Optik je Einbauort (Klassen 1:1 aus den bisherigen Seiten, nur Inhalt vereinheitlicht). */
    variant?: VerifyVariant;
    /* Optionale Zusatzzeile: scort den einzigen legitimen Code-Fall exakt ein —
       nur Eltern-Verknüpfung, nicht Schüler-Verifizierung. */
    parentNote?: boolean;
}

function ParentNote({ dark }: { dark: boolean }) {
    return (
        <p className={`mt-3 flex items-start gap-2 text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
            <KeyRound size={15} className={`mt-0.5 shrink-0 ${dark ? 'text-primary' : 'text-amber-700'}`} aria-hidden />
            <span>
                <strong className={dark ? 'text-white' : 'text-gray-900'}>Nur die Eltern-Verknüpfung braucht einen Code</strong>
                {' '}— die Schüler-Verifizierung nicht.
            </span>
        </p>
    );
}

export default function VerifySteps({ tone = 'du', variant = 'rows', parentNote = false }: VerifyStepsProps) {
    const steps = tone === 'sie' ? STEPS_SIE : STEPS_DU;
    const reduceMotion = useReducedMotion();
    /* Liste als Liste: 3-Schritt-Stagger, Total-Delay 180 ms (Cap ~400 ms). */
    const stepAnim = (i: number) => reduceMotion ? {} : {
        initial: { opacity: 0, y: 14 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px 0px' },
        transition: { duration: 0.5, delay: i * 0.09, ease: easeOut },
    };

    if (variant === 'spotlight') {
        return (
            <>
                <ol className="mt-8 space-y-0">
                    {steps.map((s, i) => (
                        <motion.li key={s.title} {...stepAnim(i)} className="relative flex gap-5 pb-8 last:pb-0">
                            {i < 2 && <span className="absolute left-[27px] top-14 bottom-0 w-0.5 bg-white/10" aria-hidden />}
                            <span className="grid place-items-center w-14 h-14 rounded-2xl bg-primary text-black font-display text-xl shrink-0 z-10" aria-hidden>{i + 1}</span>
                            <div className="pt-1">
                                <p className="font-bold text-white text-lg inline-flex items-center gap-2"><s.icon size={18} className="text-primary" aria-hidden />{s.title}</p>
                                <p className="mt-1 text-sm text-gray-400 leading-relaxed">{s.text}</p>
                            </div>
                        </motion.li>
                    ))}
                </ol>
                {parentNote && <ParentNote dark />}
            </>
        );
    }

    if (variant === 'chips') {
        return (
            <>
                <ol className="mt-3 flex flex-wrap gap-2">
                    {steps.map((s, i) => (
                        <motion.li key={s.title} {...stepAnim(i)} className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-mono tabular-nums font-bold text-gray-900 dark:text-white" aria-hidden>{i + 1}</span>
                            <span><strong className="text-gray-900 dark:text-white">{s.title}:</strong> {s.text}</span>
                        </motion.li>
                    ))}
                </ol>
                {parentNote && <ParentNote dark={false} />}
            </>
        );
    }

    if (variant === 'rows-dark') {
        return (
            <>
                <ol className="mt-3 space-y-0 border-t border-white/10">
                    {steps.map((s, i) => (
                        <motion.li key={s.title} {...stepAnim(i)} className="flex gap-4 py-3 border-b border-white/10">
                            <span className="grid place-items-center w-8 h-8 rounded-full bg-primary text-black font-bold text-xs font-mono tabular-nums shrink-0" aria-hidden>
                                {i + 1}
                            </span>
                            <div className="min-w-0">
                                <p className="font-bold text-white text-[15px]">{s.title}</p>
                                <p className="mt-0.5 text-sm leading-relaxed text-gray-300">{s.text}</p>
                            </div>
                        </motion.li>
                    ))}
                </ol>
                {parentNote && <ParentNote dark />}
            </>
        );
    }

    return (
        <>
            <ol className="divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
                {steps.map((s, i) => (
                    <motion.li key={s.title} {...stepAnim(i)} className="grid grid-cols-[2.5rem_1fr] gap-3 py-3">
                        <span className="font-mono tabular-nums font-bold text-gray-900 dark:text-white" aria-hidden>{i + 1}</span>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{s.title}</p>
                            <p>{s.text}</p>
                        </div>
                    </motion.li>
                ))}
            </ol>
            {parentNote && <ParentNote dark={false} />}
        </>
    );
}
