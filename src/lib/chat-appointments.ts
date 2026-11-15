// ==============================================================================
// Chat-Termine: Parsen und Erzeugen des bestehenden TERMIN-VEREINBARUNG-Formats
// ==============================================================================
//
// Das Backend kennt keine eigenen Termin-Entities. Ein Terminvorschlag ist eine
// normale Chat-Nachricht mit einem festen Textformat. Diese Helfer halten das
// Format an einer Stelle, damit alte Nachrichten weiter lesbar bleiben und neue
// Vorschläge exakt dasselbe Format schreiben.

export interface AppointmentDetails {
    subject: string;
    /** Lokales Datum im Format YYYY-MM-DD. */
    date: string;
    /** Lokale Uhrzeit im Format HH:MM (24h). */
    time: string;
    durationMinutes: number;
    location?: string;
    format?: string;
}

export const DEFAULT_APPOINTMENT_DURATION = 45;
export const DEFAULT_APPOINTMENT_LOCATION = 'FWG Bibliothek / Schulgelände';

export const APPOINTMENT_SUBJECTS = [
    'Mathematik',
    'Englisch',
    'Deutsch',
    'Französisch',
    'Latein',
    'Physik',
    'Chemie',
    'Biologie',
    'Informatik',
    'Geschichte',
] as const;

export const APPOINTMENT_LOCATIONS = [
    DEFAULT_APPOINTMENT_LOCATION,
    'SV-Raum',
    'Klassenraum (Absprache)',
    'Schulhof',
] as const;

export const APPOINTMENT_TIMES = ['13:00', '14:00', '15:00', '15:30', '16:00'] as const;

const SUBJECT_ALIASES: Record<string, string> = {
    mathe: 'Mathematik',
    math: 'Mathematik',
    mathematic: 'Mathematik',
    englisch: 'Englisch',
    english: 'Englisch',
    deutsch: 'Deutsch',
    german: 'Deutsch',
    franzoesisch: 'Französisch',
    französisch: 'Französisch',
    latein: 'Latein',
    physik: 'Physik',
    chemie: 'Chemie',
    biologie: 'Biologie',
    bio: 'Biologie',
    informatik: 'Informatik',
    info: 'Informatik',
    geschichte: 'Geschichte',
};

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

/** Prüft ein Kalenderdatum ohne Zeitzonen-Umweg. */
export function isValidISODate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

export function isValidTime(value: string): boolean {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return false;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/** Lokales Datum als YYYY-MM-DD (nicht UTC, damit der Termin am richtigen Tag bleibt). */
export function toISODate(date: Date): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayISODate(now: Date = new Date()): string {
    return toISODate(now);
}

export function addDaysToISODate(value: string, days: number): string {
    if (!isValidISODate(value)) return value;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    return toISODate(date);
}

/** Plant einen Termin in der lokalen Zeitzone; null bei ungültigen Angaben. */
export function appointmentStartDate(details: Pick<AppointmentDetails, 'date' | 'time'>): Date | null {
    if (!isValidISODate(details.date) || !isValidTime(details.time)) return null;
    const [year, month, day] = details.date.split('-').map(Number);
    const [hours, minutes] = details.time.split(':').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

export function appointmentEndTime(
    details: Pick<AppointmentDetails, 'time' | 'durationMinutes'>
): string {
    const [hours, minutes] = details.time.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return details.time;
    const total = hours * 60 + minutes + Math.max(1, details.durationMinutes || DEFAULT_APPOINTMENT_DURATION);
    const endHours = Math.floor(total / 60) % 24;
    const endMinutes = total % 60;
    return `${pad2(endHours)}:${pad2(endMinutes)}`;
}

export function formatAppointmentDate(date: string, now: Date = new Date()): string {
    if (!isValidISODate(date)) return date;
    const [year, month, day] = date.split('-').map(Number);
    const value = new Date(year, month - 1, day);
    const includeYear = value.getFullYear() !== now.getFullYear();
    return value.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        ...(includeYear ? { year: 'numeric' as const } : {}),
    });
}

export function formatAppointmentTime(details: Pick<AppointmentDetails, 'time' | 'durationMinutes'>): string {
    return `${details.time}–${appointmentEndTime(details)} Uhr`;
}

export function isAppointmentInPast(
    details: Pick<AppointmentDetails, 'date' | 'time'>,
    now: Date = new Date()
): boolean {
    const start = appointmentStartDate(details);
    if (!start) return false;
    return start.getTime() < now.getTime();
}

/**
 * Normalisiert ein Fach aus der Anfrage auf eine Option des Termin-Dialogs.
 * Unbekannte Fächer bleiben erhalten; der Dialog ergänzt sie als Extra-Option.
 */
