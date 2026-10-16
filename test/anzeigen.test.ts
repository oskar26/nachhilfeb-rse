// Regressionstests für den Anzeigen-Lesepfad (src/lib/anzeigen.ts).
// Die Erwartungen dokumentieren das eingefrorene Feed-Verhalten (Stand: Extraktion
// aus Feed.tsx), damit Änderungen an der Logik bewusst passieren müssen.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    GRADE_VALUES,
    PRICE_SLIDER_MAX,
    PRICE_SLIDER_MIN,
    SAVED_SEARCH_KEY,
    SORT_KEYS,
    filtereAnzeigen,
    istGeboostet,
    istNachwuchsAngebot,
    isValidSortKey,
    ladeGespeicherteSuche,
    parseGespeicherteSuche,
    speichereGespeicherteSuche,
    sortiereAnzeigen,
    stundenpreis,
    verwerfeGespeicherteSuche,
    type AnzeigeLike,
    type AnzeigenFilter,
    type SavedSearch,
} from '../src/lib/anzeigen';
import { emptyAvailability, type Availability } from '../src/lib/availability';
import type { Subject } from '../src/components/SubjectChip';

const HOUR = 60 * 60 * 1000;
const hoursFromNow = (h: number) => new Date(Date.now() + h * HOUR).toISOString();

let counter = 0;

function makeAd(over: Partial<AnzeigeLike> = {}): AnzeigeLike {
    counter += 1;
    return {
        type: 'offer',
        subjects: ['Mathe'] as Subject[],
        grade_levels: ['10'],
        price_details: null,
        short_description: `Anzeige ${counter}`,
        created_at: new Date(Date.now() - counter * 1000).toISOString(),
        ...over,
    };
}

function makeFilter(over: Partial<AnzeigenFilter> = {}): AnzeigenFilter {
    return {
        query: '',
        type: 'all',
        subject: null,
        grades: [],
        minPrice: PRICE_SLIDER_MIN,
        maxPrice: PRICE_SLIDER_MAX,
        onlyCoaches: false,
        ...over,
    };
}

const withPrice = (p: unknown) => makeAd({ price_details: p as AnzeigeLike['price_details'] });

describe('Konstanten', () => {
    it('hält die Preis- und Sortier-Konstanten stabil', () => {
        expect(PRICE_SLIDER_MIN).toBe(0);
        expect(PRICE_SLIDER_MAX).toBe(30);
        expect(GRADE_VALUES).toEqual(['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2']);
        expect(SORT_KEYS).toEqual(['newest', 'oldest', 'cheapest', 'priciest', 'popular', 'saved']);
    });

    it('validiert Sortier-Keys', () => {
        expect(isValidSortKey('newest')).toBe(true);
        expect(isValidSortKey('cheapest')).toBe(true);
        expect(isValidSortKey('huhn')).toBe(false);
        expect(isValidSortKey(null)).toBe(false);
        expect(isValidSortKey(42)).toBe(false);
    });
});

describe('stundenpreis', () => {
    it('macht aus „free“ 0 €/h und lässt VB/unbekannt offen (null)', () => {
        expect(stundenpreis(withPrice(null))).toBeNull();
        expect(stundenpreis(withPrice({ mode: 'free' }))).toBe(0);
        expect(stundenpreis(withPrice({ mode: 'vb' }))).toBeNull();
    });

    it('rechnet Einheiten korrekt auf 60 Minuten um', () => {
        expect(stundenpreis(withPrice({ mode: 'fixed', value: 45, unit: '45min' }))).toBe(60);
        expect(stundenpreis(withPrice({ mode: 'fixed', value: 90, unit: '90min' }))).toBe(60);
        expect(stundenpreis(withPrice({ mode: 'fixed', value: 12, unit: '45min' }))).toBe(16);
        // Unbekannte Einheit: Altverhalten rechnet mit 60 Minuten.
        expect(stundenpreis(withPrice({ mode: 'fixed', value: 10, unit: '60min' }))).toBe(10);
    });

    it('verwirft ungültige Werte', () => {
        expect(stundenpreis(withPrice({ mode: 'fixed', value: 'abc', unit: '45min' }))).toBeNull();
        expect(stundenpreis(withPrice({ mode: 'fixed', value: -5, unit: '45min' }))).toBeNull();
        expect(stundenpreis(withPrice({ mode: 'fixed', unit: '45min' }))).toBeNull();
    });
});

