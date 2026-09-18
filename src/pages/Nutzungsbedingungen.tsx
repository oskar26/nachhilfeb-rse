import { ChevronLeft, FileText } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">{children}</div>
        </div>
    );
}

export default function Nutzungsbedingungen() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>

                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary-hover">
                        <FileText size={14} /> Rechtliches
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Nutzungsbedingungen</h1>
                    <p className="text-gray-500 dark:text-gray-400">Stand: September 2026 · Betreiber: Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln</p>
                </div>

                <Section title="§ 1 Was ist die Nachhilfebörse?">
                    <p>
                        Die Nachhilfebörse ist eine <strong>nicht-kommerzielle Vermittlungsplattform von
                        Schülern für Schüler</strong>. Sie ermöglicht es, Nachhilfeangebote und -gesuche zu
                        veröffentlichen, Kontakt aufzunehmen und Termine zu vereinbaren.
                    </p>
                    <p>
                        Vereinbarungen über Nachhilfe (Inhalte, Zeiten, Ort, Vergütung) kommen{' '}
                        <strong>ausschließlich zwischen den beteiligten Nutzerinnen und Nutzern</strong> zustande.
                        Der Betreiber (SV-Team) ist an diesen Vereinbarungen nicht beteiligt, erhält keine
                        Provision und übernimmt keine Gewähr für deren Durchführung oder Qualität.
                    </p>
                </Section>

                <Section title="§ 2 Wer darf mitmachen?">
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Schülerinnen und Schüler</strong> des Friedrich-Wilhelms-Gymnasiums Köln können Accounts erstellen, Anzeigen aufgeben und Nachrichten schreiben.</li>
                        <li><strong>Eltern</strong> können eigene Accounts erstellen, für ihre Kinder inserieren und verknüpfte Kinder-Accounts begleiten.</li>
                        <li>Nutzerinnen und Nutzer <strong>unter 16 Jahren</strong> benötigen die <strong>Einwilligung eines Elternteils</strong> (Art. 8 DSGVO). Ohne bestätigte Eltern-E-Mail bleibt der Account eingeschränkt.</li>
                        <li>Nur <strong>verifizierte Accounts</strong> (Verifizierung im SV-Raum) können Anzeigen erstellen und Kontakt aufnehmen.</li>
                    </ul>
                </Section>

                <Section title="§ 3 Registrierung & Account">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Pro Person ist <strong>ein Account</strong> vorgesehen. Die Angaben bei der Registrierung müssen zutreffen (keine falschen Namen, Klassen oder Rollen).</li>
                        <li>Deine <strong>Zugangsdaten sind geheim zu halten</strong>. Bei Verdacht auf Missbrauch informiere uns sofort über <a href="mailto:info@sv-fwg.de" className="font-bold text-primary hover:underline">info@sv-fwg.de</a>.</li>
                        <li>Die Angabe einer falschen Rolle (z. B. Eltern-Account ohne Elternschaft) oder die Umgehung der Verifizierung führt zur Sperrung.</li>
                    </ul>
                </Section>

                <Section title="§ 4 Regeln für Anzeigen">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Anzeigen müssen <strong>wahr, konkret und aktuell</strong> sein (Fächer, Klassenstufen, Preise). Veraltete Anzeigen sind zu deaktivieren oder zu löschen.</li>
                        <li><strong>Richtpreise:</strong> Als fair gelten ca. 10–15 € pro 45 Minuten. Wucherpreise oder Lockangebote mit versteckten Kosten sind untersagt.</li>
                        <li>Verboten sind: Beleidigungen, Diskriminierung, Werbung für externe kommerzielle Anbieter, Kettenbriefe, politische oder religiöse Agitation sowie Inhalte, die gegen Gesetze verstoßen.</li>
                        <li>Fotos dürfen nur hochgeladen werden, wenn du die <strong>Rechte daran hast</strong> und abgebildete Personen einverstanden sind.</li>
                    </ul>
                </Section>

                <Section title="§ 5 Schüler-Coaching AG">
                    <p>
                        Mitglieder der Schüler-Coaching AG erhalten nach Schulung ein <strong>Coach-Abzeichen</strong>.
                        Was das Badge bedeutet, wer Coach werden kann und warum manche Anzeigen hervorgehoben
                        werden, steht transparent auf der{' '}
                        <Link to="/coaching" className="font-bold text-primary hover:underline">Coaching-Seite</Link>.
                        Das Badge steht für geprüfte Vertrauenswürdigkeit als Person – nicht für Erfolgsgarantien.
                    </p>
                </Section>

                <Section title="§ 6 Kommunikation">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Der Chat dient <strong>ausschließlich Nachhilfe-Absprachen</strong>.</li>
                        <li>Belästigung, Beleidigung, Spam oder die Weitergabe fremder Kontaktdaten sind verboten.</li>
                        <li><strong>Treffen:</strong> Erste Treffen sollten in der Schule (z. B. Bibliothek, Mensa) stattfinden. Private Treffen außerhalb der Schule nur mit Wissen der Eltern.</li>
                        <li>Verdächtige Nachrichten oder Nutzer kannst du über die <strong>Meldefunktion</strong> in der App melden.</li>
                    </ul>
                </Section>

                <Section title="§ 7 Moderation & Sanktionen">
                    <p>Bei Verstößen gegen diese Bedingungen kann das SV-Team – je nach Schwere – folgende Maßnahmen ergreifen:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Verwarnung</strong> mit Hinweis auf die verletzte Regel</li>
                        <li><strong>Entfernung einzelner Inhalte</strong> (Anzeigen, Bilder, Nachrichten)</li>
                        <li><strong>Zeitweise Sperrung</strong> (z. B. 7 Tage) oder <strong>dauerhafte Sperrung</strong> bei schweren oder wiederholten Verstößen</li>
                        <li><strong>Entzug des Coach-Status</strong> nach den Regeln der <Link to="/coaching" className="font-bold text-primary hover:underline">Coaching-Seite</Link></li>
                    </ul>
                    <p>
                        Gegen Maßnahmen kannst du <strong>Widerspruch einlegen</strong> – per Support-Ticket
                        in der App, per E-Mail an <a href="mailto:info@sv-fwg.de" className="font-bold text-primary hover:underline">info@sv-fwg.de</a> oder
                        persönlich im SV-Raum. Wir prüfen jeden Fall erneut.
                    </p>
                </Section>

                <Section title="§ 8 Haftung">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Der Betreiber haftet <strong>nicht für Inhalte</strong> der Nutzer (Anzeigen, Profile, Nachrichten).</li>
                        <li>Der Betreiber haftet nicht für das Zustandekommen, die Qualität oder die Bezahlung vereinbarter Nachhilfe.</li>
                        <li>Für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit haftet der Betreiber unbeschränkt nach den gesetzlichen Vorschriften.</li>
                    </ul>
                </Section>

                <Section title="§ 9 Minderjährige & Vergütung">
                    <p>
                        Nachhilfe gegen Bezahlung zwischen Minderjährigen berührt das Taschengeldrecht
                        (§ 110 BGB): <strong>Bitte kläre Vergütung und Umfang vorab mit deinen Eltern</strong> –
                        besonders bei regelmäßiger oder teurer Nachhilfe. Für Streitigkeiten über Bezahlung
                        zwischen Nutzern ist der Betreiber nicht zuständig.
                    </p>
                </Section>

                <Section title="§ 10 Kündigung & Account-Löschung">
                    <p>
                        Du kannst die Nutzung <strong>jederzeit beenden</strong>. Die vollständige Löschung
                        deines Accounts beantragst du über ein <strong>Support-Ticket in der App</strong> oder
                        per E-Mail an <a href="mailto:info@sv-fwg.de" className="font-bold text-primary hover:underline">info@sv-fwg.de</a>.
                        Wir bestätigen die Löschung innerhalb von 14 Tagen (Details zur Speicherung in der{' '}
                        <Link to="/datenschutz" className="font-bold text-primary hover:underline">Datenschutzerklärung</Link>).
                    </p>
                    <p>
                        Der Betreiber kann Accounts bei schweren Verstößen fristlos sperren (§ 7) und die
                        Plattform insgesamt mit einer Ankündigungsfrist von 30 Tagen einstellen.
                    </p>
                </Section>

                <Section title="§ 11 Änderungen & Kontakt">
                    <p>
                        Wir können diese Bedingungen anpassen, wenn sich Funktionen oder Rechtslage ändern.
                        Über wesentliche Änderungen informieren wir <strong>mindestens 14 Tage vorher in der App</strong>.
                        Wer danach weiter nutzt, stimmt den neuen Bedingungen zu.
                    </p>
                    <p>
                        Kontakt: Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln, Severinstraße 241,
                        50676 Köln · <a href="mailto:info@sv-fwg.de" className="font-bold text-primary hover:underline">info@sv-fwg.de</a>
                    </p>
                </Section>

                <div className="text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln
                </div>
            </div>
        </div>
    );
}
