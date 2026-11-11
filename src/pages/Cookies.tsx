import { Link } from 'react-router-dom';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import StaticLayout from '../components/StaticLayout';

const STORAGE_ROWS: Array<{
    storage: string;
    purpose: string;
    duration: React.ReactNode;
    basis: string;
}> = [
    {
        storage: 'Browser (Local Storage): Anmeldestatus',
        purpose: 'Angemeldet bleiben',
        duration: 'Bis zum Logout bzw. Löschen der Browserdaten',
        basis: '§ 25 Abs. 2 TDDDG (technisch erforderlich)',
    },
    {
        storage: 'Browser (Local Storage): Design-Einstellung',
        purpose: 'Hell-/Dunkelmodus merken (Komfort)',
        duration: 'Bis zur Änderung bzw. Löschen der Browserdaten',
        basis: '§ 25 Abs. 2 TDDDG (technisch erforderlich)',
    },
    {
        storage: 'Browser (Local Storage): Hinweis-Status',
        purpose: 'Cookie-Hinweis nicht erneut anzeigen',
        duration: 'Bis zum Löschen der Browserdaten',
        basis: '§ 25 Abs. 2 TDDDG (technisch erforderlich)',
    },
    {
        storage: 'Server: Nutzungsstatistik (Seitenaufrufe, ohne IP)',
        purpose: 'App verbessern; Zahl der aktiven Nutzer (bei Anmeldung mit Konto-Kennung, pseudonym); läuft immer mit',
        duration: 'Detaildaten 90 Tage, danach automatische Löschung. Widerspruch jederzeit möglich.',
        basis: 'Art. 6 Abs. 1 lit. f DSGVO',
    },
    {
        storage: 'Server: Fächer-Klicks (ohne IP, ohne Konto)',
        purpose: 'Reihenfolge der „Beliebt“-Fächer ermitteln',
        duration: '90 Tage, danach automatische Löschung',
        basis: 'Art. 6 Abs. 1 lit. f DSGVO',
    },
];

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
            <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
                <section aria-labelledby="cookies-kurz" className="space-y-3 rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-soft sm:p-8">
                    <h2 id="cookies-kurz" className="text-lg font-semibold text-foreground">Kurz gesagt</h2>
                    <div className="space-y-2 text-base leading-7 text-muted-foreground">
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

                <section aria-labelledby="cookies-speicher" className="space-y-4 rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-soft sm:p-8">
                    <h2 id="cookies-speicher" className="text-lg font-semibold text-foreground">Was wird wo gespeichert?</h2>

                    {/* Mobil: gestapelte Leseeinheiten statt horizontaler Tabelle. */}
                    <dl className="divide-y divide-border border-y border-border md:hidden">
                        {STORAGE_ROWS.map((row) => (
                            <div key={row.storage} className="space-y-2 py-4 text-sm">
                                <div>
                                    <dt className="font-semibold text-foreground">Speicher</dt>
                                    <dd className="mt-0.5 text-muted-foreground">{row.storage}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-foreground">Zweck</dt>
                                    <dd className="mt-0.5 text-muted-foreground">{row.purpose}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-foreground">Dauer</dt>
                                    <dd className="mt-0.5 text-muted-foreground">{row.duration}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-foreground">Grundlage</dt>
                                    <dd className="mt-0.5 text-muted-foreground">{row.basis}</dd>
                                </div>
                            </div>
                        ))}
                    </dl>

                    {/* Desktop: echte Tabelle mit definierten Spaltenbreiten. */}
                    <div className="hidden md:block">
                        <Table className="w-full table-fixed border-collapse text-left text-sm">
                            <colgroup>
                                <col className="w-[24%]" />
                                <col className="w-[32%]" />
                                <col className="w-[26%]" />
                                <col className="w-[18%]" />
                            </colgroup>
                            <TableHeader>
                                <TableRow className="border-b border-border text-foreground">
                                    <TableHead scope="col" className="whitespace-normal py-2 pr-4 font-semibold">Speicher</TableHead>
                                    <TableHead scope="col" className="whitespace-normal py-2 pr-4 font-semibold">Zweck</TableHead>
                                    <TableHead scope="col" className="whitespace-normal py-2 pr-4 font-semibold">Dauer</TableHead>
                                    <TableHead scope="col" className="whitespace-normal py-2 font-semibold">Grundlage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="leading-relaxed">
                                {STORAGE_ROWS.map((row) => (
                                    <TableRow key={row.storage} className="border-b border-border align-top">
                                        <TableCell className="whitespace-normal py-3 pr-4 align-top">{row.storage}</TableCell>
                                        <TableCell className="whitespace-normal py-3 pr-4 align-top">{row.purpose}</TableCell>
                                        <TableCell className="whitespace-normal py-3 pr-4 align-top">{row.duration}</TableCell>
                                        <TableCell className="whitespace-normal py-3 align-top">{row.basis}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <p className="text-base leading-7 text-muted-foreground">
                        Details zur Datenverarbeitung stehen in der{' '}
                        <Link to="/datenschutz" className="font-bold text-brand-ink hover:underline dark:text-primary">Datenschutzerklärung</Link>.
                    </p>
                </section>

                <section aria-labelledby="cookies-hinweis" className="space-y-3 rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-soft sm:p-8">
                    <h2 id="cookies-hinweis" className="text-lg font-semibold text-foreground">Hinweis erneut anzeigen</h2>
                    <div className="space-y-2 text-base leading-7 text-muted-foreground">
                        <p>
                            Der Cookie-Hinweis ist eine reine Information. Es gibt keine Auswahl und
                            keine Einwilligung, die du widerrufen müsstest. Wenn du den Hinweis trotzdem
                            noch einmal sehen möchtest, blendest du ihn hier wieder ein:
                        </p>
                        <Button onClick={showNoticeAgain} variant="outline" className="mt-2 min-h-11 rounded-full">
                            Hinweis erneut anzeigen
                        </Button>
                    </div>
                </section>
            </div>
        </StaticLayout>
    );
}
