import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { BarChart3, TrendingUp, Users, FileText, AlertTriangle, Sparkles, Award, Euro, Landmark, MessageSquare, Star, CheckCircle } from 'lucide-react';

interface GradeDist {
    grade: string;
    count: number;
}

interface SubjectDist {
    subject: string;
    count: number;
}

interface PriceDist {
    range: string;
    count: number;
}

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState({
        total: 0,
        students: 0,
        parents: 0,
        admins: 0,
        verified: 0,
        banned: 0
    });
    const [adStats, setAdStats] = useState({
        total: 0,
        offers: 0,
        searches: 0,
        active: 0,
        boosted: 0
    });
    const [engagementStats, setEngagementStats] = useState({
        totalRequests: 0,
        pendingRequests: 0,
        acceptedRequests: 0,
        rejectedRequests: 0,
        totalReviews: 0,
        avgRating: 0
    });
    const [reportsCount, setReportsCount] = useState({
        total: 0,
        open: 0,
        resolved: 0
    });

    const [gradeDistribution, setGradeDistribution] = useState<GradeDist[]>([]);
    const [subjectDistribution, setSubjectDistribution] = useState<SubjectDist[]>([]);
    const [priceDistribution, setPriceDistribution] = useState<PriceDist[]>([]);

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
                .select('type, subjects, is_active, price_details, boosted, boosted_until');
            if (adsError) throw adsError;

            // 3. Fetch requests stats
            const { data: requests, error: requestsError } = await supabase
                .from('ad_requests')
                .select('status');
            if (requestsError && requestsError.code !== '42P01') throw requestsError;

            // 4. Fetch review stats
            const { data: reviews, error: reviewsError } = await supabase
                .from('reviews')
                .select('rating');
            if (reviewsError && reviewsError.code !== '42P01') throw reviewsError;

            // 5. Fetch reports stats
            const { data: reports, error: reportsError } = await supabase
                .from('reports')
                .select('status');
            if (reportsError && reportsError.code !== '42P01') throw reportsError;

            // Calculate profile metrics
            if (profiles) {
                let total = profiles.length;
                let verified = 0;
                let banned = 0;
                let students = 0;
                let parents = 0;
                let admins = 0;
                const gradesMap: Record<string, number> = {};

                profiles.forEach(p => {
                    if (p.is_verified) verified++;
                    if (p.is_banned) banned++;
                    if (p.role === 'student') students++;
                    if (p.role === 'parent') parents++;
                    if (p.role === 'sv_admin') admins++;
                    if (p.grade_level) {
                        gradesMap[p.grade_level] = (gradesMap[p.grade_level] || 0) + 1;
                    }
                });

                setUserStats({ total, students, parents, admins, verified, banned });

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

            // Calculate ad metrics & price range
            if (ads) {
                let total = ads.length;
                let offers = 0;
                let searches = 0;
                let active = 0;
                let boosted = 0;
                const subjectsMap: Record<string, number> = {};
                const priceRanges = {
                    'Kostenlos': 0,
                    'Unter 10€': 0,
                    '10€ - 15€': 0,
                    'Über 15€': 0,
                    'Verhandlungsbasis (VB)': 0
                };

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

                    // Price ranges
                    const mode = ad.price_details?.mode;
                    const value = Number(ad.price_details?.value || 0);

                    if (mode === 'free') {
                        priceRanges['Kostenlos']++;
                    } else if (mode === 'vb') {
                        priceRanges['Verhandlungsbasis (VB)']++;
                    } else if (mode === 'fixed') {
                        if (value < 10) {
                            priceRanges['Unter 10€']++;
                        } else if (value >= 10 && value <= 15) {
                            priceRanges['10€ - 15€']++;
                        } else {
                            priceRanges['Über 15€']++;
                        }
                    }
                });

                setAdStats({ total, offers, searches, active, boosted });

                // Construct price distribution list
                setPriceDistribution(
                    Object.entries(priceRanges).map(([range, count]) => ({ range, count }))
                );

                // Construct subject distribution list (top 8)
                const sortedSubjects = Object.entries(subjectsMap)
                    .map(([subject, count]) => ({ subject, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8);
                setSubjectDistribution(sortedSubjects);
            }

            // Calculate engagement metrics
            if (requests) {
                const totalRequests = requests.length;
                const pendingRequests = requests.filter(r => r.status === 'pending').length;
                const acceptedRequests = requests.filter(r => r.status === 'accepted').length;
                const rejectedRequests = requests.filter(r => r.status === 'rejected').length;

                let totalReviews = 0;
                let avgRating = 0;

                if (reviews && reviews.length > 0) {
                    totalReviews = reviews.length;
                    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
                    avgRating = sum / totalReviews;
                }

                setEngagementStats({
                    totalRequests,
                    pendingRequests,
                    acceptedRequests,
                    rejectedRequests,
                    totalReviews,
                    avgRating
                });
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
    const maxPriceCount = Math.max(...priceDistribution.map(p => p.count), 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <BarChart3 className="text-primary-hover" size={24} /> Analytics & Statistik
                </h1>
                <p className="text-gray-500 text-sm mt-1">Ausführliche Live-Analysen über Nachhilfevermittlungen, Benutzeraktivitäten und Preise.</p>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-indigo-950/10 dark:to-blue-950/5">
                    <CardContent className="p-5 space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Registrierte Nutzer</span>
                        <div className="text-3xl font-black">{userStats.total}</div>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                            {userStats.students} Schüler · {userStats.parents} Eltern
                        </span>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-emerald-50/50 to-green-50/30 dark:from-emerald-950/10 dark:to-green-950/5">
                    <CardContent className="p-5 space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Aktive Anzeigen</span>
                        <div className="text-3xl font-black">{adStats.active}</div>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                            {adStats.offers} Angebote · {adStats.searches} Gesuche
                        </span>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-950/10 dark:to-pink-950/5">
                    <CardContent className="p-5 space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Erfolgte Anfragen</span>
                        <div className="text-3xl font-black">{engagementStats.totalRequests}</div>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                            {engagementStats.acceptedRequests} angenommen · {engagementStats.pendingRequests} offen
                        </span>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/5">
                    <CardContent className="p-5 space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Durchschn. Bewertung</span>
                        <div className="text-3xl font-black flex items-center gap-1.5">
                            <Star className="text-yellow-500 shrink-0" size={20} fill="currentColor" />
                            {engagementStats.avgRating > 0 ? engagementStats.avgRating.toFixed(1) : '--'}
                        </div>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                            aus insgesamt {engagementStats.totalReviews} Bewertungen
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* Main Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Stufen-Verteilung */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Award size={18} className="text-primary-hover" /> Stufen-Verteilung
                        </CardTitle>
                        <CardDescription>Anzahl der verifizierten Schüler nach Klassenstufen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {gradeDistribution.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs">Keine Stufendaten vorhanden.</div>
                        ) : (
                            gradeDistribution.map(g => {
                                const percentage = (g.count / maxGradeCount) * 100;
                                return (
                                    <div key={g.grade} className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span>{['EF', 'Q1', 'Q2'].includes(g.grade) ? `Stufe ${g.grade}` : `Klasse ${g.grade}`}</span>
                                            <span className="text-gray-500">{g.count} Schüler</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-primary/70 to-primary-hover rounded-full transition-all duration-550" 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* 2. Top-Nachhilfefächer */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary-hover" /> Beliebte Schulfächer
                        </CardTitle>
                        <CardDescription>Häufigkeit der Fächer in Angeboten und Gesuchen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {subjectDistribution.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs">Keine Anzeigendaten vorhanden.</div>
                        ) : (
                            subjectDistribution.map(s => {
                                const percentage = (s.count / maxSubjectCount) * 100;
                                return (
                                    <div key={s.subject} className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="capitalize">{s.subject}</span>
                                            <span className="text-gray-500">{s.count} Anzeigen</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-550" 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* 3. Preis-Verteilung */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Euro size={18} className="text-primary-hover" /> Preisstrukturen
                        </CardTitle>
                        <CardDescription>Aufteilung der angegebenen Stundensätze (€ / 45 Min)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {priceDistribution.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs">Keine Preisdaten vorhanden.</div>
                        ) : (
                            priceDistribution.map(p => {
                                const percentage = (p.count / maxPriceCount) * 100;
                                return (
                                    <div key={p.range} className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span>{p.range}</span>
                                            <span className="text-gray-500">{p.count} Anzeigen</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-550" 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* 4. Plattform-Engagement & Verifizierung */}
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <CheckCircle size={18} className="text-primary-hover" /> Plattform-Status & Verifizierung
                        </CardTitle>
                        <CardDescription>Zustand von Verifizierungen, Meldungen und Raten</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm font-semibold">
                        <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
                            <span className="text-gray-500">Verifizierungsrate:</span>
                            <span className="text-green-650 dark:text-green-450">
                                {userStats.total > 0 ? Math.round((userStats.verified / userStats.total) * 100) : 0}% ({userStats.verified} von {userStats.total})
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
                            <span className="text-gray-500">Erfolgsquote (Anfragen angenommen):</span>
                            <span className="text-blue-650 dark:text-blue-450">
                                {engagementStats.totalRequests > 0 ? Math.round((engagementStats.acceptedRequests / engagementStats.totalRequests) * 100) : 0}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
                            <span className="text-gray-500">Unbehandelte Meldungen:</span>
                            <span className={reportsCount.open > 0 ? 'text-red-500' : 'text-gray-500'}>
                                {reportsCount.open} offene Meldungen
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-500">Admins im Dienst:</span>
                            <span>{userStats.admins} SV-Admins</span>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
