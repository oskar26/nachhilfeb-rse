/**
 * Profanity 2.0 — Severity-Engine (DE + EN) für Chats, Support und Anzeigen.
 *
 * Philosophie (mit der SV abgestimmt):
 * - MILD (Grundschul-Niveau: „Kacke", „Scheiße", „doof", „Quatsch") wird
 *   TOLERIERT — nicht blockiert, nicht gemeldet.
 * - SEVERE (Beleidigungen, sexuelle Inhalte, Spam/Betrug, Drogenhandel, ...)
 *   wird BLOCKIERT + automatisch zur SV-Moderation gemeldet (Priorität hoch).
 * - EXTREME (Nazi-Verherrlichung, konkrete Gewalt-/Missbrauchs-Drohungen,
 *   Grooming an Minderjährigen) wird BLOCKIERT + kritisch gemeldet.
 * - SELFHARM (Hinweise auf Selbstgefährdung) wird mit Hilfsangeboten
 *   beantwortet + kritisch gemeldet (Fürsorgepflicht).
 *
 * Technik: Normalisierung (Leet, Wiederholungen, Trennzeichen) +
 * Wortgrenzen-Prüfung + externe Wortliste (profanity-words.ts, eingebettet,
 * damit offline/PWA-fähig) + Admin-Overrides (Filter-Feedback im SV-Panel).
 */

import { EXTERNAL_WORDS } from './profanity-words';
import { apiRequest } from './api';

const LEET_MAP: Record<string, string> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '8': 'b', '@': 'a', '$': 's', '+': 't',
    '6': 'g', '9': 'g', '(': 'c', '<': 'c',
    '2': 'z',
};

/** Normalisiert Text: Leet auflösen, 3-fach-Wiederholungen kollabieren. */
export function normalizeForFilter(text: string): string {
    const lowered = text.toLowerCase().replace(/ß/g, 'ss');
    let out = '';
    for (const ch of lowered) {
        const n = LEET_MAP[ch] ?? ch;
        out += /[a-zäöü0-9]/.test(n) ? n : ' ';
    }
    out = out.trim().replace(/\s+/g, ' ');
    out = out.replace(/([a-zäöü0-9])\1{2,}/g, '$1');
    out = out.replace(/(?:^| )((?:[a-zäöü0-9] )+[a-zäöü0-9])(?= |$)/g, (_m, g1: string) =>
        ` ${String(g1).replace(/ /g, '')} `
    );
    return ` ${out.trim().replace(/\s+/g, ' ')} `;
}

// ---------------------------------------------------------------------------
// MILD — wird toleriert (Grundschul-Niveau, kein Mobbing, nichts Sexuelles).
// Alle Einträge bereits normalisiert (klein, ss statt ß).
// ---------------------------------------------------------------------------
const MILD_TOLERATED = new Set([
    // Deutsch, Schulhof-Niveau
    'kacke', 'kacka', 'kack', 'scheisse', 'scheiss', 'mist',
    'doof', 'doofi', 'bloed', 'bloede', 'bloedmann', 'bloedsinn',
    'dumm', 'dummer', 'dummkopf', 'depp', 'deppen', 'trottel',
    'honk', 'pappnase', 'quatsch', 'quatschkopf', 'nerv', 'nervig',
    'aetzend', 'langweilig', 'idiot', 'idioten', 'idiotisch',
    'halt die klappe', 'klappe',
    // Englisch, harmlos
    'crap', 'damn', 'stupid', 'dumb', 'sucks', 'suck', 'lame',
    'shut up',
    // Gaming-Slang, harmlos
    'noob', 'noobs', 'camper', 'op', 'gg',
]);

// ---------------------------------------------------------------------------
// EDUCATIONAL — Schulbegriffe, die NIE blockieren (Geschichte-Nachhilfe).
// Werden vor der Prüfung maskiert. Echte Parolen stehen unter EXTREME.
// ---------------------------------------------------------------------------
const EDUCATIONAL_ALLOW = [
    'moby dick', 'en retard', 'dick und duenn', 'dick und dünn',
    'adolf', 'hitler', 'nazi', 'nazis', 'holocaust', 'anne frank',
    'drittes reich', 'zweiter weltkrieg', 'weichsel', 'stalingrad',
];

function maskAllowlist(norm: string, extra: string[] = []): string {
    let masked = norm;
    for (const phrase of [...EDUCATIONAL_ALLOW, ...extra]) {
        const needle = ` ${phrase} `;
        while (masked.includes(needle)) masked = masked.replace(needle, ' ');
    }
    return masked;
}

