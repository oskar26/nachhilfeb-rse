import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { BarChart3, TrendingUp, Users, FileText, AlertTriangle, Sparkles, Award } from 'lucide-react';

interface GradeDist {
    grade: string;
    count: number;
}

interface SubjectDist {
    subject: string;
    count: number;
}

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState({
        total: 0,
        verified: 0,
        banned: 0,
        admins: 0
    });
    const [adStats, setAdStats] = useState({
        total: 0,
        offers: 0,
        searches: 0,
        active: 0,
        boosted: 0
    });
    const [reportsCount, setReportsCount] = useState({
        total: 0,
        open: 0,
        resolved: 0
    });
    const [gradeDistribution, setGradeDistribution] = useState<GradeDist[]>([]);
    const [subjectDistribution, setSubjectDistribution] = useState<SubjectDist[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // 1. Fetch profile stats
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('grade_level, role, is_verified, is_banned');

            if (profilesError) throw profilesError;

            // 2. Fetch ad stats
            const { data: ads, error: adsError } = await supabase
                .from('ads')
                .select('type, subjects, is_active, boosted, boosted_until');

            if (adsError) throw adsError;

            // 3. Fetch reports stats
            const { data: reports, error: reportsError } = await supabase
                .from('reports')
                .select('status');

            if (reportsError && reportsError.code !== '42P01') throw reportsError; // Ignore if table missing

            // Calculate profile metrics
            if (profiles) {
                let total = profiles.length;
                let verified = 0;
                let banned = 0;
                let admins = 0;
                const gradesMap: Record<string, number> = {};

                profiles.forEach(p => {
                    if (p.is_verified) verified++;
                    if (p.is_banned) banned++;
                    if (p.role === 'sv_admin') admins++;
                    if (p.grade_level) {
                        gradesMap[p.grade_level] = (gradesMap[p.grade_level] || 0) + 1;
                    }
                });

                setUserStats({ total, verified, banned, admins });

                // Construct grade distribution list
                const sortedGrades = Object.entries(gradesMap)
                    .map(([grade, count]) => ({ grade, count }))
                    .sort((a, b) => {
                        const order = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];
                        const idxA = order.indexOf(a.grade);
                        const idxB = order.indexOf(b.grade);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return a.grade.localeCompare(b.grade);
                    });
                setGradeDistribution(sortedGrades);
            }

            // Calculate ad metrics
            if (ads) {
                let total = ads.length;
                let offers = 0;
                let searches = 0;
                let active = 0;
                let boosted = 0;
                const subjectsMap: Record<string, number> = {};

                const now = new Date();

                ads.forEach(ad => {
                    if (ad.type === 'offer') offers++;
                    if (ad.type === 'search') searches++;
                    if (ad.is_active) active++;
                    
                    const isBoostActive = ad.boosted && ad.boosted_until && new Date(ad.boosted_until) > now;
                    if (isBoostActive) boosted++;

                    if (Array.isArray(ad.subjects)) {
                        ad.subjects.forEach((subj: string) => {
                            subjectsMap[subj] = (subjectsMap[subj] || 0) + 1;
                        });
                    }
                });

                setAdStats({ total, offers, searches, active, boosted });

                // Construct subject distribution list (top 6)
                const sortedSubjects = Object.entries(subjectsMap)
                    .map(([subject, count]) => ({ subject, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 6);
                setSubjectDistribution(sortedSubjects);
            }

            // Calculate reports metrics
            if (reports) {
                let total = reports.length;
                let open = reports.filter(r => r.status === 'open').length;
                let resolved = reports.filter(r => r.status === 'resolved').length;
                setReportsCount({ total, open, resolved });
            }

        } catch (err) {
            console.error('Error fetching analytics details:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1);
    const maxSubjectCount = Math.max(...subjectDistribution.map(s => s.count), 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <BarChart3 className="text-primary-hover" size={24} /> Analytics & Statistik
                </h1>
                <p className="text-gray-500 text-sm mt-1">Echtzeit-Einblicke in die Plattformnutzung</p>
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Users Stat */}
                <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-indigo-950/10 dark:to-blue-950/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Users size={16} className="text-blue-500" /> Registrierte Benutzer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-4xl font-extrabold tracking-tight">{userStats.total}</div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                                {userStats.verified} verifiziert
                            </span>
                            <span className="bg-purple-100 text-purple-750 dark:bg-purple-950/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                                {userStats.admins} Admins
                            </span>
                            {userStats.banned > 0 && (
                                <span className="bg-red-100 text-red-750 dark:bg-red-950/30 dark:text-red-400 px-2 py-0.5 rounded-full text-red-500">
                                    {userStats.banned} gesperrt
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Ads Stat */}
                <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-emerald-50/50 to-green-50/30 dark:from-emerald-950/10 dark:to-green-950/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <FileText size={16} className="text-emerald-500" /> Erstellte Anzeigen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-4xl font-extrabold tracking-tight">{adStats.total}</div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                {adStats.offers} Angebote
                            </span>
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                {adStats.searches} Gesuche
                            </span>
                            {adStats.boosted > 0 && (
                                <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Sparkles size={10} /> {adStats.boosted} Empfohlen
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Reports Stat */}
                <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" /> System-Meldungen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-4xl font-extrabold tracking-tight">{reportsCount.total}</div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                                {reportsCount.open} offen
                            </span>
                            <span className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                {reportsCount.resolved} gelöst
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Grade Distribution Bar Chart */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Award size={18} className="text-primary-hover" /> Stufen-Verteilung
                        </CardTitle>
                        <CardDescription>Anzahl der Benutzer nach Jahrgangsstufen</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {gradeDistribution.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-xs">Keine Stufendaten vorhanden.</div>
                        ) : (
                            <div className="space-y-4">
                                {gradeDistribution.map(g => {
                                    const percentage = (g.count / maxGradeCount) * 100;
                                    return (
                                        <div key={g.grade} className="space-y-1">
                                            <div className="flex justify-between text-xs font-semibold px-1">
                                                <span>{['EF', 'Q1', 'Q2'].includes(g.grade) ? `Stufe ${g.grade}` : `Klasse ${g.grade}`}</span>
                                                <span className="text-gray-500">{g.count} Schüler</span>
                                            </div>
                                            <div className="w-full h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-primary/70 to-primary-hover rounded-full transition-all duration-500" 
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Popular Subjects Chart */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary-hover" /> Top-Nachhilfefächer
                        </CardTitle>
                        <CardDescription>Die am häufigsten nachgefragten/angebotenen Fächer</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {subjectDistribution.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-xs">Keine Anzeigendaten vorhanden.</div>
                        ) : (
                            <div className="space-y-4">
                                {subjectDistribution.map(s => {
                                    const percentage = (s.count / maxSubjectCount) * 100;
                                    return (
                                        <div key={s.subject} className="space-y-1">
                                            <div className="flex justify-between text-xs font-semibold px-1">
                                                <span className="capitalize">{s.subject}</span>
                                                <span className="text-gray-500">{s.count} Nennungen</span>
                                            </div>
                                            <div className="w-full h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-emerald-450/70 to-emerald-500 rounded-full transition-all duration-500" 
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
