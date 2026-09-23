import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Award, ClipboardCheck, Scale, Megaphone, HeartHandshake, Gavel, Mail, School, Clock, MapPin, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import StaticLayout from '../components/StaticLayout';
import { api } from '../lib/api';

const easeOut = [0.16, 1, 0.3, 1] as const;

export const FALLBACK: Record<string, string> = {
    hero_title: 'Schüler-Coaching am FWG',
    hero_subtitle: 'Große helfen Kleinen: Geschulte Schülerinnen und Schüler ab Klasse 8 unterstützen die Klassen 5 und 6 beim Ankommen am Friedrich-Wilhelm-Gymnasium Köln. Ehrenamtlich, pädagogisch begleitet und für alle nach denselben fairen Regeln.',
    s_badge_title: 'Was bedeutet das Coach-Abzeichen?',
    s_badge_body: 'Das goldene Coach-Badge auf Profilen und Anzeigen zeigt: Diese Person ist aktives Mitglied der Schüler-Coaching AG, wurde von der AG-Leitung geschult und vom SV-Team verifiziert.\n\nDas Badge steht für Vertrauenswürdigkeit als Person, nicht für Erfolgsgarantien und nicht für kostenlose Nachhilfe. Preise und Absprachen bleiben Sache der Beteiligten (siehe Nutzungsbedingungen).',
    s_school_title: 'Das Coaching an unserer Schule',
    s_school_body: 'Das Schüler-Coaching ist ein schulisches Angebot des FWG: Jede Woche dienstags von 13:45–14:30 Uhr in Raum H310 helfen geschulte Schülerinnen und Schüler der 8. Klassen den 5. und 6. Klassen. Es geht um einzelne Fächer und um die Lern- und Arbeitsorganisation allgemein. Die Coaches werden jeweils vor den Herbstferien geschult und engagieren sich ehrenamtlich bis zum Ende des Schuljahres. Das Angebot wird in der Regel sehr gerne angenommen, weil die Coaches einen guten Blick auf die Probleme der jüngeren Schülerinnen und Schüler haben.\n\nMehr dazu auf der Schul-Website: fwg-koeln.de/lebendige-schule/foerdern-und-fordern/coaching. Diese Nachhilfebörse der SV ergänzt das Angebot: Hier finden alle Jahrgangsstufen individuelle Nachhilfe. Die Coaches der AG sind dabei besonders sichtbar, damit man sie leicht findet.',
    s_who_title: 'Wer kann Coach werden?',
    s_who_body: '• Schülerin oder Schüler des FWG ab Klasse 8\n• Teilnahme an der Coach-Schulung der AG-Leitung (findet jeweils vor den Herbstferien statt)\n• Zuverlässigkeit und respektvoller Umgang, auch auf der Plattform\n• Verifizierter Account auf der Nachhilfebörse\n\nInteressiert? Wende dich an Frau Balistreri oder sprich das SV-Team im SV-Raum an. Die Aufnahme erfolgt nach Schulung über einen persönlichen Coaching-Code. Für alle gelten dieselben Kriterien.',
    s_boost_title: 'Warum stehen manche Anzeigen oben?',
    s_boost_body: 'Anzeigen mit dem Hinweis „Hervorgehoben“ erhalten eine bessere Platzierung und eine gelbe Markierung. Das passiert ausschließlich in zwei Fällen:\n\n• Coach-Status: Nach Einlösen eines Coaching-Codes werden Anzeigen des Coaches für 30 Tage hervorgehoben.\n• SV-Aktionen: Zeitlich begrenzte Hinweise des SV-Teams (z. B. zum Schuljahresstart).\n\nSichtbarkeit ist bei uns nicht käuflich: Es gibt keine bezahlten Boosts und keine Werbung. Zusätzlich erhalten Coach-Anzeigen einen kleinen, öffentlich dokumentierten Ranking-Vorteil (etwa +24 Stunden Aktualität bzw. leicht bessere Match-Einordnung). Das ist bewusst eine Anerkennung für das Ehrenamt der Coaches, für alle Coaches gleich und nur solange der Coach-Status aktiv ist. Versteckte Bevorzugungen gibt es nicht: Alles steht auf dieser Seite.',
    s_fair_title: 'Gleiche Chancen für alle',
    s_fair_body: '• Jede Schülerin und jeder Schüler kann kostenlos Anzeigen erstellen, mit oder ohne Badge.\n• Der Filter „Nur Coaches“ hilft beim Finden geprüfter Coaches, blendet aber niemanden aus: Alle Anzeigen bleiben für alle sichtbar.\n• Codes sind personenbezogen und begrenzt (in der Regel einmalig einlösbar) und werden nur nach Schulung vergeben, nicht auf Zuruf oder gegen Gegenleistung.\n• Die Vergabe von Codes und Coach-Status wird protokolliert und kann vom SV-Team geprüft werden.\n• Der kleine Ranking-Vorteil für Coaches steht öffentlich auf dieser Seite. Versteckte Bevorzugungen gibt es nicht.',
    s_conduct_title: 'Verhalten als Coach',
    s_conduct_body: '• Respektvoller, geduldiger Umgang, besonders mit jüngeren Schülern\n• Keine falschen Versprechen (z. B. garantierte Notenverbesserung)\n• Treffen möglichst in der Schule (z. B. Bibliothek, Mensa); private Treffen nur mit Wissen der Eltern\n• Bei Problemen: frühzeitig die AG-Leitung oder das SV-Team ansprechen',
    s_revoke_title: 'Entzug des Status & Widerspruch',
    s_revoke_body: 'Bei Verstößen gegen diese Regeln oder die Nutzungsbedingungen (z. B. unzuverlässiges Verhalten, Missbrauch des Badges, unangemessene Inhalte) kann die AG-Leitung oder das SV-Team den Coach-Status entziehen. Du bekommst eine kurze Begründung direkt in der App oder per E-Mail.\n\nDagegen kannst du Widerspruch einlegen: Schreibe an info@nachhilfe-sv.de oder komme im SV-Raum vorbei. Das SV-Team prüft jeden Fall erneut.',
    contact_text: 'AG-Leitung: Frau Balistreri · SV-Lehrer: Herr Schulz, Herr Steinberg',
};

