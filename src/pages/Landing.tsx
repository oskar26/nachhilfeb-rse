import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Shield,
    Filter,
    Bookmark,
    MessageSquare,
    Image as ImageIcon,
    CheckCircle,
    Smartphone,
    GraduationCap,
    ChevronDown,
    ChevronUp,
    Users,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Landing() {
    const navigate = useNavigate();
    const [infoOpen, setInfoOpen] = useState(true);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

    useEffect(() => {
        async function fetchAnnouncements() {
            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }
                setAnnouncements(data || []);
            } catch (err) {
                console.warn('Could not fetch announcements from database, using fallback:', err);
                setAnnouncements([
                    { id: '1', title: 'SV-Nachhilfebörse v2 ist live!', body: 'Neue Features: Merkliste mit Sammlungen, verbessertes Meldesystem, personalisiertes Matching und vieles mehr!', icon: '📢', created_at: '2026-06-20T12:00:00Z' },
                    { id: '2', title: 'Neue Fächer verfügbar', body: 'Ab sofort können Angebote und Suchen für die Fächer Chemie und Informatik erstellt werden.', icon: '🧪', created_at: '2026-06-18T12:00:00Z' }
                ]);
            } finally {
                setLoadingAnnouncements(false);
            }
        }
        fetchAnnouncements();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 px-6 py-4 flex justify-between items-center z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center font-bold text-primary-foreground shadow-lg">N</div>
                    <span className="text-xl font-bold tracking-tight">Nachhilfebörse</span>
                </div>
                <div className="flex gap-4">
                    <Button variant="ghost" className="font-medium hidden sm:inline-flex" onClick={() => navigate('/login')}>Anmelden</Button>
                    <Button className="rounded-full px-6 shadow-soft font-bold" onClick={() => navigate('/login')}>Registrieren</Button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-12 px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-bold tracking-widest uppercase bg-primary/10 text-primary-hover dark:text-primary rounded-full border border-primary/20">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Schülervertretung Friedrich-Wilhelms-Gymnasium Köln
                    </div>
                </motion.div>

                <motion.h1
                    className="text-center text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.1]"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                >
                    Finde Nachhilfe.<br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-500">
                        Einfacher denn je.
                    </span>
                </motion.h1>

                <motion.p
                    className="text-center text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mb-12 leading-relaxed"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                >
                    Egal ob du Unterstützung in Mathe suchst oder selbst Experte in Englisch bist: Hier kannst du Nachhilfe <b>suchen</b> und <b>anbieten</b>. Die exklusive Plattform für das FWG Köln.
                </motion.p>

                <motion.div
                    className="flex justify-center w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                >
                    <Button
                        size="lg"
                        className="rounded-full text-xl px-10 py-7 shadow-2xl hover:scale-105 transition-transform bg-primary text-black font-bold"
                        onClick={() => navigate('/login')}
                    >
                        Jetzt loslegen
                    </Button>
                </motion.div>
            </section>

            {/* Collapsible News & Announcements Section */}
            <section className="px-6 py-4 max-w-4xl mx-auto">
                <Card className="rounded-3xl border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setInfoOpen(!infoOpen)}
                        className="w-full flex items-center justify-between p-5 font-bold text-gray-800 dark:text-gray-200 text-sm focus:outline-none"
                    >
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Neu</span>
                            <span>Aktuelle Infos & Neuigkeiten</span>
                        </div>
                        {infoOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </button>
                    
                    <motion.div
                        initial={false}
                        animate={{ height: infoOpen ? 'auto' : 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 pt-1 divide-y dark:divide-gray-800/60 space-y-4">
                            {announcements.length === 0 ? (
                                <p className="text-xs text-gray-400 py-3 text-center">Keine aktuellen Neuigkeiten vorhanden.</p>
                            ) : (
                                announcements.map((item) => (
                                    <div key={item.id} className="pt-4 first:pt-2 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary-hover text-xs shrink-0 mt-0.5">
                                            {item.icon || '📢'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                                {item.body}
                                            </p>
                                            <span className="text-[9px] text-gray-400 block mt-1 font-semibold">
                                                {new Date(item.created_at).toLocaleDateString('de-DE', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </Card>
            </section>

            {/* Suchen vs Bieten vs Eltern */}
            <section className="px-6 py-12 max-w-6xl mx-auto grid md:grid-cols-3 gap-8 z-10 relative">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                        <Search size={24} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Ich suche Nachhilfe</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Du hängst in Mathe fest oder brauchst Hilfe für die nächste Klausur? Finde schnell erfahrene FWG Schüler, die dir den Stoff verständlich erklären.
                    </p>
                    <ul className="space-y-2 text-sm font-medium">
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-blue-500"/> Filtere nach Fach & Klasse</li>
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-blue-500"/> Direkter Kontakt über die App</li>
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-blue-500"/> Geprüfte Oberstufenschüler</li>
                    </ul>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-6">
                        <GraduationCap size={24} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Ich biete Nachhilfe</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Du bist stark in Sprachen oder Naturwissenschaften? Teile dein Wissen, hilf deinen Mitschülern am FWG und verdiene dir nebenbei etwas dazu.
                    </p>
                    <ul className="space-y-2 text-sm font-medium">
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Eigene Preise & Bedingungen setzen</li>
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Flexible Termine ausmachen</li>
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Bewertungen sammeln & Profilstatur</li>
                    </ul>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6">
                        <Users size={24} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Für Eltern</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Behalten Sie die Aktivitäten Ihrer Kinder im Blick. Verknüpfen Sie Ihren Eltern-Account, um Anzeigen aufzugeben und Benachrichtigungen zu erhalten.
                    </p>
                    <ul className="space-y-2 text-sm font-medium">
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-purple-500"/> Anzeigen für Kinder erstellen</li>
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-purple-500"/> Lernfortschritte & Matches einsehen</li>
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-purple-500"/> Volle Kontrolle & Benachrichtigungen</li>
                    </ul>
                </div>
            </section>

            {/* Main Screenshot Placeholder -> CSS UI Mockup */}
            <section className="px-6 pb-24 max-w-6xl mx-auto">
                <motion.div
                    className="w-full aspect-[16/10] sm:aspect-[21/9] bg-gray-50 dark:bg-[#0A0A0A] rounded-[2rem] border-8 border-white dark:border-gray-800 shadow-2xl overflow-hidden relative"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="absolute top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-6 justify-between z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-black text-sm">N</div>
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                        </div>
                        <div className="hidden sm:flex gap-4">
                            <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                        </div>
                    </div>
                    
                    <div className="pt-24 px-8 pb-8 h-full flex gap-8">
                        {/* Sidebar Mockup */}
                        <div className="hidden md:flex flex-col gap-4 w-64">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`h-12 rounded-xl flex items-center px-4 gap-3 ${i === 1 ? 'bg-primary/10 text-primary' : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'}`}>
                                    <div className={`w-5 h-5 rounded-md ${i === 1 ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                                    <div className={`h-3 rounded-full ${i === 1 ? 'w-20 bg-primary' : 'w-24 bg-gray-200 dark:bg-gray-700'}`}></div>
                                </div>
                            ))}
                        </div>

                        {/* Feed Mockup */}
                        <div className="flex-1 flex flex-col gap-6">
                            <div className="h-32 w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl border border-blue-500/30 flex items-center px-8">
                                <div className="space-y-3">
                                    <div className="h-6 w-48 bg-blue-500/50 rounded-full"></div>
                                    <div className="h-4 w-32 bg-blue-500/30 rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-10 w-24 bg-primary/20 rounded-full border border-primary/30"></div>
                                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                                                <div className="space-y-2">
                                                    <div className="h-3 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                                                    <div className="h-2 w-16 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="h-6 w-16 bg-green-100 dark:bg-green-900/30 rounded-full"></div>
                                        </div>
                                        <div className="space-y-2 mt-2">
                                            <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                                            <div className="h-3 w-4/5 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Huge Feature Grid */}
            <section className="bg-white dark:bg-[#1A1A1A] py-32 px-6">
                <div className="max-w-6xl mx-auto text-center mb-20">
                    <h2 className="text-4xl sm:text-5xl font-black mb-6">Alles, was du brauchst.</h2>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">Vom Suchen bis zum Finden – wir haben den kompletten Prozess durchdacht und optimiert.</p>
                </div>

                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureBox icon={<Filter className="text-blue-500" />} title="Entdecken & Filtern" desc="Nutze präzise Filter für Klassenstufen, Fächer und Preisspannen. Finde exakt das, was du suchst." />
                    <FeatureBox icon={<Bookmark className="text-yellow-500" />} title="Merkliste" desc="Speichere dir interessante Anzeigen ab und greife später darauf zu. Geht nichts verloren." />
                    <FeatureBox icon={<MessageSquare className="text-purple-500" />} title="Sichere Anfragen" desc="Schreibe Anbieter direkt an. Deine Kontaktdaten (Handy/Moodle) bleiben privat, bis die Anfrage akzeptiert wird." />
                    <FeatureBox icon={<Shield className="text-green-500" />} title="Verifizierte User" desc="Dank des SV-Panels sind alle Accounts echt. Keine Fake-Profile. Sicherheit durch Verifizierung im SV-Raum." />
                    <FeatureBox icon={<ImageIcon className="text-pink-500" />} title="Rich Profiles" desc="Lade ein eigenes Profilbild hoch und erstelle eine ausführliche Biografie mit dem integrierten Text-Editor." />
                    <FeatureBox icon={<Smartphone className="text-orange-500" />} title="Als App installierbar" desc="Füge die Börse zu deinem Homescreen hinzu. Funktioniert auf iOS und Android wie eine echte App (PWA)." />
                </div>
            </section>

            {/* Deep Dive Sections with Side-by-Side Screenshots */}
            <section className="py-24 px-6 overflow-hidden">
                <div className="max-w-6xl mx-auto space-y-32">

                    {/* Feature 1 */}
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 space-y-6">
                            <div className="inline-block p-3 rounded-2xl bg-primary/10 text-primary">
                                <Search size={32} />
                            </div>
                            <h3 className="text-3xl font-bold font-sans">Suchen & Filtern wie ein Profi.</h3>
                            <p className="text-lg text-gray-500 dark:text-gray-400">Das Entdecken-Feature bietet Live-Suche und Preisspannen-Regler. Du willst nur kostenlose Ehrenamt-Angebote? Ein Klick reicht. Filtere nach Fächern und Stufen sofort.</p>
                            <ul className="space-y-3">
                                {['Echtzeitsuche', 'Preisspanne-Regler', 'Mehrfache Fächerauswahl'].map(t => (
                                    <li key={t} className="flex gap-2 items-center font-bold text-sm"><CheckCircle size={16} className="text-green-500" /> {t}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="aspect-square sm:aspect-[4/3] bg-white dark:bg-gray-900 rounded-[2rem] border-8 border-gray-50 dark:border-gray-800 shadow-xl flex flex-col p-6 relative overflow-hidden">
                                <div className="flex gap-2 mb-6">
                                    <div className="h-8 w-24 bg-primary/20 rounded-full"></div>
                                    <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                                    <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 w-full bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center px-4 gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 w-1/3 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                                                <div className="h-2 w-1/2 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                                            </div>
                                            <div className="h-8 w-8 bg-primary/10 rounded-full"></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"></div>
                            </div>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="flex flex-col md:flex-row-reverse items-center gap-12">
                        <div className="flex-1 space-y-6">
                            <div className="inline-block p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-3xl font-bold font-sans">Volle Kontrolle & Privatsphäre.</h3>
                            <p className="text-lg text-gray-500 dark:text-gray-400">Trage deine Handynummer, Moodle-Namen oder E-Mail ein. Du entscheidest in den Privatsphäre-Einstellungen, wer was sieht. Das SV-Panel sorgt zusätzlich für Moderation und saubere Accounts.</p>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="aspect-square sm:aspect-[4/3] bg-white dark:bg-gray-900 rounded-[2rem] border-8 border-gray-50 dark:border-gray-800 shadow-xl flex flex-col items-center justify-center p-8 relative overflow-hidden text-center">
                                <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                                    <Shield size={48} className="text-amber-500" />
                                </div>
                                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded-full mb-4"></div>
                                <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-8"></div>
                                
                                <div className="w-full space-y-3">
                                    <div className="h-12 w-full bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between px-4">
                                        <div className="h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                                        <div className="w-10 h-5 bg-green-500 rounded-full"></div>
                                    </div>
                                    <div className="h-12 w-full bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between px-4">
                                        <div className="h-3 w-32 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Eltern Section */}
            <section className="py-24 px-6 bg-blue-50 dark:bg-blue-950/20">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Shield className="text-blue-600 dark:text-blue-400" size={32} />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">Informationen für Eltern</h2>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Die Sicherheit Ihrer Kinder hat für uns oberste Priorität. Erfahren Sie, wie wir die Plattform schützen, wer sich registrieren darf und welche Sicherheitsmaßnahmen (wie unser automatischer Schimpfwort-Filter) aktiv sind.
                    </p>
                    <div className="pt-4">
                        <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                            onClick={() => navigate('/eltern-leitfaden')}
                        >
                            Zum Eltern-Leitfaden
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer / Legal */}
            <footer className="bg-gray-100 dark:bg-gray-900 pt-20 pb-10 px-6 border-t border-gray-200 dark:border-gray-800/50 mt-10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="text-2xl font-black mb-2">Nachhilfebörse</div>
                        <p className="text-gray-500 text-sm">Die clevere Art, am FWG zu lernen.</p>
                    </div>
                    <div className="flex gap-6 text-sm font-medium text-gray-600 dark:text-gray-400 flex-wrap">
                        <button onClick={() => navigate('/impressum')} className="hover:text-black dark:hover:text-white transition-colors">Impressum</button>
                        <button onClick={() => navigate('/datenschutz')} className="hover:text-black dark:hover:text-white transition-colors">Datenschutz</button>
                        <button onClick={() => navigate('/cookies')} className="hover:text-black dark:hover:text-white transition-colors">Cookies</button>
                        <button onClick={() => navigate('/eltern-leitfaden')} className="hover:text-black dark:hover:text-white transition-colors font-bold text-primary">Eltern-Leitfaden</button>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto border-t border-gray-200 dark:border-gray-800 mt-10 pt-8 text-center text-xs text-gray-400">
                    © Schülervertretung Friedrich-Wilhelms-Gymnasium Köln {new Date().getFullYear()}. Hosting in Deutschland DSGVO konform.
                </div>
            </footer>
        </div>
    );
}

function FeatureBox({ icon, title, desc }: any) {
    return (
        <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-all hover:shadow-xl hover:-translate-y-1 text-left">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-950 shadow-soft flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{desc}</p>
        </div>
    );
}
