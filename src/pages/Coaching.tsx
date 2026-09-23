import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Award, ClipboardCheck, Scale, Megaphone, HeartHandshake, Gavel, Mail, School, Clock, MapPin, ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import StaticLayout from '../components/StaticLayout';
import VerifySteps from '../components/VerifySteps';
import { api } from '../lib/api';

const easeOut = [0.16, 1, 0.3, 1] as const;

// Fallback-Texte (identisch zu den Backend-Defaults), falls die CMS-Texte nicht laden.
export const FALLBACK: Record<string, string> = {
    hero_title: 'Schüler-Coaching am FWG',
    hero_subtitle: 'Große helfen Kleinen: Geschulte Schülerinnen und Schüler ab Klasse 8 unterstützen die Klassen 5 und 6 beim Ankommen am Friedrich-Wilhelm-Gymnasium Köln – ehrenamtlich, pädagogisch begleitet und für alle nach denselben fairen Regeln.',
    s_badge_title: 'Was bedeutet das Coach-Abzeichen?',
    s_badge_body: 'Das goldene Coach-Badge auf Profilen und Anzeigen zeigt: Diese Person ist aktives Mitglied der Schüler-Coaching AG, wurde von der AG-Leitung geschult und vom SV-Team verifiziert.\n\nDas Badge steht für Vertrauenswürdigkeit als Person – nicht für Erfolgsgarantien und nicht für kostenlose Nachhilfe. Preise und Absprachen bleiben Sache der Beteiligten (siehe Nutzungsbedingungen).',
    s_school_title: 'Das Coaching an unserer Schule',
    s_school_body: 'Das Schüler-Coaching ist ein schulisches Angebot des FWG: Jede Woche dienstags von 13:45–14:30 Uhr in Raum H310 helfen geschulte Schülerinnen und Schüler der 8. Klassen den 5. und 6. Klassen – bei einzelnen Fächern oder der Lern- und Arbeitsorganisation allgemein. Die Coaches werden jeweils vor den Herbstferien geschult und engagieren sich ehrenamtlich bis zum Ende des Schuljahres. Dieses Angebot wird in der Regel sehr gerne angenommen, da die Coaches einen guten Blick auf die Probleme der jüngeren Schülerinnen und Schüler haben.\n\nMehr dazu auf der Schul-Website: fwg-koeln.de/lebendige-schule/foerdern-und-fordern/coaching. Diese Nachhilfebörse der SV ergänzt das Angebot: Hier finden alle Jahrgangsstufen individuelle Nachhilfe – die Coaches der AG sind dabei besonders sichtbar, damit man sie leicht findet.',
    s_who_title: 'Wer kann Coach werden?',
    s_who_body: '• Schülerin oder Schüler des FWG ab Klasse 8\n• Teilnahme an der Coach-Schulung der AG-Leitung\n• Zuverlässigkeit und respektvoller Umgang – auch auf der Plattform\n• Verifizierter Account auf der Nachhilfebörse\n\nInteressiert? Wende dich an Frau Balistreri oder sprich das SV-Team im SV-Raum an.',
    s_boost_title: 'Warum stehen manche Anzeigen oben?',
    s_boost_body: 'Anzeigen mit dem Hinweis „Hervorgehoben“ erhalten eine bessere Platzierung und eine gelbe Markierung – ausschließlich bei Coach-Status (30 Tage nach Coaching-Code) oder SV-Aktionen.\n\nSichtbarkeit ist bei uns nicht käuflich: Es gibt keine bezahlten Boosts und keine Werbung.',
    s_fair_title: 'Gleiche Chancen für alle',
    s_fair_body: '• Jede Schülerin und jeder Schüler kann kostenlos Anzeigen erstellen – mit oder ohne Badge.\n• Codes sind personenbezogen und begrenzt und werden nur nach Schulung vergeben.\n• Die Vergabe wird protokolliert und kann vom SV-Team geprüft werden.',
    s_conduct_title: 'Verhalten als Coach',
    s_conduct_body: '• Respektvoller, geduldiger Umgang – besonders mit jüngeren Schülern\n• Keine falschen Versprechen (z. B. garantierte Notenverbesserung)\n• Treffen möglichst in der Schule; private Treffen nur mit Wissen der Eltern\n• Bei Problemen: frühzeitig die AG-Leitung oder das SV-Team ansprechen',
    s_revoke_title: 'Entzug des Status & Widerspruch',
    s_revoke_body: 'Bei Verstößen gegen diese Regeln oder die Nutzungsbedingungen kann die AG-Leitung oder das SV-Team den Coach-Status entziehen – mit kurzer Begründung direkt in der App oder per E-Mail.\n\nDagegen kannst du Widerspruch einlegen: Schreibe an info@nachhilfe-sv.de oder komme im SV-Raum vorbei. Das SV-Team prüft jeden Fall erneut.',
    contact_text: 'AG-Leitung: Frau Balistreri · SV-Team: persönlich im SV-Raum',
};