export function normalizeAppointmentSubject(value?: string | null): string {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return 'Mathematik';
    const known = APPOINTMENT_SUBJECTS.find(subject => subject.toLowerCase() === trimmed.toLowerCase());
    if (known) return known;
    return SUBJECT_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function appointmentSubjectFromRequest(subjects?: string[] | null): string {
    const first = Array.isArray(subjects) ? subjects.find(subject => typeof subject === 'string' && subject.trim() !== '') : null;
    return normalizeAppointmentSubject(first ?? null);
}

function valueAfterLabel(lines: string[], label: string): string | null {
    const normalizedLabel = label.toLowerCase();
    for (const line of lines) {
        const match = /^\s*([^:]{1,24})\s*:\s*(.+?)\s*$/.exec(line);
        if (match && match[1].trim().toLowerCase() === normalizedLabel) {
            return match[2].trim();
        }
    }
    return null;
}

function parseDateField(value: string | null): string | null {
    if (!value) return null;
    const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(value);
    if (iso) {
        const normalized = `${iso[1]}-${pad2(Number(iso[2]))}-${pad2(Number(iso[3]))}`;
        return isValidISODate(normalized) ? normalized : null;
    }
    const german = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/.exec(value);
    if (german) {
        const year = german[3].length === 2 ? `20${german[3]}` : german[3];
        const normalized = `${year}-${pad2(Number(german[2]))}-${pad2(Number(german[1]))}`;
        return isValidISODate(normalized) ? normalized : null;
    }
    return null;
}

function parseTimeField(value: string | null): string | null {
    if (!value) return null;
    const match = /\b(\d{1,2})[:.](\d{2})\b/.exec(value);
    if (!match) return null;
    const time = `${pad2(Number(match[1]))}:${match[2]}`;
    return isValidTime(time) ? time : null;
}

function parseDurationField(value: string | null): number {
    if (!value) return DEFAULT_APPOINTMENT_DURATION;
    const match = /\b(\d{1,3})\s*(?:Min|Minuten)\b/i.exec(value);
    if (!match) return DEFAULT_APPOINTMENT_DURATION;
    const minutes = Number(match[1]);
    return Number.isFinite(minutes) && minutes >= 5 && minutes <= 240
        ? minutes
        : DEFAULT_APPOINTMENT_DURATION;
}

/**
 * Liest das alte und das aktuelle TERMIN-VEREINBARUNG-Format.
 * Gibt null zurück, wenn die Nachricht kein vollständiger Terminvorschlag ist;
 * dann bleibt der ursprüngliche Text sichtbar.
 */
export function parseAppointmentMessage(content: string): AppointmentDetails | null {
    if (!content || !content.includes('TERMIN-VEREINBARUNG')) return null;

    const lines = content.split(/\r?\n/);
    const markerIndex = lines.findIndex(line => line.trim().toUpperCase() === 'TERMIN-VEREINBARUNG');
    if (markerIndex === -1) return null;

    const body = lines.slice(markerIndex + 1);
    const date = parseDateField(valueAfterLabel(body, 'Datum'));
    const time = parseTimeField(valueAfterLabel(body, 'Uhrzeit'));
    if (!date || !time) return null;

    const subject = valueAfterLabel(body, 'Fach') ?? valueAfterLabel(body, 'Fachgebiet') ?? 'Nachhilfe';
    const location = valueAfterLabel(body, 'Ort')
        ?? valueAfterLabel(body, 'Treffpunkt')
        ?? undefined;
    const format = valueAfterLabel(body, 'Format') ?? undefined;
    const durationSource = valueAfterLabel(body, 'Dauer') ?? valueAfterLabel(body, 'Uhrzeit');

    return {
        subject,
        date,
        time,
        durationMinutes: parseDurationField(durationSource),
        ...(location ? { location } : {}),
        ...(format ? { format } : {}),
    };
}

export function isAppointmentMessage(content: string): boolean {
    return parseAppointmentMessage(content) !== null;
}

/** Schreibt exakt das bestehende Format, damit auch alte Clients es anzeigen können. */
export function buildAppointmentMessage(details: AppointmentDetails): string {
    const lines = [
        'TERMIN-VEREINBARUNG',
        `Fach: ${details.subject.trim() || 'Nachhilfe'}`,
        `Datum: ${details.date}`,
        `Uhrzeit: ${details.time} Uhr (${details.durationMinutes || DEFAULT_APPOINTMENT_DURATION} Min)`,
    ];
    const location = details.location?.trim();
    if (location) lines.push(`Ort: ${location}`);
    const format = details.format?.trim();
    if (format) lines.push(`Format: ${format}`);
    return lines.join('\n');
}

/** Klare, normale Antwortnachricht auf einen Terminvorschlag (kein Backend-Status). */
export function buildAppointmentConfirmation(details: AppointmentDetails): string {
    return `✅ Passt: ${details.subject} am ${formatNumericDate(details.date)}, ${details.time} Uhr.`;
}

/** Absage als normale Nachricht; der Marker macht den lokalen Status lesbar. */
export function buildAppointmentDecline(details: AppointmentDetails): string {
    return `❌ Passt nicht: ${details.subject} am ${formatNumericDate(details.date)}, ${details.time} Uhr. Bitte schlage einen anderen Termin vor.`;
}

export function formatNumericDate(value: string): string {
    if (!isValidISODate(value)) return value;
    const [year, month, day] = value.split('-');
    return `${day}.${month}.${year}`;
}

export type AppointmentLocalStatus = 'proposed' | 'accepted' | 'declined' | 'countered';

export interface AppointmentResponse {
    status: 'accepted' | 'declined';
    subject: string;
    date: string;
    time: string;
}

/**
 * Liest die von den Schnellaktionen erzeugten Antworten.
 * Bewusst nur das eigene, klar markierte Format; freie Texte wie „ja, passt“
 * werden nicht als Status interpretiert.
 */
export function parseAppointmentResponse(content: string): AppointmentResponse | null {
    const match = /^\s*(✅|❌)\s*(Passt(?:\s+nicht)?)\s*:\s*(.+?)\s+am\s+(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2})\s*Uhr/i
        .exec(String(content ?? '').trim());
    if (!match) return null;
    const date = `${match[6]}-${pad2(Number(match[5]))}-${pad2(Number(match[4]))}`;
    const time = `${pad2(Number(match[7]))}:${match[8]}`;
    if (!isValidISODate(date) || !isValidTime(time)) return null;
    return {
        status: match[2].toLowerCase().replace(/\s+/g, ' ') === 'passt nicht' ? 'declined' : 'accepted',
        subject: match[3].trim(),
        date,
        time,
    };
}

