import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Link, useLocation } from 'react-router-dom';
import { Award, ClipboardCheck, Scale, Megaphone, HeartHandshake, Gavel, Mail, School, Clock, MapPin, Plus, type LucideIcon } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import StaticLayout from '../components/StaticLayout';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { DISTANCE, m, PAGE_ENTER, prefersReducedMotion } from '../lib/motion';

export const FALLBACK: Record<string, string> = {
    hero_title: 'Coaching-AG am FWG',
    hero_subtitle: 'Ältere helfen Jüngeren: Geschulte Schülerinnen und Schüler ab Klasse 8 begleiten die Klassen 5 und 6 beim Ankommen am FWG. Ehrenamtlich, pädagogisch begleitet und für alle nach denselben Regeln.',
    s_badge_title: 'Was bedeutet das Coach-Abzeichen?',
    s_badge_body: 'Das Coach-Abzeichen auf Profilen und Anzeigen zeigt: Diese Person ist aktives Mitglied der Coaching-AG, wurde von der AG-Leitung geschult und vom SV-Team verifiziert.\n\nDas Abzeichen belegt Schulung und Verifizierung, nicht die Qualität der Nachhilfe. Preise und Absprachen bleiben Sache der Beteiligten (siehe Nutzungsbedingungen).',
    s_school_title: 'Die Coaching-AG an unserer Schule',
    s_school_body: 'Die Coaching-AG ist ein schulisches Angebot des FWG: Jeden Dienstag von 13:45 bis 14:30 Uhr in Raum H310 helfen geschulte Schülerinnen und Schüler ab Klasse 8 den Klassen 5 und 6, bei einzelnen Fächern oder bei der Lern- und Arbeitsorganisation. Die Coaches werden jeweils vor den Herbstferien geschult und engagieren sich ehrenamtlich bis zum Ende des Schuljahres. Die Coaches kennen den Schulalltag der jüngeren Schülerinnen und Schüler.\n\nMehr dazu auf der Schul-Website: fwg-koeln.de/lebendige-schule/foerdern-und-fordern/coaching. Diese Nachhilfebörse der SV ergänzt das Angebot: Hier finden alle Jahrgangsstufen individuelle Nachhilfe. Die Coaches der AG sind besonders sichtbar, damit man sie leicht findet.',
    s_who_title: 'Wer kann Coach werden?',
    s_who_body: '• Schülerin oder Schüler des FWG ab Klasse 8\n• Teilnahme an der Coach-Schulung der AG-Leitung (findet jeweils vor den Herbstferien statt)\n• Zuverlässigkeit und respektvoller Umgang, auch auf der Plattform\n• Verifiziertes Konto auf der Nachhilfebörse\n\nInteressiert? Wende dich an Frau Balistreri oder sprich das SV-Team im SV-Raum an. Die Aufnahme erfolgt nach der Schulung über einen persönlichen Coaching-Code. Für alle gelten dieselben Kriterien.',
    s_boost_title: 'Warum stehen manche Anzeigen oben?',
    s_boost_body: 'Anzeigen mit dem Hinweis „Hervorgehoben“ erhalten eine bessere Platzierung und eine gelbe Markierung. Das passiert ausschließlich in zwei Fällen:\n\n• Coach-Status: Nach Einlösen eines Coaching-Codes werden Anzeigen des Coaches für 30 Tage hervorgehoben.\n• SV-Aktionen: Zeitlich begrenzte Hinweise des SV-Teams (z. B. zum Schuljahresstart).\n\nDie Platzierung folgt festen Regeln: Coach-Status oder SV-Aktion. Geld spielt dabei keine Rolle. Anzeigen von Coaches werden etwas höher einsortiert, solange der Coach-Status aktiv ist. Die Regeln für die Platzierung stehen auf dieser Seite.',
    s_fair_title: 'Gleiche Chancen für alle',
    s_fair_body: '• Das Erstellen einer Anzeige ist kostenlos, mit oder ohne Abzeichen. Die Nachhilfe wird privat bezahlt. Die Plattform vermittelt den Kontakt und nimmt keine Provision.\n• Der Filter „Nur Coaches“ hilft beim Finden geprüfter Coaches, blendet aber niemanden aus: Alle Anzeigen bleiben für alle sichtbar.\n• Codes sind personenbezogen, in der Regel einmalig einlösbar und werden nach der Schulung persönlich vergeben. Eine Vergabe gegen Gegenleistung ist ausgeschlossen.\n• Die Vergabe von Codes und Coach-Status wird protokolliert und kann vom SV-Team geprüft werden.\n• Anzeigen von Coaches werden etwas höher einsortiert, solange der Coach-Status aktiv ist.',
    s_conduct_title: 'Verhalten als Coach',
    s_conduct_body: '• Respektvoller, geduldiger Umgang, besonders mit jüngeren Schülerinnen und Schülern\n• Keine falschen Versprechen zu besseren Noten\n• Treffen möglichst in der Schule (z. B. Bibliothek, Mensa); private Treffen nur mit Wissen der Eltern\n• Bei Problemen: frühzeitig die AG-Leitung oder das SV-Team ansprechen',
    s_revoke_title: 'Entzug des Status & Widerspruch',
    s_revoke_body: 'Bei Verstößen gegen diese Regeln oder die Nutzungsbedingungen (z. B. unzuverlässiges Verhalten, Missbrauch des Abzeichens, unangemessene Inhalte) kann die AG-Leitung oder das SV-Team den Coach-Status entziehen. Du bekommst eine kurze Begründung direkt in der App oder per E-Mail.\n\nDagegen kannst du Widerspruch einlegen: Schreibe an info@nachhilfe-sv.de oder komme im SV-Raum vorbei. Das SV-Team prüft jeden Fall erneut.',
    contact_text: 'AG-Leitung: Frau Balistreri · SV-Lehrer: Herr Schulz, Herr Steinberg',
};

