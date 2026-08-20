import { ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function Impressum() {
    const navigate = useNavigate();
    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 pl-0">
                <ChevronLeft className="mr-2" size={20} /> Zurück
            </Button>
            <h1 className="text-4xl font-black mb-8 tracking-tight">Impressum</h1>
            <div className="space-y-8 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Angaben gemäß § 5 DDG</h2>
                    <p className="leading-relaxed">
                        Schülervertretung (SV) des Friedrich-Wilhelms-Gymnasiums Köln<br />
                        Severinstraße 241<br />
                        50676 Köln<br />
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Projektverantwortung & Vertretung</h2>
                    <p className="leading-relaxed">
                        Diese Plattform ist ein schulinternes, ehrenamtliches Projekt der Schülervertretung (SV) des FWG Köln.<br />
                        Vertreten durch das Schülersprecher-Team & die SV-Beratungslehrer.<br />
                        Unterstützt durch die Schulleitung des Friedrich-Wilhelms-Gymnasiums.
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Kontakt</h2>
                    <p className="leading-relaxed">
                        <strong>E-Mail SV:</strong> sv@fwg-koeln.de<br />
                        <strong>Schulsekretariat:</strong> sekretariat@fwg-koeln.de<br />
                        <strong>Website:</strong> <a href="https://www.fwg-koeln.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.fwg-koeln.de</a>
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Nutzungsbereich</h2>
                    <p className="leading-relaxed text-sm text-gray-600 dark:text-gray-400">
                        Diese Anwendung ist ausschließlich für Schülerinnen, Schüler und Erziehungsberechtigte des Friedrich-Wilhelms-Gymnasiums Köln bestimmt. Es handelt sich um ein nicht-kommerzielles Bildungs- und Hilfsangebot.
                    </p>
                </section>
            </div>
            <div className="mt-12 text-sm text-gray-500 text-center font-medium">
                &copy; {new Date().getFullYear()} Schülervertretung Friedrich-Wilhelms-Gymnasium Köln
            </div>
        </div>
    );
}
