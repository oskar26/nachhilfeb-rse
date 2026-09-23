import { ShieldCheck, BadgeCheck, KeyRound, Mail, Check } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import StaticLayout from '../components/StaticLayout';
import VerifySteps from '../components/VerifySteps';

const easeOut = [0.16, 1, 0.3, 1] as const;

type AnimFn = (delay?: number) => Record<string, unknown>;

function SpecRowDark({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
    return (
        <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[11rem_1fr] sm:gap-4 border-t border-white/10 first:border-t-0">
            <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</dt>
            <dd className={`text-[15px] leading-7 text-gray-200 ${mono ? 'font-mono tabular-nums' : ''}`}>{children}</dd>
        </div>
    );
}

function CheckRow({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex gap-3 py-3 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
            <span className="grid place-items-center w-7 h-7 rounded-full bg-black text-primary dark:bg-primary dark:text-black shrink-0 mt-0.5" aria-hidden>
                <Check size={15} />
            </span>
            <span className="text-[15px] leading-7 text-gray-600 dark:text-gray-300">{children}</span>
        </li>
    );
}

const PARENT_STEPS = [
    { n: '1', t: 'Registrieren', d: 'Elternkonto mit dem SV-Einladungscode für Eltern erstellen.' },
    { n: '2', t: 'Code anfragen', d: '6-stelligen Freigabe-Code unter „Einstellungen“ Ihres Kindes zeigen lassen.' },
    { n: '3', t: 'Verknüpfen', d: 'Code im Eltern-Dashboard eingeben — sofort aktiv.' },
];

export default function ParentGuide() {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    /* Read-Modus: ruhiger als die Landing — dezenter Authored Reveal (y 18, 0.55 s). */
    const anim: AnimFn = (delay = 0) => reduceMotion ? {} : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.55, delay, ease: easeOut },
    };
    /* clip-path statt scaleX(0): zero-width-Rects blockieren IntersectionObserver (Chromium). */
    const wipeLine = (delay = 0.2) => reduceMotion ? {} : {
        initial: { clipPath: 'inset(0 100% 0 0)' },
        whileInView: { clipPath: 'inset(0 0% 0 0)' },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.5, delay, ease: easeOut },
    };

    return (
        <StaticLayout
            title="Leitfaden für Eltern"
            intro="Verifizierte Accounts, SV-Moderation und faire Preise halten Nachhilfe sicher."
        >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 min-w-0 flex flex-col gap-10 sm:gap-12">

                {/* A: Schwarze Spec-Karte im Plakat-Stil (ohne Eyebrow — die H2 trägt das Gewicht) */}
                <motion.section
                    aria-labelledby="eltern-sicherheit"
                    {...anim()}
                    className="rounded-3xl bg-zinc-900 dark:bg-zinc-900 text-white p-6 sm:p-8 shadow-soft border border-white/15"
                >
                    <div className="flex items-center gap-3">
                        <span className="grid place-items-center w-11 h-11 rounded-2xl bg-primary text-black shrink-0" aria-hidden>
                            <ShieldCheck size={22} />
                        </span>
                        <h2 id="eltern-sicherheit" className="font-display uppercase text-2xl sm:text-3xl tracking-tight">
                            Sicherheit & Verifizierung
                        </h2>
                    </div>
                    <motion.span {...wipeLine()} className="mt-2 ml-14 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    <dl className="mt-5">
                        <SpecRowDark label="Zugang">Nur Schülerinnen und Schüler des Friedrich-Wilhelm-Gymnasiums.</SpecRowDark>
                        <SpecRowDark label="Verifizierung">Persönlich im SV-Raum — ohne Code, einfach melden.</SpecRowDark>
                        <SpecRowDark label="Treffen">Meist direkt in der Schule, z. B. Bibliothek oder Mensa.</SpecRowDark>
                        <SpecRowDark label="Schutz">Unverifizierte Konten bleiben eingeschränkt und können deaktiviert werden.</SpecRowDark>
                    </dl>
                    <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Verifizierung in 3 Schritten
                    </h3>
                    <VerifySteps tone="sie" variant="rows-dark" parentNote />
                </motion.section>

                {/* B: Helle Preis-Tafel mit Preis in Mono */}
                <motion.section
                    aria-labelledby="eltern-qualitaet"
                    {...anim()}
                    className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft"
                >
                    <h2 id="eltern-qualitaet" className="font-display uppercase text-2xl sm:text-3xl tracking-tight text-gray-900 dark:text-white">
                        Qualität der Nachhilfe
                    </h2>
                    <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    <div className="mt-5 space-y-3 text-[15px] leading-7 text-gray-600 dark:text-gray-300 max-w-prose">
                        <p>
                            <strong className="text-gray-900 dark:text-white">Wer hilft:</strong> Engagierte Schülerinnen und Schüler ab Klasse 8 — viele aus der Coaching-AG.
                        </p>
                        <p>
                            <strong className="text-gray-900 dark:text-white">Coaching-AG:</strong> Schüler-Coaching AG von Frau Balistreri für die Stufen 5 und 6 — alle Regeln auf der{' '}
                            <Link to="/coaching" className="font-bold text-amber-700 dark:text-primary hover:underline">Coaching-Seite</Link>.
                        </p>
                    </div>
                    <div className="mt-6 rounded-2xl bg-gray-950 dark:bg-black p-5 sm:p-6">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Faire Preise</p>
                        <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-primary">
                            ca. 10–15 € / 45 Min
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-300">
                            Fair von Schülern für Schüler.
                        </p>
                    </div>
                </motion.section>

                {/* C: Awareness & Kontakt als schlichte Checkliste */}
                <motion.section
                    aria-labelledby="eltern-awareness"
                    {...anim()}
                    className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft"
                >
                    <div className="flex items-center gap-3">
                        <span className="grid place-items-center w-11 h-11 rounded-2xl bg-black text-primary dark:bg-primary dark:text-black shrink-0" aria-hidden>
                            <BadgeCheck size={22} />
                        </span>
                        <h2 id="eltern-awareness" className="font-display uppercase text-2xl sm:text-3xl tracking-tight text-gray-900 dark:text-white">
                            Awareness & Kontakt
                        </h2>
                    </div>
                    <motion.span {...wipeLine()} className="mt-2 ml-14 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    <ul className="mt-5">
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Melden:</strong> Jede Anzeige und jedes Profil lässt sich mit Begründung melden.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Prüfen:</strong> Das SV-Team sichtet Meldungen täglich.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Konsequenz:</strong> Verwarnung oder sofortige Sperrung bei Verstößen.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Primär-Kontakt:</strong>{' '}
                            <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a>
                            {' '}— Fragen und Hilfe rund um die Börse.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Hinweis:</strong> Vergütung und Umfang vereinbaren Sie direkt mit der Anbieter-Familie — das SV-Team vermittelt nur den Kontakt.
                        </CheckRow>
                    </ul>
                </motion.section>

                {/* D: Schwarzer CTA-Block mit der einzigen CTA der Seite */}
                <motion.section
                    aria-labelledby="eltern-konto"
                    {...anim()}
                    className="rounded-3xl bg-gray-950 dark:bg-gray-900 text-white p-6 sm:p-10 shadow-soft text-center"
                >
                    <h2 id="eltern-konto" className="font-display uppercase text-2xl sm:text-3xl tracking-tight flex items-center justify-center gap-2">
                        <KeyRound className="text-primary" size={24} aria-hidden /> Eltern-Account einrichten
                    </h2>
                    <motion.span {...wipeLine()} className="mx-auto mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    <p className="mt-4 text-[15px] leading-7 text-gray-300 max-w-2xl mx-auto">
                        Verknüpfen Sie Ihr Elternkonto mit dem Konto Ihres Kindes und behalten Sie Anzeigen und Anfragen im Blick.
                    </p>
                    <ol className="mt-6 grid gap-3 text-left max-w-2xl mx-auto">
                        {PARENT_STEPS.map(s => (
                            <li key={s.n} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                <span className="grid place-items-center w-8 h-8 rounded-full bg-primary text-black font-bold text-xs font-mono tabular-nums shrink-0" aria-hidden>
                                    {s.n}
                                </span>
                                <span className="min-w-0">
                                    <span className="font-bold text-[15px] block">{s.t}</span>
                                    <span className="text-sm text-gray-300 block leading-relaxed">{s.d}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
                        <Mail size={15} className="text-primary" aria-hidden />
                        Fragen dazu: <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a>
                    </p>
                    <Button onClick={() => navigate('/login')} size="lg" className="mt-5 bg-primary hover:bg-primary-hover text-black font-extrabold px-8 shadow-glow transition-all rounded-full min-h-[48px]">
                        Jetzt Eltern-Account erstellen
                    </Button>
                </motion.section>

            </div>
        </StaticLayout>
    );
}
