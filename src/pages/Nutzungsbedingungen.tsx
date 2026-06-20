import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function Nutzungsbedingungen() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-4 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>

                <h1 className="text-3xl font-bold mb-8 tracking-tight">Nutzungsbedingungen</h1>
                
                <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
                    <p>
                        Willkommen bei der Nachhilfebörse des Friedrich-Wilhelms-Gymnasiums. Mit der Erstellung eines Accounts und der Nutzung dieser Plattform stimmst du den folgenden Nutzungsbedingungen zu.
                    </p>

                    <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">1. Geltungsbereich und Zielgruppe</h2>
                    <p>
                        Diese Plattform richtet sich ausschließlich an Schülerinnen und Schüler des Friedrich-Wilhelms-Gymnasiums (FWG) Köln. Die Nutzung durch schulfremde Personen ist untersagt. Die Plattform dient der Vermittlung von Nachhilfe und Lerncoaching.
                    </p>

                    <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">2. Registrierung und Verifizierung</h2>
                    <p>
                        Um Anzeigen zu erstellen oder Anfragen zu versenden, ist ein Account erforderlich. 
                        Nach der Registrierung muss der Account durch das SV-Team verifiziert werden (entweder durch persönliches Erscheinen im SV-Raum oder durch Angabe der korrekten Klasse/Moodle-Identifikation). 
                        Du verpflichtest dich, bei der Registrierung wahrheitsgemäße Angaben zu machen.
                    </p>

                    <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">3. Verhaltensregeln und Chat-Nutzung</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Ein respektvoller Umgang ist Grundvoraussetzung. Beleidigungen, Mobbing oder diskriminierende Äußerungen werden nicht toleriert.</li>
                        <li>Das integrierte Chat-System verfügt über einen automatisierten Filter für unangemessene Sprache. Bei wiederholten Verstößen behalten wir uns vor, Accounts zu sperren.</li>
                        <li>Die Chat-Funktion darf ausschließlich für die Absprache von Nachhilfestunden genutzt werden.</li>
                        <li>Die SV hat im Falle von Meldungen (Reports) das Recht, Chat-Protokolle einzusehen, um Konflikte zu klären und die Sicherheit der Nutzer zu gewährleisten.</li>
                    </ul>

                    <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">4. Haftungsausschluss</h2>
                    <p>
                        Die Nachhilfebörse und das SV-Team stellen lediglich die technische Plattform zur Verfügung. 
                        Wir übernehmen keine Garantie für die Qualität der Nachhilfe, die Zuverlässigkeit der Nutzer oder die erfolgreiche Notenverbesserung. 
                        Absprachen (inkl. Bezahlung bei "VB") finden ausschließlich zwischen den Nutzern bzw. deren Erziehungsberechtigten statt.
                    </p>

                    <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">5. Datenschutz</h2>
                    <p>
                        Der Schutz deiner Daten ist uns wichtig. Details zur Erhebung und Verarbeitung deiner Daten findest du in unserer <a href="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</a>. 
                        Bitte sei sparsam mit privaten Kontaktdaten (Telefonnummer) und teile diese erst, wenn du dem Gegenüber vertraust.
                    </p>

                    <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">6. Sperrung und Löschung von Accounts</h2>
                    <p>
                        Das Administrations-Team behält sich vor, Accounts, die gegen diese Nutzungsbedingungen verstoßen, ohne Vorwarnung temporär oder permanent zu sperren. 
                        Nutzer können jederzeit die Löschung ihres Accounts beantragen.
                    </p>
                    
                    <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                        Stand: {new Date().toLocaleDateString('de-DE')}
                    </div>
                </div>
            </div>
        </div>
    );
}
