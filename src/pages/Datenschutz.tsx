import StaticLayout from '../components/StaticLayout';

function scrollToId(id: string) {
    // Hinweis: Die App nutzt einen HashRouter (Routen wie #/datenschutz).
    // Ein klassischer Anker-Link (href="#d1") würde den Hash ersetzen und damit
    // die Route zerstören (= 404-Seite). Deshalb scrollen wir per Button + DOM.
    const el = document.getElementById(id);
    const reduce = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const headingId = `${id}-heading`;
    return (
        <section id={id} aria-labelledby={headingId} className="scroll-mt-24 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3">
            <h2 id={headingId} className="font-bold text-lg text-gray-900 dark:text-white">{title}</h2>
            <div className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 flex flex-col gap-2">{children}</div>
        </section>
    );
}

const toc = [
    { id: 'd1', label: '1. Wer ist verantwortlich?' },
    { id: 'd2', label: '2. Welche Daten und wofür?' },
    { id: 'd3', label: '3. Kinder und Jugendliche' },
    { id: 'd4', label: '4. Wer bekommt die Daten? Wo liegen sie?' },
    { id: 'd5', label: '5. Wie lange speichern wir Daten?' },
    { id: 'd6', label: '6. Deine Rechte' },
    { id: 'd7', label: '7. Datensicherheit' },
];

