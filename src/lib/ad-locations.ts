// Reine Orts-Normalisierung für Anzeigen. Bewusst ohne React-/DOM-Abhängigkeit,
// damit Draft-Migration und Legacy-Daten direkt testbar sind.

export const MAX_AD_LOCATIONS = 10;
export const MAX_AD_CUSTOM_LOCATION_LENGTH = 120;

export interface SplitAdLocationsResult {
    locations: string[];
    custom_locations: string[];
}

/**
 * Teilt alte und neue Ortsdaten in Presets und eigene Orte. Alte Anzeigen und
 * Drafts können eigene Orte sowohl in `locations` (früher zusammengeführt) als
 * auch im Einzelwert `custom_location` tragen; beides wird hier vereinigt.
 */
export function splitAdLocations(
    rawLocations: unknown,
    rawCustomLocations: unknown = [],
    legacyCustomLocation: unknown = '',
    presetLocations: ReadonlySet<string> = new Set<string>(),
    maxLocations: number = MAX_AD_LOCATIONS,
    maxCustomLength: number = MAX_AD_CUSTOM_LOCATION_LENGTH
): SplitAdLocationsResult {
    const locations: string[] = [];
    const customLocations: string[] = [];

    const add = (value: unknown) => {
        if (typeof value !== 'string') return;
        const clean = value.trim().slice(0, maxCustomLength);
        if (!clean) return;
        if (locations.length + customLocations.length >= maxLocations) return;
        if (presetLocations.has(clean)) {
            if (!locations.includes(clean)) locations.push(clean);
            return;
        }
        if (!customLocations.includes(clean) && !locations.includes(clean)) {
            customLocations.push(clean);
        }
    };

    if (Array.isArray(rawLocations)) rawLocations.forEach(add);
    if (Array.isArray(rawCustomLocations)) rawCustomLocations.forEach(add);
    add(legacyCustomLocation);

    return { locations, custom_locations: customLocations };
}
