import { describe, expect, it } from 'vitest';

import {
    MAX_AD_CUSTOM_LOCATION_LENGTH,
    MAX_AD_LOCATIONS,
    splitAdLocations,
} from '../src/lib/ad-locations';

const PRESETS = new Set(['Bibliothek', 'Online', 'Mensa']);

describe('splitAdLocations', () => {
    it('trennt Presets von eigenen Orten', () => {
        const result = splitAdLocations(
            ['Bibliothek', 'Stadtbibliothek am Neumarkt', 'Online'],
            [],
            '',
            PRESETS
        );

        expect(result.locations).toEqual(['Bibliothek', 'Online']);
        expect(result.custom_locations).toEqual(['Stadtbibliothek am Neumarkt']);
    });

    it('migriert alte Draft-/Anzeigendaten aus locations und custom_location', () => {
        const draftFormData = {
            locations: ['Bibliothek', 'Alte Bibliothek', 'Café Extrablatt'],
            custom_location: 'Alte Bibliothek',
        };

        const result = splitAdLocations(
            draftFormData.locations,
            [],
            draftFormData.custom_location,
            PRESETS
        );

        expect(result.locations).toEqual(['Bibliothek']);
        expect(result.custom_locations).toEqual(['Alte Bibliothek', 'Café Extrablatt']);
    });

    it('führt custom_locations und legacy custom_location ohne Duplikate zusammen', () => {
        const result = splitAdLocations(
            ['Online'],
            ['Café Extrablatt', 'Online'],
            'Café Extrablatt',
            PRESETS
        );

        expect(result.locations).toEqual(['Online']);
        expect(result.custom_locations).toEqual(['Café Extrablatt']);
    });

    it('begrenzt auf 10 Orte', () => {
        const rawLocations = Array.from({ length: 12 }, (_, i) => `Ort ${i + 1}`);
        const result = splitAdLocations(rawLocations, [], '', PRESETS);

        expect(result.locations).toEqual([]);
        expect(result.custom_locations).toHaveLength(MAX_AD_LOCATIONS);
        expect(result.custom_locations[0]).toBe('Ort 1');
        expect(result.custom_locations.at(-1)).toBe('Ort 10');
    });

    it('kürzt einen sehr langen Ort auf 120 Zeichen', () => {
        const longLocation = 'x'.repeat(150);
        const result = splitAdLocations([longLocation], [], '', PRESETS);

        expect(result.custom_locations).toHaveLength(1);
        expect(result.custom_locations[0]).toHaveLength(MAX_AD_CUSTOM_LOCATION_LENGTH);
        expect(result.custom_locations[0]).toBe('x'.repeat(120));
    });

    it('ignoriert leere und nicht-string-Werte', () => {
        const result = splitAdLocations(
            ['  Bibliothek  ', '', null, 42, '   '],
            undefined,
            '',
            PRESETS
        );

        expect(result.locations).toEqual(['Bibliothek']);
        expect(result.custom_locations).toEqual([]);
    });
});
