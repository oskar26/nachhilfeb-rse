import { ShieldCheck, BadgeCheck, Mail, Check, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import StaticLayout from '../components/StaticLayout';
import VerifySteps from '../components/VerifySteps';

const easeOut = [0.16, 1, 0.3, 1] as const;

type AnimFn = (delay?: number) => Record<string, unknown>;

function SpecRowDark({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
    return (
        <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[11rem_1fr] sm:gap-4 border-t border-black/10 first:border-t-0">
            <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</dt>
            <dd className={`text-[15px] leading-7 text-gray-700 ${mono ? 'font-mono tabular-nums' : ''}`}>{children}</dd>
        </div>
    );
}

function CheckRow({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex gap-3 py-3 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
            <span className="grid place-items-center w-7 h-7 rounded-full bg-primary text-black shrink-0 mt-0.5" aria-hidden>
                <Check size={15} />
            </span>
            <span className="text-[15px] leading-7 text-gray-600 dark:text-gray-300">{children}</span>
        </li>
    );
}

export default function ParentGuide() {
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
            intro="Kein eigener Eltern-Account, kein Verknüpfungscode: Eltern betreuen die Nachhilfe gemeinsam mit ihrem Kind – hier steht, wie das geht und was die Börse sicher macht."
        >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 min-w-0 flex flex-col gap-10 sm:gap-12">

                {/* A: Helle Spec-Karte im Papier-Stil (ohne Eyebrow — die H2 trägt das Gewicht) */}
                <motion.section
                    aria-labelledby="eltern-sicherheit"
                    {...anim()}
                    className="rounded-3xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 sm:p-8 shadow-soft border border-black/5 dark:border-gray-800"
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
                        <SpecRowDark label="Zugang">Konten legen nur Schülerinnen und Schüler des Friedrich-Wilhelm-Gymnasiums an.</SpecRowDark>
                        <SpecRowDark label="Verifizierung">Schüler persönlich im SV-Raum, ohne Code. Einfach melden.</SpecRowDark>
                        <SpecRowDark label="Gemeinsam">Ihr Kind nutzt seinen Schüler-Account; Sie schauen und unterstützen gemeinsam – ein eigener Eltern-Account ist nicht nötig.</SpecRowDark>
                        <SpecRowDark label="Treffen">Meist direkt in der Schule, z. B. Bibliothek oder Mensa.</SpecRowDark>
                        <SpecRowDark label="Schutz">Unverifizierte Konten bleiben eingeschränkt und können deaktiviert werden.</SpecRowDark>
                    </dl>
                    <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                        Verifizierung in 3 Schritten
                    </h3>
                    <VerifySteps tone="sie" variant="rows" />
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
                            <strong className="text-gray-900 dark:text-white">Wer hilft:</strong> Engagierte Schülerinnen und Schüler ab Klasse 8, viele aus der Coaching-AG.
                        </p>
                        <p>
                            <strong className="text-gray-900 dark:text-white">Coaching-AG:</strong> Schüler-Coaching AG von Frau Balistreri für die Stufen 5 und 6. Alle Regeln stehen auf der{' '}
                            <Link to="/coaching" className="font-bold text-amber-700 dark:text-primary hover:underline">Coaching-Seite</Link>.
                        </p>
                    </div>
                    <div className="mt-6 rounded-2xl bg-[#faf7ef] dark:bg-gray-900 border border-black/10 dark:border-gray-800 p-5 sm:p-6">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Faire Preise</p>
                        <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-amber-600 dark:text-primary">
                            ca. 10–12 € / 45–60 Min
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            Fair von Schülern für Schüler: Richtwert der Nachhilfebörse.
                        </p>
                    </div>
                </motion.section>

                {/* C: Gemeinsame Betreuung — kein Eltern-Account, kein Verknüpfungscode */}
                <motion.section
                    aria-labelledby="eltern-gemeinsam"
                    {...anim()}
                    className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft"
                >
                    <div className="flex items-center gap-3">
                        <span className="grid place-items-center w-11 h-11 rounded-2xl bg-primary text-black shrink-0" aria-hidden>
                            <Users size={22} />
                        </span>
                        <h2 id="eltern-gemeinsam" className="font-display uppercase text-2xl sm:text-3xl tracking-tight text-gray-900 dark:text-white">
                            Gemeinsam betreuen
                        </h2>
                    </div>
                    <motion.span {...wipeLine()} className="mt-2 ml-14 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    <p className="mt-5 text-[15px] leading-7 text-gray-600 dark:text-gray-300 max-w-prose">
                        Sie brauchen weder einen eigenen Account noch einen Verknüpfungscode. Die Betreuung läuft
                        gemeinsam über den Schüler-Account Ihres Kindes:
                    </p>
                    <ul className="mt-5">
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Ein Konto, gemeinsam genutzt:</strong> Ihr Kind nutzt seinen verifizierten Schüler-Account; Sie schauen und unterstützen mit – zum Beispiel beim Erstellen von Anzeigen oder beim Durchgehen von Anfragen.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Nichts zu verknüpfen:</strong> Es gibt keinen Eltern-Account und keinen Code. Öffnen Sie die Börse einfach gemeinsam mit Ihrem Kind.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Gemeinsam im Blick:</strong> Anzeigen, Anfragen, passende Matches und Merkliste können Sie zusammen durchgehen.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Grenzen respektieren:</strong> Die Chat-Nachrichten gehören Ihrem Kind. Die Börse legt dafür bewusst keine Eltern-Zugänge an.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Fragen & Beschwerden:</strong> Wenden Sie sich jederzeit an das SV-Team unter{' '}
                            <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a>.
                        </CheckRow>
                    </ul>
                </motion.section>

                {/* D: Awareness & Kontakt als schlichte Checkliste */}
                <motion.section
                    aria-labelledby="eltern-awareness"
                    {...anim()}
                    className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft"
                >
                    <div className="flex items-center gap-3">
                        <span className="grid place-items-center w-11 h-11 rounded-2xl bg-primary text-black shrink-0" aria-hidden>
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
                            <strong className="text-gray-900 dark:text-white">Keine Zahlungen:</strong> Die Börse wickelt keine Zahlungen ab. Vergütung und Umfang vereinbaren Sie direkt mit der Anbieter-Familie.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-gray-900 dark:text-white">Primär-Kontakt:</strong>{' '}
                            <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a>
                            {'. Fragen und Hilfe rund um die Börse.'}
                        </CheckRow>
                    </ul>
                </motion.section>

                {/* E: Gelber CTA-Block mit der einzigen Aktion der Seite */}
                <motion.section
                    aria-labelledby="eltern-kontakt"
                    {...anim()}
                    className="rounded-3xl bg-primary text-black p-6 sm:p-10 shadow-soft text-center"
                >
                    <h2 id="eltern-kontakt" className="font-display uppercase text-2xl sm:text-3xl tracking-tight flex items-center justify-center gap-2">
                        <Users className="text-black" size={24} aria-hidden /> Gemeinsam mit Ihrem Kind
                    </h2>
                    <motion.span {...wipeLine()} className="mx-auto mt-2 block h-1 w-10 origin-left rounded-full bg-black" aria-hidden />
                    <p className="mt-4 text-[15px] leading-7 text-black/80 max-w-2xl mx-auto">
                        Kein eigener Eltern-Account, kein Verknüpfungscode: Ihr Kind nutzt seinen Schüler-Account,
                        Sie schauen und unterstützen gemeinsam. Bei Fragen, Problemen oder Beschwerden hilft das SV-Team.
                    </p>
                    <p className="mt-6 flex items-center justify-center gap-2 text-sm text-black/70">
                        <Mail size={15} className="text-black" aria-hidden />
                        Kontakt: <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-black underline break-anywhere">info@nachhilfe-sv.de</a>
                    </p>
                    <Button
                        onClick={() => { window.location.href = 'mailto:info@nachhilfe-sv.de'; }}
                        size="lg"
                        className="mt-5 bg-white hover:bg-black/5 text-black font-extrabold px-8 shadow-md border border-black/10 transition-all rounded-full min-h-[48px]"
                    >
                        Fragen? Schreiben Sie uns
                    </Button>
                </motion.section>

            </div>
        </StaticLayout>
    );
}
