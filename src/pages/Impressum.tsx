import { Mail, MapPin, Building2, Newspaper, Phone } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';

export default function Impressum() {
    return (
        <StaticLayout
            title="Impressum"
            intro="Stand: September 2026 · Betreiber: SV FWG Köln — Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG)."
        >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
                <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                    <div className="flex gap-4">
                        <Building2 className="text-primary shrink-0 mt-1" size={22} aria-hidden="true" />
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Diensteanbieter</h2>
                            <p className="text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                                Schülervertretung (SV) des<br />
                                <strong>Friedrich-Wilhelm-Gymnasiums Köln</strong><br />
                                Severinstraße 241<br />
                                50676 Köln<br />
                                Deutschland
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Mail className="text-primary shrink-0 mt-1" size={22} aria-hidden="true" />
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Kontakt</h2>
                            <ul className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-1">
                                <li>
                                    E-Mail (SV-Team & Nachhilfebörse):{' '}
                                    <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">info@nachhilfe-sv.de</a>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Phone size={16} className="shrink-0 mt-1.5" aria-hidden="true" />
                                    <span>Telefon: <strong>[Telefon: wird ergänzt]</strong></span>
                                </li>
                                <li>
                                    Schüler-Coaching:{' '}
                                    <a href="mailto:Rosalia.Balistreri@fwg-koeln.nrw.schule" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">Rosalia.Balistreri@fwg-koeln.nrw.schule</a>{' '}
                                    (Frau Balistreri)
                                </li>
                                <li>
                                    Technik & Fehlermeldungen:{' '}
                                    <a href="mailto:technik@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline break-anywhere">technik@nachhilfe-sv.de</a>
                                </li>
                            </ul>
                            <p className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 mt-2">
                                Die Nachhilfebörse ist ein nicht-kommerzielles Schülerprojekt der SV.
                                Ansprechpartner für Inhalte dieser Plattform ist das SV-Team.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <MapPin className="text-primary shrink-0 mt-1" size={22} aria-hidden="true" />
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Schulträger</h2>
                            <p className="text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                                Stadt Köln – Amt für Schulentwicklung<br />
                                Die Schule in Trägerschaft der Stadt Köln ist eine öffentliche Einrichtung
                                des Landes Nordrhein-Westfalen.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Newspaper className="text-primary shrink-0 mt-1" size={22} aria-hidden="true" />
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV)</h2>
                            <p className="text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                                <strong>[Name, Funktion: wird ergänzt]</strong>, für das SV-Team des
                                Friedrich-Wilhelm-Gymnasiums Köln,<br />
                                Severinstraße 241, 50676 Köln.
                            </p>
                            <p className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 mt-3">
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
            </div>
        </StaticLayout>
    );
}
