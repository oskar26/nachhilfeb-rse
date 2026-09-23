import { Link } from 'react-router-dom';
import { Sparkles, Github, Clock, Users, Code2, ShieldCheck, ExternalLink } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';

export default function Transparenz() {
    return (
        <StaticLayout
            title="Transparenz"
            intro="Wie diese Plattform entstanden ist · Open Source · KI-gestützte Entwicklung · Stand: September 2026."
        >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
                <section aria-labelledby="trans-kurz" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 id="trans-kurz" className="font-bold text-lg text-gray-900 dark:text-white">Kurz gesagt</h2>
                    <div className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-2">
                        <p>
                            Die FWG-Nachhilfebörse ist ein <strong>nicht-kommerzielles Schülerprojekt</strong> der SV.
                            Ein großer Teil des Codes und der Texte wurde <strong>mit Hilfe von KI erstellt</strong> —
                            durch sogenanntes <strong>agentisches Coding</strong>. Das ist kein Geheimnis, sondern
                            wird hier offengelegt, damit du weißt, womit du es zu tun hast.
                        </p>
                        <p>
                            Die Anwendung ist <strong>Open Source</strong> und liegt öffentlich auf GitHub:
                            {' '}
                            <a
                                href="https://github.com/oskar26/nachhilfeb-rse"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-amber-700 dark:text-primary hover:underline inline-flex items-center gap-1"
                            >
                                github.com/oskar26/nachhilfeb-rse <ExternalLink size={14} aria-hidden="true" />
                            </a>
                        </p>
                    </div>
                </section>

                <section aria-labelledby="trans-wie" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                    <h2 id="trans-wie" className="font-bold text-lg text-gray-900 dark:text-white">Wie wurde gebaut?</h2>
                    <ul className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-4">
                        <li className="flex gap-3">
                            <Clock className="text-primary shrink-0 mt-1" size={20} aria-hidden="true" />
                            <span>
                                <strong>Seit Ende 2025</strong>, also <strong>über zehn Monate</strong>,
                                entsteht die Plattform in dieser Form. Der Aufwand beläuft sich auf
                                <strong> mehrere hundert Stunden</strong> Arbeit — oft in langen Entwicklungsläufen
                                über viele Tage und Wochen.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <Code2 className="text-primary shrink-0 mt-1" size={20} aria-hidden="true" />
                            <span>
                                <strong>Agentisches Coding:</strong> KI-Agenten schreiben, ändern und testen den Code;
                                ein Mensch setzt Ziele, liest mit, verwirft und entscheidet. Features, Layout und
                                Texte entstehen so im Dialog zwischen Mensch und Maschine.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <Sparkles className="text-primary shrink-0 mt-1" size={20} aria-hidden="true" />
                            <span>
                                <strong>AI-generated ist AI-generated:</strong> Ein wesentlicher Anteil von Code
                                und Texten ist maschinell erzeugt oder maschinell überarbeitet. Wir geben das
                                klar zu — statt so zu tun, als wäre alles von Hand getippt.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <Users className="text-primary shrink-0 mt-1" size={20} aria-hidden="true" />
                            <span>
                                <strong>Verantwortung bleibt beim SV-Team:</strong> Über Sicherheit, Datenschutz,
                                Moderation und die Frage, was live geht, entscheiden Menschen. KI schreibt mit,
                                haftet aber nicht — und kann Fehler machen.
                            </span>
                        </li>
                    </ul>
                </section>

                <section aria-labelledby="trans-os" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 id="trans-os" className="font-bold text-lg text-gray-900 dark:text-white">Open Source</h2>
                    <div className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-2">
                        <p>
                            Der gesamte Quellcode ist öffentlich einsehbar. Jeder kann ihn lesen, Fehler melden
                            oder Verbesserungen vorschlagen — unabhängig davon, ob man sich auf der Plattform
                            anmeldet.
                        </p>
                        <p className="flex flex-wrap items-center gap-3 pt-1">
                            <a
                                href="https://github.com/oskar26/nachhilfeb-rse"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="press inline-flex items-center justify-center h-11 px-5 text-sm gap-2 rounded-full bg-black text-white hover:bg-gray-900 dark:bg-primary dark:text-black dark:hover:bg-primary-hover font-bold"
                            >
                                <Github size={16} aria-hidden="true" /> Repository ansehen
                            </a>
                            <a
                                href="https://github.com/oskar26/nachhilfeb-rse/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-11 px-5 text-sm gap-2 rounded-full border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                            >
                                Fehler melden
                            </a>
                        </p>
                    </div>
                </section>

                <section aria-labelledby="trans-sicherheit" className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                    <h2 id="trans-sicherheit" className="font-bold text-lg text-gray-900 dark:text-white">Was das für dich bedeutet</h2>
                    <div className="text-[15px] leading-7 text-gray-600 dark:text-gray-300 space-y-2">
                        <p className="flex gap-3">
                            <ShieldCheck className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" size={20} aria-hidden="true" />
                            <span>
                                Datenschutz, Jugendschutz und Sicherheitsregeln (z.&nbsp;B. Verifikation
                                über die SV, Meldefunktion) sind bewusst gebaut und gelten unabhängig
                                davon, wer den Code geschrieben hat.
                            </span>
                        </p>
                        <p className="flex gap-3">
                            <ShieldCheck className="text-amber-500 shrink-0 mt-0.5" size={20} aria-hidden="true" />
                            <span>
                                Trotzdem: Bei KI-gestützter Entwicklung kann Unschärfe bleiben. Findest du einen
                                Fehler oder etwas Undurchsichtiges, schreib an{' '}
                                <a href="mailto:technik@nachhilfe-sv.de" className="font-bold text-amber-700 dark:text-primary hover:underline">technik@nachhilfe-sv.de</a>{' '}
                                oder öffne ein Issue auf GitHub. Wir prüfen das.
                            </span>
                        </p>
                    </div>
                </section>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-900 dark:text-white">Ergänzende Seiten:</strong>{' '}
                    <Link to="/impressum" className="font-bold text-amber-700 dark:text-primary hover:underline">Impressum</Link>,{' '}
                    <Link to="/datenschutz" className="font-bold text-amber-700 dark:text-primary hover:underline">Datenschutzerklärung</Link>,{' '}
                    <Link to="/nutzungsbedingungen" className="font-bold text-amber-700 dark:text-primary hover:underline">Nutzungsbedingungen</Link>.
                    Hinweis: Diese Transparenzseite ersetzt keine amtliche Kennzeichnung; sie ergänzt das Impressum.
                </div>
            </div>
        </StaticLayout>
    );
}
