import { ChevronLeft, Award, ClipboardCheck, Scale, Megaphone, HeartHandshake, Gavel, Mail, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

function RuleCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-11 h-11 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">{children}</div>
        </div>
    );
}

export default function Coaching() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>

                <div className="text-center space-y-4 mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                        <Award size={14} className="text-amber-500" />
                        Fairness-Regeln der Schüler-Coaching AG
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Schüler-Coaching am FWG</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Große helfen Kleinen: Geschulte Schülerinnen und Schüler ab Klasse 8 unterstützen
                        die Klassen 5 und 6 beim Ankommen am Friedrich-Wilhelms-Gymnasium Köln –
                        ehrenamtlich, pädagogisch begleitet und für alle nach denselben fairen Regeln.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <RuleCard icon={<Award size={22} />} title="Was bedeutet das Coach-Abzeichen?">
                        <p>
                            Das goldene <strong>Coach-Badge</strong> auf Profilen und Anzeigen zeigt:
                            Diese Person ist aktives Mitglied der Schüler-Coaching AG, wurde von der
                            AG-Leitung geschult und vom SV-Team verifiziert.
                        </p>
                        <p>
                            Das Badge steht für <strong>Vertrauenswürdigkeit als Person</strong> –
                            nicht für Erfolgsgarantien und nicht für kostenlose Nachhilfe.
                            Preise und Absprachen bleiben Sache der Beteiligten (siehe Nutzungsbedingungen).
                        </p>
                    </RuleCard>

                    <RuleCard icon={<School size={22} />} title="Das Coaching an unserer Schule">
                        <p>
                            Das Schüler-Coaching ist ein <strong>schulisches Angebot des FWG</strong>:
                            Jede Woche <strong>dienstags von 13:45–14:30 Uhr in Raum H310</strong> helfen
                            geschulte Schülerinnen und Schüler der 8. Klassen den 5. und 6. Klassen –
                            bei einzelnen Fächern oder der Lern- und Arbeitsorganisation allgemein.
                            Die Coaches werden jeweils vor den Herbstferien geschult und engagieren
                            sich ehrenamtlich bis zum Ende des Schuljahres.
                            Dieses Angebot wird in der Regel sehr gerne angenommen,
                            da die Coaches einen guten Blick auf die Probleme der
                            jüngeren Schülerinnen und Schüler haben.
                        </p>
                        <p>
                            Mehr dazu auf der Schul-Website:{' '}
                            <a href="https://fwg-koeln.de/lebendige-schule/foerdern-und-fordern/coaching" target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">fwg-koeln.de → Coaching</a>.
                            Diese Nachhilfebörse der SV ergänzt das Angebot: Hier finden alle
                            Jahrgangsstufen individuelle Nachhilfe – die Coaches der AG sind dabei
                            besonders sichtbar, damit man sie leicht findet.
                        </p>
                    </RuleCard>

                    <RuleCard icon={<ClipboardCheck size={22} />} title="Wer kann Coach werden?">
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Schülerin oder Schüler des FWG <strong>ab Klasse 8</strong></li>
                            <li>Teilnahme an der <strong>Coach-Schulung</strong> der AG-Leitung (findet jeweils vor den Herbstferien statt)</li>
                            <li><strong>Zuverlässigkeit</strong> und respektvoller Umgang – auch auf der Plattform</li>
                            <li>Verifizierter Account auf der Nachhilfebörse</li>
                        </ul>
                        <p>
                            Interessiert? Wende dich an <strong>Frau Balistreri</strong> oder sprich das
                            SV-Team im SV-Raum an. Die Aufnahme erfolgt nach Schulung über einen
                            persönlichen <strong>Coaching-Code</strong> – für alle mit denselben Kriterien.
                        </p>
                    </RuleCard>

                    <RuleCard icon={<Megaphone size={22} />} title="Warum stehen manche Anzeigen oben?">
                        <p>
                            Anzeigen mit dem Hinweis <strong>„Hervorgehoben“</strong> erhalten eine bessere
                            Platzierung und eine gelbe Markierung. Das passiert ausschließlich in zwei Fällen:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Coach-Status:</strong> Nach Einlösen eines Coaching-Codes werden Anzeigen des Coaches für <strong>30 Tage</strong> hervorgehoben.</li>
                            <li><strong>SV-Aktionen:</strong> Zeitlich begrenzte Hinweise des SV-Teams (z. B. zum Schuljahresstart).</li>
                        </ul>
                        <p>
                            <strong>Sichtbarkeit ist bei uns nicht käuflich:</strong> Es gibt keine bezahlten
                            Boosts und keine Werbung. Zusätzlich erhalten Coach-Anzeigen einen
                            <strong> kleinen, öffentlich dokumentierten Ranking-Vorteil</strong> (etwa
                            +24 Stunden Aktualität bzw. leicht bessere Match-Einordnung) – bewusst als
                            Anerkennung für das Ehrenamt der Coaches, für alle Coaches gleich und nur
                            solange der Coach-Status aktiv ist. Versteckte Bevorzugungen gibt es nicht:
                            Alles steht auf dieser Seite.
                        </p>
                    </RuleCard>

                    <RuleCard icon={<Scale size={22} />} title="Gleiche Chancen für alle">
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Jede Schülerin und jeder Schüler kann <strong>kostenlos Anzeigen erstellen</strong> – mit oder ohne Badge.</li>
                            <li>Der Filter <strong>„Nur Coaches“</strong> hilft beim Finden geprüfter Coaches, blendet aber niemanden aus: Alle Anzeigen bleiben für alle sichtbar.</li>
                            <li>Codes sind <strong>personenbezogen und begrenzt</strong> (in der Regel einmalig einlösbar) und werden nur nach Schulung vergeben – nicht auf Zuruf oder gegen Gegenleistung.</li>
                            <li>Die Vergabe von Codes und Coach-Status wird <strong>protokolliert</strong> und kann vom SV-Team geprüft werden.</li>
                            <li>Der kleine Ranking-Vorteil für Coaches steht <strong>öffentlich auf dieser Seite</strong> – es gibt keine versteckten Bevorzugungen.</li>
                        </ul>
                    </RuleCard>

                    <RuleCard icon={<HeartHandshake size={22} />} title="Verhalten als Coach">
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Respektvoller, geduldiger Umgang – besonders mit jüngeren Schülern</li>
                            <li>Keine falschen Versprechen (z. B. garantierte Notenverbesserung)</li>
                            <li>Treffen möglichst <strong>in der Schule</strong> (z. B. Bibliothek, Mensa); private Treffen nur mit Wissen der Eltern</li>
                            <li>Bei Problemen: frühzeitig die AG-Leitung oder das SV-Team ansprechen</li>
                        </ul>
                    </RuleCard>

                    <RuleCard icon={<Gavel size={22} />} title="Entzug des Status & Widerspruch">
                        <p>
                            Bei Verstößen gegen diese Regeln oder die Nutzungsbedingungen (z. B. unzuverlässiges
                            Verhalten, Missbrauch des Badges, unangemessene Inhalte) kann die AG-Leitung oder
                            das SV-Team den <strong>Coach-Status entziehen</strong> – mit kurzer Begründung
                            direkt in der App oder per E-Mail.
                        </p>
                        <p>
                            Dagegen kannst du <strong>Widerspruch einlegen</strong>: Schreibe an{' '}
                            <a href="mailto:info@nachhilfe-sv.de" className="font-bold text-primary hover:underline">info@nachhilfe-sv.de</a>{' '}
                            oder komme im SV-Raum vorbei. Das SV-Team prüft jeden Fall erneut.
                        </p>
                    </RuleCard>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-11 h-11 bg-primary/10 text-primary-hover rounded-2xl flex items-center justify-center shrink-0">
                        <Mail size={22} />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-bold text-gray-900 dark:text-white">Fragen zum Coaching?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            AG-Leitung: Frau Balistreri · SV-Lehrer: Herr Schulz, Herr Steinberg · E-Mail: <a href="mailto:Rosalia.Balistreri@fwg-koeln.nrw.schule" className="font-bold text-primary hover:underline">Rosalia.Balistreri@fwg-koeln.nrw.schule</a>
                        </p>
                    </div>
                    <Button onClick={() => navigate('/eltern-leitfaden')} variant="outline" className="rounded-full shrink-0">
                        Zum Eltern-Leitfaden
                    </Button>
                </div>

                <div className="text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln
                </div>
            </div>
        </div>
    );
}
