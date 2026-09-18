import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">{children}</div>
        </div>
    );
}

export default function Datenschutz() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>

                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary-hover">
                        <ShieldCheck size={14} /> Rechtliches
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Datenschutzerklärung</h1>
                    <p className="text-gray-500 dark:text-gray-400">Stand: September 2026 · Informationen nach Art. 13 DSGVO</p>
                </div>

                <Section title="1. Wer ist verantwortlich?">
                    <p>
                        Schülervertretung (SV) des Friedrich-Wilhelms-Gymnasiums Köln,
                        Severinstraße 241, 50676 Köln ·{' '}
                        <a href="mailto:info@sv-fwg.de" className="font-bold text-primary hover:underline">info@sv-fwg.de</a>
                    </p>
                    <p>
                        Die Nachhilfebörse ist ein nicht-kommerzielles Schülerprojekt. Bei Fragen zum
                        Datenschutz wende dich an das SV-Team oder nutze die Support-Funktion in der App.
                    </p>
                </Section>

                <Section title="2. Welche Daten verarbeiten wir – und wofür?">
                    <p><strong>Registrierung & Account (Art. 6 Abs. 1 lit. b DSGVO – Vertrag):</strong> E-Mail-Adresse, selbst gewählter Name, Rolle (Schüler/in, Elternteil), Klassenstufe und Geburtsdatum (zur Prüfung der Alters- und Schulregeln). Das Passwort wird ausschließlich als sicherer Hash gespeichert – im Klartext kennt es niemand.</p>
                    <p><strong>Profil & Anzeigen (Art. 6 Abs. 1 lit. b DSGVO):</strong> Alle Angaben, die du freiwillig in Profil und Anzeigen einträgst (Fächer, Beschreibung, Preise, Verfügbarkeiten, Profilbild). Anzeigen sind für alle angemeldeten Nutzer sichtbar.</p>
                    <p><strong>Nachrichten & Anfragen (Art. 6 Abs. 1 lit. b DSGVO):</strong> Chat-Nachrichten und Anfragen zwischen Nutzern, damit die Vermittlung funktioniert.</p>
                    <p><strong>Verifizierung & Sicherheit (Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse am Schutz Minderjähriger):</strong> Verifizierungsstatus, Sperrstatus bei Regelverstößen sowie ein Protokoll von Moderationsmaßnahmen (wer wurde wann von wem aus welchem Grund verwarnt/gesperrt).</p>
                    <p><strong>Anonyme Nutzungsstatistik (Art. 6 Abs. 1 lit. f DSGVO):</strong> Wir erfassen in anonymisierter Form, welche Seiten aufgerufen werden (Seitenpfad, Gerätetyp, Browser, Uhrzeit), um die App zu verbessern. Es werden <strong>keine IP-Adressen gespeichert</strong>, keine Cookies zu Analysezwecken gesetzt und <strong>keine externen Analyse- oder Werbedienste</strong> (z. B. Google Analytics) eingesetzt.</p>
                    <p><strong>Technisch notwendige Speicherung:</strong> Anmeldestatus und Einstellungen (z. B. Theme, Cookie-Entscheidung) werden lokal in deinem Browser (Local Storage) abgelegt. Das ist für den Betrieb erforderlich; eine Einwilligung ist dafür nach § 25 Abs. 2 TDDDG nicht nötig.</p>
                </Section>

                <Section title="3. Kinder und Jugendliche">
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
                        <a href="mailto:info@sv-fwg.de" className="font-bold text-primary hover:underline">info@sv-fwg.de</a>.
                        Nach dem Widerruf wird der Account des Kindes deaktiviert.
                    </p>
                </Section>

                <Section title="4. Wer bekommt die Daten? Wo liegen sie?">
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

                <Section title="5. Wie lange speichern wir Daten?">
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Accounts & Inhalte:</strong> solange dein Account besteht. Inaktive Anzeigen kannst du selbst löschen.</li>
                        <li><strong>Nach Account-Löschung:</strong> Wir löschen Profil, Anzeigen und Nachrichten oder anonymisieren sie, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Moderationsprotokolle (Sperren, Verwarnungen) bewahren wir zum Schutz der Community noch <strong>12 Monate</strong> auf und löschen sie danach.</li>
                        <li><strong>Anonyme Statistik:</strong> aggregierte Aufrufzahlen ohne Personenbezug, unbefristet (kein Personenbezug, daher kein Löschanspruch).</li>
                    </ul>
                </Section>

                <Section title="6. Deine Rechte">
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
                        <a href="mailto:info@sv-fwg.de" className="font-bold text-primary hover:underline">info@sv-fwg.de</a>{' '}
                        – wir bestätigen die Löschung innerhalb von 14 Tagen.
                    </p>
                    <p>
                        Außerdem hast du das Recht auf Beschwerde bei einer Aufsichtsbehörde – für uns zuständig:{' '}
                        <strong>Landesbeauftragte für Datenschutz und Informationsfreiheit NRW (LDI NRW)</strong>, Kavalleriestr. 2–4, 40213 Düsseldorf.
                    </p>
                </Section>

                <Section title="7. Datensicherheit">
                    <p>
                        Die Übertragung erfolgt verschlüsselt (HTTPS). Passwörter werden gehasht gespeichert,
                        Zugriffe auf Verwaltungsfunktionen sind auf das SV-Team beschränkt und werden
                        protokolliert. Absolute Sicherheit im Internet gibt es nicht – bei Verdacht auf
                        Missbrauch deines Accounts melde dich sofort bei uns.
                    </p>
                </Section>

                <div className="text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln
                </div>
            </div>
        </div>
    );
}
