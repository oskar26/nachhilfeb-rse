/**
 * Gemeinsamer Inhaltsfilter (DE + EN) für Chats, Support und Anzeigen.
 * Sendeseitige Prüfung: blockiert Beleidigungen, sexuelle Belästigung,
 * Hassrede, Drohungen und Spam-/Betrugs-Muster, bevor sie gespeichert werden.
 *
 * Technik: Normalisierung (Kleinbuchstaben, Leet-Speak, Wiederholungen,
 * Trennzeichen) + Wortgrenzen-Prüfung, damit z. B. „Diktat", „Moby Dick",
 * „en retard" oder „ich finde dich nett" NICHT als Treffer zählen.
 *
 * Hinweis: Historische Begriffe (Hitler, Nazi) sind bewusst NICHT enthalten,
 * damit Geschichte-Nachhilfe möglich bleibt. Erkannt werden dagegen
 * eindeutige extremistische Parolen.
 */

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
        // Nur Buchstaben/Ziffern behalten, alles andere wird Wortgrenze (Leerzeichen)
        out += /[a-zäöü0-9]/.test(n) ? n : ' ';
    }
    out = out.trim().replace(/\s+/g, ' ');
    // „huuure" -> „hure": 3+ gleiche Zeichen in Folge kollabieren.
    // (Echte Doppelbuchstaben wie in „Wetter" bleiben erhalten.)
    out = out.replace(/([a-zäöü0-9])\1{2,}/g, '$1');
    // „h u r e" -> „hure": einzeln getrennte Buchstaben (Umgehung) joinen
    out = out.replace(/(?:^| )((?:[a-zäöü0-9] )+[a-zäöü0-9])(?= |$)/g, (_m, g1: string) =>
        ` ${String(g1).replace(/ /g, '')} `
    );
    return ` ${out.trim().replace(/\s+/g, ' ')} `;
}

/**
 * Harmlose Redewendungen, die blockierte Wörter enthalten.
 * Werden vor der Prüfung maskiert (Moby Dick, en retard, dick und dünn).
 */
const ALLOWLIST = ['moby dick', 'en retard', 'dick und duenn', 'dick und dünn'];

function maskAllowlist(norm: string): string {
    let masked = norm;
    for (const phrase of ALLOWLIST) {
        const needle = ` ${phrase} `;
        while (masked.includes(needle)) masked = masked.replace(needle, ' ');
    }
    return masked;
}

// ---------------------------------------------------------------------------
// Wortlisten (alle Einträge kleingeschrieben; Prüfung mit Wortgrenzen)
// ---------------------------------------------------------------------------

/** Deutsche Beleidigungen & Schimpfwörter */
const DE_INSULTS = [
    'hurensohn', 'huso', 'hure', 'nutte', 'schlampe', 'fotze',
    'fotzenknecht', 'fick', 'fick dich', 'ficken', 'gefickt', 'ficker', 'wixer',
    'wichser', 'wichsen', 'abspritzen', 'verpiss dich', 'leck mich',
    'halt die fresse', 'halt deine fresse', 'halt dein maul',
    'muschi', 'mumu', 'titten', 'brüste',
    'schwanz', 'pimmel', 'penis', 'vagina',
    'poppen', 'vögeln', 'bumsen', 'nageln', 'notgeil', 'pervers',
    'porno', 'orgasmus', 'pädophil', 'fussbild', 'fussbilder',
    'arschloch', 'arsch', 'pisser', 'pissen', 'scheisse', 'scheiss',
    'kacke', 'kacken', 'kotze', 'kotzen', 'dreckschwein', 'miststück',
    'missgeburt', 'bastard', 'spasti', 'spast', 'behinderter',
    'dummkopf', 'idiot', 'vollidiot', 'trottel', 'depp',
    'hirni', 'dämlich', 'blödmann', 'penner', 'asozial', 'assi',
    'schmarotzer', 'lügner', 'heuchler', 'feigling',
    'versager', 'loser', 'niete', 'nulpe', 'opferrolle',
    'hässlich', 'rattengesicht', 'ekelpaket', 'stinktier',
];

/** Englische Beleidigungen & Schimpfwörter */
const EN_INSULTS = [
    'bitch', 'bitches', 'slut', 'sluts', 'whore', 'whores', 'cunt',
    'dick', 'dicks', 'dickpic', 'cock', 'cocks', 'pussy',
    'tits', 'boobs', 'boob', 'nipple', 'blowjob', 'handjob',
    'asshole', 'dumbass', 'jackass', 'bastard',
    'motherfucker', 'fucker', 'fuck', 'fucked', 'fucking',
    'shit', 'bullshit', 'shut up', 'stupid', 'moron',
    'loser', 'weirdo', 'creep', 'pervert', 'douche', 'douchebag',
    'wanker', 'tosser', 'prick', 'twat', 'bollocks',
    'slutty', 'horny', 'porn', 'hentai', 'onlyfans', 'camgirl',
    'nudes', 'orgasm', 'masturbate', 'suck my', 'hookup',
    'unalive', 'kys',
];

/** Hassrede / Diskriminierung (DE + EN) */
const HATE_SPEECH = [
    'nigger', 'nigga', 'neger', 'kanake', 'kanacke', 'kümmeltürke',
    'ziegenficker', 'kamelficker', 'sandneger', 'judensau',
    'itaker', 'polacke', 'schlitzauge', 'schlitzaugen',
    'zigeuner', 'schwuchtel', 'transe', 'faggot', 'dyke', 'tranny',
    'kike', 'chink', 'spic', 'raghead',
    'white power', 'sieg heil', 'hakenkreuz',
    'ausländer raus', 'deutschland den deutschen', 'kanacken raus',
    'krüppel', 'minderwertig', 'untermensch',
];