// ---------------------------------------------------------------------------
// EXTREME — blockiert + kritische Auto-Meldung an die SV-Moderation.
// ---------------------------------------------------------------------------
const EXTREME_PATTERNS = [
    // Nazi-Verherrlichung (keine Schulbegriffe, sondern Parolen)
    'sieg heil', 'heil hitler', 'adolf hitler', 'hakenkreuz',
    'white power', 'white pride', 'fourteen words', '14 words',
    'blut und ehre', 'juden raus', 'kanacken raus', 'auslaender raus',
    'deutschland den deutschen', 'zyklon b', 'arbeit macht frei',
    // Konkrete Tötungs-/Gewalt-Drohungen
    'ich bring dich um', 'ich bringe dich um', 'bring dich um',
    'ich toete dich', 'ich töte dich', 'toete dich',
    'ich steche dich ab', 'steche dich ab',
    'ich vergewaltige dich', 'vergewaltige dich', 'i will rape you',
    'i will kill you', 'gonna kill you',
    // Doxxing-Drohung
    'ich weiss wo du wohnst', 'weisst wo du wohnst', 'i know where you live',
    // Grooming / sexuelle Anmache an Minderjährige
    'schick mir nudes', 'schick nudes', 'send nudes', 'send me nudes',
    'nacktbild schicken', 'zeig dich nackt', 'zieh dich aus',
    'sag es keinem', 'sag es niemandem', 'erzaehl es niemandem',
    'unser geheimnis', 'unser kleines geheimnis',
];

// ---------------------------------------------------------------------------
// SEVERE — handkuratierte Muster (blockiert + Auto-Meldung, Priorität hoch).
// Hinweis: milde Wörter (MILD_TOLERATED) sind hier bewusst NICHT enthalten.
// ---------------------------------------------------------------------------
const DE_SEVERE = [
    'hurensohn', 'huso', 'hure', 'nutte', 'schlampe', 'fotze',
    'fotzenknecht', 'fick', 'fick dich', 'ficken', 'gefickt', 'ficker', 'wixer',
    'wichser', 'wichsen', 'abspritzen', 'verpiss dich', 'leck mich',
    'halt die fresse', 'halt deine fresse', 'halt dein maul',
    'muschi', 'mumu', 'titten', 'brueste',
    'schwanz', 'pimmel', 'penis', 'vagina',
    'poppen', 'voegeln', 'bumsen', 'nageln', 'notgeil', 'pervers',
    'porno', 'orgasmus', 'paedophil', 'fussbild', 'fussbilder',
    'nacktbild', 'nacktbilder', 'nacktfoto', 'nacktfotos',
    'arschloch', 'arsch', 'pisser', 'pissen',
    'kotze', 'kotzen', 'dreckschwein', 'miststueck',
    'missgeburt', 'bastard', 'spasti', 'spast', 'behinderter',
    'penner', 'asozial', 'assi', 'schmarotzer', 'versager',
    'hässlich', 'haesslich', 'fett', 'fette', 'opfer',
    'rattengesicht', 'ekelpaket', 'stinktier', 'loser', 'niete',
    'krueppel', 'minderwertig', 'untermensch',
    'vergewaltigen', 'vergewaltigung', 'entfuehren', 'kidnap',
    'amok', 'bombe', 'bombendrohung', 'anschlag', 'terror',
    'kokain', 'koks', 'mdma', 'ecstasy', 'drogen kaufen',
    'waffen kaufen', 'pistole kaufen', 'messer kaufen',
    'sugar daddy', 'sugar baby', 'escort',
    'fussbilder verkaufen', 'hausaufgaben verkaufen',
];

const EN_SEVERE = [
    'bitch', 'bitches', 'slut', 'sluts', 'whore', 'whores', 'cunt',
    'dick', 'dicks', 'dickpic', 'cock', 'cocks', 'pussy',
    'tits', 'boobs', 'boob', 'nipple', 'blowjob', 'handjob',
    'asshole', 'dumbass', 'jackass', 'bastard',
    'motherfucker', 'fucker', 'fuck', 'fucked', 'fucking',
    'bullshit', 'moron', 'weirdo', 'creep', 'pervert',
    'douche', 'douchebag', 'wanker', 'tosser', 'prick', 'twat', 'bollocks',
    'slutty', 'horny', 'porn', 'hentai', 'onlyfans', 'camgirl',
    'nudes', 'orgasm', 'masturbate', 'suck my', 'hookup',
    'unalive', 'kys',
    'nigger', 'nigga', 'neger', 'kanake', 'kanacke', 'kuemmeltuerke',
    'ziegenficker', 'kamelficker', 'sandneger', 'judensau',
    'itaker', 'polacke', 'schlitzauge', 'schlitzaugen',
    'zigeuner', 'schwuchtel', 'transe', 'faggot', 'dyke', 'tranny',
    'kike', 'chink', 'spic', 'raghead',
    'kill you', 'beat you up', 'stab you', 'rape',
    'free money', 'double your crypto', 'send me money',
    'gift card code', 'claim your prize',
];