const COACH_MAIL = 'Rosalia.Balistreri@fwg-koeln.nrw.schule';
const COACHING_DOCUMENT_VERSION = 1 as const;
const LINK_CLS = 'font-bold text-amber-700 dark:text-primary hover:underline';

export interface CoachingListItem {
    id: string;
    title: string;
    body: string;
}

export interface CoachingScheduleDay {
    id: string;
    label: string;
}

export interface CoachingScheduleCell {
    id: string;
    text: string;
}

export interface CoachingScheduleRow {
    id: string;
    cells: CoachingScheduleCell[];
}

export interface CoachingHeaderBlock {
    id: string;
    type: 'header';
    title: string;
    intro: string;
}

export interface CoachingPosterBlock {
    id: string;
    type: 'poster';
    stamp: string;
    title: string;
    time: string;
    room: string;
    contactText: string;
    email: string;
    mailSubject: string;
    ctaLabel: string;
    hint: string;
}

export interface CoachingStepsBlock {
    id: string;
    type: 'steps';
    title: string;
    items: CoachingListItem[];
    note: string;
    verificationTitle: string;
    verificationItems: CoachingListItem[];
}

export interface CoachingBenefitsBlock {
    id: string;
    type: 'benefits';
    title: string;
    items: CoachingListItem[];
}

export interface CoachingRulesBlock {
    id: string;
    type: 'rules';
    title: string;
    items: CoachingListItem[];
}

export interface CoachingContactBlock {
    id: string;
    type: 'contact';
    title: string;
    text: string;
    email: string;
    parentText: string;
    parentLinkLabel: string;
    parentLinkPath: string;
}

export interface CoachingSupportBlock {
    id: string;
    type: 'support';
    title: string;
    paragraphs: string[];
    registrationText: string;
    registrationEmail: string;
    days: CoachingScheduleDay[];
    rows: CoachingScheduleRow[];
    learnCoachingText: string;
    learnCoachingEmail: string;
}

export interface CoachingTextBlock {
    id: string;
    type: 'text';
    title: string;
    body: string;
}

export type CoachingBlock =
    | CoachingPosterBlock
    | CoachingStepsBlock
    | CoachingBenefitsBlock
    | CoachingRulesBlock
    | CoachingContactBlock
    | CoachingSupportBlock
    | CoachingTextBlock;

export type CoachingBlockType = CoachingBlock['type'];

export interface CoachingDocument {
    version: typeof COACHING_DOCUMENT_VERSION;
    header: CoachingHeaderBlock | null;
    blocks: CoachingBlock[];
}

const RULE_KEYS = [
    ['rule-badge', 's_badge'],
    ['rule-school', 's_school'],
    ['rule-who', 's_who'],
    ['rule-boost', 's_boost'],
    ['rule-fair', 's_fair'],
    ['rule-conduct', 's_conduct'],
    ['rule-revoke', 's_revoke'],
] as const;

