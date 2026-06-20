import { ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function Cookies() {
    const navigate = useNavigate();
    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 pl-0">
                <ChevronLeft className="mr-2" size={20} /> Zurück
            </Button>
            <h1 className="text-4xl font-black mb-8 tracking-tight">Cookie-Richtlinie</h1>
            <div className="space-y-8 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Keine Tracking-Cookies</h2>
                    <p className="leading-relaxed">
                        Wir freuen uns, dir mitteilen zu können: <strong>Die Nachhilfebörse verwendet keine Tracking-, Analyse- oder Werbe-Cookies.</strong> Wir verzichten vollständig auf Tools wie Google Analytics, Facebook Pixel oder ähnliche Dienste.
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Technisch notwendige Speicherung</h2>
                    <p className="leading-relaxed">
                        Um die Kernfunktionen dieser Anwendung bereitzustellen, nutzen wir den sicheren, lokalen Speicher deines Browsers (Local Storage / Session Storage). Diese Daten werden nicht an Dritte weitergegeben und dienen ausschließlich dem Betrieb der App.
                    </p>
                    <ul className="list-disc pl-5 mt-4 space-y-3 leading-relaxed">
                        <li><strong>Authentifizierung (Tokens):</strong> Speicherung deiner sicheren Login-Token von Supabase. Dies ermöglicht es dir, angemeldet zu bleiben, ohne bei jedem Klick dein Passwort erneut eingeben zu müssen.</li>
                        <li><strong>Theme-Präferenz:</strong> Speicherung deiner Auswahl für den Dark Mode oder Light Mode, damit die App bei deinem nächsten Besuch direkt in deinem bevorzugten Design lädt.</li>
                        <li><strong>Zustimmung zum Hinweis:</strong> Speicherung der Information, ob du den Informationsbanner (inkl. dieser Richtlinie) bereits zur Kenntnis genommen hast, damit er nicht bei jedem Start erneut erscheint.</li>
                    </ul>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Löschen der Daten</h2>
                    <p className="leading-relaxed">
                        Da es sich um rein lokale Speicherung in deinem Browser handelt, kannst du diese Daten jederzeit selbst löschen. Gehe dazu in die Einstellungen deines Browsers und lösche die "Website-Daten" oder "Local Storage" für unsere Domain. Beachte jedoch, dass du danach aus der App abgemeldet bist und deine Theme-Einstellungen neu setzen musst.
                    </p>
                </section>
            </div>
            <div className="mt-12 text-sm text-gray-500 text-center font-medium">
                &copy; {new Date().getFullYear()} Schülervertretung Friedrich-Wilhelms-Gymnasium Köln.
            </div>
        </div>
    );
}
