import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown, Mail } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';
import VerifySteps from '../components/VerifySteps';

const easeOut = [0.16, 1, 0.3, 1] as const;

function scrollToId(id: string) {
    // Hinweis: Die App nutzt einen HashRouter (Routen wie #/nutzungsbedingungen).
    // Ein klassischer Anker-Link (href="#p1") würde den Hash ersetzen und damit
    // die Route zerstören (= 404-Seite). Deshalb scrollen wir per Button + DOM.
    // Geschlossene Details-Gruppen werden dabei zuerst geöffnet.
    const el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS' && !(el as HTMLDetailsElement).open) {
        (el as HTMLDetailsElement).open = true;
    }
    const reduce = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

// Listenwüsten vermeiden: Regeln als nummerierte Stapelliste (Copy unverändert).
function ParaList({ items, start = 1 }: { items: React.ReactNode[]; start?: number }) {
    return (
        <ol className="mt-2 divide-y divide-border border-y border-border">
            {items.map((item, i) => (
                <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-3 py-3">
                    <span className="font-semibold tabular-nums text-foreground" aria-hidden>
                        {String(start + i).padStart(2, '0')}
                    </span>
                    <div className="text-base leading-7 text-muted-foreground">{item}</div>
                </li>
            ))}
        </ol>
    );
}

function Para({ id, nr, title, children, open = false }: {
    id: string;
    nr: string;
    title: string;
    children: React.ReactNode;
    open?: boolean;
}) {
    return (
        <details
            id={id}
            open={open}
            className="group scroll-mt-24 rounded-xl border border-border bg-card"
        >
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-foreground" aria-hidden>
                    {nr}
                </span>
                <h3 className="flex-1 break-words tracking-tight text-lg text-foreground">{title}</h3>
                <ChevronDown size={20} className="shrink-0 text-foreground transition-transform duration-200 ease-out group-open:rotate-180" aria-hidden />
            </summary>
            <div className="accordion-body flex max-w-prose flex-col gap-3 px-5 pb-5 text-base leading-7 text-muted-foreground sm:px-6 sm:pb-6">
                {children}
            </div>
        </details>
    );
}

const MAIL_CLS = 'font-semibold text-foreground hover:underline break-anywhere';
const MAIL = 'info@nachhilfe-sv.de';

const toc = [
    { id: 'p1', label: '§ 1 Was ist die Nachhilfebörse?' },
    { id: 'p2', label: '§ 2 Wer darf mitmachen?' },
    { id: 'p3', label: '§ 3 Registrierung & Konto' },
    { id: 'p4', label: '§ 4 Regeln für Anzeigen' },
    { id: 'p5', label: '§ 5 Coaching-AG' },
    { id: 'p6', label: '§ 6 Kommunikation' },
    { id: 'p7', label: '§ 7 Moderation & Sanktionen' },
    { id: 'p8', label: '§ 8 Haftung' },
    { id: 'p9', label: '§ 9 Minderjährige & Vergütung' },
    { id: 'p10', label: '§ 10 Kündigung & Konto-Löschung' },
    { id: 'p11', label: '§ 11 Änderungen & Kontakt' },
];

const SANKTIONEN: Array<{ v: string; m: React.ReactNode }> = [
    { v: 'Leichter Verstoß (z. B. veraltete Anzeige, falsche Kategorie)', m: (<span><strong>Verwarnung</strong> mit Hinweis auf die verletzte Regel</span>) },
    { v: 'Rechtswidrige oder beleidigende Inhalte', m: (<span><strong>Entfernung einzelner Inhalte</strong> (Anzeigen, Bilder, Nachrichten)</span>) },
    { v: 'Schwere oder wiederholte Verstöße', m: (<span><strong>Zeitweise Sperrung</strong> (z. B. <span className="tabular-nums">7 Tage</span>) oder <strong>dauerhafte Sperrung</strong></span>) },
    { v: 'Pflichtverletzung als Coach', m: (<span><strong>Entzug des Coach-Status</strong> nach den Regeln der <Link to="/coaching" className="font-semibold text-foreground hover:underline">Coaching-Seite</Link></span>) },
];