const COACH_MAIL = 'Rosalia.Balistreri@fwg-koeln.nrw.schule';
const COACHING_DOCUMENT_VERSION = 1 as const;
const LINK_CLS = 'font-semibold text-foreground hover:underline';

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
    /** Optionale Zeitangabe für die Zeile, z. B. "7. Stunde". Legacy-Zeilen bleiben leer. */
    time?: string;
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
                mailSubject: 'Anmeldung Coaching-AG',
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
                    listItem('step-3', 'Abzeichen und Start', 'Erhalte das Coach-Abzeichen und starte dienstags in H310.'),
                ],
                note: 'Die AG-Stunde dienstags in H310 ist ehrenamtlich. Private Nachhilfe über die Börse vereinbaren Familien direkt. Richtwert: 12 € pro 45 Minuten (16 €/h), individuell anpassbar. Die Bezahlung läuft privat; die Plattform vermittelt den Kontakt und nimmt keine Provision.',
                verificationTitle: 'Verifizierung in der App',
                verificationItems: [
                    listItem('verify-1', 'Konto anlegen', 'Lege ein Konto mit deinen Angaben an.'),
                    listItem('verify-2', 'Im SV-Raum melden', 'Sag dem SV-Team, dass du dich verifizieren lassen möchtest, und nenne deinen Namen.'),
                    listItem('verify-3', 'Freischaltung abwarten', 'Das SV-Team prüft, ob du das FWG besuchst, und schaltet dein Konto frei. Erst dann kannst du Anzeigen erstellen und Kontakt aufnehmen.'),
                ],
            },
            {
                id: 'benefits',
                type: 'benefits',
                title: 'Darum lohnt sich das Coaching',
                items: [
                    listItem('benefit-1', 'Ältere unterstützen Jüngere', 'Klassen 5 und 6 erhalten Hilfe von geschulten Coaches ab Klasse 8.'),
                    listItem('benefit-2', 'Begleitet & ehrenamtlich', 'Pädagogisch begleitet durch Frau Balistreri, ehrenamtlich bis zum Schuljahresende.'),
                    listItem('benefit-3', 'Fester Treffpunkt', 'Jeden Dienstag 13:45–14:30 Uhr in Raum H310. Einfach vorbeikommen.'),
                ],
            },
            {
                id: 'rules',
                type: 'rules',
                title: 'Regeln und Hinweise',
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
                title: 'Förderunterricht Sek. I (1. HJ · 26/27)',
                paragraphs: [
                    'Förderunterricht wird in den Jahrgangsstufen 5-10 in den Fächern Deutsch, Mathematik, Englisch und Latein erteilt. Die Entscheidung über eine Anmeldung liegt bei den Eltern.',
                    'Kick-off am Mittwoch, 16.09., in der 7. Stunde in H408. Ab dem 21.09. läuft der Förderunterricht in der 7. Stunde in den Räumen um H402.',
                    'Nach der Anmeldung ist die Teilnahme verbindlich. Darüber hinaus ist eine freiwillige Teilnahme jederzeit möglich.',
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
                        time: '',
                        cells: [
                            { id: 'r1c1', text: 'D' },
                            { id: 'r1c2', text: 'M' },
                            { id: 'r1c3', text: 'D' },
                            { id: 'r1c4', text: 'M' },
                        ],
                    },
                    {
                        id: 'schedule-row-2',
                        time: '',
                        cells: [
                            { id: 'r2c1', text: 'LRS 5. und 6. Klasse' },
                            { id: 'r2c2', text: 'E' },
                            { id: 'r2c3', text: 'E' },
                            { id: 'r2c4', text: 'L' },
                        ],
                    },
                    {
                        id: 'schedule-row-3',
                        time: '',
                        cells: [
                            { id: 'r3c1', text: 'L' },
                            { id: 'r3c2', text: '' },
                            { id: 'r3c3', text: '' },
                            { id: 'r3c4', text: 'D' },
                        ],
                    },
                    {
                        id: 'schedule-row-4',
                        time: '',
                        cells: [
                            { id: 'r4c1', text: '' },
                            { id: 'r4c2', text: '' },
                            { id: 'r4c3', text: '' },
                            { id: 'r4c4', text: 'LRS 5. und 6. Klasse' },
                        ],
                    },
                ],
                learnCoachingText: 'Termine für ein Lerncoaching vereinbart ihr persönlich oder per E-Mail mit Herrn Gampp, Frau Trottmann oder Frau Weyers:',
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

// Alte gespeicherte Coaching-Inhalte enthielten teilweise noch „ca. 12 € pro Stunde“.
// Beim Laden wird nur dieser Satz auf die abgestimmte Preis-Copy umgestellt.
const LEGACY_HOURLY_PRICE = /Richtwert(?:\s+ca\.?)?\s*12\s*€\s*(?:pro|\/)\s*Stunde\.?/gi;
const CANONICAL_PRICE_COPY = 'Richtwert: 12 € pro 45 Minuten (16 €/h).';