describe('istGeboostet', () => {
    it('zählt nur laufende Boosts', () => {
        expect(istGeboostet(makeAd({ boosted: true, boosted_until: hoursFromNow(24) }))).toBe(true);
        expect(istGeboostet(makeAd({ boosted: true, boosted_until: hoursFromNow(-24) }))).toBe(false);
        expect(istGeboostet(makeAd({ boosted: true }))).toBe(false);
        expect(istGeboostet(makeAd({ boosted: false, boosted_until: hoursFromNow(24) }))).toBe(false);
    });
});

describe('istNachwuchsAngebot', () => {
    it('erkennt Angebote von Klasse 5/6 (mit Trim), unabhängig vom Fachvokabular', () => {
        expect(istNachwuchsAngebot(makeAd({ type: 'offer', profiles: { grade_level: '5' } }))).toBe(true);
        expect(istNachwuchsAngebot(makeAd({ type: 'offer', profiles: { grade_level: ' 6 ' } }))).toBe(true);
        expect(istNachwuchsAngebot(makeAd({ type: 'offer', profiles: { grade_level: '7' } }))).toBe(false);
        expect(istNachwuchsAngebot(makeAd({ type: 'offer' }))).toBe(false);
        expect(istNachwuchsAngebot(makeAd({ type: 'search', profiles: { grade_level: '5' } }))).toBe(false);
    });
});

describe('filtereAnzeigen', () => {
    const anna = makeAd({
        type: 'offer',
        subjects: ['mathematik'] as Subject[],
        grade_levels: ['10'],
        short_description: 'Algebra Nachhilfe',
        price_details: { mode: 'fixed', value: 10, unit: '45min' } as AnzeigeLike['price_details'],
        profiles: { display_name: 'Anna', is_coach: true },
    });
    const ben = makeAd({
        type: 'offer',
        subjects: ['englisch'] as Subject[],
        grade_levels: ['5'],
        short_description: 'Conversation Training',
        price_details: { mode: 'vb' } as AnzeigeLike['price_details'],
        profiles: { display_name: 'Ben' },
    });
    const cara = makeAd({
        type: 'search',
        subjects: ['mathematik'] as Subject[],
        grade_levels: ['10'],
        short_description: 'Suche Mathe-Hilfe',
        profiles: { display_name: 'Cara' },
    });
    const dora = makeAd({
        type: 'offer',
        subjects: ['physik'] as Subject[],
        grade_levels: ['EF'],
        short_description: 'Physik kompakt',
        price_details: { mode: 'fixed', value: 25, unit: '45min' } as AnzeigeLike['price_details'],
        profiles: { display_name: 'Dora' },
    });
    const emil = makeAd({
        type: 'offer',
        subjects: ['deutsch'] as Subject[],
        grade_levels: ['Q1'],
        short_description: 'Deutsch kostenlos',
        price_details: { mode: 'free' } as AnzeigeLike['price_details'],
        profiles: { display_name: 'Emil' },
    });
    const all = [anna, ben, cara, dora, emil];

    it('sucht über Beschreibung, Fächer und Anzeigename (case-insensitiv)', () => {
        expect(filtereAnzeigen(all, makeFilter({ query: 'algebra' }))).toEqual([anna]);
        expect(filtereAnzeigen(all, makeFilter({ query: 'MATHE' }))).toEqual([anna, cara]);
        expect(filtereAnzeigen(all, makeFilter({ query: 'cara' }))).toEqual([cara]);
        expect(filtereAnzeigen(all, makeFilter({ query: 'gibtsnicht' }))).toEqual([]);
    });

    it('filtert nach Typ, Fach und Klasse', () => {
        // maxPrice 100, um diese Dimensionen isoliert zu prüfen (Default-Limit ist 30).
        expect(filtereAnzeigen(all, makeFilter({ type: 'offer', maxPrice: 100 }))).toEqual([anna, ben, dora, emil]);
        expect(filtereAnzeigen(all, makeFilter({ type: 'search' }))).toEqual([cara]);
        expect(filtereAnzeigen(all, makeFilter({ subject: 'mathematik' as Subject }))).toEqual([anna, cara]);
        expect(filtereAnzeigen(all, makeFilter({ grades: ['5'] }))).toEqual([ben]);
        expect(filtereAnzeigen(all, makeFilter({ grades: ['EF', 'Q1'], maxPrice: 100 }))).toEqual([dora, emil]);
    });

    it('wendet den Preisfilter an: VB passiert immer, free zählt als 0 €/h', () => {
        // 5–15 €/h: Anna (13,33) und Ben (VB) und Cara (kein Preis) bleiben, Dora (33,33) fliegt raus.
        expect(filtereAnzeigen(all, makeFilter({ minPrice: 5, maxPrice: 15 }))).toEqual([anna, ben, cara]);
        // Default-Obergrenze 30: Dora (33,33) bleibt draußen, Emil (free = 0 €/h) fliegt bei Untergrenze 1 raus.
        expect(filtereAnzeigen(all, makeFilter({ minPrice: 1, maxPrice: 30 }))).toEqual([anna, ben, cara]);
    });

    it('filtert auf verifizierte Coaches', () => {
        expect(filtereAnzeigen(all, makeFilter({ onlyCoaches: true }))).toEqual([anna]);
    });

    it('kombiniert Filter wie der Feed', () => {
        expect(filtereAnzeigen(all, makeFilter({ query: 'nachhilfe', type: 'offer', grades: ['10'] }))).toEqual([anna]);
    });
});

