// ==============================================================================
// FWG Nachhilfebörse — Zentrale Kontaktadressen (eine Stelle für alle E-Mails)
// Domain sv-fwg.de: NUR SV-Organisation · Domain nachhilfe-sv.de: Plattform-Betrieb
// Schul-Adresse: Coaching läuft über Fr. Balistreri (kein eigenes Postfach nötig)
// ==============================================================================

export const CONTACT_EMAILS = {
    /** NUR SV-Organisation, Impressum, Datenschutz (Verantwortlicher) */
    svInfo: 'info@sv-fwg.de',
    /** General-Mail Börse (NEU anzulegen): Hilfe, Fragen, Widerspruch, Löschung, Meldungen, Eltern */
    general: 'info@nachhilfe-sv.de',
    /** Versand-Adresse (NEU anzulegen, Weiterleitung genügt): Absender automatischer Mails */
    noreply: 'noreply@nachhilfe-sv.de',
    /** Schüler-Coaching AG: Fr. Balistreri (Schul-Adresse, kein Börsen-Postfach) */
    coaching: 'Rosalia.Balistreri@fwg-koeln.nrw.schule',
    /** Bugs & technische Probleme */
    technik: 'technik@nachhilfe-sv.de',
} as const;

export function mailtoLink(email: string): string {
    return `mailto:${email}`;
}
