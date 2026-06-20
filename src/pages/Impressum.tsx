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
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Angaben gemäß § 5 TMG</h2>
                    <p className="leading-relaxed">
                        Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln<br />
                        Severinstraße 241<br />
                        50676 Köln<br />
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Vertretung</h2>
                    <p className="leading-relaxed">
                        Die Schülervertretung wird vertreten durch den Schülersprecher / die Schülersprecherin.<br />
                        (Dies ist ein schulinternes, nicht-kommerzielles Projekt der SV.)
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Kontakt</h2>
                    <p className="leading-relaxed">
                        E-Mail: sv@fwg-koeln.de<br />
                        Internet: www.fwg-koeln.de (Offizielle Schulwebsite)
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
                    <p className="leading-relaxed">
                        Oskar H. im Namen der SV des FWG Köln.<br />
                        Severinstraße 241<br />
                        50676 Köln
                    </p>
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">Haftung für Inhalte & Links</h2>
                    <p className="leading-relaxed text-sm text-gray-500 dark:text-gray-400">
                        Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen. Wir haften nicht für externe Links; für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
                    </p>
                </section>
            </div>
            <div className="mt-12 text-sm text-gray-500 text-center font-medium">
                &copy; {new Date().getFullYear()} Schülervertretung Friedrich-Wilhelms-Gymnasium Köln.
            </div>
        </div>
    );
}
