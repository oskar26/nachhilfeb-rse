import { motion, useReducedMotion } from 'framer-motion';
import { Smartphone, DoorOpen, BadgeCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* Single Source of Truth für die Schüler-Verifizierung (beschlossene Wahrheit
   laut DESIGN.md-Nachträgen): 3 Schritte im Schulhof-Ton, OHNE Code.
   Anmelden → im SV-Raum melden (wörtliche Rede) → freigeschaltet = verifiziert.
   Copy ist wörtlich aus den bisherigen Seiten übernommen, nichts erfunden. */

const easeOut = [0.16, 1, 0.3, 1] as const;

export type VerifyTone = 'du' | 'sie';
export type VerifyVariant = 'spotlight' | 'chips' | 'rows' | 'rows-dark' | 'timeline';

interface VerifyStep {
    icon: LucideIcon;
    title: string;
    text: string;
}

const STEPS_DU: VerifyStep[] = [
    { icon: Smartphone, title: 'Konto anlegen', text: 'Lege ein Konto mit deinen Angaben an.' },
    { icon: DoorOpen, title: 'Im SV-Raum melden', text: 'Sag dem SV-Team, dass du dich verifizieren lassen möchtest, und nenne deinen Namen.' },
    { icon: BadgeCheck, title: 'Freischaltung abwarten', text: 'Das SV-Team prüft, ob du das FWG besuchst, und schaltet dein Konto frei. Erst dann kannst du Anzeigen erstellen und Kontakt aufnehmen.' },
];

const STEPS_SIE: VerifyStep[] = [
    { icon: Smartphone, title: 'Konto anlegen', text: 'Ihr Kind erstellt sein Konto in der App.' },
    { icon: DoorOpen, title: 'Im SV-Raum melden', text: 'Ihr Kind nennt dem SV-Team seinen Namen und bittet um Verifizierung.' },
    { icon: BadgeCheck, title: 'Freischaltung abwarten', text: 'Das SV-Team prüft die Angaben und schaltet das Konto frei. Erst dann kann Ihr Kind Anzeigen erstellen und Kontakt aufnehmen.' },
];

export interface VerifyStepsProps {
    /* Tonfall: 'du' für Schüler-Seiten, 'sie' für den Eltern-Leitfaden. */
    tone?: VerifyTone;
    /* Optik je Einbauort (Klassen 1:1 aus den bisherigen Seiten, nur Inhalt vereinheitlicht). */
    variant?: VerifyVariant;
}

export default function VerifySteps({ tone = 'du', variant = 'rows' }: VerifyStepsProps) {
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
                            {i < 2 && <span className="absolute left-[27px] top-14 bottom-0 w-0.5 bg-foreground/10" aria-hidden />}
                            <span className="grid place-items-center w-14 h-14 rounded-xl bg-muted text-foreground text-xl font-semibold shrink-0 z-10" aria-hidden>{i + 1}</span>
                            <div className="pt-1">
                                <p className="text-lg font-semibold text-foreground inline-flex items-center gap-2"><s.icon size={18} className="text-muted-foreground" aria-hidden />{s.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                            </div>
                        </motion.li>
                    ))}
                </ol>
            </>
        );
    }

    if (variant === 'timeline') {
        const circleTones = [
            'bg-pastel-blue text-pastel-blue-foreground',
            'bg-pastel-yellow text-pastel-yellow-foreground',
            'bg-pastel-mint text-pastel-mint-foreground',
        ];
        return (
            <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
                {steps.map((s, i) => (
                    <motion.li key={s.title} {...stepAnim(i)} className="relative pl-16 sm:pl-0">
                        {i < steps.length - 1 && (
                            <span aria-hidden className="absolute left-[23px] top-12 h-[calc(100%+2rem)] w-0.5 rounded-full bg-pastel-mint-foreground/30 sm:left-14 sm:top-6 sm:h-0.5 sm:w-[calc(100%-2rem)]" />
                        )}
                        <span className={`relative z-10 grid size-12 place-items-center rounded-full ${circleTones[i]}`} aria-hidden>
                            <s.icon size={21} strokeWidth={2} />
                        </span>
                        <p className="mt-4 text-base font-bold text-foreground">{s.title}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                    </motion.li>
                ))}
            </ol>
        );
    }

    if (variant === 'chips') {
        return (
            <>
                <ol className="mt-3 flex flex-wrap gap-2">
                    {steps.map((s, i) => (
                        <motion.li key={s.title} {...stepAnim(i)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                            <span className="tabular-nums font-semibold text-foreground" aria-hidden>{i + 1}</span>
                            <span><strong className="text-foreground">{s.title}:</strong> {s.text}</span>
                        </motion.li>
                    ))}
                </ol>
            </>
        );
    }

    if (variant === 'rows-dark') {
        return (
            <>
                <ol className="mt-3 space-y-0 border-t border-border">
                    {steps.map((s, i) => (
                        <motion.li key={s.title} {...stepAnim(i)} className="flex gap-4 py-3 border-b border-border">
                            <span className="grid place-items-center w-8 h-8 rounded-lg bg-muted text-foreground font-semibold text-xs tabular-nums shrink-0" aria-hidden>
                                {i + 1}
                            </span>
                            <div className="min-w-0">
                                <p className="font-semibold text-foreground text-base">{s.title}</p>
                                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                            </div>
                        </motion.li>
                    ))}
                </ol>
            </>
        );
    }

    return (
        <>
            <ol className="divide-y divide-border border-y border-border">
                {steps.map((s, i) => (
                    <motion.li key={s.title} {...stepAnim(i)} className="grid grid-cols-[2.5rem_1fr] gap-3 py-3">
                        <span className="tabular-nums font-semibold text-foreground" aria-hidden>{i + 1}</span>
                        <div>
                            <p className="font-semibold text-foreground">{s.title}</p>
                            <p>{s.text}</p>
                        </div>
                    </motion.li>
                ))}
            </ol>
        </>
    );
}