export default function Nutzungsbedingungen() {
    const reduceMotion = useReducedMotion();
    const anim = (delay = 0) => reduceMotion ? {} : {
        initial: { y: 28 },
        whileInView: { y: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.7, delay, ease: easeOut },
    };
    return (
        <StaticLayout
            title="Nutzungsbedingungen"
            intro="Stand: Oktober 2026 · Betreiber: SV FWG Köln."
        >
            {/* Sektions-Rhythmus: Leseeinheiten innen eng (gap-4/5), Sektionen großzügig (gap-10/12). */}
            <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-10 px-4 pb-16 sm:gap-12 sm:px-6">
                {/* Leseeinheit 1: Zusammenfassung + Inhaltsübersicht gehören zusammen. */}
                <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                {/* Gelbe TL;DR-Box zum Einstieg (H2 trägt das Gewicht, kein Kicker) */}
                <motion.section
                    aria-labelledby="nutz-kurz"
                    {...anim()}
                    className="relative overflow-hidden rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8"
                >
                    <div className="absolute inset-0 " aria-hidden />
                    <div className="relative">
                        <h2 id="nutz-kurz" className="text-2xl tracking-tight">Kurz gesagt</h2>
                        <div className="mt-3 flex max-w-prose flex-col gap-2 text-base font-medium leading-7 text-muted-foreground">
                            <p>
                                Die Nachhilfebörse ist ein <strong className="text-foreground">kostenloses Schülerprojekt von Schülern für Schüler</strong>.
                                Du bist für deine Inhalte selbst verantwortlich, bleibst fair und freundlich – und klärst
                                Geld und Treffen vorher mit deinen Eltern.
                            </p>
                            <p>
                                Bei Problemen meldest du Inhalte über die <strong className="text-foreground">Meldefunktion</strong> in der App oder
                                schreibst uns an{' '}
                                <a href={`mailto:${MAIL}`} className="break-anywhere font-semibold text-foreground underline underline-offset-4">{MAIL}</a>.
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Mini-TOC als Scroll-Buttons, kein href-Anker wegen HashRouter */}
                <motion.nav
                    aria-label="Inhaltsübersicht"
                    {...anim()}
                    className="rounded-xl border border-border bg-card p-6 sm:p-8"
                >
                    <h2 className="text-2xl tracking-tight text-foreground">Inhalt</h2>
                    <ol className="mt-4 grid gap-1 sm:grid-cols-2">
                        {toc.map((item) => (
                            <li key={item.id}>
                                <Button
                                    variant="unstyled"
                                    size="unstyled"
                                    hapticStyle={false}
                                    type="button"
                                    onClick={() => scrollToId(item.id)}
                                    className="flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-left text-base font-semibold text-foreground hover:bg-muted hover:underline active:bg-muted"
                                >
                                    {item.label}
                                </Button>
                            </li>
                        ))}
                    </ol>
                </motion.nav>
                </div>

                {/* Paragrafen als aufklappbare Details-Gruppen */}
                <section aria-labelledby="nutz-paragrafen" className="flex flex-col gap-6 sm:gap-8 min-w-0">
                    <div className="flex flex-col gap-2">
                    <h2 id="nutz-paragrafen" className="text-2xl tracking-tight text-foreground">
                        Paragrafen im Detail
                    </h2>
                    </div>

                    <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
                    <Para id="p1" nr="01" title="§ 1 Was ist die Nachhilfebörse?" open>
                        <p>
                            Die Nachhilfebörse ist eine <strong>nicht-kommerzielle Vermittlungsplattform von
                            Schülern für Schüler</strong>. Sie ermöglicht es, Nachhilfeangebote und -gesuche zu
                            veröffentlichen, Kontakt aufzunehmen und Termine zu vereinbaren.
                        </p>
                        <p>
                            Vereinbarungen über Nachhilfe (Inhalte, Zeiten, Ort, Vergütung) kommen{' '}
                            <strong>ausschließlich zwischen den beteiligten Nutzerinnen und Nutzern</strong> zustande.
                            Der Betreiber (SV-Team) ist an diesen Vereinbarungen nicht beteiligt, erhält keine
                            Provision und übernimmt keine Gewähr für deren Durchführung oder Qualität.
                        </p>
                    </Para>

                    <Para id="p2" nr="02" title="§ 2 Wer darf mitmachen?">
                        <ParaList items={[
                            <span key="a"><strong>Schülerinnen und Schüler</strong> des Friedrich-Wilhelm-Gymnasiums Köln können Konten erstellen, Anzeigen aufgeben und Nachrichten schreiben.</span>,
                            <span key="b"><strong>Eltern</strong> können das Konto ihres Kindes mitbetreuen. Wie eng, entscheiden sie gemeinsam mit ihrem Kind je nach Alter.</span>,
                            <span key="c">Nutzerinnen und Nutzer <strong>unter 16 Jahren</strong> benötigen die <strong>Einwilligung eines Elternteils</strong> (Art. 8 DSGVO). Die Einwilligung wird bei der Registrierung eingeholt und dokumentiert.</span>,
                            <span key="d">Nur <strong>verifizierte Konten</strong> (Verifizierung im SV-Raum) können Anzeigen erstellen und Kontakt aufnehmen.</span>,
                        ]} />
                        <h4 className="pt-2 text-sm font-semibold text-muted-foreground">
                            Verifizierung in 3 Schritten
                        </h4>
                        <div className="[&_li]:transform-none! [&_li]:opacity-100!">
                            <VerifySteps tone="du" variant="rows" />
                        </div>
                    </Para>

                    <Para id="p3" nr="03" title="§ 3 Registrierung & Konto">
                        <ParaList items={[
                            <span key="a">Pro Person ist <strong>ein Konto</strong> vorgesehen. Die Angaben bei der Registrierung müssen zutreffen (keine falschen Namen, Klassen oder Rollen).</span>,
                            <span key="b">Deine <strong>Zugangsdaten sind geheim zu halten</strong>. Bei Verdacht auf Missbrauch informiere uns sofort über <a href={`mailto:${MAIL}`} className={MAIL_CLS}>{MAIL}</a>.</span>,
                            <span key="c">Die Angabe einer falschen Rolle oder die Umgehung der Verifizierung führt zur Sperrung.</span>,
                        ]} />
                    </Para>

                    <Para id="p4" nr="04" title="§ 4 Regeln für Anzeigen">
                        <ParaList items={[
                            <span key="a">Anzeigen müssen <strong>wahr, konkret und aktuell</strong> sein (Fächer, Klassenstufen, Preise). Veraltete Anzeigen sind zu deaktivieren oder zu löschen.</span>,
                            <span key="b"><strong>Richtpreise:</strong> Als Richtwert gelten <span className="tabular-nums">ca. 12 € pro Stunde</span>. Der Preis ist individuell anpassbar. Wucherpreise oder Lockangebote mit versteckten Kosten sind untersagt.</span>,
                            <span key="c">Verboten sind: Beleidigungen, Diskriminierung, Werbung für externe kommerzielle Anbieter, Kettenbriefe, politische oder religiöse Agitation sowie Inhalte, die gegen Gesetze verstoßen.</span>,
                            <span key="d">Fotos dürfen nur hochgeladen werden, wenn du die <strong>Rechte daran hast</strong> und abgebildete Personen einverstanden sind.</span>,
                        ]} />
                    </Para>

                    <Para id="p5" nr="05" title="§ 5 Coaching-AG">
                        <p>
                            Mitglieder der Coaching-AG erhalten nach Schulung ein <strong>Coach-Abzeichen</strong>.
                            Was das Abzeichen bedeutet, wer Coach werden kann und warum manche Anzeigen hervorgehoben
                            werden, steht transparent auf der{' '}
                            <Link to="/coaching" className="font-semibold text-foreground hover:underline">Coaching-Seite</Link>.
                            Das Abzeichen steht für Schulung und Verifizierung, nicht für Erfolgsgarantien.
                        </p>
                    </Para>

                    <Para id="p6" nr="06" title="§ 6 Kommunikation">
                        <ParaList items={[
                            <span key="a">Der Chat dient <strong>ausschließlich Nachhilfe-Absprachen</strong>.</span>,
                            <span key="b">Belästigung, Beleidigung, Spam oder die Weitergabe fremder Kontaktdaten sind verboten.</span>,
                            <span key="c"><strong>Treffen:</strong> Erste Treffen sollten in der Schule (z. B. Bibliothek, Mensa) stattfinden. Private Treffen außerhalb der Schule nur mit Wissen der Eltern.</span>,
                            <span key="d">Verdächtige Nachrichten oder Nutzer kannst du über die <strong>Meldefunktion</strong> in der App melden.</span>,
                        ]} />
                    </Para>

                    <Para id="p7" nr="07" title="§ 7 Moderation & Sanktionen">
                        <p>Bei Verstößen gegen diese Bedingungen kann das SV-Team je nach Schwere folgende Maßnahmen ergreifen:</p>
                        <ul className="divide-y divide-border border-y border-border">
                            {SANKTIONEN.map((s) => (
                                <li key={s.v} className="py-3">
                                    <p className="text-base text-foreground"><strong>Verstoß:</strong> {s.v}</p>
                                    <p className="mt-1 text-base">
                                        <strong className="text-foreground">Maßnahme:</strong>{' '}
                                        {s.m}
                                    </p>
                                </li>
                            ))}
                        </ul>
                        <p>
                            Gegen Maßnahmen kannst du <strong>Widerspruch einlegen</strong>. Nutze dafür eine Anfrage
                            in der App, per E-Mail an <a href={`mailto:${MAIL}`} className={MAIL_CLS}>{MAIL}</a> oder
                            persönlich im SV-Raum. Wir prüfen jeden Fall erneut.
                        </p>
                    </Para>

                    <Para id="p8" nr="08" title="§ 8 Haftung">
                        <ParaList items={[
                            <span key="a">Der Betreiber haftet <strong>nicht für Inhalte</strong> der Nutzer (Anzeigen, Profile, Nachrichten).</span>,
                            <span key="b">Der Betreiber haftet nicht für das Zustandekommen, die Qualität oder die Bezahlung vereinbarter Nachhilfe.</span>,
                            <span key="c">Für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit haftet der Betreiber unbeschränkt nach den gesetzlichen Vorschriften.</span>,
                        ]} />
                    </Para>

                    <Para id="p9" nr="09" title="§ 9 Minderjährige & Vergütung">
                        <p>
                            Nachhilfe gegen Bezahlung zwischen Minderjährigen berührt das Taschengeldrecht
                            (§ 110 BGB): <strong>Bitte kläre Vergütung und Umfang vorab mit deinen Eltern</strong> –
                            besonders bei regelmäßiger oder teurer Nachhilfe. Für Streitigkeiten über Bezahlung
                            zwischen Nutzern ist der Betreiber nicht zuständig.
                        </p>
                    </Para>

                    <Para id="p10" nr="10" title="§ 10 Kündigung & Konto-Löschung">
                        <p>
                            Du kannst die Nutzung <strong>jederzeit beenden</strong>. Die vollständige Löschung
                            deines Kontos beantragst du über eine <strong>Anfrage in der App</strong> oder
                            per E-Mail an <a href={`mailto:${MAIL}`} className={MAIL_CLS}>{MAIL}</a>.
                            Wir bestätigen die Löschung innerhalb von <span className="tabular-nums">14 Tagen</span> (Details zur Speicherung in der{' '}
                            <Link to="/datenschutz" className="font-semibold text-foreground hover:underline">Datenschutzerklärung</Link>).
                        </p>
                        <p>
                            Der Betreiber kann Konten bei schweren Verstößen fristlos sperren (§ 7) und die
                            Plattform insgesamt mit einer Ankündigungsfrist von <span className="tabular-nums">30 Tagen</span> einstellen.
                        </p>
                    </Para>

                    <Para id="p11" nr="11" title="§ 11 Änderungen & Kontakt">
                        <p>
                            Wir können diese Bedingungen anpassen, wenn sich Funktionen oder Rechtslage ändern.
                            Über wesentliche Änderungen informieren wir <strong>mindestens <span className="tabular-nums">14 Tage</span> vorher in der App</strong>.
                            Wer danach weiter nutzt, stimmt den neuen Bedingungen zu.
                        </p>
                        <p>
                            Kontakt: Schülervertretung des Friedrich-Wilhelm-Gymnasiums Köln, Severinstraße 241,
                            50676 Köln · <a href={`mailto:${MAIL}`} className={MAIL_CLS}>{MAIL}</a>
                        </p>
                    </Para>
                    </div>
                </section>

                {/* Einzige CTA der Seite: Kontakt per Mail */}
                <motion.section
                    aria-labelledby="nutz-kontakt"
                    {...anim()}
                    className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8"
                >
                    <h2 id="nutz-kontakt" className="text-2xl tracking-tight">
                        Fragen zu den Regeln?
                    </h2>
                    <p className="mt-3 max-w-prose text-base leading-7 text-muted-foreground">
                        Melde Inhalte über die Meldefunktion in der App oder schreib uns direkt.
                    </p>
                    <a
                        href={`mailto:${MAIL}`}
                        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover sm:w-auto"
                    >
                        <Mail size={16} aria-hidden /> {MAIL}
                    </a>
                </motion.section>
            </div>
        </StaticLayout>
    );
}
