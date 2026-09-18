import { ChevronLeft, Mail, MapPin, Building2, Newspaper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function Impressum() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>

                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary-hover">
                        Rechtliches
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Impressum</h1>
                    <p className="text-gray-500 dark:text-gray-400">Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG)</p>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-soft space-y-6">
                    <div className="flex gap-4">
                        <Building2 className="text-primary shrink-0 mt-1" size={22} />
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Diensteanbieter</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Schülervertretung (SV) des<br />
                                <strong>Friedrich-Wilhelms-Gymnasiums Köln</strong><br />
                                Severinstraße 241<br />
                                50676 Köln<br />
                                Deutschland
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Mail className="text-primary shrink-0 mt-1" size={22} />
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Kontakt</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                E-Mail: <a href="mailto:info@sv-fwg.de" className="font-bold text-primary hover:underline">info@sv-fwg.de</a><br />
                                Technik & Fehlermeldungen: <a href="mailto:technik@nachhilfe-sv.de" className="font-bold text-primary hover:underline">technik@nachhilfe-sv.de</a><br />
                                Die Nachhilfebörse ist ein nicht-kommerzielles Schülerprojekt der SV.
                                Ansprechpartner für Inhalte dieser Plattform ist das SV-Team.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <MapPin className="text-primary shrink-0 mt-1" size={22} />
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Schulträger</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Stadt Köln – Amt für Schulentwicklung<br />
                                Die Schule in Trägerschaft der Stadt Köln ist eine öffentliche Einrichtung
                                des Landes Nordrhein-Westfalen.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Newspaper className="text-primary shrink-0 mt-1" size={22} />
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV)</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Das SV-Team des Friedrich-Wilhelms-Gymnasiums Köln,<br />
                                Severinstraße 241, 50676 Köln.
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-3">
                                Für <strong>nutzergenerierte Inhalte</strong> (Anzeigen, Profile, Nachrichten)
                                sind die jeweiligen Nutzerinnen und Nutzer verantwortlich. Das SV-Team prüft
                                gemeldete Inhalte und entfernt rechtswidrige Inhalte nach Kenntnis
                                unverzüglich (siehe Nutzungsbedingungen und Meldefunktion in der App).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-900 dark:text-white">Hinweis zum Charakter der Plattform:</strong>{' '}
                    Dies ist eine schulische Vermittlungsplattform von Schülern für Schüler.
                    Nachhilfevereinbarungen (Zeiten, Preise, Inhalte) kommen ausschließlich zwischen den
                    jeweiligen Nutzerinnen und Nutzern zustande – das SV-Team ist daran nicht beteiligt
                    und übernimmt dafür keine Gewähr (Details in den Nutzungsbedingungen).
                </div>

                <div className="text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln
                </div>
            </div>
        </div>
    );
}