describe('sortiereAnzeigen', () => {
    const options = (over: Partial<Parameters<typeof sortiereAnzeigen>[1]> = {}) => ({
        sortKey: 'newest' as const,
        filterByTime: false,
        myAvailability: emptyAvailability(),
        ...over,
    });

    it('schiebt laufende Boosts nach oben', () => {
        const newest = makeAd({ created_at: hoursFromNow(0) });
        const boosted = makeAd({ created_at: hoursFromNow(-48), boosted: true, boosted_until: hoursFromNow(1) });
        const oldest = makeAd({ created_at: hoursFromNow(-72) });
        expect(sortiereAnzeigen([oldest, newest, boosted], options())).toEqual([boosted, newest, oldest]);
    });

    it('schiebt Nachwuchs-Angebote (Klasse 5/6) nach unten', () => {
        const young = makeAd({ profiles: { grade_level: '5' }, created_at: hoursFromNow(0) });
        const a = makeAd({ created_at: hoursFromNow(-1) });
        const b = makeAd({ created_at: hoursFromNow(-2) });
        expect(sortiereAnzeigen([young, b, a], options())).toEqual([a, b, young]);
    });

    it('sortiert nach Preis mit unbekannten (VB) am Ende', () => {
        const cheap = withPrice({ mode: 'fixed', value: 10, unit: '45min' }); // 13,33 €/h
        const expensive = withPrice({ mode: 'fixed', value: 30, unit: '45min' }); // 40 €/h
        const vb = withPrice({ mode: 'vb' });
        expect(sortiereAnzeigen([expensive, vb, cheap], options({ sortKey: 'cheapest' }))).toEqual([cheap, expensive, vb]);
        expect(sortiereAnzeigen([cheap, vb, expensive], options({ sortKey: 'priciest' }))).toEqual([expensive, cheap, vb]);
    });

    it('sortiert nach Beliebtheit und Merkliste', () => {
        const low = makeAd({ view_count: 1, favorite_count: 2 });
        const high = makeAd({ view_count: 9, favorite_count: 7 });
        const mid = makeAd({ view_count: 4, favorite_count: 4 });
        expect(sortiereAnzeigen([low, high, mid], options({ sortKey: 'popular' }))).toEqual([high, mid, low]);
        expect(sortiereAnzeigen([low, high, mid], options({ sortKey: 'saved' }))).toEqual([high, mid, low]);
    });

    it('sortiert nach Datum und gewährt Coaches den offengelegten 24h-Frische-Bonus', () => {
        const a = makeAd({ created_at: hoursFromNow(-1) });
        const b = makeAd({ created_at: hoursFromNow(-2) });
        expect(sortiereAnzeigen([b, a], options({ sortKey: 'newest' }))).toEqual([a, b]);
        expect(sortiereAnzeigen([a, b], options({ sortKey: 'oldest' }))).toEqual([b, a]);

        const coachOlder = makeAd({ created_at: hoursFromNow(-23), profiles: { is_coach: true } });
        const workerNewer = makeAd({ created_at: hoursFromNow(-10) });
        expect(sortiereAnzeigen([workerNewer, coachOlder], options({ sortKey: 'newest' }))).toEqual([coachOlder, workerNewer]);
    });

    it('sortiert bei aktivem Zeitfilter nach Überschneidung (+0,5 Coach-Bonus)', () => {
        const my = { ...emptyAvailability(), mon: ['08:00', '09:00', '10:00'] } as Availability;
        const x = makeAd({ profiles_avail: { ...emptyAvailability(), mon: ['08:00', '09:00'] } }); // 2 Treffer
        const y = makeAd({ profiles: { is_coach: true }, profiles_avail: { ...emptyAvailability(), mon: ['08:00'] } }); // 1,5
        const z = makeAd({ profiles_avail: { ...emptyAvailability(), mon: ['08:00'] } }); // 1
        expect(sortiereAnzeigen([z, y, x], options({ filterByTime: true, myAvailability: my }))).toEqual([x, y, z]);
    });
});