// Design-Config fuer den Seiten-Builder (Reihenfolge, Sichtbarkeit, Plakat, Regeln)
export type PosterBg = 'gelb' | 'schwarz' | 'blau';
export type RegelnStil = 'liste' | 'aufklappbar';
export type CoachingSectionId = 'plakat' | 'ablauf' | 'nutzen' | 'regeln' | 'kontakt';
export interface SectionConfig {
    id: CoachingSectionId;
    visible: boolean;
}
export interface DesignConfig {
    sections: SectionConfig[];
    posterBg: PosterBg;
    regelnStil: RegelnStil;
}

export const DEFAULT_DESIGN: DesignConfig = {
    sections: [
        { id: 'plakat', visible: true },
        { id: 'ablauf', visible: true },
        { id: 'nutzen', visible: true },
        { id: 'regeln', visible: true },
        { id: 'kontakt', visible: true },
    ],
    posterBg: 'gelb',
    regelnStil: 'liste',
};

const SECTION_IDS: CoachingSectionId[] = ['plakat', 'ablauf', 'nutzen', 'regeln', 'kontakt'];

// Parst content.layout_json robust (ungueltig oder fremd fuellt Default auf, kein Crash)
export function parseCoachingDesign(raw: unknown): DesignConfig {
    const fallbackSections = DEFAULT_DESIGN.sections.map(s => ({ ...s }));
    if (typeof raw !== 'string' || !raw.trim()) {
        return { sections: fallbackSections, posterBg: 'gelb', regelnStil: 'liste' };
    }
    try {
        const parsed = JSON.parse(raw) as Partial<DesignConfig>;
        let sections: SectionConfig[] = fallbackSections;
        if (Array.isArray(parsed.sections)) {
            const mapped: SectionConfig[] = [];
            for (const entry of parsed.sections) {
                if (entry && typeof entry.id === 'string' && (SECTION_IDS as string[]).includes(entry.id)) {
                    mapped.push({ id: entry.id as CoachingSectionId, visible: entry.visible !== false });
                }
            }
            for (const id of SECTION_IDS) {
                if (!mapped.some(m => m.id === id)) mapped.push({ id, visible: true });
            }
            sections = mapped;
        }
        const posterBg: PosterBg =
            parsed.posterBg === 'schwarz' || parsed.posterBg === 'blau' || parsed.posterBg === 'gelb'
                ? parsed.posterBg
                : 'gelb';
        const regelnStil: RegelnStil = parsed.regelnStil === 'aufklappbar' ? 'aufklappbar' : 'liste';
        return { sections, posterBg, regelnStil };
    } catch {
        return { sections: fallbackSections, posterBg: 'gelb', regelnStil: 'liste' };
    }
}

const COACH_MAIL = 'Rosalia.Balistreri@fwg-koeln.nrw.schule';

// Gelb auf Weiß ist zu blass, Links daher dunkel fassen (amber-700 light / primary dark).
const LINK_CLS = 'font-bold text-amber-700 dark:text-primary hover:underline';

// Einfaches Auto-Link für fwg-koeln.de in Fließtext-Absätzen
function linkify(text: string) {
    const parts = text.split(/(fwg-koeln\.de(?:\/\S*)?)/g);
    return parts.map((p, i) =>
        /^fwg-koeln\.de/.test(p)
            ? <a key={i} href={`https://${p}`} target="_blank" rel="noreferrer" className={LINK_CLS}>{p}</a>
            : <span key={i}>{p}</span>
    );
}

// Absätze (Leerzeile) → <p>; Aufzählungs-Blöcke (Zeilen mit •) → <ul>
function renderBody(body: string) {
    const blocks = body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    return blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0 && lines.every(l => l.startsWith('•'))) {
            return (
                <ul key={i} className="list-disc pl-4 space-y-1">
                    {lines.map((l, j) => <li key={j}>{linkify(l.replace(/^•\s*/, ''))}</li>)}
                </ul>
            );
        }
        return <p key={i}>{linkify(block)}</p>;
    });
}

