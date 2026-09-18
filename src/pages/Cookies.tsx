import { ChevronLeft, Cookie } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function Cookies() {
    const navigate = useNavigate();

    const withdrawConsent = () => {
        try {
            localStorage.removeItem('cookie_consent');
        } catch {
            /* ignore */
        }
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>

                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary-hover">
                        <Cookie size={14} /> Rechtliches
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Cookie- & Speicherhinweise</h1>
                    <p className="text-gray-500 dark:text-gray-400">Stand: September 2026 · Informationen nach § 25 TDDDG</p>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 className="font-bold text-lg text-gray-900 dark:text-white">Kurz gesagt</h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                        <p>
                            Die FWG-Nachhilfebörse kommt <strong>ohne Cookies zu Analyse- oder Werbezwecken</strong> aus.
                            Es gibt keine externen Tracker (kein Google Analytics o. ä.).
                        </p>
                        <p>Folgendes wird lokal in deinem Browser bzw. auf unseren Servern gespeichert:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Anmeldestatus</strong> (Local Storage) – damit du angemeldet bleibst. Technisch erforderlich.</li>
                            <li><strong>Design-Einstellung</strong> (Hell-/Dunkelmodus, Local Storage) – Komfortfunktion.</li>
                            <li><strong>Deine Cookie-Entscheidung</strong> (Local Storage) – damit wir dich nicht erneut fragen.</li>
                            <li><strong>Anonyme Seitenstatistik</strong> (Server, ohne IP-Adresse, ohne Personenbezug) – zur Verbesserung der App. Details in der Datenschutzerklärung.</li>
                        </ul>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 className="font-bold text-lg text-gray-900 dark:text-white">Einwilligung widerrufen</h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                        <p>
                            Deine Entscheidung im Cookie-Banner kannst du jederzeit widerrufen oder ändern:
                            Der Widerruf wirkt für die Zukunft und ist genauso einfach wie die Erteilung –
                            ein Klick genügt. Danach fragen wir dich beim nächsten Besuch erneut.
                        </p>
                        <Button onClick={withdrawConsent} variant="outline" className="rounded-full mt-2">
                            Einwilligung widerrufen & Banner erneut anzeigen
                        </Button>
                    </div>
                </div>

                <div className="text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln
                </div>
            </div>
        </div>
    );
}