function createId(prefix: string): string {
    const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${random}`;
}

function valueFrom(legacy: Record<string, string>, key: string): string {
    return typeof legacy[key] === 'string' ? legacy[key] : FALLBACK[key] ?? '';
}

function listItem(id: string, title: string, body: string): CoachingListItem {
    return { id, title, body };
}

export function createDefaultCoachingDocument(legacy: Record<string, string> = FALLBACK): CoachingDocument {
    const text = (key: string) => valueFrom(legacy, key);
    return {
        version: COACHING_DOCUMENT_VERSION,
        header: {
            id: 'header',
            type: 'header',
            title: text('hero_title'),
            intro: text('hero_subtitle'),
        },
        blocks: [
            {
                id: 'poster',
                type: 'poster',
                stamp: 'Ehrenamtlich',
                title: 'Direkt dabei sein',
                time: 'Di 13:45–14:30',
                room: 'Raum H310',
                contactText: text('contact_text'),
                email: COACH_MAIL,
                mailSubject: 'Anmeldung Schüler-Coaching AG',
                ctaLabel: 'Per Mail anmelden',
                hint: 'oder das SV-Team im SV-Raum ansprechen',
            },
            {
                id: 'steps',
                type: 'steps',
                title: 'In 3 Schritten Coach werden',
                items: [
                    listItem('step-1', 'Melden', 'Schreib eine Mail an Frau Balistreri oder sprich das SV-Team im SV-Raum an.'),
                    listItem('step-2', 'Schulung', 'Nimm an der Coach-Schulung der AG-Leitung vor den Herbstferien teil.'),
                    listItem('step-3', 'Badge & Start', 'Erhalte das Coach-Badge und starte dienstags in H310.'),
                ],
                note: 'Die AG-Stunde dienstags in H310 ist ehrenamtlich. Private Nachhilfe über die Börse vereinbaren Familien direkt. Richtwert ca. 10–12 € pro 45–60 Min.',
                verificationTitle: 'Verifizierung in der App',
                verificationItems: [
                    listItem('verify-1', 'Melde dich an', 'Account anlegen. Das dauert keine große Pause.'),
                    listItem('verify-2', 'Komm in den SV-Raum', 'Sag einfach: „Hey, ich habe mich angemeldet, ich möchte mich verifizieren lassen.“'),
                    listItem('verify-3', 'Wir schalten dich frei. Du bist verifiziert.', 'Erst dann kannst du Anzeigen erstellen und Kontakt aufnehmen.'),
                ],
            },
            {
                id: 'benefits',
                type: 'benefits',
                title: 'Darum lohnt sich das Coaching',
                items: [
                    listItem('benefit-1', 'Große helfen Kleinen', 'Klassen 5 und 6 erhalten Hilfe von geschulten Coaches ab Klasse 8.'),
                    listItem('benefit-2', 'Begleitet & ehrenamtlich', 'Pädagogisch begleitet durch Frau Balistreri, ehrenamtlich bis zum Schuljahresende.'),
                    listItem('benefit-3', 'Fester Treffpunkt', 'Jeden Dienstag 13:45–14:30 Uhr in Raum H310. Einfach vorbeikommen.'),
                ],
            },
            {
                id: 'rules',
                type: 'rules',
                title: 'Die 7 Fairness-Regeln',
                items: RULE_KEYS.map(([id, key]) => listItem(id, text(`${key}_title`), text(`${key}_body`))),
            },
            {
                id: 'contact',
                type: 'contact',
                title: 'Fragen zum Coaching?',
                text: text('contact_text'),
                email: COACH_MAIL,
                parentText: 'Mehr für Eltern:',
                parentLinkLabel: 'Eltern-Leitfaden',
                parentLinkPath: '/eltern-leitfaden',
            },
            {
                id: 'foerderung',
                type: 'support',
                title: 'Förderunterricht Sek. I (2. HJ)',
                paragraphs: [
                    'Förderunterricht wird in den Jahrgangsstufen 5-10 in den Fächern Deutsch, Mathematik, Englisch und Latein erteilt. Die Entscheidung über eine Anmeldung liegt bei den Eltern.',
                    'Start: Mittwoch, 18.02. in der 7. Stunde (Kick-off in H408). Danach regulär in H402.',
                ],
                registrationText: 'Anmeldung verbindlich über:',
                registrationEmail: 'foerderunterricht@fwg-koeln.nrw.schule',
                days: [
                    { id: 'day-monday', label: 'Montag' },
                    { id: 'day-tuesday', label: 'Dienstag' },
                    { id: 'day-wednesday', label: 'Mittwoch' },
                    { id: 'day-thursday', label: 'Donnerstag' },
                ],
                rows: [
                    {
                        id: 'schedule-row-1',
                        cells: [
                            { id: 'r1c1', text: 'D' },
                            { id: 'r1c2', text: 'D' },
                            { id: 'r1c3', text: 'M' },
                            { id: 'r1c4', text: 'M' },
                        ],
                    },
                    {
                        id: 'schedule-row-2',
                        cells: [
                            { id: 'r2c1', text: 'E' },
                            { id: 'r2c2', text: 'L' },
                            { id: 'r2c3', text: 'L' },
                            { id: 'r2c4', text: 'E' },
                        ],
                    },
                    {
                        id: 'schedule-row-3',
                        cells: [
                            { id: 'r3c1', text: 'D/LRS' },
                            { id: 'r3c2', text: '' },
                            { id: 'r3c3', text: '' },
                            { id: 'r3c4', text: 'D/LRS' },
                        ],
                    },
                ],
                learnCoachingText: 'Terminabsprachen für ein Lerncoaching trefft ihr gerne individuell persönlich oder per Mail mit Herr Gampp, Frau Hallerbach, Frau Trottmann oder Frau Weyers:',
                learnCoachingEmail: 'lerncoaching@fwg-koeln.nrw.schule',
            },
        ],
    };
}

export function createDefaultCoachingBlock(type: CoachingBlockType, legacy: Record<string, string> = FALLBACK): CoachingBlock {
    const document = createDefaultCoachingDocument(legacy);
    if (type === 'text') {
        return {
            id: createId('text'),
            type: 'text',
            title: 'Neuer Textabschnitt',
            body: 'Hier steht der Text des Abschnitts.',
        };
    }
    const block = document.blocks.find(candidate => candidate.type === type);
    if (!block) throw new Error(`Unbekannter Coaching-Block: ${type}`);
    return structuredClone(block);
}

export function createCoachingTextBlock(): CoachingTextBlock {
    return {
        id: createId('text'),
        type: 'text',
        title: 'Neuer Textabschnitt',
        body: 'Hier steht der Text des Abschnitts.',
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function textValue(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
}

function uniqueId(value: unknown, prefix: string, used: Set<string>): string {
    const base = typeof value === 'string' && value.trim() ? value : createId(prefix);
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
    }
    used.add(id);
    return id;
}

function normalizeList(value: unknown, fallback: CoachingListItem[], prefix: string): CoachingListItem[] {
    if (!Array.isArray(value)) return fallback.map(item => ({ ...item }));
    const used = new Set<string>();
    const items: CoachingListItem[] = [];
    for (const [index, raw] of value.entries()) {
        if (!isRecord(raw)) continue;
        const source = fallback[index % Math.max(fallback.length, 1)] ?? { id: '', title: '', body: '' };
        items.push({
            id: uniqueId(raw.id, `${prefix}-${index + 1}`, used),
            title: textValue(raw.title, source.title),
            body: textValue(raw.body, source.body),
        });
    }
    return items;
}

function normalizeDays(value: unknown, fallback: CoachingScheduleDay[]): CoachingScheduleDay[] {
    if (!Array.isArray(value)) return fallback.map(day => ({ ...day }));
    const used = new Set<string>();
    return value.flatMap((raw, index) => {
        if (typeof raw === 'string') {
            return [{ id: uniqueId(raw, `day-${index + 1}`, used), label: raw }];
        }
        if (!isRecord(raw)) return [];
        return [{
            id: uniqueId(raw.id, `day-${index + 1}`, used),
            label: textValue(raw.label, fallback[index % Math.max(fallback.length, 1)]?.label ?? ''),
        }];
    });
}

function normalizeRows(value: unknown, fallback: CoachingScheduleRow[]): CoachingScheduleRow[] {
    if (!Array.isArray(value)) return fallback.map(row => ({ ...row, cells: row.cells.map(cell => ({ ...cell })) }));
    const usedRows = new Set<string>();
    const usedCells = new Set<string>();
    return value.flatMap((raw, rowIndex) => {
        if (!isRecord(raw) || !Array.isArray(raw.cells)) return [];
        const source = fallback[rowIndex % Math.max(fallback.length, 1)];
        return [{
            id: uniqueId(raw.id, `schedule-row-${rowIndex + 1}`, usedRows),
            cells: raw.cells.flatMap((cell, cellIndex) => {
                const cellText = typeof cell === 'string'
                    ? cell
                    : isRecord(cell) ? textValue(cell.text, source?.cells[cellIndex]?.text ?? '') : null;
                if (cellText === null) return [];
                return [{
                    id: uniqueId(
                        isRecord(cell) ? cell.id : `cell-${rowIndex + 1}-${cellIndex + 1}`,
                        `cell-${rowIndex + 1}-${cellIndex + 1}`,
                        usedCells
                    ),
                    text: cellText,
                }];
            }),
        }];
    });
}

function normalizeBlock(raw: unknown, fallback: CoachingBlock): CoachingBlock | null {
    if (!isRecord(raw) || raw.type !== fallback.type) return null;
    if (fallback.type === 'poster') {
        return {
            ...fallback,
            stamp: textValue(raw.stamp, fallback.stamp),
            title: textValue(raw.title, fallback.title),
            time: textValue(raw.time, fallback.time),
            room: textValue(raw.room, fallback.room),
            contactText: textValue(raw.contactText, fallback.contactText),
            email: textValue(raw.email, fallback.email),
            mailSubject: textValue(raw.mailSubject, fallback.mailSubject),
            ctaLabel: textValue(raw.ctaLabel, fallback.ctaLabel),
            hint: textValue(raw.hint, fallback.hint),
        };
    }
    if (fallback.type === 'steps') {
        return {
            ...fallback,
            title: textValue(raw.title, fallback.title),
            items: normalizeList(raw.items, fallback.items, 'step'),
            note: textValue(raw.note, fallback.note),
            verificationTitle: textValue(raw.verificationTitle, fallback.verificationTitle),
            verificationItems: normalizeList(raw.verificationItems, fallback.verificationItems, 'verify'),
        };
    }
    if (fallback.type === 'benefits' || fallback.type === 'rules') {
        return {
            ...fallback,
            title: textValue(raw.title, fallback.title),
            items: normalizeList(raw.items, fallback.items, fallback.type === 'rules' ? 'rule' : 'benefit'),
        };
    }
    if (fallback.type === 'contact') {
        return {
            ...fallback,
            title: textValue(raw.title, fallback.title),
            text: textValue(raw.text, fallback.text),
            email: textValue(raw.email, fallback.email),
            parentText: textValue(raw.parentText, fallback.parentText),
            parentLinkLabel: textValue(raw.parentLinkLabel, fallback.parentLinkLabel),
            parentLinkPath: textValue(raw.parentLinkPath, fallback.parentLinkPath),
        };
    }
    if (fallback.type === 'support') {
        const paragraphs = Array.isArray(raw.paragraphs)
            ? raw.paragraphs.map((paragraph, index) => textValue(paragraph, fallback.paragraphs[index] ?? ''))
            : [...fallback.paragraphs];
        return {
            ...fallback,
            title: textValue(raw.title, fallback.title),
            paragraphs,
            registrationText: textValue(raw.registrationText, fallback.registrationText),
            registrationEmail: textValue(raw.registrationEmail, fallback.registrationEmail),
            days: normalizeDays(raw.days, fallback.days),
            rows: normalizeRows(raw.rows, fallback.rows),
            learnCoachingText: textValue(raw.learnCoachingText, fallback.learnCoachingText),
            learnCoachingEmail: textValue(raw.learnCoachingEmail, fallback.learnCoachingEmail),
        };
    }
    return {
        ...fallback,
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : fallback.id,
        title: textValue(raw.title, fallback.title),
        body: textValue(raw.body, fallback.body),
    };
}

function normalizeCoachingDocument(raw: Record<string, unknown>, legacy: Record<string, string>): CoachingDocument {
    const fallback = createDefaultCoachingDocument(legacy);
    let header = fallback.header;
    if (Object.prototype.hasOwnProperty.call(raw, 'header')) {
        if (raw.header === null) {
            header = null;
        } else if (isRecord(raw.header)) {
            header = {
                id: typeof raw.header.id === 'string' ? raw.header.id : 'header',
                type: 'header',
                title: textValue(raw.header.title, fallback.header?.title ?? ''),
                intro: textValue(raw.header.intro, fallback.header?.intro ?? ''),
            };
        }
    }
    let blocks = fallback.blocks;
    if (Array.isArray(raw.blocks)) {
        const byType = new Map(fallback.blocks.map(block => [block.type, block]));
        const used = new Set<string>();
        blocks = raw.blocks.flatMap((entry, index) => {
            if (!isRecord(entry) || typeof entry.type !== 'string') return [];
            const type = entry.type as CoachingBlockType;
            const fallbackBlock = type === 'text' ? createCoachingTextBlock() : byType.get(type);
            if (!fallbackBlock) return [];
            const block = normalizeBlock(entry, fallbackBlock);
            if (!block) return [];
            return [{ ...block, id: uniqueId(block.id, `block-${index + 1}`, used) }];
        });
    }
    return {
        version: COACHING_DOCUMENT_VERSION,
        header,
        blocks,
    };
}

function legacyFromData(data: Record<string, unknown>): Record<string, string> {
    const legacy: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') legacy[key] = value;
    }
    return legacy;
}

export function parseCoachingDocument(data: Record<string, unknown>): CoachingDocument {
    const legacy = legacyFromData(data);
    const fallback = createDefaultCoachingDocument(legacy);
    const rawContent = data.content_json;
    if (typeof rawContent !== 'string' || !rawContent.trim()) return fallback;
    try {
        const parsed: unknown = JSON.parse(rawContent);
        return isRecord(parsed) ? normalizeCoachingDocument(parsed, legacy) : fallback;
    } catch {
        return fallback;
    }
}

export function documentToLegacy(document: CoachingDocument): Record<string, string> {
    const rules = document.blocks.find((block): block is CoachingRulesBlock => block.type === 'rules');
    const legacy: Record<string, string> = {
        hero_title: document.header?.title ?? '',
        hero_subtitle: document.header?.intro ?? '',
        contact_text: '',
    };
    for (const [id, key] of RULE_KEYS) {
        const item = rules?.items.find(candidate => candidate.id === id);
        legacy[`${key}_title`] = item?.title ?? '';
        legacy[`${key}_body`] = item?.body ?? '';
    }
    const poster = document.blocks.find((block): block is CoachingPosterBlock => block.type === 'poster');
    const contact = document.blocks.find((block): block is CoachingContactBlock => block.type === 'contact');
    legacy.contact_text = poster ? poster.contactText : contact?.text ?? '';
    return legacy;
}

function linkify(text: string) {
    const parts = text.split(/([\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|fwg-koeln\.de(?:\/\S*)?)/g);
    return parts.map((part, index) => {
        if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(part)) {
            return <a key={index} href={`mailto:${part}`} className={LINK_CLS}>{part}</a>;
        }
        if (/^fwg-koeln\.de/.test(part)) {
            return <a key={index} href={`https://${part}`} target="_blank" rel="noreferrer" className={LINK_CLS}>{part}</a>;
        }
        return <span key={index}>{part}</span>;
    });
}