export default function Datenschutz() {
    return (
        <StaticLayout
            title="Datenschutzerklärung"
            intro="Stand: September 2026 · Betreiber: SV FWG Köln."
        >
            {/* Sektions-Rhythmus wie Nutzungsbedingungen: Einheiten eng (gap-4/5), Sektionen weit (gap-10/12). */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 min-w-0 flex flex-col gap-10 sm:gap-12">
                {/* Leseeinheit 1: Zusammenfassung + Inhaltsübersicht gehören zusammen. */}
                <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                <section aria-labelledby="datenschutz-tldr" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3">
                    <h2 id="datenschutz-tldr" className="font-bold text-lg text-gray-900 dark:text-white">TL;DR: kurz und einfach gesagt</h2>
                    <div className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 flex flex-col gap-2">
                        <p>
                            Deine Daten gehören dir. Wir speichern nur, was die App zum Laufen braucht
                            (Account, Anzeigen, Nachrichten). Wir verkaufen nichts, wir tracken nicht,
                            es gibt keine Werbung und keine Weitergabe an Dritte.
                        </p>
                        <p>
                            Deine <strong>E-Mail-Adresse und dein Geburtsdatum sehen andere Nutzer nie</strong>.
                            Du kannst jederzeit Auskunft, Korrektur oder Löschung verlangen – schreib uns
                            einfach (siehe unten: „Was du jetzt tun kannst“).
                        </p>
                        <p className="text-sm">
                            Die ausführlichen Informationen nach Art. 13 DSGVO findest du in den Abschnitten unten.
                        </p>
                    </div>
                </section>

                <nav aria-label="Inhaltsübersicht" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3">
                    <h2 className="font-bold text-lg text-gray-900 dark:text-white">Inhalt</h2>
                    <ol className="grid gap-1 sm:grid-cols-2 text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                        {toc.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => scrollToId(item.id)}
                                    className="flex min-h-[44px] w-full items-center rounded-xl px-3 py-2.5 text-left font-semibold text-amber-700 hover:bg-amber-50 hover:underline dark:text-primary dark:hover:bg-white/5"
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ol>
                </nav>
                </div>

                {/* Leseeinheit 2: die Abschnitte d1–d7 als fortlaufendes Kapitel (eng), CTA danach separat (weit). */}
                <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                <Section id="d1" title="1. Wer ist verantwortlich?">
                    <p>
                        Schülervertretung (SV) des Friedrich-Wilhelm-Gymnasiums Köln,
                        Severinstraße 241, 50676 Köln ·{' '}
                        <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a>
                    </p>
                    <p>
                        Die Nachhilfebörse ist ein nicht-kommerzielles Schülerprojekt. Bei Fragen zum
                        Datenschutz wende dich an das SV-Team oder nutze die Support-Funktion in der App.
                    </p>
                </Section>

                <Section id="d2" title="2. Welche Daten verarbeiten wir – und wofür?">
                    <p><strong>Registrierung & Account (Art. 6 Abs. 1 lit. b DSGVO (Vertrag)):</strong> E-Mail-Adresse, selbst gewählter Name, Rolle (Schüler/in, Elternteil), Klassenstufe und Geburtsdatum (zur Prüfung der Alters- und Schulregeln). Das Passwort wird ausschließlich als sicherer Hash gespeichert – im Klartext kennt es niemand.</p>
                    <p><strong>Profil & Anzeigen (Art. 6 Abs. 1 lit. b DSGVO):</strong> Alle Angaben, die du freiwillig in Profil und Anzeigen einträgst (Fächer, Beschreibung, Preise, Verfügbarkeiten, Profilbild). Anzeigen sind für alle angemeldeten Nutzer sichtbar.</p>
                    <p><strong>Nachrichten & Anfragen (Art. 6 Abs. 1 lit. b DSGVO):</strong> Chat-Nachrichten und Anfragen zwischen Nutzern, damit die Vermittlung funktioniert.</p>
                    <p><strong>Verifizierung & Sicherheit (Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am Schutz Minderjähriger)):</strong> Verifizierungsstatus, Sperrstatus bei Regelverstößen sowie ein Protokoll von Moderationsmaßnahmen (wer wurde wann von wem aus welchem Grund verwarnt/gesperrt).</p>
                    <p><strong>Anonyme Nutzungsstatistik (Art. 6 Abs. 1 lit. f DSGVO):</strong> Wir erfassen in anonymisierter Form, welche Seiten aufgerufen werden (Seitenpfad, Gerätetyp, Browser, Uhrzeit), um die App zu verbessern. Es werden <strong>keine IP-Adressen gespeichert</strong>, keine Cookies zu Analysezwecken gesetzt und <strong>keine externen Analyse- oder Werbedienste</strong> (z. B. Google Analytics) eingesetzt.</p>
                    <p><strong>Technisch notwendige Speicherung:</strong> Anmeldestatus und Einstellungen (z. B. Theme, Hinweis-Status) werden lokal in deinem Browser (Local Storage) abgelegt. Das ist für den Betrieb erforderlich; eine Einwilligung ist dafür nach § 25 Abs. 2 TDDDG nicht nötig.</p>
                </Section>

                <Section id="d3" title="3. Kinder und Jugendliche">
                    <p>
                        Unsere Plattform richtet sich an Schülerinnen und Schüler des FWG sowie deren Eltern.
                        Für Nutzerinnen und Nutzer <strong>unter 16 Jahren</strong> holen wir im Rahmen der
                        Registrierung die <strong>Einwilligung der Eltern</strong> ein (Art. 8 DSGVO):
                        Ohne bestätigte Eltern-E-Mail bleibt der Account eingeschränkt (keine Anzeigenerstellung,
                        keine Kontaktaufnahme), bis ein Elternteil zugestimmt hat.
                    </p>
                    <p>
                        Eltern können verknüpfte Kinder-Accounts einsehen und die Einwilligung jederzeit
                        mit Wirkung für die Zukunft widerrufen – wende dich dazu an{' '}
                        <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a>.
                        Nach dem Widerruf wird der Account des Kindes deaktiviert.
                    </p>
                </Section>

                <Section id="d4" title="4. Wer bekommt die Daten? Wo liegen sie?">
                    <p>
                        Die Daten liegen auf Servern unseres Hosting-Dienstleisters <strong>ALL-INKL.COM</strong> (ALL-INKL.COM – Neue Medien Münnich, Hauptstraße 68, 02742 Friedersdorf, Deutschland) in Deutschland und werden dort in einer Datenbank verarbeitet (Auftragsverarbeitung nach Art. 28 DSGVO).
                    </p>
                    <p>
                        Eine Weitergabe an Dritte findet nicht statt – außer, wenn wir gesetzlich dazu
                        verpflichtet sind (z. B. gegenüber Strafverfolgungsbehörden) oder du ausdrücklich
                        eingewilligt hast. Es findet <strong>kein Verkauf</strong> von Daten und <strong>keine
                        Übermittlung in Drittländer</strong> außerhalb der EU statt.
                    </p>
                    <p>
                        Innerhalb der App sehen andere angemeldete Nutzer deine Anzeigen und dein Profil
                        (Name, Klassenstufe, Fächer, Beschreibung). Deine <strong>E-Mail-Adresse und dein
                        Geburtsdatum bleiben immer privat</strong> und werden anderen Nutzern nie angezeigt.
                    </p>
                </Section>

                <Section id="d5" title="5. Wie lange speichern wir Daten?">
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Accounts & Inhalte:</strong> solange dein Account besteht. Inaktive Anzeigen kannst du selbst löschen.</li>
                        <li><strong>Nach Account-Löschung:</strong> Wir löschen Profil, Anzeigen und Nachrichten oder anonymisieren sie, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Moderationsprotokolle (Sperren, Verwarnungen) bewahren wir zum Schutz der Community noch <strong>12 Monate</strong> auf und löschen sie danach.</li>
                        <li><strong>Anonyme Statistik:</strong> aggregierte Aufrufzahlen ohne Personenbezug, unbefristet (kein Personenbezug, daher kein Löschanspruch).</li>
                    </ul>
                </Section>

                <Section id="d6" title="6. Deine Rechte">
                    <p>
                        Du hast das Recht auf <strong>Auskunft</strong> (Art. 15), <strong>Berichtigung</strong> (Art. 16),{' '}
                        <strong>Löschung</strong> (Art. 17), <strong>Einschränkung</strong> (Art. 18),{' '}
                        <strong>Datenübertragbarkeit</strong> (Art. 20) sowie <strong>Widerspruch</strong> gegen
                        Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO).
                    </p>
                    <p>
                        Profil und Anzeigen kannst du in der App unter „Profil“ bzw. „Meine Anzeigen“ selbst
                        verwalten. Die <strong>vollständige Löschung deines Accounts</strong> beantragst du
                        über ein Support-Ticket in der App oder per E-Mail an{' '}
                        <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a>{' '}
                        – wir bestätigen die Löschung innerhalb von 14 Tagen.
                    </p>
                    <p>
                        Außerdem hast du das Recht auf Beschwerde bei einer Aufsichtsbehörde – für uns zuständig:{' '}
                        <strong>Landesbeauftragte für Datenschutz und Informationsfreiheit NRW (LDI NRW)</strong>, Kavalleriestr. 2–4, 40213 Düsseldorf.
                    </p>
                </Section>

                <Section id="d7" title="7. Datensicherheit">
                    <p>
                        Die Übertragung erfolgt verschlüsselt (HTTPS). Passwörter werden gehasht gespeichert,
                        Zugriffe auf Verwaltungsfunktionen sind auf das SV-Team beschränkt und werden
                        protokolliert. Absolute Sicherheit im Internet gibt es nicht – bei Verdacht auf
                        Missbrauch deines Accounts melde dich sofort bei uns.
                    </p>
                </Section>
                </div>

                <section aria-labelledby="datenschutz-handeln" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3">
                    <h2 id="datenschutz-handeln" className="font-bold text-lg text-gray-900 dark:text-white">Was du jetzt tun kannst</h2>
                    <ul className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 list-disc pl-4 space-y-1">
                        <li><strong>Support-Ticket in der App</strong> erstellen, für Auskunft, Korrektur oder Löschung deines Accounts.</li>
                        <li><strong>E-Mail schreiben</strong> an <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a> – wir antworten und bestätigen Löschungen innerhalb von 14 Tagen.</li>
                        <li><strong>Beschwerde einreichen</strong> bei der LDI NRW (Kavalleriestr. 2–4, 40213 Düsseldorf), wenn du mit unserer Antwort nicht zufrieden bist.</li>
                    </ul>
                </section>
            </div>
        </StaticLayout>
    );
}
