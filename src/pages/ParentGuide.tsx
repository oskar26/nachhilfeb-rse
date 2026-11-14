import { ShieldCheck, BadgeCheck, Mail, Check, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { buttonVariants } from '../components/ui/button';
import StaticLayout from '../components/StaticLayout';
import VerifySteps from '../components/VerifySteps';

const easeOut = [0.16, 1, 0.3, 1] as const;

type AnimFn = (delay?: number) => Record<string, unknown>;

function SpecRowDark({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
    return (
        <div className="grid gap-1 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
            <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
            <dd className={`text-base leading-7 text-foreground ${mono ? 'tabular-nums' : ''}`}>{children}</dd>
        </div>
    );
}

function CheckRow({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex gap-3 border-t border-border py-3 first:border-t-0">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-foreground" aria-hidden>
                <Check size={16} />
            </span>
            <span className="text-base leading-7 text-muted-foreground">{children}</span>
        </li>
    );
}

export default function ParentGuide() {
    const reduceMotion = useReducedMotion();
    /* Read-Modus: ruhiger als die Landing — dezenter Authored Reveal (y 18, 0.55 s).
       Nur Transform, keine Opacity: Inhalt bleibt bei Full-Page/Print sofort sichtbar. */
    const anim: AnimFn = (delay = 0) => reduceMotion ? {} : {
        initial: { y: 18 },
        whileInView: { y: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.55, delay, ease: easeOut },
    };
    return (
        <StaticLayout
            title="Leitfaden für Eltern"
            intro="Ein Konto pro Kind, je nach Alter gemeinsam betreut oder selbstständig genutzt. Hier steht, wie das geht und was die Börse für Sicherheit tut."
        >
            <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-10 px-4 pb-16 sm:gap-12 sm:px-6">

                {/* A: Helle Spec-Karte im Papier-Stil (ohne Eyebrow — die H2 trägt das Gewicht) */}
                <motion.section
                    aria-labelledby="eltern-sicherheit"
                    {...anim()}
                    className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8"
                >
                    <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-foreground" aria-hidden>
                            <ShieldCheck size={24} />
                        </span>
                        <h2 id="eltern-sicherheit" className="min-w-0 break-words text-2xl tracking-tight sm:text-3xl">
                            Sicherheit &amp; Verifizierung
                        </h2>
                    </div>
                    <dl className="mt-5">
                        <SpecRowDark label="Zugang">Konten legen nur Schülerinnen und Schüler des Friedrich-Wilhelm-Gymnasiums an.</SpecRowDark>
                        <SpecRowDark label="Verifizierung">Ihr Kind meldet sich persönlich im SV-Raum und wird dort freigeschaltet.</SpecRowDark>
                        <SpecRowDark label="Gemeinsam">Ihr Kind nutzt sein Konto, Sie schauen und unterstützen mit. Wie eng Sie begleiten, entscheiden Sie gemeinsam.</SpecRowDark>
                        <SpecRowDark label="Treffen">Meist direkt in der Schule, z. B. Bibliothek oder Mensa.</SpecRowDark>
                        <SpecRowDark label="Schutz">Unverifizierte Konten bleiben eingeschränkt und können deaktiviert werden.</SpecRowDark>
                    </dl>
                    <h3 className="mt-6 text-sm font-semibold text-muted-foreground">
                        Verifizierung in 3 Schritten
                    </h3>
                    <div className="[&_li]:transform-none! [&_li]:opacity-100!">
                        <VerifySteps tone="sie" variant="rows" />
                    </div>
                </motion.section>

                {/* B: Helle Preis-Tafel mit Preis in Mono */}
                <motion.section
                    aria-labelledby="eltern-qualitaet"
                    {...anim()}
                    className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8"
                >
                    <h2 id="eltern-qualitaet" className="text-2xl tracking-tight sm:text-3xl">
                        Qualität der Nachhilfe
                    </h2>
                    <div className="mt-5 max-w-prose space-y-3 text-base leading-7 text-muted-foreground">
                        <p>
                            <strong className="text-foreground">Wer hilft:</strong> Engagierte Schülerinnen und Schüler ab Klasse 8, viele aus der Coaching-AG.
                        </p>
                        <p>
                            <strong className="text-foreground">Coaching-AG:</strong> Coaching-AG von Frau Balistreri für die Stufen 5 und 6. Alle Regeln stehen auf der{' '}
                            <Link to="/coaching" className="font-semibold text-foreground hover:underline">Coaching-Seite</Link>.
                        </p>
                    </div>
                    <div className="mt-6 border-y border-border py-4">
                        <p className="text-sm font-semibold text-muted-foreground">Richtwert</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
                            ca. 12 € pro Stunde
                        </p>
                        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                            Richtwert der Nachhilfebörse. Der Preis ist individuell anpassbar. Die Nachhilfe wird privat bezahlt.
                        </p>
                    </div>
                </motion.section>

                {/* C: Gemeinsame Betreuung — ein Konto, altersgerechte Begleitung */}
                <motion.section
                    aria-labelledby="eltern-gemeinsam"
                    {...anim()}
                    className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8"
                >
                    <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-foreground" aria-hidden>
                            <Users size={24} />
                        </span>
                        <h2 id="eltern-gemeinsam" className="min-w-0 break-words text-2xl tracking-tight sm:text-3xl">
                            Gemeinsam betreuen
                        </h2>
                    </div>
                    <p className="mt-5 max-w-prose text-base leading-7 text-muted-foreground">
                        Die Börse läuft über das Konto Ihres Kindes. Wie viel Begleitung Ihr Kind braucht,
                        entscheiden Sie gemeinsam:
                    </p>
                    <ul className="mt-5">
                        <CheckRow>
                            <strong className="text-foreground">Ein Konto pro Kind, das Sie mitbetreuen:</strong> Ihr Kind nutzt sein Konto, Sie schauen und unterstützen mit. Zum Beispiel beim Erstellen von Anzeigen oder beim Durchgehen von Anfragen.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-foreground">Altersgerecht begleiten:</strong> In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung. Ältere Schülerinnen und Schüler nutzen die Börse meist selbstständig.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-foreground">Gemeinsam im Blick:</strong> Anzeigen, Anfragen, passende Vorschläge und Merkliste können Sie zusammen durchgehen.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-foreground">Grenzen respektieren:</strong> Die Chat-Nachrichten gehören Ihrem Kind. So bleibt ihm ein eigener Raum, ganz gleich wie eng Sie begleiten.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-foreground">Fragen &amp; Beschwerden:</strong> Wenden Sie sich jederzeit an das SV-Team unter{' '}
                            <a href="mailto:info@nachhilfe-sv.de" className="break-anywhere font-semibold text-foreground hover:underline">info@nachhilfe-sv.de</a>.
                        </CheckRow>
                    </ul>
                </motion.section>

                {/* D: Awareness & Kontakt als schlichte Checkliste */}
                <motion.section
                    aria-labelledby="eltern-awareness"
                    {...anim()}
                    className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8"
                >
                    <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-foreground" aria-hidden>
                            <BadgeCheck size={24} />
                        </span>
                        <h2 id="eltern-awareness" className="min-w-0 break-words text-2xl tracking-tight sm:text-3xl">
                            Awareness &amp; Kontakt
                        </h2>
                    </div>
                    <ul className="mt-5">
                        <CheckRow>
                            <strong className="text-foreground">Melden:</strong> Jede Anzeige und jedes Profil lässt sich mit Begründung melden.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-foreground">Prüfen:</strong> Das SV-Team sichtet Meldungen mindestens einmal pro Woche, oft auch häufiger.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-foreground">Konsequenz:</strong> Verwarnung oder sofortige Sperrung bei Verstößen.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-foreground">Keine Zahlungen:</strong> Die Börse wickelt keine Zahlungen ab. Vergütung und Umfang vereinbaren Sie direkt mit der Anbieter-Familie.
                        </CheckRow>
                        <CheckRow>
                            <strong className="text-foreground">Primär-Kontakt:</strong>{' '}
                            <a href="mailto:info@nachhilfe-sv.de" className="break-anywhere font-semibold text-foreground hover:underline">info@nachhilfe-sv.de</a>
                            {'. Fragen und Hilfe rund um die Börse.'}
                        </CheckRow>
                    </ul>
                </motion.section>

                {/* E: Gelber CTA-Block mit der einzigen Aktion der Seite */}
                <motion.section
                    aria-labelledby="eltern-kontakt"
                    {...anim()}
                    className="rounded-xl bg-card p-6 text-center text-card-foreground sm:p-10"
                >
                    <h2 id="eltern-kontakt" className="flex items-center justify-center gap-2 text-2xl tracking-tight sm:text-3xl">
                        <Users size={24} aria-hidden /> Gemeinsam mit Ihrem Kind
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                        Ihr Kind nutzt sein Konto, Sie schauen mit und unterstützen, so viel Sie möchten.
                        Bei Fragen, Problemen oder Beschwerden hilft das SV-Team.
                    </p>
                    <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Mail size={16} aria-hidden />
                        Kontakt: <a href="mailto:info@nachhilfe-sv.de" className="break-anywhere font-semibold text-foreground underline">info@nachhilfe-sv.de</a>
                    </p>
                    <a
                        href="mailto:info@nachhilfe-sv.de"
                        className={buttonVariants({ size: 'lg', className: 'mt-5 min-h-12 rounded-lg border border-border bg-background px-8 font-semibold text-foreground hover:bg-muted' })}
                    >
                        Fragen? Schreiben Sie uns
                    </a>
                </motion.section>

            </div>
        </StaticLayout>
    );
}