const SCAM_SEVERE = [
    'geld verdienen schnell', 'schnell geld', 'krypto verdopplung',
    'bitcoin verdopplung', 'send mir geld', 'ueberweis mir',
    'paypal freunde', 'guthaben code', 'paysafecard', 'geschenkkarte code',
    'kostenloses iphone', 'gewonnen herzlichen glueckwunsch',
    'folgendem link', 'bit.ly', 'tinyurl',
    'whatsapp nummer', 'snapchat add', 'telegram gruppe',
];

/** Selbstgefährdung: Hilfe statt Strafe + kritische Meldung (Fürsorge). */
const SELF_HARM_PATTERNS = [
    'selbstmord', 'suizid', 'suicide', 'selbstverletzung',
    'ritzen', 'mich umbringen', 'will nicht mehr leben',
    'keinen sinn mehr', 'kill myself', 'end my life', 'suicidal',
];

// ---------------------------------------------------------------------------
// Severity-Pools aufbauen (einmalig beim Laden, normalisiert).
// Externe Liste: Default SEVERE, abzüglich milder + schulischer Begriffe.
// ---------------------------------------------------------------------------
function normPattern(raw: string): string {
    return normalizeForFilter(raw).trim();
}

function buildPool(entries: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of entries) {
        const p = normPattern(raw);
        if (!p || seen.has(p)) continue;
        if (MILD_TOLERATED.has(p)) continue;
        seen.add(p);
        out.push(p);
    }
    return out;
}

const EXTREME_POOL = buildPool(EXTREME_PATTERNS);
const SELF_HARM_POOL = buildPool(SELF_HARM_PATTERNS);
const SEVERE_POOL = buildPool([...DE_SEVERE, ...EN_SEVERE, ...SCAM_SEVERE, ...EXTERNAL_WORDS]);

// ---------------------------------------------------------------------------
// Ergebnis-Typen
// ---------------------------------------------------------------------------
import { CONTACT_EMAILS } from './contact';

export type Severity = 'none' | 'mild' | 'severe' | 'extreme' | 'selfharm';
export type BlockKind = 'abuse' | 'selfharm' | null;

export interface FilterOverrides {
    /** Normalisierte Wörter/Phrasen, die zusätzlich erlaubt sind (SV-Feedback). */
    allow: string[];
    /** Normalisierte Wörter/Phrasen, die zusätzlich blockieren (SV-Feedback). */
    block: string[];
}

export interface ProfanityResult {
    blocked: boolean;
    severity: Severity;
    /** Alle erkannten Treffer (max. 6, für Meldung/Feedback), sonst [] */
    hits: string[];
    /** Erster Treffer (für Logging/Feedback), sonst null */
    matched: string | null;
    kind: BlockKind;
}

/** Sammelt alle Treffer eines Pools (max. 6). */
function collectHits(norm: string, normNoSpaces: string, pool: string[]): string[] {
    const hits: string[] = [];
    for (const pattern of pool) {
        if (hits.length >= 6) break;
        if (norm.includes(` ${pattern} `)) {
            hits.push(pattern);
            continue;
        }
        if (pattern.includes(' ') && normNoSpaces.includes(pattern.replace(/ /g, ''))) {
            hits.push(pattern);
        }
    }
    return hits;
}