const NUTZEN = [
    { title: 'Große helfen Kleinen', text: 'Klassen 5 und 6 erhalten Hilfe von geschulten Coaches ab Klasse 8.' },
    { title: 'Begleitet & ehrenamtlich', text: 'Pädagogisch begleitet durch Frau Balistreri — ehrenamtlich bis zum Schuljahresende.' },
    { title: 'Fester Treffpunkt', text: 'Jeden Dienstag 13:45–14:30 Uhr in Raum H310 — einfach vorbeikommen.' },
];

const SCHRITTE = [
    { n: '1', title: 'Melden', text: 'Schreib eine Mail an Frau Balistreri oder sprich das SV-Team im SV-Raum an.' },
    { n: '2', title: 'Schulung', text: 'Nimm an der Coach-Schulung der AG-Leitung vor den Herbstferien teil.' },
    { n: '3', title: 'Badge & Start', text: 'Erhalte das Coach-Badge und starte dienstags in H310.' },
];

// Praesentative Ansicht der Coaching-Seite (wird öffentlich und in der Builder-Preview genutzt)
export function CoachingView({ content, design }: { content: Record<string, string>; design: DesignConfig }) {
    const reduceMotion = useReducedMotion();
    /* Read-Modus: ruhiger als die Landing — dezenter Authored Reveal (y 18, 0.55 s). */
    const anim = (delay = 0) => reduceMotion ? {} : {
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

    const sections = [
        { icon: <Award size={22} aria-hidden />, title: content.s_badge_title, body: content.s_badge_body },
        { icon: <School size={22} aria-hidden />, title: content.s_school_title, body: content.s_school_body },
        { icon: <ClipboardCheck size={22} aria-hidden />, title: content.s_who_title, body: content.s_who_body },
        { icon: <Megaphone size={22} aria-hidden />, title: content.s_boost_title, body: content.s_boost_body },
        { icon: <Scale size={22} aria-hidden />, title: content.s_fair_title, body: content.s_fair_body },
        { icon: <HeartHandshake size={22} aria-hidden />, title: content.s_conduct_title, body: content.s_conduct_body },
        { icon: <Gavel size={22} aria-hidden />, title: content.s_revoke_title, body: content.s_revoke_body },
    ];

    // Plakat-Farbvarianten mit geprueften Kontrasten (kein text-primary Fliesstext)
    const posterCls =
        design.posterBg === 'schwarz'
            ? 'relative overflow-hidden rounded-3xl bg-gray-950 text-white p-6 sm:p-10 shadow-soft border border-white/10'
            : design.posterBg === 'blau'
                ? 'relative overflow-hidden rounded-3xl bg-blue-700 text-white p-6 sm:p-10 shadow-soft'
                : 'relative overflow-hidden rounded-3xl bg-primary text-black p-6 sm:p-10 shadow-soft';
    const grainCls = design.posterBg === 'gelb' ? 'absolute inset-0 poster-grain-dark' : 'absolute inset-0 poster-grain';
    const stampCls =
        design.posterBg === 'gelb'
            ? 'rotate-6 rounded border-2 border-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-black/70 stamp-ring'
            : 'rotate-6 rounded border-2 border-white/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 stamp-ring';
    const headlineCls =
        'mt-3 font-display uppercase leading-[0.95] tracking-tight text-3xl sm:text-5xl' +
        (design.posterBg === 'schwarz' ? ' text-primary' : '');
    const contactCls =
        design.posterBg === 'gelb'
            ? 'mt-3 text-[15px] leading-7 font-medium text-black/75 max-w-prose'
            : design.posterBg === 'schwarz'
                ? 'mt-3 text-[15px] leading-7 font-medium text-gray-300 max-w-prose'
                : 'mt-3 text-[15px] leading-7 font-medium text-blue-100 max-w-prose';
    const ctaCls =
        design.posterBg === 'gelb'
            ? 'press inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-black px-8 py-3 text-sm font-bold text-white hover:bg-gray-900 w-full sm:w-auto'
            : design.posterBg === 'schwarz'
                ? 'press inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold text-black hover:bg-yellow-300 w-full sm:w-auto'
                : 'press inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50 w-full sm:w-auto';
    const hintCls =
        design.posterBg === 'gelb'
            ? 'text-sm font-semibold text-black/70 text-center sm:text-left'
            : design.posterBg === 'schwarz'
                ? 'text-sm font-semibold text-gray-300 text-center sm:text-left'
                : 'text-sm font-semibold text-blue-100 text-center sm:text-left';
    const hintStrongCls = design.posterBg === 'gelb' ? 'text-black' : 'text-white';

    const plakat = (
        <motion.section
            key="plakat"
            aria-labelledby="coaching-plakat"
            {...anim()}
            className={posterCls}
        >
            <div className={grainCls} aria-hidden />
            <div className="relative">
                <div className="flex flex-wrap items-start justify-end gap-4">
                    <span className={stampCls} aria-hidden>
                        Ehrenamtlich
                    </span>
                </div>
                <h2 id="coaching-plakat" className={headlineCls}>
                    Direkt dabei sein
                </h2>
                <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] font-bold">
                    <span className="inline-flex items-center gap-1.5">
                        <Clock size={16} aria-hidden />
                        <span className="font-mono tabular-nums">Di 13:45–14:30</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <MapPin size={16} aria-hidden />
                        <span className="font-mono tabular-nums">Raum H310</span>
                    </span>
                </p>
                <p className={contactCls}>
                    {content.contact_text}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <a
                        href={`mailto:${COACH_MAIL}?subject=${encodeURIComponent('Anmeldung Schüler-Coaching AG')}`}
                        className={ctaCls}
                    >
                        <Mail size={18} aria-hidden /> Per Mail anmelden
                    </a>
                    <span className={hintCls}>
                        oder das SV-Team im <strong className={hintStrongCls}>SV-Raum</strong> ansprechen
                    </span>
                </div>
            </div>
        </motion.section>
    );

    const ablauf = (
        <motion.section
            key="ablauf"
            aria-labelledby="coaching-ablauf"
            {...anim()}
            className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft"
        >
            <h2 id="coaching-ablauf" className="font-display uppercase text-2xl sm:text-3xl tracking-tight text-gray-900 dark:text-white">
                In 3 Schritten Coach werden
            </h2>
            <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
            <ol className="mt-6 divide-y-2 divide-dashed divide-gray-300 dark:divide-gray-700 border-y-2 border-dashed border-gray-300 dark:border-gray-700">
                {SCHRITTE.map(s => (
                    <li key={s.n} className="grid gap-1 py-5 sm:grid-cols-[3.5rem_1fr] sm:gap-4 sm:items-start">
                        <span className="font-mono tabular-nums text-3xl font-bold text-gray-900 dark:text-white" aria-hidden>
                            {s.n.padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-[15px]">{s.title}</p>
                            <p className="mt-1 text-[15px] leading-7 text-gray-600 dark:text-gray-300 max-w-prose">{s.text}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <p className="mt-5 text-[15px] leading-7 text-gray-600 dark:text-gray-300 max-w-prose">
                Die AG-Stunde dienstags in <span className="font-mono tabular-nums">H310</span> ist{' '}
                <strong>ehrenamtlich</strong>. Private Nachhilfe über die Börse vereinbaren Familien direkt —
                Richtwert <span className="font-mono tabular-nums font-bold">ca. 10–15 € / 45 Min</span>.
            </p>
            <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                    Verifizierung in der App
                </h3>
                <VerifySteps tone="du" variant="chips" />
            </div>
        </motion.section>
    );

    const nutzen = (
        <motion.section
            key="nutzen"
            aria-labelledby="coaching-nutzen"
            {...anim()}
            className="rounded-3xl bg-gray-950 dark:bg-gray-900 text-white p-6 sm:p-8 shadow-soft"
        >
            <h2 id="coaching-nutzen" className="font-display uppercase text-2xl sm:text-3xl tracking-tight">
                Darum lohnt sich das Coaching
            </h2>
            <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                {NUTZEN.map((n, i) => (
                    <li key={n.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <span className="font-mono tabular-nums text-sm font-bold text-primary" aria-hidden>
                            {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="mt-2 font-display uppercase text-lg tracking-tight">{n.title}</p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-300">{n.text}</p>
                    </li>
                ))}
            </ul>
        </motion.section>
    );

    const regeln = (
        <motion.section
            key="regeln"
            aria-labelledby="coaching-regeln"
            {...anim()}
            className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft"
        >
            <h2 id="coaching-regeln" className="font-display uppercase text-2xl sm:text-3xl tracking-tight text-gray-900 dark:text-white">
                Die 7 Fairness-Regeln
            </h2>
            <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
            {design.regelnStil === 'aufklappbar' ? (
                <div className="mt-6 border-t-2 border-gray-900 dark:border-white">
                    {sections.map((s, idx) => (
                        <details
                            key={s.title}
                            open={idx === 0}
                            className="group border-b border-gray-100 dark:border-gray-800"
                        >
                            <summary className="flex min-h-[44px] cursor-pointer items-center gap-4 py-3 font-display uppercase text-xl tracking-tight text-gray-900 dark:text-white [&::-webkit-details-marker]:hidden">
                                <span className="grid place-items-center w-11 h-11 rounded-2xl bg-black text-primary dark:bg-primary dark:text-black shrink-0" aria-hidden>
                                    {s.icon}
                                </span>
                                <span className="min-w-0 flex-1">{s.title}</span>
                                <ChevronDown size={18} className="shrink-0 text-amber-700 transition-transform duration-200 ease-out group-open:rotate-180 dark:text-primary" aria-hidden />
                            </summary>
                            <div className="accordion-body pb-6 sm:pl-[3.75rem] mt-1 text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-2 max-w-prose">
                                {renderBody(s.body)}
                            </div>
                        </details>
                    ))}
                </div>
            ) : (
                <div className="mt-6 border-t-2 border-gray-900 dark:border-white">
                    {sections.map(s => (
                        <article key={s.title} className="grid gap-3 py-6 border-b border-gray-100 dark:border-gray-800 last:border-b-0 sm:grid-cols-[3rem_1fr] sm:gap-5">
                            <span className="grid place-items-center w-11 h-11 rounded-2xl bg-black text-primary dark:bg-primary dark:text-black shrink-0" aria-hidden>
                                {s.icon}
                            </span>
                            <div className="min-w-0">
                                <h3 className="font-display uppercase text-xl tracking-tight text-gray-900 dark:text-white">{s.title}</h3>
                                <div className="mt-2 text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-2 max-w-prose">
                                    {renderBody(s.body)}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </motion.section>
    );

    const kontakt = (
        <motion.section
            key="kontakt"
            aria-labelledby="coaching-kontakt"
            {...anim()}
            className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft"
        >
            <h2 id="coaching-kontakt" className="font-display uppercase text-xl tracking-tight text-gray-900 dark:text-white">
                Fragen zum Coaching?
            </h2>
            <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
            <p className="mt-3 text-[15px] leading-7 text-gray-600 dark:text-gray-300 max-w-prose">
                {content.contact_text} · E-Mail:{' '}
                <a href={`mailto:${COACH_MAIL}`} className={`${LINK_CLS} break-anywhere`}>{COACH_MAIL}</a>
            </p>
            <p className="mt-2 text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                Mehr für Eltern: <Link to="/eltern-leitfaden" className={LINK_CLS}>Eltern-Leitfaden</Link>
            </p>
        </motion.section>
    );

    const byId: Record<CoachingSectionId, React.ReactNode> = {
        plakat,
        ablauf,
        nutzen,
        regeln,
        kontakt,
    };

    // Förderunterricht-Stundenplan (vom Feed hierher umgezogen, immer sichtbar, nicht Builder-gesteuert).
    const foerderung = (
        <motion.section
            key="foerderung"
            id="foerderung"
            aria-labelledby="foerderung-titel"
            {...anim()}
            className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-soft scroll-mt-24"
        >
            <h2 id="foerderung-titel" className="font-display uppercase text-2xl sm:text-3xl tracking-tight text-gray-900 dark:text-white">
                Förderunterricht Sek. I (2. HJ)
            </h2>
            <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
            <div className="mt-4 text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-2 max-w-prose">
                <p>Förderunterricht wird in den Jahrgangsstufen 5-10 in den Fächern Deutsch, Mathematik, Englisch und Latein erteilt. Die Entscheidung über eine Anmeldung liegt bei den Eltern.</p>
                <p><strong>Start:</strong> Mittwoch, 18.02. in der 7. Stunde (Kick-off in H408). Danach regulär in H402.</p>
                <p>
                    Anmeldung verbindlich über:{' '}
                    <a href="mailto:foerderunterricht@fwg-koeln.nrw.schule" className={LINK_CLS}>foerderunterricht@fwg-koeln.nrw.schule</a>
                </p>
            </div>
            <div className="overflow-x-auto max-w-full mt-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full min-w-[440px] text-center text-xs md:text-sm border-collapse">
                    <thead>
                        <tr>
                            <th className="border p-2 border-gray-200 dark:border-gray-800 font-mono tabular-nums">Montag</th>
                            <th className="border p-2 border-gray-200 dark:border-gray-800 font-mono tabular-nums">Dienstag</th>
                            <th className="border p-2 border-gray-200 dark:border-gray-800 font-mono tabular-nums">Mittwoch</th>
                            <th className="border p-2 border-gray-200 dark:border-gray-800 font-mono tabular-nums">Donnerstag</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono tabular-nums">
                        <tr>
                            <td className="border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold">D</td>
                            <td className="border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold">D</td>
                            <td className="border p-2 bg-green-200/50 dark:bg-green-900/50 border-gray-200 dark:border-gray-800 text-green-800 dark:text-green-200 font-bold">M</td>
                            <td className="border p-2 bg-green-200/50 dark:bg-green-900/50 border-gray-200 dark:border-gray-800 text-green-800 dark:text-green-200 font-bold">M</td>
                        </tr>
                        <tr>
                            <td className="border p-2 bg-blue-200/50 dark:bg-blue-900/50 border-gray-200 dark:border-gray-800 text-blue-800 dark:text-blue-200 font-bold">E</td>
                            <td className="border p-2 bg-pink-200/50 dark:bg-pink-900/50 border-gray-200 dark:border-gray-800 text-pink-800 dark:text-pink-200 font-bold">L</td>
                            <td className="border p-2 bg-pink-200/50 dark:bg-pink-900/50 border-gray-200 dark:border-gray-800 text-pink-800 dark:text-pink-200 font-bold">L</td>
                            <td className="border p-2 bg-blue-200/50 dark:bg-blue-900/50 border-gray-200 dark:border-gray-800 text-blue-800 dark:text-blue-200 font-bold">E</td>
                        </tr>
                        <tr>
                            <td className="border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold">D/LRS</td>
                            <td className="border p-2 border-gray-200 dark:border-gray-800"></td>
                            <td className="border p-2 border-gray-200 dark:border-gray-800"></td>
                            <td className="border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold">D/LRS</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-[15px] leading-7 text-gray-600 dark:text-gray-300 max-w-prose">
                Terminabsprachen für ein Lerncoaching trefft ihr gerne individuell persönlich oder per Mail mit Herr Gampp, Frau Hallerbach, Frau Trottmann oder Frau Weyers:<br />
                <a href="mailto:lerncoaching@fwg-koeln.nrw.schule" className={LINK_CLS}>lerncoaching@fwg-koeln.nrw.schule</a>
            </p>
        </motion.section>
    );

    const ordered: CoachingSectionId[] = [];
    for (const entry of design.sections) {
        if ((SECTION_IDS as string[]).includes(entry.id) && entry.visible && !ordered.includes(entry.id)) {
            ordered.push(entry.id);
        }
    }
    for (const id of SECTION_IDS) {
        const inDesign = design.sections.find(s => s.id === id);
        if (!inDesign && !ordered.includes(id)) ordered.push(id);
    }

    return (
        <StaticLayout
            title={content.hero_title}
            intro={content.hero_subtitle}
        >
            {/* Sektions-Rhythmus wie alle StaticLayout-Seiten: eng innen, weit zwischen Sektionen. */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 min-w-0 flex flex-col gap-10 sm:gap-12">
                {ordered.map(id => byId[id])}
                {foerderung}
            </div>
        </StaticLayout>
    );
}

export default function Coaching() {
    const [content, setContent] = useState<Record<string, string>>(FALLBACK);
    const [design, setDesign] = useState<DesignConfig>(DEFAULT_DESIGN);
    const location = useLocation();

    useEffect(() => {
        let cancelled = false;
        api.coach.getCoachingPage()
            .then(res => {
                if (!cancelled && res?.data && typeof res.data === 'object') {
                    const data = res.data as Record<string, unknown>;
                    const texts: Record<string, string> = {};
                    for (const [k, v] of Object.entries(data)) {
                        if (typeof v === 'string') texts[k] = v;
                    }
                    setContent({ ...FALLBACK, ...texts });
                    setDesign(parseCoachingDesign(data.layout_json));
                }
            })
            .catch(() => { /* Fallback-Texte bleiben */ });
        return () => { cancelled = true; };
    }, []);

    // HashRouter-sicherer Tiefensprung (z. B. vom Feed: navigate('/coaching', { state: { section: 'foerderung' } })).
    useEffect(() => {
        const section = (location.state as { section?: string } | null)?.section;
        if (!section) return;
        const t = setTimeout(() => {
            const el = document.getElementById(section);
            if (!el) return;
            const reduce = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(t);
    }, [location.state]);

    return <CoachingView content={content} design={design} />;
}