function renderBody(body: string): ReactNode {
    const blocks = body.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
    if (blocks.length === 0) return null;
    return blocks.map((block, index) => {
        const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length > 0 && lines.every(line => line.startsWith('•'))) {
            return (
                <ul key={index} className="list-disc pl-4 space-y-1">
                    {lines.map((line, lineIndex) => <li key={lineIndex}>{linkify(line.replace(/^•\s*/, ''))}</li>)}
                </ul>
            );
        }
        return <p key={index}>{linkify(block)}</p>;
    });
}

const RULE_ICONS: LucideIcon[] = [Award, School, ClipboardCheck, Megaphone, Scale, HeartHandshake, Gavel];

function scheduleCellClass(text: string): string {
    const value = text.trim();
    if (!value) return 'border p-2 border-gray-200 dark:border-gray-800';
    if (/^E(?:\s|$)/i.test(value)) {
        return 'border p-2 bg-blue-200/50 dark:bg-blue-900/50 border-gray-200 dark:border-gray-800 text-blue-800 dark:text-blue-200 font-bold';
    }
    if (/^L(?:\s|$)/i.test(value)) {
        return 'border p-2 bg-pink-200/50 dark:bg-pink-900/50 border-gray-200 dark:border-gray-800 text-pink-800 dark:text-pink-200 font-bold';
    }
    if (/^M(?:\s|$)/i.test(value)) {
        return 'border p-2 bg-green-200/50 dark:bg-green-900/50 border-gray-200 dark:border-gray-800 text-green-800 dark:text-green-200 font-bold';
    }
    return 'border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-gray-200 dark:border-gray-800 text-yellow-800 dark:text-yellow-200 font-bold';
}

