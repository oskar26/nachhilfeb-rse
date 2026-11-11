import { Link } from 'react-router-dom';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import StaticLayout from '../components/StaticLayout';

export default function Cookies() {
    const showNoticeAgain = () => {
        try {
            localStorage.removeItem('cookie_notice_seen');
        } catch {
            /* ignore */
        }
        window.location.reload();
    };

    return (
        <StaticLayout
            title="Cookies"
            intro="Speicherhinweise · Stand: Oktober 2026 · Betreiber: SV FWG Köln."
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
                            Eine <strong>Server-Statistik</strong> (welche Seiten werden aufgerufen,{' '}
                            <strong>ohne IP-Adresse und ohne Gerätekennung</strong>) läuft immer mit, damit wir die
                            App verbessern können. Bei <strong>angemeldeten</strong> Nutzerinnen und Nutzern wird
                            zusätzlich die Konto-Kennung mitgezählt, um die Zahl der aktiven Personen zu ermitteln –
                            diese Daten sind <strong>pseudonym</strong> und werden <strong>nach 90 Tagen
                            automatisch gelöscht</strong>. Du kannst der Statistik jederzeit widersprechen (siehe
                            Datenschutzerklärung, Abschnitt 6); die Nutzung bleibt uneingeschränkt möglich.
                        </p>
                        <p>
                            Klicks auf die „Beliebt“-Fächer im Feed zählen wir dagegen <strong>ohne jeden
                            Nutzerbezug</strong>: nur Fachname und Zeitpunkt, keine IP, kein Konto.
                        </p>
                    </div>
                </section>

                <section aria-labelledby="cookies-speicher" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 id="cookies-speicher" className="font-bold text-lg text-gray-900 dark:text-white">Was wird wo gespeichert?</h2>
                    <div className="overflow-x-auto">
                        <Table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                            <TableHeader>
                                <TableRow className="border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                    <TableHead scope="col" className="py-2 pr-4 font-bold">Speicher</TableHead>
                                    <TableHead scope="col" className="py-2 pr-4 font-bold">Zweck</TableHead>
                                    <TableHead scope="col" className="py-2 pr-4 font-bold">Dauer</TableHead>
                                    <TableHead scope="col" className="py-2 font-bold">Grundlage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="leading-relaxed">
                                <TableRow className="border-b border-gray-100 dark:border-gray-800">
                                    <TableCell className="py-2 pr-4">Browser (Local Storage): Anmeldestatus</TableCell>
                                    <TableCell className="py-2 pr-4">Angemeldet bleiben</TableCell>
                                    <TableCell className="py-2 pr-4">Bis zum Logout bzw. Löschen der Browserdaten</TableCell>
                                    <TableCell className="py-2">§ 25 Abs. 2 TDDDG (technisch erforderlich)</TableCell>
                                </TableRow>
                                <TableRow className="border-b border-gray-100 dark:border-gray-800">
                                    <TableCell className="py-2 pr-4">Browser (Local Storage): Design-Einstellung</TableCell>
                                    <TableCell className="py-2 pr-4">Hell-/Dunkelmodus merken (Komfort)</TableCell>
                                    <TableCell className="py-2 pr-4">Bis zur Änderung bzw. Löschen der Browserdaten</TableCell>
                                    <TableCell className="py-2">§ 25 Abs. 2 TDDDG (technisch erforderlich)</TableCell>
                                </TableRow>
                                <TableRow className="border-b border-gray-100 dark:border-gray-800">
                                    <TableCell className="py-2 pr-4">Browser (Local Storage): Hinweis-Status</TableCell>
                                    <TableCell className="py-2 pr-4">Cookie-Hinweis nicht erneut anzeigen</TableCell>
                                    <TableCell className="py-2 pr-4">Bis zum Löschen der Browserdaten</TableCell>
                                    <TableCell className="py-2">§ 25 Abs. 2 TDDDG (technisch erforderlich)</TableCell>
                                </TableRow>
                                <TableRow className="border-b border-gray-100 dark:border-gray-800">
                                    <TableCell className="py-2 pr-4">Server: Nutzungsstatistik (Seitenaufrufe, ohne IP)</TableCell>
                                    <TableCell className="py-2 pr-4">App verbessern; Zahl der aktiven Nutzer (bei Anmeldung mit Konto-Kennung, pseudonym); läuft immer mit</TableCell>
                                    <TableCell className="py-2 pr-4">Detaildaten <strong>90 Tage</strong>, danach automatische Löschung. Widerspruch jederzeit möglich.</TableCell>
                                    <TableCell className="py-2">Art. 6 Abs. 1 lit. f DSGVO</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="py-2 pr-4">Server: Fächer-Klicks (ohne IP, ohne Konto)</TableCell>
                                    <TableCell className="py-2 pr-4">Reihenfolge der „Beliebt“-Fächer ermitteln</TableCell>
                                    <TableCell className="py-2 pr-4">90 Tage, danach automatische Löschung</TableCell>
                                    <TableCell className="py-2">Art. 6 Abs. 1 lit. f DSGVO</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
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
                            Der Cookie-Hinweis ist eine reine Information. Es gibt keine Auswahl und
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
