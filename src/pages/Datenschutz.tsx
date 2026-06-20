import { ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function Datenschutz() {
    const navigate = useNavigate();
    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 pl-0">
                <ChevronLeft className="mr-2" size={20} /> Zurück
            </Button>
            <h1 className="text-4xl font-black mb-8 tracking-tight">Datenschutzerklärung</h1>
            <div className="space-y-8 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">1. Datenschutz auf einen Blick</h2>
                    <p className="leading-relaxed">
                        Diese Anwendung ist ein schulinternes Projekt für das Friedrich-Wilhelms-Gymnasium Köln. Wir nehmen den Schutz deiner persönlichen Daten sehr ernst. Wir behandeln deine personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">2. Datenerfassung auf dieser Website</h2>
                    <h3 className="text-lg font-bold mt-4 mb-2 text-black dark:text-white">Wer ist verantwortlich für die Datenerfassung?</h3>
                    <p className="leading-relaxed">
                        Die Datenverarbeitung auf dieser Website erfolgt durch die Schülervertretung des FWG Köln. Die Kontaktdaten können dem Impressum entnommen werden.
                    </p>
                    <h3 className="text-lg font-bold mt-4 mb-2 text-black dark:text-white">Welche Daten erfassen wir?</h3>
                    <ul className="list-disc pl-5 mt-2 space-y-2 leading-relaxed">
                        <li><strong>Account-Daten:</strong> E-Mail-Adresse und ein verschlüsseltes Passwort bei der Registrierung.</li>
                        <li><strong>Profil-Informationen:</strong> Freiwillige Angaben wie dein Vor- und Nachname, Klasse, Telefonnummer, Moodle-Name oder andere Kontaktmöglichkeiten (z.B. Discord).</li>
                        <li><strong>Anzeigen & Chat:</strong> Inhalte deiner erstellten Nachhilfe-Angebote oder Gesuche sowie Nachrichten, die du über die App versendest.</li>
                        <li><strong>Technische Daten:</strong> Automatisch durch Supabase erfasste Server-Logfiles (z.B. IP-Adresse anonymisiert, Zugriffszeit, Browsertyp) zur Aufrechterhaltung der Sicherheit.</li>
                    </ul>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">3. Sichtbarkeit & Zugriffsrechte</h2>
                    <p className="leading-relaxed">
                        Deine Kontaktdaten sind standardmäßig <strong>unsichtbar</strong> für alle anderen Nutzer. Erst wenn du in den Einstellungen die Sichtbarkeit aktivierst oder eine Anfrage akzeptierst, werden die Daten für den jeweiligen Kontaktpartner sichtbar. Das SV-Admin-Team hat Zugriff auf Profile und Anzeigen (inklusive Meldungen), um die Sicherheit der Community zu gewährleisten und bei Missbrauch eingreifen zu können.
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">4. Hosting & Backend</h2>
                    <p className="leading-relaxed">
                        Diese Anwendung nutzt <strong>Supabase</strong> als Backend-as-a-Service (BaaS) für Datenbank, Authentifizierung und Storage. Die Daten werden sicher in Rechenzentren innerhalb der Europäischen Union (Hosting in Deutschland, z.B. über AWS Frankfurt) gespeichert. Mit dem Anbieter wurde ein Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO geschlossen, um den Schutz deiner Daten sicherzustellen.
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">5. Deine Rechte (Auskunft, Löschung, Sperrung)</h2>
                    <p className="leading-relaxed">
                        Du hast im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema Datenschutz kannst du dich jederzeit über die im Impressum angegebene Adresse an uns wenden. Alternativ kannst du die Löschung deines Accounts auch direkt im SV-Panel beantragen.
                    </p>
                </section>
            </div>
            <div className="mt-12 text-sm text-gray-500 text-center font-medium">
                &copy; {new Date().getFullYear()} Schülervertretung Friedrich-Wilhelms-Gymnasium Köln.
            </div>
        </div>
    );
}
