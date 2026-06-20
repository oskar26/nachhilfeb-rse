import { ChevronLeft, ShieldCheck, Heart, BookOpen, AlertCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function ParentGuide() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-8">
                
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>

                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Leitfaden für Eltern</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Transparenz und Sicherheit stehen bei der FWG Nachhilfebörse an erster Stelle. Erfahren Sie, wie wir Ihr Kind schützen und den Vermittlungsprozess begleiten.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Security Section */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border dark:border-gray-800 shadow-sm">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-6">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-4">Sicherheit & Verifizierung</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                            Die Nachhilfebörse ist ein geschützter Raum. Nur Schülerinnen und Schüler des Friedrich-Wilhelms-Gymnasiums haben Zugang.
                        </p>
                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400 list-disc pl-4">
                            <li>Jeder Account muss persönlich im SV-Raum per Schülerausweis verifiziert werden, bevor Anzeigen erstellt werden können.</li>
                            <li>Die Plattform ist nicht für schulfremde Personen zugänglich.</li>
                            <li>Nachhilfe-Treffen finden meist direkt in der Schule statt (z.B. Bibliothek, Mensa).</li>
                        </ul>
                    </div>

                    {/* Quality Section */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border dark:border-gray-800 shadow-sm">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                            <BookOpen size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-4">Qualität der Nachhilfe</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                            Wir fördern das Prinzip "Schüler helfen Schülern". Dies stärkt nicht nur das Wissen, sondern auch die Schulgemeinschaft.
                        </p>
                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400 list-disc pl-4">
                            <li>Anbieter sind in der Regel engagierte Schüler der Oberstufe.</li>
                            <li>Zusätzlich gibt es das kostenlose "8er Coaching" für die Stufen 5 und 6.</li>
                            <li>Preise werden fair von Schülern für Schüler gestaltet (oft Festpreise um 10-15€ pro 45 Min).</li>
                        </ul>
                    </div>

                    {/* Awareness Section */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border dark:border-gray-800 shadow-sm">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6">
                            <Heart size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-4">Awareness & Jugendschutz</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                            Wir dulden kein unangemessenes Verhalten auf unserer Plattform. Das SV-Team moderiert aktiv.
                        </p>
                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400 list-disc pl-4">
                            <li>Integrierter Meldungskatalog: Jede Anzeige und jedes Profil kann bei Auffälligkeiten mit ausführlicher Begründung gemeldet werden.</li>
                            <li>Das SV-Admin-Team sichtet Meldungen täglich und kann Nutzer verwarnen oder sofort sperren.</li>
                        </ul>
                    </div>

                    {/* Contact Section */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border dark:border-gray-800 shadow-sm">
                        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center mb-6">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-4">Kontakt für Eltern</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                            Haben Sie Fragen zur Plattform, zum Förderunterricht oder ein konkretes Anliegen bezüglich des Jugendschutzes?
                        </p>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p><strong>E-Mail SV-Team:</strong> sv@fwg-koeln.nrw.schule</p>
                            <p><strong>Lerncoaching:</strong> lerncoaching@fwg-koeln.nrw.schule</p>
                            <p><strong>Förderunterricht:</strong> foerderunterricht@fwg-koeln.nrw.schule</p>
                        </div>
                    </div>
                </div>

                {/* Parent account steps and CTA */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-900/40 p-8 rounded-3xl border dark:border-gray-800 shadow-sm space-y-6 text-center">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2">
                        <Users className="text-primary-hover" size={24} /> Eltern-Account einrichten
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm max-w-2xl mx-auto leading-relaxed">
                        Sie können als Elternteil einen Account registrieren und diesen mit dem Konto Ihres Kindes verknüpfen. 
                        Dadurch erhalten Sie Einsicht in die erstellten Anzeigen, Bewertungen und erhalten Benachrichtigungen über Lernfortschritte.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left py-4">
                        <div className="bg-white dark:bg-gray-950 p-4 rounded-2xl border dark:border-gray-800 space-y-2">
                            <span className="w-7 h-7 bg-primary text-black font-bold rounded-full flex items-center justify-center text-xs">1</span>
                            <span className="font-bold text-sm block">Registrieren</span>
                            <span className="text-xs text-gray-500 block leading-normal">Erstellen Sie ein Elternkonto mit dem SV-Einladungscode für Eltern.</span>
                        </div>
                        <div className="bg-white dark:bg-gray-950 p-4 rounded-2xl border dark:border-gray-800 space-y-2">
                            <span className="w-7 h-7 bg-primary text-black font-bold rounded-full flex items-center justify-center text-xs">2</span>
                            <span className="font-bold text-sm block">Code anfragen</span>
                            <span className="text-xs text-gray-500 block leading-normal">Lassen Sie sich den 6-stelligen Freigabe-Code unter 'Einstellungen' Ihres Kindes zeigen.</span>
                        </div>
                        <div className="bg-white dark:bg-gray-950 p-4 rounded-2xl border dark:border-gray-800 space-y-2">
                            <span className="w-7 h-7 bg-primary text-black font-bold rounded-full flex items-center justify-center text-xs">3</span>
                            <span className="font-bold text-sm block">Verknüpfen</span>
                            <span className="text-xs text-gray-500 block leading-normal">Geben Sie den Code im Eltern-Dashboard ein. Die Verknüpfung ist sofort aktiv!</span>
                        </div>
                    </div>
                    
                    <Button onClick={() => navigate('/login')} className="bg-primary hover:bg-primary/95 text-black font-extrabold px-8 h-12 rounded-2xl shadow-md transition-all">
                        Jetzt Eltern-Account erstellen
                    </Button>
                </div>

                <div className="text-center text-sm text-gray-500 mt-12">
                    &copy; {new Date().getFullYear()} Schülervertretung des Friedrich-Wilhelms-Gymnasiums
                </div>

            </div>
        </div>
    );
}
