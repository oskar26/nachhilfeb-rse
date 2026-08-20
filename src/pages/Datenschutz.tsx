import { ChevronLeft, ShieldCheck, Lock, Heart, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function Datenschutz() {
    const navigate = useNavigate();
    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 pl-0">
                <ChevronLeft className="mr-2" size={20} /> Zurück
            </Button>
            <h1 className="text-4xl font-black mb-8 tracking-tight">Datenschutz</h1>
            
            <div className="space-y-8 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                
                {/* Highlights Banner */}
                <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl space-y-3">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                        <ShieldCheck className="text-primary-hover" size={22} /> Das Wichtigste auf einen Blick
                    </h2>
                    <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                            <strong>Schulintern & geschützt:</strong> Nur für FWG-Schülerinnen, -Schüler & Eltern.
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                            <strong>Kein Tracking & keine Werbung:</strong> Wir verkaufen keine Daten und nutzen keine Analytics.
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                            <strong>Reiner Serverstandort Deutschland:</strong> Hosting bei ALL-INKL in Dresden.
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                            <strong>Volle Kontrolle:</strong> Du kannst deine Daten jederzeit exportieren oder löschen.
                        </li>
                    </ul>
                </div>

                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">1. Wer betreibt die Plattform?</h2>
                    <p className="leading-relaxed">
                        Diese Anwendung ist ein ehrenamtliches Projekt der Schülervertretung (SV) des Friedrich-Wilhelms-Gymnasiums Köln. Wir behandeln alle Daten streng vertraulich und nach den Vorgaben der Datenschutz-Grundverordnung (DSGVO).
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">2. Welche Daten erfassen wir & wofür?</h2>
                    <p className="leading-relaxed mb-3">
                        Wir erheben nur Daten, die für das Vermitteln von Nachhilfe wirklich notwendig sind:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 leading-relaxed text-sm">
                        <li><strong>Konto & Profil:</strong> E-Mail-Adresse, Vor- und Nachname, Klasse/Stufe, evtl. Moodle-Name oder Telefonnummer (freiwillig).</li>
                        <li><strong>Anzeigen & Chat:</strong> Inhalte deiner Nachhilfe-Gesuche/Angebote und Chat-Nachrichten zur Absprache der Stunden.</li>
                        <li><strong>Elterneinwilligung:</strong> Bei Nutzern unter 16 Jahren wird im Registrierungsprozess die Zustimmung der Erziehungsberechtigten festgehalten.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">3. Sichtbarkeit deiner Daten</h2>
                    <p className="leading-relaxed">
                        Deine Kontaktdaten (wie Telefonnummer) sind <strong>standardmäßig geschützt</strong>. Sie werden anderen Nutzern erst gezeigt, wenn du eine Nachhilfe-Anfrage annimmst oder die Sichtbarkeit in deinen Einstellungen bewusst aktivierst. Das SV-Admin-Team hat Moderationsrechte, um die Plattform sicher zu halten und bei Verstößen eingreifen zu können.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">4. Hosting & Sicherheit</h2>
                    <p className="leading-relaxed">
                        Die Anwendung, Domain und Datenbank werden bei dem deutschen Webhosting-Anbieter <strong>ALL-INKL.COM (Neue Medien Münnich)</strong> in eigenen Rechenzentren am Standort <strong>Dresden (Deutschland)</strong> gehostet. Ein rechtlich vorgeschriebener Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO liegt vor. Alle Daten verbleiben somit zu 100 % in Deutschland. Die Übertragung erfolgt stets verschlüsselt (HTTPS/TLS). Wir verwenden keine externen Tracking-Cookies oder Analytics. Auch Schriftarten werden lokal von unseren eigenen Servern geladen (Self-Hosted).
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">5. Deine Rechte (Auskunft, Export & Löschung)</h2>
                    <p className="leading-relaxed mb-3">
                        Du hast jederzeit die volle Kontrolle über deine Daten:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 leading-relaxed text-sm">
                        <li><strong>Datenexport (Art. 20 DSGVO):</strong> In den Einstellungen kannst du mit einem Klick eine Kopie all deiner Daten als JSON-Datei herunterladen.</li>
                        <li><strong>Konto löschen (Art. 17 DSGVO):</strong> Du kannst deinen Account in den Einstellungen jederzeit zur Löschung vormerken. Alle deine Anzeigen werden sofort deaktiviert.</li>
                        <li><strong>Korrektur:</strong> Du kannst dein Profil in den Einstellungen jederzeit selbst anpassen.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">6. Fragen zum Datenschutz?</h2>
                    <p className="leading-relaxed">
                        Wenn du oder deine Eltern Fragen zum Datenschutz haben, wende dich einfach direkt an das SV-Team unter <a href="mailto:sv@fwg-koeln.de" className="text-primary font-bold hover:underline">sv@fwg-koeln.de</a> oder an das Schulsekretariat.
                    </p>
                </section>
            </div>

            <div className="mt-12 text-sm text-gray-500 text-center font-medium">
                Schülervertretung Friedrich-Wilhelms-Gymnasium Köln
            </div>
        </div>
    );
}
