// ==============================================================================
// FWG Nachhilfebörse — Zentrale Kontaktadressen (eine Stelle für alle E-Mails)
// Domain sv-fwg.de: SV-Organisation · Domain nachhilfe-sv.de: Plattform-Betrieb
// ==============================================================================

export const CONTACT_EMAILS = {
    /** SV-Organisation, Impressum, Datenschutz, allgemeine SV-Anliegen */
    svInfo: 'info@sv-fwg.de',
    /** Allgemeine Hilfe, Fragen, Widersprüche (Nutzungsbedingungen), Eltern */
    support: 'support@nachhilfe-sv.de',
    /** Meldungen, Moderation, Missbrauch, Verifizierung, Filter-Fehlalarme */
    sicherheit: 'sicherheit@nachhilfe-sv.de',
    /** Schüler-Coaching AG (Fr. Balistreri, Hr. Schulz, Hr. Steinberg) */
    coaching: 'coaching@nachhilfe-sv.de',
    /** Bugs & technische Probleme */
    technik: 'technik@nachhilfe-sv.de',
} as const;

export function mailtoLink(email: string): string {
    return `mailto:${email}`;
}
