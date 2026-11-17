import { Link } from 'react-router-dom';
import { Github, Clock, Users, Code2, ShieldCheck, ExternalLink } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';

export default function Transparenz() {
    return (
        <StaticLayout
            title="Transparenz"
            intro="Wie diese Plattform entstanden ist · Quellcode einsehbar · KI-gestützte Entwicklung · Stand: November 2026."
        >
            <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
                <section aria-labelledby="trans-kurz" className="space-y-3 rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id="trans-kurz" className="text-lg font-semibold text-foreground">Kurz gesagt</h2>
                    <div className="space-y-2 text-base leading-7 text-muted-foreground">
                        <p>
                            Die FWG-Nachhilfebörse ist ein <strong>nicht-kommerzielles Schülerprojekt</strong> der SV.
                            Ein großer Teil des Codes und der Texte wurde <strong>mit Hilfe von KI erstellt</strong> –
                            durch sogenanntes <strong>agentisches Coding</strong>. Wir legen es hier offen,
                            damit du weißt, womit du es zu tun hast.
                        </p>
                        <p>
                            Der Quellcode liegt öffentlich auf GitHub und ist <strong>einsehbar</strong>:
                            {' '}
                            <a
                                href="https://github.com/oskar26/nachhilfeb-rse"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 break-anywhere font-semibold text-foreground hover:underline"
                            >
                                github.com/oskar26/nachhilfeb-rse <ExternalLink size={16} aria-hidden="true" />
                            </a>
                        </p>
                        <p>
                            Die Plattform ist kostenlos und nicht-kommerziell. Die Bezahlung der Nachhilfe erfolgt privat
                            zwischen den Beteiligten; die Börse vermittelt den Kontakt und nimmt keine Provision.
                        </p>
                    </div>
                </section>

                <section aria-labelledby="trans-wie" className="space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id="trans-wie" className="text-lg font-semibold text-foreground">Wie wurde gebaut?</h2>
                    <ul className="space-y-4 text-base leading-7 text-muted-foreground">
                        <li className="flex gap-3">
                            <Clock className="mt-1 shrink-0 text-foreground" size={20} aria-hidden="true" />
                            <span>
                                <strong className="text-foreground">Seit dem 7. November 2025</strong>, also <strong className="text-foreground">seit über einem Jahr</strong>,
                                entsteht die Plattform in dieser Form. Der Aufwand beläuft sich auf
                                <strong className="text-foreground">mehrere tausend Stunden</strong> Arbeit, oft in langen Entwicklungsläufen
                                über viele Tage und Wochen.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <Code2 className="mt-1 shrink-0 text-foreground" size={20} aria-hidden="true" />
                            <span>
                                <strong className="text-foreground">KI im Entwicklungsprozess:</strong> KI-Programme schreiben, ändern und testen den Code;
                                ein Mensch setzt Ziele, liest mit, verwirft und entscheidet. Features, Layout und
                                Texte entstehen so im Dialog zwischen Mensch und Maschine.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <Users className="mt-1 shrink-0 text-foreground" size={20} aria-hidden="true" />
                            <span>
                                <strong className="text-foreground">Verantwortung bleibt beim SV-Team:</strong> Über Sicherheit, Datenschutz,
                                Moderation und die Frage, was live geht, entscheiden Menschen. KI kann Fehler machen;
                                deshalb prüfen und entscheiden Menschen.
                            </span>
                        </li>
                    </ul>
                </section>

                <section aria-labelledby="trans-os" className="space-y-3 rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id="trans-os" className="text-lg font-semibold text-foreground">Quellcode &amp; Lizenz</h2>
                    <div className="space-y-2 text-base leading-7 text-muted-foreground">
                        <p>
                            Der Quellcode ist öffentlich einsehbar. Du kannst ihn lesen, Fehler melden und Verbesserungen
                            vorschlagen, auch ohne Konto.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <a
                                href="https://github.com/oskar26/nachhilfeb-rse"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                            >
                                <Github size={16} aria-hidden="true" /> Repository ansehen
                            </a>
                            <a
                                href="https://github.com/oskar26/nachhilfeb-rse/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                                Fehler melden
                            </a>
                        </div>
                        <p>
                            Private, nicht-kommerzielle Tests sind kostenlos. Wenn du die Börse kommerziell nutzen
                            oder an einer anderen Schule einsetzen willst, frag bitte vorher. Die Bedingungen stehen
                            in der <a
                                href="https://github.com/oskar26/nachhilfeb-rse/blob/main/LICENSE"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-anywhere font-semibold text-foreground hover:underline"
                            >
                                LICENSE-Datei
                            </a>.
                        </p>
                        <p>
                            Hinter dem Projekt stehen mehrere tausend Stunden Arbeit, viel Zeit, Geld und Schweiß.
                            Deshalb ist die Anfrage Fairness, keine Bürokratie.
                        </p>
                    </div>
                </section>

                <section aria-labelledby="trans-sicherheit" className="space-y-3 rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                    <h2 id="trans-sicherheit" className="text-lg font-semibold text-foreground">Was das für dich bedeutet</h2>
                    <div className="space-y-2 text-base leading-7 text-muted-foreground">
                        <p className="flex gap-3">
                            <ShieldCheck className="mt-0.5 shrink-0 text-foreground" size={20} aria-hidden="true" />
                            <span>
                                Datenschutz, Jugendschutz und Sicherheitsregeln (z.&nbsp;B. Verifikation
                                über die SV, Meldefunktion) sind bewusst gebaut und gelten unabhängig
                                davon, wer den Code geschrieben hat.
                            </span>
                        </p>
                        <p className="flex gap-3">
                            <ShieldCheck className="mt-0.5 shrink-0 text-foreground" size={20} aria-hidden="true" />
                            <span>
                                Trotzdem: Bei KI-gestützter Entwicklung können Fehler bleiben. Findest du einen
                                Fehler oder etwas Undurchsichtiges, schreib an{' '}
                                <a href="mailto:technik@nachhilfe-sv.de" className="break-anywhere font-semibold text-foreground hover:underline">technik@nachhilfe-sv.de</a>{' '}
                                oder öffne ein Issue auf GitHub. Wir prüfen das.
                            </span>
                        </p>
                    </div>
                </section>

                <div className="rounded-xl border border-border bg-muted/60 p-6 text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Ergänzende Seiten:</strong>{' '}
                    <Link to="/impressum" className="font-semibold text-foreground hover:underline">Impressum</Link>,{' '}
                    <Link to="/datenschutz" className="font-semibold text-foreground hover:underline">Datenschutzerklärung</Link>,{' '}
                    <Link to="/nutzungsbedingungen" className="font-semibold text-foreground hover:underline">Nutzungsbedingungen</Link>.
                    Hinweis: Diese Transparenzseite ersetzt keine amtliche Kennzeichnung; sie ergänzt das Impressum.
                </div>
            </div>
        </StaticLayout>
    );
}