/** Vollanalyse eines Textes (mit optionalen SV-Overrides aus dem Filter-Feedback). */
export function checkContent(text: string, overrides?: FilterOverrides): ProfanityResult {
    const clean: ProfanityResult = { blocked: false, severity: 'none', hits: [], matched: null, kind: null };
    if (!text || !text.trim()) return clean;

    const extraAllow = (overrides?.allow ?? []).map(normPattern).filter(Boolean);
    const extraBlock = buildPool(overrides?.block ?? []);
    const norm = maskAllowlist(normalizeForFilter(text), extraAllow);
    const normNoSpaces = norm.replace(/ /g, '');

    const selfHarm = collectHits(norm, normNoSpaces, SELF_HARM_POOL);
    if (selfHarm.length > 0) {
        return { blocked: true, severity: 'selfharm', hits: selfHarm, matched: selfHarm[0], kind: 'selfharm' };
    }
    const extreme = collectHits(norm, normNoSpaces, EXTREME_POOL);
    if (extreme.length > 0) {
        return { blocked: true, severity: 'extreme', hits: extreme, matched: extreme[0], kind: 'abuse' };
    }
    const severe = collectHits(norm, normNoSpaces, [...extraBlock, ...SEVERE_POOL]);
    if (severe.length > 0) {
        return { blocked: true, severity: 'severe', hits: severe, matched: severe[0], kind: 'abuse' };
    }
    // Mild: erkannt, aber toleriert (kein Block, keine Meldung).
    const mildHits = collectHits(norm, normNoSpaces, [...MILD_TOLERATED]);
    if (mildHits.length > 0) {
        return { blocked: false, severity: 'mild', hits: mildHits, matched: mildHits[0], kind: null };
    }
    return clean;
}

/** Sendeseitiger Inhaltsfilter: gibt die anzuzeigende Blockier-Meldung zurück (null = ok). */
export function blockedReason(text: string, overrides?: FilterOverrides): string | null {
    const result = checkContent(text, overrides);
    if (!result.blocked) return null;
    if (result.severity === 'selfharm') return SELF_HARM_MESSAGE;
    if (result.severity === 'extreme') return EXTREME_MESSAGE;
    return BLOCKED_MESSAGE;
}

/** Schwere Stufen (severe/extreme/selfharm) werden automatisch zur SV-Moderation gemeldet. */
export function shouldAutoReport(result: ProfanityResult): boolean {
    return result.blocked && result.severity !== 'mild';
}

// ---------------------------------------------------------------------------
// SV-Overrides (Filter-Feedback): einmal pro Sitzung laden, dann cachen.
// ---------------------------------------------------------------------------
let overridesCache: FilterOverrides | null = null;
let overridesFetchedAt = 0;
const OVERRIDES_TTL_MS = 30 * 60 * 1000;

export async function loadFilterOverrides(force = false): Promise<FilterOverrides> {
    const empty: FilterOverrides = { allow: [], block: [] };
    if (!force && overridesCache && Date.now() - overridesFetchedAt < OVERRIDES_TTL_MS) {
        return overridesCache;
    }
    try {
        const raw = localStorage.getItem('fwg_filter_overrides');
        if (raw && !force) {
            const parsed = JSON.parse(raw) as { at: number; data: FilterOverrides };
            if (Date.now() - parsed.at < OVERRIDES_TTL_MS && parsed.data) {
                overridesCache = parsed.data;
                overridesFetchedAt = parsed.at;
                return parsed.data;
            }
        }
    } catch { /* Cache lesen ist best-effort */ }
    try {
        const res = await apiRequest('/moderation.php?action=overrides');
        const data: FilterOverrides = {
            allow: Array.isArray(res.data?.allow) ? res.data.allow : [],
            block: Array.isArray(res.data?.block) ? res.data.block : [],
        };
        overridesCache = data;
        overridesFetchedAt = Date.now();
        try {
            localStorage.setItem('fwg_filter_overrides', JSON.stringify({ at: overridesFetchedAt, data }));
        } catch { /* Speichern ist best-effort */ }
        return data;
    } catch {
        return overridesCache ?? empty;
    }
}

/** Einheitliche Meldung für blockierte Inhalte */
export const BLOCKED_MESSAGE =
    `Diese Nachricht wurde blockiert: Sie enthält unangebrachte Inhalte. Bei Fragen wende dich an ${CONTACT_EMAILS.general}.`;

/** Verschärfte Meldung bei extremen Inhalten (Hassrede, Drohungen, Grooming) */
export const EXTREME_MESSAGE =
    'Diese Nachricht wurde blockiert und zur Prüfung an die Schülervertretung weitergeleitet. ' +
    'Bei Bedrohungen wende dich bitte zusätzlich an eine Vertrauensperson (Hr. Schulz, Hr. Steinberg) oder ' + CONTACT_EMAILS.general + '.';

/** Hilfetext bei Hinweisen auf Selbstgefährdung */
export const SELF_HARM_MESSAGE =
    'Deine Nachricht klingt so, als ginge es dir gerade nicht gut. Du bist nicht allein: ' +
    'Telefonseelsorge 0800 111 0 111 (anonym, kostenlos, 24h), Nummer gegen Kummer 116 111. ' +
    'In der Schule helfen dir auch die Vertrauenslehrer Hr. Schulz und Hr. Steinberg sowie Fr. Balistreri.';