describe('parseGespeicherteSuche', () => {
    const valid = {
        query: 'mathe',
        type: 'offer',
        subject: 'mathematik',
        grades: ['5', '5', 'EF'],
        minPrice: 5,
        maxPrice: 20,
        onlyCoaches: true,
        filterByTime: false,
        sortKey: 'cheapest',
    };

    it('akzeptiert gültige Stände und normalisiert sie', () => {
        expect(parseGespeicherteSuche(valid)).toEqual({
            ...valid,
            grades: ['5', 'EF'],
        });
    });

    it('fällt bei unbekanntem sortKey auf „newest“ zurück', () => {
        expect(parseGespeicherteSuche({ ...valid, sortKey: 'huhn' })?.sortKey).toBe('newest');
    });

    it('lehnt kaputte oder unvollständige Stände ab', () => {
        expect(parseGespeicherteSuche(null)).toBeNull();
        expect(parseGespeicherteSuche('mathe')).toBeNull();
        expect(parseGespeicherteSuche([])).toBeNull();
        expect(parseGespeicherteSuche({})).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, type: 'both' })).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, subject: 'Quatsch' })).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, grades: ['11'] })).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, grades: [5] })).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, minPrice: 5.5 })).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, minPrice: 20, maxPrice: 5 })).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, minPrice: -1 })).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, maxPrice: 31 })).toBeNull();
        expect(parseGespeicherteSuche({ ...valid, onlyCoaches: 'ja' })).toBeNull();
    });
});

describe('gespeicherte Suche auf dem Gerät', () => {
    const entry: SavedSearch = {
        query: 'mathe',
        type: 'offer',
        subject: 'mathematik' as Subject,
        grades: ['5', 'EF'],
        minPrice: 5,
        maxPrice: 20,
        onlyCoaches: true,
        filterByTime: false,
        sortKey: 'cheapest',
    };

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('speichert, liest und verwirft über localStorage', () => {
        const store = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { store.set(k, String(v)); },
            removeItem: (k: string) => { store.delete(k); },
        });

        expect(ladeGespeicherteSuche()).toBeNull();
        expect(speichereGespeicherteSuche(entry)).toBe(true);
        expect(store.get(SAVED_SEARCH_KEY)).toBeTruthy();
        expect(ladeGespeicherteSuche()).toEqual(entry);
        expect(verwerfeGespeicherteSuche()).toBe(true);
        expect(ladeGespeicherteSuche()).toBeNull();
    });

    it('meldet Fehler statt zu werfen', () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); },
            removeItem: () => { throw new Error('blocked'); },
        });

        expect(ladeGespeicherteSuche()).toBeNull();
        expect(speichereGespeicherteSuche(entry)).toBe(false);
        expect(verwerfeGespeicherteSuche()).toBe(false);
    });
});