/** Drohungen & Gewalt */
const THREATS = [
    'ich bring dich um', 'bring dich um', 'bring mich um',
    'ich töte dich', 'töte dich',
    'ich stech dich ab', 'abstechen', 'verprügeln', 'zusammenschlagen',
    'aufs maul', 'aufsmaul', 'fresse einschlagen', 'knochenbrechen',
    'ich weiß wo du wohnst', 'weisst wo du wohnst',
    'du bist tot', 'bist tot', 'umbringen', 'erstechen',
    'kill you', 'i will kill', 'gonna kill', 'beat you up', 'stab you',
    'rape', 'vergewaltigen', 'vergewaltigung', 'entführen', 'kidnap',
    'amok', 'bombe', 'bombendrohung', 'anschlag', 'terror',
    'kokain', 'mdma', 'ecstasy', 'waffen kaufen', 'pistole kaufen',
    'messer kaufen', 'drogen kaufen', 'gras kaufen', 'weed kaufen',
    'fußbilder verkaufen', 'hausaufgaben verkaufen',
    'sugar daddy', 'sugar baby', 'escort',
];

/** Spam / Betrug / Abzocke */
const SCAM_SPAM = [
    'geld verdienen schnell', 'schnell geld', 'krypto verdopplung',
    'bitcoin verdopplung', 'send mir geld', 'überweis mir',
    'paypal freunde', 'guthaben code', 'paysafecard', 'geschenkkarte code',
    'kostenloses iphone', 'gewonnen herzlichen glückwunsch',
    'folgendem link', 'bit.ly', 'tinyurl',
    'whatsapp nummer', 'snapchat add', 'telegram gruppe',
    'free money', 'double your crypto', 'send me money',
    'gift card code', 'claim your prize',
];

const ABUSE_PATTERNS = [
    ...DE_INSULTS,
    ...EN_INSULTS,
    ...HATE_SPEECH,
    ...THREATS,
    ...SCAM_SPAM,
];

/**
 * Selbstgefährdung: wird NICHT mit Standard-Text blockiert, sondern mit
 * Hilfsangeboten beantwortet (Telefonseelsorge, Nummer gegen Kummer).
 */
const SELF_HARM_PATTERNS = [
    'selbstmord', 'suizid', 'suicide', 'selbstverletzung',
    'ritzen', 'mich umbringen', 'will nicht mehr leben',
    'keinen sinn mehr', 'don t want to live', 'kill myself',
    'end my life', 'suicidal',
];

export type BlockKind = 'abuse' | 'selfharm' | null;

export interface ProfanityResult {
    blocked: boolean;
    /** Das erkannte Wort/Muster (für Logging/Feedback), sonst null */
    matched: string | null;
    kind: BlockKind;
}

function matchesAny(norm: string, patterns: string[]): string | null {
    // Muster vor-normalisieren (Leet, ß/ss, Punkte wie in „bit.ly")
    const normNoSpaces = norm.replace(/ /g, '');
    for (const raw of patterns) {
        const pattern = normalizeForFilter(raw).trim();
        if (!pattern) continue;
        // Wortgrenzen beidseitig: verhindert Treffer in harmlosen Wörtern
        if (norm.includes(` ${pattern} `)) return pattern;
        // Mehrwort-Phrasen zusätzlich ohne Leerzeichen (gegen „s i e g h e i l")
        if (pattern.includes(' ') && normNoSpaces.includes(pattern.replace(/ /g, ''))) {
            return pattern;
        }
    }
    return null;
}

/** Prüft einen Text (Selbstgefährdung zuerst, dann Missbrauch/Spam). */
export function checkContent(text: string): ProfanityResult {
    if (!text || !text.trim()) return { blocked: false, matched: null, kind: null };
    const norm = maskAllowlist(normalizeForFilter(text));
    const selfHarm = matchesAny(norm, SELF_HARM_PATTERNS);
    if (selfHarm) return { blocked: true, matched: selfHarm, kind: 'selfharm' };
    const abuse = matchesAny(norm, ABUSE_PATTERNS);
    if (abuse) return { blocked: true, matched: abuse, kind: 'abuse' };
    return { blocked: false, matched: null, kind: null };
}

/** Sendeseitiger Inhaltsfilter: gibt die anzuzeigende Blockier-Meldung zurück (null = ok). */
export function blockedReason(text: string): string | null {
    const result = checkContent(text);
    if (!result.blocked) return null;
    return result.kind === 'selfharm' ? SELF_HARM_MESSAGE : BLOCKED_MESSAGE;
}

/** Einheitliche Meldung für blockierte Inhalte */
export const BLOCKED_MESSAGE =
    'Diese Nachricht wurde blockiert: Sie enthält unangebrachte Inhalte. Bei Fragen wende dich an info@sv-fwg.de.';

/** Hilfetext bei Hinweisen auf Selbstgefährdung */
export const SELF_HARM_MESSAGE =
    'Deine Nachricht klingt so, als ginge es dir gerade nicht gut. Du bist nicht allein: ' +
    'Telefonseelsorge 0800 111 0 111 (anonym, kostenlos, 24h), Nummer gegen Kummer 116 111. ' +
    'In der Schule helfen dir auch die Vertrauenslehrer Hr. Schulz und Hr. Steinberg sowie Fr. Balistreri.';