export function CoachingView({ document, preview = false }: { document: CoachingDocument; preview?: boolean }) {
    const reduceMotion = useReducedMotion();
    const idPrefix = preview ? 'preview-' : '';
    const anim = (delay = 0) => reduceMotion ? {} : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.55, delay, ease: easeOut },
    };
    const wipeLine = (delay = 0.2) => reduceMotion ? {} : {
        initial: { clipPath: 'inset(0 100% 0 0)' },
        whileInView: { clipPath: 'inset(0 0% 0 0)' },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.5, delay, ease: easeOut },
    };
    const supportAnchorId = document.blocks.find(block => block.type === 'support')?.id;

    const renderBlock = (block: CoachingBlock): ReactNode => {
        if (block.type === 'poster') {
            return (
                <motion.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="relative overflow-hidden rounded-3xl bg-primary p-6 text-black shadow-soft sm:p-10">
                    <div className="absolute inset-0 poster-grain-dark" aria-hidden />
                    <div className="relative">
                        {block.stamp ? (
                            <div className="flex flex-wrap items-start justify-end gap-4">
                                <span className="stamp-ring rotate-6 rounded border-2 border-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-black/70" aria-hidden>{block.stamp}</span>
                            </div>
                        ) : null}
                        <h2 id={`${idPrefix}${block.id}-title`} className="mt-3 font-display text-3xl uppercase leading-[0.95] tracking-tight sm:text-5xl">{block.title}</h2>
                        {(block.time || block.room) ? (
                            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] font-bold">
                                {block.time ? <span className="inline-flex items-center gap-1.5"><Clock size={16} aria-hidden /><span className="font-mono tabular-nums">{block.time}</span></span> : null}
                                {block.room ? <span className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden /><span className="font-mono tabular-nums">{block.room}</span></span> : null}
                            </p>
                        ) : null}
                        {block.contactText ? <p className="mt-3 max-w-prose text-[15px] font-medium leading-7 text-black/75">{block.contactText}</p> : null}
                        {block.ctaLabel || block.hint ? (
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                                {block.ctaLabel ? (
                                    <a href={`mailto:${block.email}?subject=${encodeURIComponent(block.mailSubject)}`} className="press inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-black px-8 py-3 text-sm font-bold text-white hover:bg-gray-900 sm:w-auto">
                                        <Mail size={18} aria-hidden /> {block.ctaLabel}
                                    </a>
                                ) : null}
                                {block.hint ? <span className="text-center text-sm font-semibold text-black/70 sm:text-left">{block.hint}</span> : null}
                            </div>
                        ) : null}
                    </div>
                </motion.section>
            );
        }

        if (block.type === 'steps') {
            return (
                <motion.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="font-display text-2xl uppercase tracking-tight text-gray-900 dark:text-white sm:text-3xl">{block.title}</h2>
                    <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    {block.items.length > 0 ? (
                        <ol className="mt-6 divide-y-2 divide-dashed divide-gray-300 border-y-2 border-dashed border-gray-300 dark:divide-gray-700 dark:border-gray-700">
                            {block.items.map((item, index) => (
                                <li key={item.id} className="grid gap-1 py-5 sm:grid-cols-[3.5rem_1fr] sm:items-start sm:gap-4">
                                    <span className="font-mono text-3xl font-bold tabular-nums text-gray-900 dark:text-white" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                                    <div className="min-w-0">
                                        <p className="text-[15px] font-bold text-gray-900 dark:text-white">{item.title}</p>
                                        <div className="mt-1 max-w-prose text-[15px] leading-7 text-gray-600 dark:text-gray-300">{renderBody(item.body)}</div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : null}
                    {block.note ? <div className="mt-5 max-w-prose text-[15px] leading-7 text-gray-600 dark:text-gray-300">{renderBody(block.note)}</div> : null}
                    {block.verificationTitle || block.verificationItems.length > 0 ? (
                        <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
                            {block.verificationTitle ? <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{block.verificationTitle}</h3> : null}
                            {block.verificationItems.length > 0 ? (
                                <ol className="mt-3 flex flex-wrap gap-2">
                                    {block.verificationItems.map((item, index) => (
                                        <li key={item.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                                            <span className="font-mono font-bold tabular-nums text-gray-900 dark:text-white" aria-hidden>{index + 1}</span>
                                            <span><strong className="text-gray-900 dark:text-white">{item.title}:</strong> {item.body}</span>
                                        </li>
                                    ))}
                                </ol>
                            ) : null}
                        </div>
                    ) : null}
                </motion.section>
            );
        }

        if (block.type === 'benefits') {
            return (
                <motion.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-3xl bg-gray-950 p-6 text-white shadow-soft dark:bg-gray-900 sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="font-display text-2xl uppercase tracking-tight sm:text-3xl">{block.title}</h2>
                    <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    {block.items.length > 0 ? (
                        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                            {block.items.map((item, index) => (
                                <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                    <span className="font-mono text-sm font-bold tabular-nums text-primary" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                                    <p className="mt-2 font-display text-lg uppercase tracking-tight">{item.title}</p>
                                    <div className="mt-2 text-sm leading-relaxed text-gray-300">{renderBody(item.body)}</div>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </motion.section>
            );
        }

        if (block.type === 'rules') {
            return (
                <motion.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="font-display text-2xl uppercase tracking-tight text-gray-900 dark:text-white sm:text-3xl">{block.title}</h2>
                    <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    {block.items.length > 0 ? (
                        <div className="mt-6 border-t-2 border-gray-900 dark:border-white">
                            {block.items.map((item, index) => {
                                const Icon = RULE_ICONS[index] ?? Scale;
                                return (
                                    <article key={item.id} className="grid gap-3 border-b border-gray-100 py-6 last:border-b-0 dark:border-gray-800 sm:grid-cols-[3rem_1fr] sm:gap-5">
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black text-primary dark:bg-primary dark:text-black" aria-hidden><Icon size={22} /></span>
                                        <div className="min-w-0">
                                            <h3 className="font-display text-xl uppercase tracking-tight text-gray-900 dark:text-white">{item.title}</h3>
                                            <div className="mt-2 max-w-prose space-y-2 text-[15px] leading-7 text-gray-600 dark:text-gray-300">{renderBody(item.body)}</div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : null}
                </motion.section>
            );
        }

        if (block.type === 'contact') {
            return (
                <motion.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="font-display text-xl uppercase tracking-tight text-gray-900 dark:text-white">{block.title}</h2>
                    <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    {block.text || block.email ? (
                        <p className="mt-3 max-w-prose text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                            {block.text}{block.text && block.email ? ' · ' : ''}{block.email ? <>E-Mail: <a href={`mailto:${block.email}`} className={`${LINK_CLS} break-anywhere`}>{block.email}</a></> : null}
                        </p>
                    ) : null}
                    {block.parentText || block.parentLinkLabel ? (
                        <p className="mt-2 text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                            {block.parentText}{block.parentText && block.parentLinkLabel ? ' ' : ''}
                            {block.parentLinkLabel ? <Link to={block.parentLinkPath} className={LINK_CLS}>{block.parentLinkLabel}</Link> : null}
                        </p>
                    ) : null}
                </motion.section>
            );
        }

        if (block.type === 'support') {
            return (
                <motion.section key={block.id} id={block.id === supportAnchorId ? `${idPrefix}foerderung` : undefined} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="scroll-mt-24 rounded-3xl border border-gray-100 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="font-display text-2xl uppercase tracking-tight text-gray-900 dark:text-white sm:text-3xl">{block.title}</h2>
                    <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                    <div className="mt-4 max-w-prose space-y-2 text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                        {block.paragraphs.filter(paragraph => paragraph.trim()).map((paragraph, index) => <p key={`${block.id}-paragraph-${index}`}>{linkify(paragraph)}</p>)}
                        {block.registrationText || block.registrationEmail ? (
                            <p>
                                {block.registrationText}{block.registrationText && block.registrationEmail ? ' ' : ''}
                                {block.registrationEmail ? <a href={`mailto:${block.registrationEmail}`} className={LINK_CLS}>{block.registrationEmail}</a> : null}
                            </p>
                        ) : null}
                    </div>
                    {block.days.length > 0 ? (
                        <div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                            <table className="w-full min-w-[440px] border-collapse text-center text-xs md:text-sm">
                                <thead>
                                    <tr>{block.days.map(day => <th key={day.id} className="border border-gray-200 p-2 font-mono tabular-nums dark:border-gray-800">{day.label}</th>)}</tr>
                                </thead>
                                <tbody className="font-mono tabular-nums">
                                    {block.rows.map(row => (
                                        <tr key={row.id}>{row.cells.map(cell => <td key={cell.id} className={scheduleCellClass(cell.text)}>{cell.text}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                    {block.learnCoachingText || block.learnCoachingEmail ? (
                        <p className="mt-4 max-w-prose text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                            {block.learnCoachingText}{block.learnCoachingText && block.learnCoachingEmail ? ' ' : ''}
                            {block.learnCoachingEmail ? <a href={`mailto:${block.learnCoachingEmail}`} className={LINK_CLS}>{block.learnCoachingEmail}</a> : null}
                        </p>
                    ) : null}
                </motion.section>
            );
        }

        return (
            <motion.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                <h2 id={`${idPrefix}${block.id}-title`} className="font-display text-2xl uppercase tracking-tight text-gray-900 dark:text-white sm:text-3xl">{block.title}</h2>
                <motion.span {...wipeLine()} className="mt-2 block h-1 w-10 origin-left rounded-full bg-primary" aria-hidden />
                {block.body ? <div className="mt-5 max-w-prose space-y-3 text-[15px] leading-7 text-gray-600 dark:text-gray-300">{renderBody(block.body)}</div> : null}
            </motion.section>
        );
    };

    return (
        <StaticLayout
            title={document.header?.title ?? ''}
            intro={document.header?.intro}
            showHeader={document.header !== null}
            embedded={preview}
            idPrefix={idPrefix}
        >
            <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-10 px-4 pb-16 sm:gap-12 sm:px-6">
                {!document.header ? <h1 className="sr-only">Coaching</h1> : null}
                {!supportAnchorId ? <span id={`${idPrefix}foerderung`} className="block scroll-mt-24" aria-hidden /> : null}
                {document.blocks.map(renderBlock)}
            </div>
        </StaticLayout>
    );
}

export default function Coaching() {
    const [coachingDocument, setCoachingDocument] = useState<CoachingDocument>(() => createDefaultCoachingDocument());
    const location = useLocation();

    useEffect(() => {
        let cancelled = false;
        api.coach.getCoachingPage()
            .then(res => {
                if (!cancelled && res?.data && typeof res.data === 'object') {
                    setCoachingDocument(parseCoachingDocument(res.data as Record<string, unknown>));
                }
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const section = (location.state as { section?: string } | null)?.section;
        if (!section) return;
        const timer = window.setTimeout(() => {
            const element = document.getElementById(section);
            if (!element) return;
            const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }, 150);
        return () => window.clearTimeout(timer);
    }, [location.state, coachingDocument]);

    return <CoachingView document={coachingDocument} />;
}