export interface AppointmentSourceMessage {
    id: string;
    sender_id?: string;
    content: string;
    created_at: string;
}

function sameAppointment(a: AppointmentDetails, b: AppointmentDetails): boolean {
    return a.subject.trim().toLocaleLowerCase('de-DE') === b.subject.trim().toLocaleLowerCase('de-DE')
        && a.date === b.date
        && a.time === b.time;
}

/** Stabiler Schlüssel für denselben Termin (Fach + Datum + Uhrzeit). */
export function appointmentSlotKey(details: Pick<AppointmentDetails, 'subject' | 'date' | 'time'>): string {
    return [
        details.subject.trim().toLocaleLowerCase('de-DE'),
        details.date,
        details.time,
    ].join('|');
}

/**
 * Leitet den Terminstatus ausschließlich aus späteren Chatnachrichten ab.
 * Es gibt keine Termin-Tabelle und keine Statusspalte.
 */
export function deriveAppointmentStatus(
    messageId: string,
    messages: AppointmentSourceMessage[]
): AppointmentLocalStatus {
    const index = messages.findIndex((message) => message.id === messageId);
    if (index === -1) return 'proposed';
    const details = parseAppointmentMessage(messages[index].content);
    if (!details) return 'proposed';

    let status: AppointmentLocalStatus = 'proposed';
    for (const later of messages.slice(index + 1)) {
        const response = parseAppointmentResponse(later.content);
        if (response
            && response.subject.trim().toLocaleLowerCase('de-DE') === details.subject.trim().toLocaleLowerCase('de-DE')
            && response.date === details.date
            && response.time === details.time) {
            status = response.status;
            continue;
        }
        const proposal = parseAppointmentMessage(later.content);
        if (proposal && proposal.subject.trim().toLocaleLowerCase('de-DE') === details.subject.trim().toLocaleLowerCase('de-DE')
            && !sameAppointment(proposal, details)) {
            status = 'countered';
        }
    }
    return status;
}

export interface AppointmentTimelineEntry {
    messageId: string;
    senderId: string;
    details: AppointmentDetails;
    createdAt: string;
    start: Date;
    status: AppointmentLocalStatus;
    isUpcoming: boolean;
}

/**
 * Extrahiert Terminvorschläge aus dem Chatverlauf für Karten und Kalenderpanel.
 * Doppelte Vorschläge für denselben Slot werden zusammengefasst; der erste
 * Eintrag bleibt Referenz, damit spätere Antworten eindeutig zugeordnet werden.
 * Die Reihenfolge der Eingabe (chronologisch) bleibt Basis für die Statusableitung.
 */
export function extractAppointments(
    messages: AppointmentSourceMessage[],
    now: Date = new Date()
): AppointmentTimelineEntry[] {
    const bySlot = new Map<string, AppointmentTimelineEntry>();
    messages.forEach((message) => {
        const details = parseAppointmentMessage(message.content);
        if (!details) return;
        const start = appointmentStartDate(details);
        if (!start) return;
        const key = appointmentSlotKey(details);
        if (bySlot.has(key)) return;
        bySlot.set(key, {
            messageId: message.id,
            senderId: message.sender_id ?? '',
            details,
            createdAt: message.created_at,
            start,
            status: 'proposed',
            isUpcoming: start.getTime() >= now.getTime(),
        });
    });

    return [...bySlot.values()]
        .map((entry) => ({
            ...entry,
            status: deriveAppointmentStatus(entry.messageId, messages),
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());
}
