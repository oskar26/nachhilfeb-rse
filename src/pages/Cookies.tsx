import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import StaticLayout from '../components/StaticLayout';

export default function Cookies() {
    const showNoticeAgain = () => {
        try {
            localStorage.removeItem('cookie_notice_seen');
            localStorage.removeItem('cookie_consent');
        } catch {
            /* ignore */
        }
        window.location.reload();
    };

    return (
        <StaticLayout
            title="Cookies"
            intro="Speicherhinweise · Stand: September 2026 · Betreiber: SV FWG Köln."
        >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
                <section aria-labelledby="cookies-kurz" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 id="cookies-kurz" className="font-bold text-lg text-gray-900 dark:text-white">Kurz gesagt</h2>
                    <div className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-2">
                        <p>
                            Die FWG-Nachhilfebörse kommt <strong>ohne Cookies zu Analyse- oder Werbezwecken</strong> aus.
                            Es gibt keine externen Tracker (kein Google Analytics o. ä.).
                        </p>
                        <p>
                            Eine <strong>anonyme Server-Statistik</strong> (welche Seiten werden aufgerufen –{' '}
                            <strong>ohne IP-Adresse, ohne Personenbezug</strong>) läuft immer mit, damit wir die
                            App verbessern können. Sie lässt sich nicht abschalten, weil dabei keine
                            personenbezogenen Daten anfallen.
                        </p>
                    </div>
                </section>

                <section aria-labelledby="cookies-speicher" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 id="cookies-speicher" className="font-bold text-lg text-gray-900 dark:text-white">Was wird wo gespeichert?</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                    <th scope="col" className="py-2 pr-4 font-bold">Speicher</th>
                                    <th scope="col" className="py-2 pr-4 font-bold">Zweck</th>
                                    <th scope="col" className="py-2 pr-4 font-bold">Dauer</th>
                                    <th scope="col" className="py-2 font-bold">Grundlage</th>
                                </tr>
                            </thead>
                            <tbody className="leading-relaxed">
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-2 pr-4">Browser (Local Storage): Anmeldestatus</td>
                                    <td className="py-2 pr-4">Angemeldet bleiben</td>
                                    <td className="py-2 pr-4">Bis zum Logout bzw. Löschen der Browserdaten</td>
                                    <td className="py-2">§ 25 Abs. 2 TDDDG (technisch erforderlich)</td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-2 pr-4">Browser (Local Storage): Design-Einstellung</td>
                                    <td className="py-2 pr-4">Hell-/Dunkelmodus merken (Komfort)</td>
                                    <td className="py-2 pr-4">Bis zur Änderung bzw. Löschen der Browserdaten</td>
                                    <td className="py-2">§ 25 Abs. 2 TDDDG (technisch erforderlich)</td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-2 pr-4">Browser (Local Storage): Hinweis-Status</td>
                                    <td className="py-2 pr-4">Cookie-Hinweis nicht erneut anzeigen</td>
                                    <td className="py-2 pr-4">Bis zum Löschen der Browserdaten</td>
                                    <td className="py-2">§ 25 Abs. 2 TDDDG (technisch erforderlich)</td>
                                </tr>
                                <tr>
                                    <td className="py-2 pr-4">Server: anonyme Seitenstatistik (ohne IP)</td>
                                    <td className="py-2 pr-4">App verbessern; läuft immer mit</td>
                                    <td className="py-2 pr-4">Aggregiert, unbefristet (kein Personenbezug)</td>
                                    <td className="py-2">Art. 6 Abs. 1 lit. f DSGVO</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                        Details zur Datenverarbeitung stehen in der{' '}
                        <Link to="/datenschutz" className="font-bold text-amber-700 dark:text-primary hover:underline">Datenschutzerklärung</Link>.
                    </p>
                </section>

                <section aria-labelledby="cookies-hinweis" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 id="cookies-hinweis" className="font-bold text-lg text-gray-900 dark:text-white">Hinweis erneut anzeigen</h2>
                    <div className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-2">
                        <p>
                            Der Cookie-Hinweis ist eine reine Information – es gibt keine Auswahl und
                            keine Einwilligung, die du widerrufen müsstest. Wenn du den Hinweis trotzdem
                            noch einmal sehen möchtest, blendest du ihn hier wieder ein:
                        </p>
                        <Button onClick={showNoticeAgain} variant="outline" className="rounded-full mt-2">
                            Hinweis erneut anzeigen
                        </Button>
                    </div>
                </section>
            </div>
        </StaticLayout>
    );
}
