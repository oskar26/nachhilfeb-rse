// Verfügbarkeits-Logik (Tage, Slots, Überschneidungen) als reines Modul ohne
// React-Abhängigkeit. Aus src/components/AvailabilityCalendar.tsx herausgezogen,
// damit Match-Engine (lib/matching.ts) und Tests diese Logik ohne UI nutzen können.
// Die Komponente re-exportiert alles weiter, bestehende Importe bleiben gültig.

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type Availability = Record<DayKey, string[]>; // string[] is array of slot keys like "13:30"

export const DAY_LABELS: Record<DayKey, string> = {
    mon: 'Mo', tue: 'Di', wed: 'Mi', thu: 'Do', fri: 'Fr', sat: 'Sa', sun: 'So'
};
export const DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Generate slots from 08:00 to 21:30 (28 slots x 30min; day window ends 22:00)
export function generateSlots(): string[] {
    const all: string[] = [];
    let hour = 8, min = 0;
    while (hour < 22) {
        all.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        min += 30;
        if (min === 60) { min = 0; hour++; }
    }
    return all;
}

export const SLOTS = generateSlots();

export function emptyAvailability(): Availability {
    return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}

export function countMatches(myAvail: Availability, theirAvail: Availability): number {
    let count = 0;
    for (const day of DAYS) {
        const mine = new Set(myAvail[day] || []);
        for (const slot of theirAvail[day] || []) {
            if (mine.has(slot)) count++;
        }
    }
    return count;
}
