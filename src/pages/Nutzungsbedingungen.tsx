import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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
        <ol className="mt-2 divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
            {items.map((item, i) => (
                <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-3 py-3">
                    <span className="font-mono tabular-nums font-bold text-gray-900 dark:text-white" aria-hidden>
                        {String(start + i).padStart(2, '0')}
                    </span>
                    <div className="text-[15px] leading-7 text-gray-600 dark:text-gray-300">{item}</div>
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
            className="group scroll-mt-24 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-soft"
        >
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black font-mono text-[11px] font-bold tabular-nums text-primary dark:bg-primary dark:text-black" aria-hidden>
                    {nr}
                </span>
                <h3 className="flex-1 font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">{title}</h3>
                <ChevronDown size={18} className="shrink-0 text-amber-700 transition-transform duration-200 ease-out group-open:rotate-180 dark:text-primary" aria-hidden />
            </summary>
            <div className="accordion-body px-5 pb-5 sm:px-6 sm:pb-6 text-[15px] leading-7 text-gray-600 dark:text-gray-300 flex flex-col gap-3 max-w-prose">
                {children}
            </div>
        </details>
    );
}

const MAIL_CLS = 'font-bold text-amber-700 dark:text-primary hover:underline break-anywhere';
const MAIL = 'info@nachhilfe-sv.de';

const toc = [
    { id: 'p1', label: '§ 1 Was ist die Nachhilfebörse?' },
    { id: 'p2', label: '§ 2 Wer darf mitmachen?' },
    { id: 'p3', label: '§ 3 Registrierung & Account' },
    { id: 'p4', label: '§ 4 Regeln für Anzeigen' },
    { id: 'p5', label: '§ 5 Schüler-Coaching AG' },
    { id: 'p6', label: '§ 6 Kommunikation' },
    { id: 'p7', label: '§ 7 Moderation & Sanktionen' },
    { id: 'p8', label: '§ 8 Haftung' },
    { id: 'p9', label: '§ 9 Minderjährige & Vergütung' },
    { id: 'p10', label: '§ 10 Kündigung & Account-Löschung' },
    { id: 'p11', label: '§ 11 Änderungen & Kontakt' },
];

const SANKTIONEN: Array<{ v: string; m: React.ReactNode }> = [
    { v: 'Leichter Verstoß (z. B. veraltete Anzeige, falsche Kategorie)', m: (<span><strong>Verwarnung</strong> mit Hinweis auf die verletzte Regel</span>) },
    { v: 'Rechtswidrige oder beleidigende Inhalte', m: (<span><strong>Entfernung einzelner Inhalte</strong> (Anzeigen, Bilder, Nachrichten)</span>) },
    { v: 'Schwere oder wiederholte Verstöße', m: (<span><strong>Zeitweise Sperrung</strong> (z. B. <span className="font-mono tabular-nums">7 Tage</span>) oder <strong>dauerhafte Sperrung</strong></span>) },
    { v: 'Pflichtverletzung als Coach', m: (<span><strong>Entzug des Coach-Status</strong> nach den Regeln der <Link to="/coaching" className="font-bold text-amber-700 dark:text-primary hover:underline">Coaching-Seite</Link></span>) },
];

export default function Nutzungsbedingungen() {
    const reduceMotion = useReducedMotion();
    const anim = (delay = 0) => reduceMotion ? {} : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.7, delay, ease: easeOut },
    };
    /* Line-Wipe unter der Anton-Headline (dieselbe Geste wie auf der Landing). */
    /* clip-path statt scaleX(0): zero-width-Rects blockieren IntersectionObserver (Chromium). */
    const wipeLine = (delay = 0.2) => reduceMotion ? {} : {
        initial: { clipPath: 'inset(0 100% 0 0)' },
        whileInView: { clipPath: 'inset(0 0% 0 0)' },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.5, delay, ease: easeOut },
    };

    return (
        <StaticLayout
            title="Nutzungsbedingungen"
            intro="Stand: September 2026 · Betreiber: SV FWG Köln."
        >
            {/* Sektions-Rhythmus: Leseeinheiten innen eng (gap-4/5), Sektionen großzügig (gap-10/12). */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 min-w-0 flex flex-col gap-10 sm:gap-12">
                {/* Leseeinheit 1: Zusammenfassung + Inhaltsübersicht gehören zusammen. */}
                <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                {/* Gelbe TL;DR-Box zum Einstieg (H2 trägt das Gewicht, kein Kicker) */}
                <motion.section
                    aria-labelledby="nutz-kurz"
                    {...anim()}
                    className="relative overflow-hidden rounded-3xl bg-primary text-black p-6 sm:p-8 border border-black/10 shadow-soft"
                >
                    <div className="absolute inset-0 poster-grain-dark" aria-hidden />
                    <div className="relative">
                        <h2 id="nutz-kurz" className="font-display uppercase text-2xl tracking-tight">Kurz gesagt</h2>
                        <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-black" aria-hidden />
                        <div className="mt-3 text-[15px] leading-7 font-medium text-black/80 flex flex-col gap-2 max-w-prose">
                            <p>
                                Die Nachhilfebörse ist ein <strong className="text-black">kostenloses Schülerprojekt von Schülern für Schüler</strong>.
                                Du bist für deine Inhalte selbst verantwortlich, bleibst fair und freundlich – und klärst
                                Geld und Treffen vorher mit deinen Eltern.
                            </p>
                            <p>
                                Bei Problemen meldest du Inhalte über die <strong className="text-black">Meldefunktion</strong> in der App oder
                                schreibst uns an{' '}
                                <a href={`mailto:${MAIL}`} className="font-bold text-black underline underline-offset-4 break-anywhere">{MAIL}</a>.
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Mini-TOC als Scroll-Buttons, kein href-Anker wegen HashRouter */}
                <motion.nav
                    aria-label="Inhaltsübersicht"
                    {...anim()}
                    className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft"
                >
                    <h2 className="font-display uppercase text-2xl tracking-tight text-gray-900 dark:text-white">Inhalt</h2>
                    <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    <ol className="mt-4 grid gap-1 sm:grid-cols-2">
                        {toc.map((item, i) => (
                            <li key={item.id}>
                                <motion.button
                                    type="button"
                                    onClick={() => scrollToId(item.id)}
                                    {...(reduceMotion ? {} : {
                                        initial: { opacity: 0, y: 8 },
                                        whileInView: { opacity: 1, y: 0 },
                                        viewport: { once: true, margin: '-60px' },
                                        transition: { duration: 0.45, delay: Math.min(i * 0.03, 0.3), ease: easeOut },
                                    })}
                                    className="press flex min-h-[44px] w-full items-center rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold text-gray-800 hover:bg-gray-100 hover:underline active:bg-primary/15 dark:text-gray-100 dark:hover:bg-white/5"
                                >
                                    {item.label}
                                </motion.button>
                            </li>
                        ))}
                    </ol>
                </motion.nav>
                </div>

                {/* Paragrafen als aufklappbare Details-Gruppen */}
                <section aria-labelledby="nutz-paragrafen" className="flex flex-col gap-6 sm:gap-8 min-w-0">
                    <div className="flex flex-col gap-2">
                    <h2 id="nutz-paragrafen" className="font-display uppercase text-2xl tracking-tight text-gray-900 dark:text-white">
                        Paragrafen im Detail
                    </h2>
                    <motion.span {...wipeLine()} className="h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
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
                            <span key="a"><strong>Schülerinnen und Schüler</strong> des Friedrich-Wilhelm-Gymnasiums Köln können Accounts erstellen, Anzeigen aufgeben und Nachrichten schreiben.</span>,
                            <span key="b"><strong>Eltern</strong> können eigene Accounts erstellen, für ihre Kinder inserieren und verknüpfte Kinder-Accounts begleiten.</span>,
                            <span key="c">Nutzerinnen und Nutzer <strong>unter 16 Jahren</strong> benötigen die <strong>Einwilligung eines Elternteils</strong> (Art. 8 DSGVO). Ohne bestätigte Eltern-E-Mail bleibt der Account eingeschränkt.</span>,
                            <span key="d">Nur <strong>verifizierte Accounts</strong> (Verifizierung im SV-Raum) können Anzeigen erstellen und Kontakt aufnehmen.</span>,
                        ]} />
                        <h4 className="pt-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                            Verifizierung in 3 Schritten
                        </h4>
                        <VerifySteps tone="du" variant="rows" />
                    </Para>

                    <Para id="p3" nr="03" title="§ 3 Registrierung & Account">
                        <ParaList items={[
                            <span key="a">Pro Person ist <strong>ein Account</strong> vorgesehen. Die Angaben bei der Registrierung müssen zutreffen (keine falschen Namen, Klassen oder Rollen).</span>,
                            <span key="b">Deine <strong>Zugangsdaten sind geheim zu halten</strong>. Bei Verdacht auf Missbrauch informiere uns sofort über <a href={`mailto:${MAIL}`} className={MAIL_CLS}>{MAIL}</a>.</span>,
                            <span key="c">Die Angabe einer falschen Rolle (z. B. Eltern-Account ohne Elternschaft) oder die Umgehung der Verifizierung führt zur Sperrung.</span>,
                        ]} />
                    </Para>

                    <Para id="p4" nr="04" title="§ 4 Regeln für Anzeigen">
                        <ParaList items={[
                            <span key="a">Anzeigen müssen <strong>wahr, konkret und aktuell</strong> sein (Fächer, Klassenstufen, Preise). Veraltete Anzeigen sind zu deaktivieren oder zu löschen.</span>,
                            <span key="b"><strong>Richtpreise:</strong> Als fair gelten <span className="font-mono tabular-nums">ca. 10–12 € pro 45–60 Minuten</span>. Wucherpreise oder Lockangebote mit versteckten Kosten sind untersagt.</span>,
                            <span key="c">Verboten sind: Beleidigungen, Diskriminierung, Werbung für externe kommerzielle Anbieter, Kettenbriefe, politische oder religiöse Agitation sowie Inhalte, die gegen Gesetze verstoßen.</span>,
                            <span key="d">Fotos dürfen nur hochgeladen werden, wenn du die <strong>Rechte daran hast</strong> und abgebildete Personen einverstanden sind.</span>,
                        ]} />
                    </Para>

                    <Para id="p5" nr="05" title="§ 5 Schüler-Coaching AG">
                        <p>
                            Mitglieder der Schüler-Coaching AG erhalten nach Schulung ein <strong>Coach-Abzeichen</strong>.
                            Was das Badge bedeutet, wer Coach werden kann und warum manche Anzeigen hervorgehoben
                            werden, steht transparent auf der{' '}
                            <Link to="/coaching" className="font-bold text-amber-700 dark:text-primary hover:underline">Coaching-Seite</Link>.
                            Das Badge steht für geprüfte Vertrauenswürdigkeit als Person – nicht für Erfolgsgarantien.
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
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
                            {SANKTIONEN.map((s) => (
                                <li key={s.v} className="py-3">
                                    <p className="text-[15px] text-gray-900 dark:text-white"><strong>Verstoß:</strong> {s.v}</p>
                                    <p className="mt-1 text-[15px]">
                                        <strong className="text-gray-900 dark:text-white">Maßnahme:</strong>{' '}
                                        {s.m}
                                    </p>
                                </li>
                            ))}
                        </ul>
                        <p>
                            Gegen Maßnahmen kannst du <strong>Widerspruch einlegen</strong> – per Support-Ticket
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

                    <Para id="p10" nr="10" title="§ 10 Kündigung & Account-Löschung">
                        <p>
                            Du kannst die Nutzung <strong>jederzeit beenden</strong>. Die vollständige Löschung
                            deines Accounts beantragst du über ein <strong>Support-Ticket in der App</strong> oder
                            per E-Mail an <a href={`mailto:${MAIL}`} className={MAIL_CLS}>{MAIL}</a>.
                            Wir bestätigen die Löschung innerhalb von <span className="font-mono tabular-nums">14 Tagen</span> (Details zur Speicherung in der{' '}
                            <Link to="/datenschutz" className="font-bold text-amber-700 dark:text-primary hover:underline">Datenschutzerklärung</Link>).
                        </p>
                        <p>
                            Der Betreiber kann Accounts bei schweren Verstößen fristlos sperren (§ 7) und die
                            Plattform insgesamt mit einer Ankündigungsfrist von <span className="font-mono tabular-nums">30 Tagen</span> einstellen.
                        </p>
                    </Para>

                    <Para id="p11" nr="11" title="§ 11 Änderungen & Kontakt">
                        <p>
                            Wir können diese Bedingungen anpassen, wenn sich Funktionen oder Rechtslage ändern.
                            Über wesentliche Änderungen informieren wir <strong>mindestens <span className="font-mono tabular-nums">14 Tage</span> vorher in der App</strong>.
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
                    className="rounded-3xl bg-gray-950 dark:bg-gray-900 text-white p-6 sm:p-8 shadow-soft"
                >
                    <h2 id="nutz-kontakt" className="font-display uppercase text-2xl tracking-tight">
                        Fragen zu den Regeln?
                    </h2>
                    <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    <p className="mt-3 text-[15px] leading-7 text-gray-300 max-w-prose">
                        Melde Inhalte über die Meldefunktion in der App oder schreib uns direkt.
                    </p>
                    <a
                        href={`mailto:${MAIL}`}
                        className="press mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold text-black hover:bg-primary-hover w-full sm:w-auto"
                    >
                        <Mail size={18} aria-hidden /> {MAIL}
                    </a>
                </motion.section>
            </div>
        </StaticLayout>
    );
}