function normalizeLegacyPriceCopy(value: string): string {
    return value.replace(LEGACY_HOURLY_PRICE, CANONICAL_PRICE_COPY);
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
    if (!Array.isArray(value)) {
        return fallback.map(row => ({ ...row, time: row.time ?? '', cells: row.cells.map(cell => ({ ...cell })) }));
    }
    const usedRows = new Set<string>();
    const usedCells = new Set<string>();
    return value.flatMap((raw, rowIndex) => {
        if (!isRecord(raw) || !Array.isArray(raw.cells)) return [];
        const source = fallback[rowIndex % Math.max(fallback.length, 1)];
        return [{
            id: uniqueId(raw.id, `schedule-row-${rowIndex + 1}`, usedRows),
            time: textValue(raw.time, '').trim(),
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
            note: normalizeLegacyPriceCopy(textValue(raw.note, fallback.note)),
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
            // Satzzeichen nach einem Link gehören nicht zur URL.
            const url = part.replace(/[.,;:!?]+$/, '');
            const trailing = part.slice(url.length);
            return (
                <Fragment key={index}>
                    <a href={`https://${url}`} target="_blank" rel="noreferrer" className={LINK_CLS}>{url}</a>
                    {trailing}
                </Fragment>
            );
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

export function scheduleCellClass(text: string): string {
    const value = text.trim();
    if (!value) return 'border p-2 border-border';
    if (/^E(?:\s|$)/i.test(value)) {
        return 'border p-2 bg-blue-200/50 dark:bg-blue-900/50 border-border text-blue-800 dark:text-blue-200 font-semibold';
    }
    if (/^L(?:\s|$)/i.test(value)) {
        return 'border p-2 bg-pink-200/50 dark:bg-pink-900/50 border-border text-pink-800 dark:text-pink-200 font-semibold';
    }
    if (/^M(?:\s|$)/i.test(value)) {
        return 'border p-2 bg-green-200/50 dark:bg-green-900/50 border-border text-green-800 dark:text-green-200 font-semibold';
    }
    return 'border p-2 bg-yellow-200/50 dark:bg-yellow-900/50 border-border text-yellow-800 dark:text-yellow-200 font-semibold';
}

/**
 * Grows/shrinks every row to the current number of days. Existing cells keep
 * their ids so inputs do not remount and lose focus while editing.
 */
export function resizeScheduleRows(days: CoachingScheduleDay[], rows: CoachingScheduleRow[]): CoachingScheduleRow[] {
    return rows.map(row => {
        const cells = row.cells.slice(0, days.length);
        while (cells.length < days.length) cells.push({ id: createId('cell'), text: '' });
        return { ...row, cells };
    });
}

export function appendScheduleDay(block: CoachingSupportBlock, label = 'Neuer Tag'): CoachingSupportBlock {
    const days = [...block.days, { id: createId('day'), label }];
    return { ...block, days, rows: resizeScheduleRows(days, block.rows) };
}

export function appendScheduleRow(block: CoachingSupportBlock): CoachingSupportBlock {
    if (block.days.length === 0) return block;
    const row: CoachingScheduleRow = {
        id: createId('schedule-row'),
        time: '',
        cells: block.days.map(() => ({ id: createId('cell'), text: '' })),
    };
    return { ...block, rows: [...block.rows, row] };
}

export function setScheduleCellText(
    block: CoachingSupportBlock,
    rowId: string,
    cellIndex: number,
    text: string
): CoachingSupportBlock {
    return {
        ...block,
        rows: block.rows.map(row => {
            if (row.id !== rowId) return row;
            const cells = [...row.cells];
            while (cells.length <= cellIndex) cells.push({ id: createId('cell'), text: '' });
            const current = cells[cellIndex];
            cells[cellIndex] = { ...current, text };
            return { ...row, cells };
        }),
    };
}

const INLINE_EDIT_CLASS = 'block w-full min-w-0 resize-none overflow-hidden rounded-sm border-0 bg-transparent p-0 font-[inherit] text-inherit outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-muted-foreground/60 hover:bg-foreground/[0.04] focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function InlineEditable({
    value,
    onChange,
    ariaLabel,
    multiline = false,
    className,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    multiline?: boolean;
    className?: string;
    placeholder?: string;
}) {
    const [draft, setDraft] = useState(value);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const cancelRef = useRef(false);

    useEffect(() => {
        if (textareaRef.current && typeof document !== 'undefined' && document.activeElement === textareaRef.current) return;
        setDraft(value);
    }, [value]);

    useLayoutEffect(() => {
        const element = textareaRef.current;
        if (!element) return;
        const resize = () => {
            element.style.height = 'auto';
            element.style.height = `${element.scrollHeight}px`;
        };
        resize();
        const parent = element.parentElement;
        if (!parent || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(resize);
        observer.observe(parent);
        return () => observer.disconnect();
    }, [draft]);

    const commit = () => {
        if (cancelRef.current) {
            cancelRef.current = false;
            setDraft(value);
            return;
        }
        const next = multiline
            ? draft.replace(/\r\n?/g, '\n')
            : draft.replace(/\s*\n+\s*/g, ' ').trim();
        if (next !== value) onChange(next);
    };

    return (
        <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-multiline={multiline}
            spellCheck
            data-inline-editable="true"
            className={cn(INLINE_EDIT_CLASS, multiline && 'whitespace-pre-wrap', className)}
            onChange={event => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelRef.current = true;
                    event.currentTarget.blur();
                    return;
                }
                if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    commit();
                }
            }}
        />
    );
}

export function CoachingView({
    document,
    preview = false,
    editable = false,
    onDocumentChange,
}: {
    document: CoachingDocument;
    preview?: boolean;
    editable?: boolean;
    onDocumentChange?: (document: CoachingDocument) => void;
}) {
    const reduceMotion = useReducedMotion();
    const idPrefix = preview ? 'preview-' : '';
    const editing = editable && typeof onDocumentChange === 'function';
    const commitDocument = (updater: (current: CoachingDocument) => CoachingDocument) => {
        if (!editing || !onDocumentChange) return;
        onDocumentChange(updater(document));
    };
    const updateBlock = (blockId: string, updater: (block: CoachingBlock) => CoachingBlock) => {
        commitDocument(current => ({
            ...current,
            blocks: current.blocks.map(block => block.id === blockId ? updater(block) : block),
        }));
    };
    const updateHeader = (patch: Partial<CoachingHeaderBlock>) => {
        commitDocument(current => current.header ? { ...current, header: { ...current.header, ...patch } } : current);
    };
    const anim = (delay = 0) => reduceMotion ? {} : {
        initial: { y: DISTANCE.enter },
        whileInView: { y: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { ...PAGE_ENTER, delay },
    };
    const supportAnchorId = document.blocks.find(block => block.type === 'support')?.id;

    const renderBlock = (block: CoachingBlock): ReactNode => {
        if (block.type === 'poster') {
            const updatePoster = (patch: Partial<CoachingPosterBlock>) => updateBlock(block.id, current => current.type === 'poster' ? { ...current, ...patch } : current);
            return (
                <m.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="relative overflow-hidden rounded-xl bg-card p-6 text-card-foreground sm:p-10">
                    <div className="absolute inset-0 " aria-hidden />
                    <div className="relative">
                        {block.stamp || editing ? (
                            <div className="flex flex-wrap items-start justify-end gap-4">
                                <span className="rounded border-2 border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground" aria-hidden={editing ? undefined : true}>
                                    {editing ? (
                                        <InlineEditable
                                            value={block.stamp}
                                            onChange={value => updatePoster({ stamp: value })}
                                            ariaLabel="Stempel des Plakats"
                                            placeholder="Stempel"
                                            className="text-center"
                                        />
                                    ) : block.stamp}
                                </span>
                            </div>
                        ) : null}
                        <h2 id={`${idPrefix}${block.id}-title`} className="mt-3 text-3xl leading-[0.95] tracking-tight sm:text-5xl">
                            {editing ? (
                                <InlineEditable
                                    value={block.title}
                                    onChange={value => updatePoster({ title: value })}
                                    ariaLabel="Titel des Plakats"
                                    placeholder="Titel"
                                />
                            ) : block.title}
                        </h2>
                        {(block.time || block.room || editing) ? (
                            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-base font-semibold">
                                {editing ? (
                                    <>
                                        <span className="inline-flex min-w-0 items-center gap-1.5">
                                            <Clock size={16} aria-hidden />
                                            <InlineEditable
                                                value={block.time}
                                                onChange={value => updatePoster({ time: value })}
                                                ariaLabel="Uhrzeit des Plakats"
                                                placeholder="Uhrzeit"
                                                className="min-w-[8rem] tabular-nums"
                                            />
                                        </span>
                                        <span className="inline-flex min-w-0 items-center gap-1.5">
                                            <MapPin size={16} aria-hidden />
                                            <InlineEditable
                                                value={block.room}
                                                onChange={value => updatePoster({ room: value })}
                                                ariaLabel="Raum des Plakats"
                                                placeholder="Raum"
                                                className="min-w-[8rem]"
                                            />
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {block.time ? <span className="inline-flex items-center gap-1.5"><Clock size={16} aria-hidden /><span className="tabular-nums">{block.time}</span></span> : null}
                                        {block.room ? <span className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden /><span className="tabular-nums">{block.room}</span></span> : null}
                                    </>
                                )}
                            </p>
                        ) : null}
                        {(block.contactText || editing) ? (
                            <p className="mt-3 max-w-prose text-base font-medium leading-7 text-muted-foreground">
                                {editing ? (
                                    <InlineEditable
                                        value={block.contactText}
                                        onChange={value => updatePoster({ contactText: value })}
                                        ariaLabel="Kontaktzeile des Plakats"
                                        placeholder="Kontaktzeile"
                                        multiline
                                    />
                                ) : block.contactText}
                            </p>
                        ) : null}
                        {(block.ctaLabel || block.hint || editing) ? (
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                                {block.ctaLabel || editing ? (
                                    editing ? (
                                        <span className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground shadow-md sm:w-auto">
                                            <Mail size={16} aria-hidden />
                                            <InlineEditable
                                                value={block.ctaLabel}
                                                onChange={value => updatePoster({ ctaLabel: value })}
                                                ariaLabel="Text des Anmelde-Buttons"
                                                placeholder="Anmelde-Button"
                                                className="min-w-[10rem] text-center"
                                            />
                                        </span>
                                    ) : (
                                        <a href={`mailto:${block.email}?subject=${encodeURIComponent(block.mailSubject)}`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground shadow-md hover:bg-muted sm:w-auto">
                                            <Mail size={16} aria-hidden /> {block.ctaLabel}
                                        </a>
                                    )
                                ) : null}
                                {block.hint || editing ? (
                                    <span className="text-center text-sm font-semibold text-muted-foreground sm:text-left">
                                        {editing ? (
                                            <InlineEditable
                                                value={block.hint}
                                                onChange={value => updatePoster({ hint: value })}
                                                ariaLabel="Hinweis neben dem Anmelde-Button"
                                                placeholder="Hinweis"
                                            />
                                        ) : block.hint}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                        {editing ? (
                            <p className="mt-3 flex flex-wrap items-baseline gap-2 text-sm text-muted-foreground">
                                <span>E-Mail:</span>
                                <InlineEditable
                                    value={block.email}
                                    onChange={value => updatePoster({ email: value })}
                                    ariaLabel="E-Mail-Adresse für die Anmeldung"
                                    placeholder="E-Mail-Adresse"
                                    className="min-w-[12rem] flex-1 font-semibold text-foreground"
                                />
                            </p>
                        ) : null}
                    </div>
                </m.section>
            );
        }

        if (block.type === 'steps') {
            const updateSteps = (patch: Partial<CoachingStepsBlock>) => updateBlock(block.id, current => current.type === 'steps' ? { ...current, ...patch } : current);
            const updateStepItem = (itemId: string, patch: Partial<CoachingListItem>) => updateSteps({
                items: block.items.map(item => item.id === itemId ? { ...item, ...patch } : item),
            });
            const updateVerificationItem = (itemId: string, patch: Partial<CoachingListItem>) => updateSteps({
                verificationItems: block.verificationItems.map(item => item.id === itemId ? { ...item, ...patch } : item),
            });
            return (
                <m.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="text-2xl tracking-tight sm:text-3xl">
                        {editing ? (
                            <InlineEditable
                                value={block.title}
                                onChange={value => updateSteps({ title: value })}
                                ariaLabel="Überschrift des Ablaufs"
                                placeholder="Überschrift"
                            />
                        ) : block.title}
                    </h2>
                    {block.items.length > 0 ? (
                        <ol className="mt-6 divide-y-2 divide-solid divide-border border-y-2 border-border border-border">
                            {block.items.map((item, index) => (
                                <li key={item.id} className="grid gap-1 py-5 sm:grid-cols-[3.5rem_1fr] sm:items-start sm:gap-4">
                                    <span className="text-3xl font-semibold tabular-nums text-foreground" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                                    <div className="min-w-0">
                                        {editing ? (
                                            <InlineEditable
                                                value={item.title}
                                                onChange={value => updateStepItem(item.id, { title: value })}
                                                ariaLabel={`Titel von Schritt ${index + 1}`}
                                                placeholder="Titel"
                                                className="text-base font-semibold text-foreground"
                                            />
                                        ) : (
                                            <p className="text-base font-semibold text-foreground">{item.title}</p>
                                        )}
                                        <div className="mt-1 max-w-prose text-base leading-7 text-muted-foreground">
                                            {editing ? (
                                                <InlineEditable
                                                    value={item.body}
                                                    onChange={value => updateStepItem(item.id, { body: value })}
                                                    ariaLabel={`Beschreibung von Schritt ${index + 1}`}
                                                    placeholder="Beschreibung"
                                                    multiline
                                                />
                                            ) : renderBody(item.body)}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : null}
                    {(block.note || editing) ? (
                        <div className="mt-5 max-w-prose text-base leading-7 text-muted-foreground">
                            {editing ? (
                                <InlineEditable
                                    value={block.note}
                                    onChange={value => updateSteps({ note: value })}
                                    ariaLabel="Hinweis unter den Schritten"
                                    placeholder="Hinweis"
                                    multiline
                                />
                            ) : renderBody(block.note)}
                        </div>
                    ) : null}
                    {(block.verificationTitle || block.verificationItems.length > 0 || editing) ? (
                        <div className="mt-5 border-t border-border pt-5">
                            {(block.verificationTitle || editing) ? (
                                editing ? (
                                    <h3 className="text-sm font-semibold text-muted-foreground">
                                        <InlineEditable
                                            value={block.verificationTitle}
                                            onChange={value => updateSteps({ verificationTitle: value })}
                                            ariaLabel="Überschrift der Verifizierung"
                                            placeholder="Überschrift der Verifizierung"
                                        />
                                    </h3>
                                ) : (
                                    <h3 className="text-sm font-semibold text-muted-foreground">{block.verificationTitle}</h3>
                                )
                            ) : null}
                            {block.verificationItems.length > 0 ? (
                                editing ? (
                                    <ol className="mt-3 space-y-2">
                                        {block.verificationItems.map((item, index) => (
                                            <li key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                                                <div className="flex items-start gap-2">
                                                    <span className="font-semibold tabular-nums text-foreground" aria-hidden>{index + 1}</span>
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <InlineEditable
                                                            value={item.title}
                                                            onChange={value => updateVerificationItem(item.id, { title: value })}
                                                            ariaLabel={`Titel von Verifizierungsschritt ${index + 1}`}
                                                            placeholder="Titel"
                                                            className="font-semibold text-foreground"
                                                        />
                                                        <InlineEditable
                                                            value={item.body}
                                                            onChange={value => updateVerificationItem(item.id, { body: value })}
                                                            ariaLabel={`Beschreibung von Verifizierungsschritt ${index + 1}`}
                                                            placeholder="Beschreibung"
                                                            multiline
                                                        />
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <ol className="mt-3 flex flex-wrap gap-2">
                                        {block.verificationItems.map((item, index) => (
                                            <li key={item.id} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                                                <span className="font-semibold tabular-nums text-foreground" aria-hidden>{index + 1}</span>
                                                <span><strong className="text-foreground">{item.title}:</strong> {item.body}</span>
                                            </li>
                                        ))}
                                    </ol>
                                )
                            ) : null}
                        </div>
                    ) : null}
                </m.section>
            );
        }

        if (block.type === 'benefits') {
            const updateBenefits = (patch: Partial<CoachingBenefitsBlock>) => updateBlock(block.id, current => current.type === 'benefits' ? { ...current, ...patch } : current);
            const updateBenefitItem = (itemId: string, patch: Partial<CoachingListItem>) => updateBenefits({
                items: block.items.map(item => item.id === itemId ? { ...item, ...patch } : item),
            });
            return (
                <m.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="text-2xl tracking-tight sm:text-3xl">
                        {editing ? (
                            <InlineEditable
                                value={block.title}
                                onChange={value => updateBenefits({ title: value })}
                                ariaLabel="Überschrift des Nutzen-Abschnitts"
                                placeholder="Überschrift"
                            />
                        ) : block.title}
                    </h2>
                    {block.items.length > 0 ? (
                        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                            {block.items.map((item, index) => (
                                <li key={item.id} className="border-t-2 border-border border-border pt-4">
                                    <span className="text-sm font-semibold tabular-nums text-foreground" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                                    {editing ? (
                                        <InlineEditable
                                            value={item.title}
                                            onChange={value => updateBenefitItem(item.id, { title: value })}
                                            ariaLabel={`Titel von Nutzen ${index + 1}`}
                                            placeholder="Titel"
                                            className="mt-2 text-lg tracking-tight"
                                        />
                                    ) : (
                                        <p className="mt-2 text-lg tracking-tight">{item.title}</p>
                                    )}
                                    <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                        {editing ? (
                                            <InlineEditable
                                                value={item.body}
                                                onChange={value => updateBenefitItem(item.id, { body: value })}
                                                ariaLabel={`Beschreibung von Nutzen ${index + 1}`}
                                                placeholder="Beschreibung"
                                                multiline
                                            />
                                        ) : renderBody(item.body)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </m.section>
            );
        }

        if (block.type === 'rules') {
            const updateRules = (patch: Partial<CoachingRulesBlock>) => updateBlock(block.id, current => current.type === 'rules' ? { ...current, ...patch } : current);
            const updateRuleItem = (itemId: string, patch: Partial<CoachingListItem>) => updateRules({
                items: block.items.map(item => item.id === itemId ? { ...item, ...patch } : item),
            });
            return (
                <m.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="text-2xl tracking-tight sm:text-3xl">
                        {editing ? (
                            <InlineEditable
                                value={block.title}
                                onChange={value => updateRules({ title: value })}
                                ariaLabel="Überschrift der Fairness-Regeln"
                                placeholder="Überschrift"
                            />
                        ) : block.title}
                    </h2>
                    {block.items.length > 0 ? (
                        <div className="mt-6 border-t-2 border-foreground">
                            {block.items.map((item, index) => {
                                const Icon = RULE_ICONS[index] ?? Scale;
                                return (
                                    <article key={item.id} className="grid gap-3 border-b border-border py-6 last:border-b-0 sm:grid-cols-[3rem_1fr] sm:gap-5">
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-foreground" aria-hidden><Icon size={20} /></span>
                                        <div className="min-w-0">
                                            {editing ? (
                                                <InlineEditable
                                                    value={item.title}
                                                    onChange={value => updateRuleItem(item.id, { title: value })}
                                                    ariaLabel={`Titel der Regel ${index + 1}`}
                                                    placeholder="Titel"
                                                    className="text-xl tracking-tight text-foreground"
                                                />
                                            ) : (
                                                <h3 className="text-xl tracking-tight text-foreground">{item.title}</h3>
                                            )}
                                            <div className="mt-2 max-w-prose space-y-2 text-base leading-7 text-muted-foreground">
                                                {editing ? (
                                                    <InlineEditable
                                                        value={item.body}
                                                        onChange={value => updateRuleItem(item.id, { body: value })}
                                                        ariaLabel={`Text der Regel ${index + 1}`}
                                                        placeholder="Text"
                                                        multiline
                                                    />
                                                ) : renderBody(item.body)}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : null}
                </m.section>
            );
        }

        if (block.type === 'contact') {
            const updateContact = (patch: Partial<CoachingContactBlock>) => updateBlock(block.id, current => current.type === 'contact' ? { ...current, ...patch } : current);
            return (
                <m.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="text-xl tracking-tight text-foreground">
                        {editing ? (
                            <InlineEditable
                                value={block.title}
                                onChange={value => updateContact({ title: value })}
                                ariaLabel="Überschrift des Kontaktabschnitts"
                                placeholder="Überschrift"
                            />
                        ) : block.title}
                    </h2>
                    {editing ? (
                        <div className="mt-3 max-w-prose space-y-1 text-base leading-7 text-muted-foreground">
                            <InlineEditable
                                value={block.text}
                                onChange={value => updateContact({ text: value })}
                                ariaLabel="Kontakttext"
                                placeholder="Kontakttext"
                                multiline
                            />
                            <div className="flex flex-wrap items-baseline gap-2">
                                <span>E-Mail:</span>
                                <InlineEditable
                                    value={block.email}
                                    onChange={value => updateContact({ email: value })}
                                    ariaLabel="E-Mail-Adresse des Kontakts"
                                    placeholder="E-Mail-Adresse"
                                    className="min-w-[12rem] flex-1 font-semibold text-foreground"
                                />
                            </div>
                        </div>
                    ) : (block.text || block.email) ? (
                        <p className="mt-3 max-w-prose text-base leading-7 text-muted-foreground">
                            {block.text}{block.text && block.email ? ' · ' : ''}{block.email ? <>E-Mail: <a href={`mailto:${block.email}`} className={`${LINK_CLS} break-anywhere`}>{block.email}</a></> : null}
                        </p>
                    ) : null}
                    {editing ? (
                        <div className="mt-2 max-w-prose space-y-1 text-base leading-7 text-muted-foreground">
                            <div className="flex flex-wrap items-baseline gap-2">
                                <InlineEditable
                                    value={block.parentText}
                                    onChange={value => updateContact({ parentText: value })}
                                    ariaLabel="Text für den Elternbereich"
                                    placeholder="Text für den Elternbereich"
                                    className="min-w-[10rem] flex-1"
                                />
                                <InlineEditable
                                    value={block.parentLinkLabel}
                                    onChange={value => updateContact({ parentLinkLabel: value })}
                                    ariaLabel="Linktext zum Eltern-Leitfaden"
                                    placeholder="Linktext"
                                    className="min-w-[8rem] flex-1 font-semibold text-foreground"
                                />
                            </div>
                            <div className="flex flex-wrap items-baseline gap-2 text-[13px] leading-5">
                                <span>Linkziel:</span>
                                <InlineEditable
                                    value={block.parentLinkPath}
                                    onChange={value => updateContact({ parentLinkPath: value })}
                                    ariaLabel="Linkziel zum Eltern-Leitfaden"
                                    placeholder="/eltern-leitfaden"
                                    className="min-w-[10rem] flex-1 font-mono"
                                />
                            </div>
                        </div>
                    ) : (block.parentText || block.parentLinkLabel) ? (
                        <p className="mt-2 text-base leading-7 text-muted-foreground">
                            {block.parentText}{block.parentText && block.parentLinkLabel ? ' ' : ''}
                            {block.parentLinkLabel ? <Link to={block.parentLinkPath} className={LINK_CLS}>{block.parentLinkLabel}</Link> : null}
                        </p>
                    ) : null}
                </m.section>
            );
        }

        if (block.type === 'support') {
            const hasTimes = editing || block.rows.some(row => (row.time ?? '').trim().length > 0);
            const updateSupport = (patch: Partial<CoachingSupportBlock>) => updateBlock(block.id, current => current.type === 'support' ? { ...current, ...patch } : current);
            const updateSupportWith = (updater: (current: CoachingSupportBlock) => CoachingSupportBlock) => updateBlock(block.id, current => current.type === 'support' ? updater(current) : current);
            const updateParagraph = (index: number, value: string) => updateSupport({
                paragraphs: block.paragraphs.map((paragraph, paragraphIndex) => paragraphIndex === index ? value : paragraph),
            });
            const updateDayLabel = (dayId: string, label: string) => updateSupport({
                days: block.days.map(day => day.id === dayId ? { ...day, label } : day),
            });
            const updateRowTime = (rowId: string, time: string) => updateSupport({
                rows: block.rows.map(row => row.id === rowId ? { ...row, time } : row),
            });
            return (
                <m.section key={block.id} id={block.id === supportAnchorId ? `${idPrefix}foerderung` : undefined} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="scroll-mt-24 rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id={`${idPrefix}${block.id}-title`} className="text-2xl tracking-tight sm:text-3xl">
                        {editing ? (
                            <InlineEditable
                                value={block.title}
                                onChange={value => updateSupport({ title: value })}
                                ariaLabel="Überschrift des Förderunterrichts"
                                placeholder="Überschrift"
                            />
                        ) : block.title}
                    </h2>
                    <div className="mt-4 max-w-prose space-y-2 text-base leading-7 text-muted-foreground">
                        {editing
                            ? block.paragraphs.map((paragraph, index) => (
                                <InlineEditable
                                    key={`${block.id}-paragraph-${index}`}
                                    value={paragraph}
                                    onChange={value => updateParagraph(index, value)}
                                    ariaLabel={`Absatz ${index + 1} des Förderunterrichts`}
                                    placeholder={`Absatz ${index + 1}`}
                                    multiline
                                />
                            ))
                            : block.paragraphs.filter(paragraph => paragraph.trim()).map((paragraph, index) => <p key={`${block.id}-paragraph-${index}`}>{linkify(paragraph)}</p>)}
                        {editing ? (
                            <div className="space-y-1">
                                <InlineEditable
                                    value={block.registrationText}
                                    onChange={value => updateSupport({ registrationText: value })}
                                    ariaLabel="Text vor der Anmeldungs-E-Mail"
                                    placeholder="Text vor der Anmeldungs-E-Mail"
                                    multiline
                                />
                                <div className="flex flex-wrap items-baseline gap-2">
                                    <span>E-Mail:</span>
                                    <InlineEditable
                                        value={block.registrationEmail}
                                        onChange={value => updateSupport({ registrationEmail: value })}
                                        ariaLabel="Anmeldungs-E-Mail des Förderunterrichts"
                                        placeholder="E-Mail-Adresse"
                                        className="min-w-[12rem] flex-1 font-semibold text-foreground"
                                    />
                                </div>
                            </div>
                        ) : (block.registrationText || block.registrationEmail) ? (
                            <p>
                                {block.registrationText}{block.registrationText && block.registrationEmail ? ' ' : ''}
                                {block.registrationEmail ? <a href={`mailto:${block.registrationEmail}`} className={`${LINK_CLS} break-anywhere`}>{block.registrationEmail}</a> : null}
                            </p>
                        ) : null}
                    </div>
                    {(block.days.length > 0 || editing) ? (
                        <div className="mt-5">
                            {block.days.length > 0 ? (
                                <div
                                    className="max-w-full overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    tabIndex={0}
                                    role="region"
                                    aria-label="Stundenplan des Förderunterrichts"
                                    onKeyDown={event => {
                                        const target = event.target as HTMLElement | null;
                                        if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
                                        const region = event.currentTarget;
                                        if (region.scrollWidth <= region.clientWidth) return;
                                        const step = Math.max(120, Math.round(region.clientWidth * 0.8));
                                        if (event.key === 'ArrowRight') {
                                            region.scrollBy({ left: step, behavior: 'auto' });
                                            event.preventDefault();
                                        } else if (event.key === 'ArrowLeft') {
                                            region.scrollBy({ left: -step, behavior: 'auto' });
                                            event.preventDefault();
                                        } else if (event.key === 'Home') {
                                            region.scrollTo({ left: 0, behavior: 'auto' });
                                            event.preventDefault();
                                        } else if (event.key === 'End') {
                                            region.scrollTo({ left: region.scrollWidth, behavior: 'auto' });
                                            event.preventDefault();
                                        }
                                    }}
                                >
                                    <Table className="w-full table-fixed border-collapse text-center text-[11px] sm:text-xs md:text-sm">
                                        <TableHeader>
                                            <TableRow>
                                                {hasTimes ? (
                                                    <TableHead scope="col" className="w-12 border border-border p-1 whitespace-nowrap sm:w-[4.75rem] sm:p-2">
                                                        {editing ? <span className="block text-center">Zeit</span> : 'Zeit'}
                                                    </TableHead>
                                                ) : null}
                                                {block.days.map((day, dayIndex) => (
                                                    <TableHead key={day.id} scope="col" className="min-w-0 whitespace-normal break-words border border-border p-1 tabular-nums">
                                                        {editing ? (
                                                            <input
                                                                type="text"
                                                                value={day.label}
                                                                onChange={event => updateDayLabel(day.id, event.target.value)}
                                                                aria-label={`Tagesname von Spalte ${dayIndex + 1}`}
                                                                placeholder={`Tag ${dayIndex + 1}`}
                                                                className="min-h-11 w-full min-w-0 rounded-sm bg-transparent px-1 py-2 text-center font-medium text-inherit outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary"
                                                            />
                                                        ) : day.label}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="tabular-nums">
                                            {block.rows.map((row, rowIndex) => (
                                                <TableRow key={row.id}>
                                                    {hasTimes ? (
                                                        <TableCell className="border border-border p-0.5 whitespace-nowrap font-medium text-foreground sm:p-2">
                                                            {editing ? (
                                                                <input
                                                                    type="text"
                                                                    value={row.time ?? ''}
                                                                    onChange={event => updateRowTime(row.id, event.target.value)}
                                                                    aria-label={`Zeit von Zeile ${rowIndex + 1}`}
                                                                    placeholder="–"
                                                                    className="min-h-11 w-full min-w-0 rounded-sm bg-transparent px-2 py-2 text-center font-medium text-inherit outline-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary"
                                                                />
                                                            ) : (row.time?.trim() || '–')}
                                                        </TableCell>
                                                    ) : null}
                                                    {block.days.map((day, cellIndex) => {
                                                        const cell = row.cells[cellIndex];
                                                        const text = cell?.text ?? '';
                                                        return (
                                                            <TableCell key={`${row.id}-${day.id}`} className={cn('min-w-0 whitespace-normal break-words p-1 text-[11px] leading-tight sm:p-2 sm:text-xs md:text-sm', scheduleCellClass(text), editing && 'p-0')}>
                                                                {editing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={text}
                                                                        onChange={event => updateSupportWith(current => setScheduleCellText(current, row.id, cellIndex, event.target.value))}
                                                                        aria-label={`Fach für ${day.label || `Spalte ${cellIndex + 1}`} in Zeile ${rowIndex + 1}`}
                                                                        placeholder="–"
                                                                        data-schedule-cell="true"
                                                                        className="min-h-11 w-full min-w-0 rounded-sm bg-transparent px-2 py-2 text-center font-[inherit] text-inherit outline-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary"
                                                                    />
                                                                ) : text}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Noch keine Tage im Stundenplan.</p>
                            )}
                            {editing ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateSupportWith(current => appendScheduleRow(current))}
                                        disabled={block.days.length === 0}
                                        className="font-semibold"
                                    >
                                        <Plus size={15} aria-hidden /> Zeile hinzufügen
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateSupportWith(current => appendScheduleDay(current))}
                                        className="font-semibold"
                                    >
                                        <Plus size={15} aria-hidden /> Tag hinzufügen
                                    </Button>
                                </div>
                            ) : null}
                            {block.days.length > 0 ? (
                                <p className="mt-2 max-w-prose text-xs leading-5 text-muted-foreground">
                                    Der Stundenplan ist eine redaktionelle Übersicht. Anwesenheit und einzelne Stunden werden nicht in der App erfasst.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    {(block.learnCoachingText || block.learnCoachingEmail || editing) ? (
                        editing ? (
                            <div className="mt-4 max-w-prose space-y-1 text-base leading-7 text-muted-foreground">
                                <InlineEditable
                                    value={block.learnCoachingText}
                                    onChange={value => updateSupport({ learnCoachingText: value })}
                                    ariaLabel="Text zum Lerncoaching"
                                    placeholder="Text zum Lerncoaching"
                                    multiline
                                />
                                <div className="flex flex-wrap items-baseline gap-2">
                                    <span>E-Mail:</span>
                                    <InlineEditable
                                        value={block.learnCoachingEmail}
                                        onChange={value => updateSupport({ learnCoachingEmail: value })}
                                        ariaLabel="Lerncoaching-E-Mail"
                                        placeholder="E-Mail-Adresse"
                                        className="min-w-[12rem] flex-1 font-semibold text-foreground"
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="mt-4 max-w-prose text-base leading-7 text-muted-foreground">
                                {block.learnCoachingText}{block.learnCoachingText && block.learnCoachingEmail ? ' ' : ''}
                                {block.learnCoachingEmail ? <a href={`mailto:${block.learnCoachingEmail}`} className={`${LINK_CLS} break-anywhere`}>{block.learnCoachingEmail}</a> : null}
                            </p>
                        )
                    ) : null}
                </m.section>
            );
        }

        const updateText = (patch: Partial<CoachingTextBlock>) => updateBlock(block.id, current => current.type === 'text' ? { ...current, ...patch } : current);
        return (
            <m.section key={block.id} aria-labelledby={block.title.trim() ? `${idPrefix}${block.id}-title` : undefined} aria-label={block.title.trim() ? undefined : 'Inhaltsbereich'} {...anim()} className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                <h2 id={`${idPrefix}${block.id}-title`} className="text-2xl tracking-tight sm:text-3xl">
                    {editing ? (
                        <InlineEditable
                            value={block.title}
                            onChange={value => updateText({ title: value })}
                            ariaLabel="Überschrift des Textabschnitts"
                            placeholder="Überschrift"
                        />
                    ) : block.title}
                </h2>
                {(block.body || editing) ? (
                    <div className="mt-5 max-w-prose space-y-3 text-base leading-7 text-muted-foreground">
                        {editing ? (
                            <InlineEditable
                                value={block.body}
                                onChange={value => updateText({ body: value })}
                                ariaLabel="Text des Textabschnitts"
                                placeholder="Text"
                                multiline
                            />
                        ) : renderBody(block.body)}
                    </div>
                ) : null}
            </m.section>
        );
    };

    return (
        <StaticLayout
            title={document.header?.title ?? ''}
            intro={document.header?.intro}
            titleContent={editing && document.header ? (
                <InlineEditable
                    value={document.header.title}
                    onChange={value => updateHeader({ title: value })}
                    ariaLabel="Seitentitel"
                    placeholder="Seitentitel"
                />
            ) : undefined}
            introContent={editing && document.header ? (
                <InlineEditable
                    value={document.header.intro}
                    onChange={value => updateHeader({ intro: value })}
                    ariaLabel="Einleitungstext der Seite"
                    placeholder="Einleitung"
                    multiline
                />
            ) : undefined}
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
            element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        }, 150);
        return () => window.clearTimeout(timer);
    }, [location.state, coachingDocument]);

    return <CoachingView document={coachingDocument} />;
}
