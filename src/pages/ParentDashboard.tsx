import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/Dialog';
import {
    Users,
    Plus,
    FileText,
    MessageSquare,
    Star,
    Bell,
    UserX,
    TrendingUp,
    Shield,
    Trash2,
    Calendar,
    ArrowUpRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import ParentLinkFlow from '../components/ParentLinkFlow';

interface ChildData {
    link_id: string;
    profile: {
        id: string;
        full_name: string | null;
        display_name: string | null;
        grade_level: string | null;
        avatar_url: string | null;
        average_rating: number;
    };
    stats: {
        adsCount: number;
        requestsCount: number;
        reviewsCount: number;
    };
    recentActivity: Array<{
        id: string;
        type: 'ad' | 'request' | 'review';
        title: string;
        description: string;
        timestamp: string;
    }>;
    preferences: {
        notify_new_ads: boolean;
        notify_requests: boolean;
        notify_ratings: boolean;
    };
}

export default function ParentDashboard() {
    const { user, profile } = useAuth();
    const [children, setChildren] = useState<ChildData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLinkFlowOpen, setIsLinkFlowOpen] = useState(false);
    const [selectedLinkToDelete, setSelectedLinkToDelete] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        if (user) {
            fetchChildrenData();
        }
    }, [user]);

    const fetchChildrenData = async () => {
        setLoading(true);
        try {
            // 1. Fetch active parent links
            const { data: links, error: linksError } = await supabase
                .from('parent_links')
                .select('*')
                .eq('parent_id', user?.id)
                .eq('status', 'active');

            if (linksError) throw linksError;

            if (!links || links.length === 0) {
                setChildren([]);
                setLoading(false);
                return;
            }

            const childrenDataResolved: ChildData[] = await Promise.all(links.map(async (link) => {
                // 2. Fetch child profile
                const { data: childProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', link.child_id)
                    .single();

                if (profileError) throw profileError;

                // 3. Fetch statistics
                const { count: adsCount } = await supabase
                    .from('ads')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', link.child_id);

                const { count: requestsCount } = await supabase
                    .from('ad_requests')
                    .select('*', { count: 'exact', head: true })
                    .or(`requester_id.eq.${link.child_id},owner_id.eq.${link.child_id}`);

                const { count: reviewsCount } = await supabase
                    .from('reviews')
                    .select('*', { count: 'exact', head: true })
                    .eq('target_user_id', link.child_id);

                // 4. Fetch recent activity (union-like from Ads, Requests, and Reviews)
                const activities: ChildData['recentActivity'] = [];

                // Ads
                const { data: ads } = await supabase
                    .from('ads')
                    .select('id, short_description, created_at, type')
                    .eq('user_id', link.child_id)
                    .order('created_at', { ascending: false })
                    .limit(3);

                ads?.forEach(ad => {
                    activities.push({
                        id: ad.id,
                        type: 'ad',
                        title: ad.type === 'offer' ? 'Neue Nachhilfe angeboten' : 'Neue Nachhilfesuche gestartet',
                        description: ad.short_description || '',
                        timestamp: ad.created_at
                    });
                });

                // Requests
                const { data: requests } = await supabase
                    .from('ad_requests')
                    .select('id, status, created_at, ads(short_description)')
                    .or(`requester_id.eq.${link.child_id},owner_id.eq.${link.child_id}`)
                    .order('created_at', { ascending: false })
                    .limit(3);

                requests?.forEach(req => {
                    activities.push({
                        id: req.id,
                        type: 'request',
                        title: 'Anfrage-Aktivität',
                        description: `Nachhilfestunden-Anfrage zu "${(req.ads as any)?.short_description || 'Anzeige'}" (${req.status})`,
                        timestamp: req.created_at
                    });
                });

                // Reviews
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('id, rating, comment, created_at, author:author_id(display_name)')
                    .eq('target_user_id', link.child_id)
                    .order('created_at', { ascending: false })
                    .limit(3);

                reviews?.forEach(rev => {
                    activities.push({
                        id: rev.id,
                        type: 'review',
                        title: `Bewertung erhalten (${rev.rating} Sterne)`,
                        description: rev.comment ? `"${rev.comment}" von ${((Array.isArray(rev.author) ? rev.author[0] : rev.author) as any)?.display_name || 'Mitschüler'}` : 'Kein Kommentar hinterlassen',
                        timestamp: rev.created_at
                    });
                });

                // Sort activities by timestamp descending
                activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                return {
                    link_id: link.id,
                    profile: {
                        id: childProfile.id,
                        full_name: childProfile.full_name,
                        display_name: childProfile.display_name || `${childProfile.first_name} ${childProfile.last_name}`,
                        grade_level: childProfile.grade_level,
                        avatar_url: childProfile.avatar_url,
                        average_rating: childProfile.average_rating || 0
                    },
                    stats: {
                        adsCount: adsCount || 0,
                        requestsCount: requestsCount || 0,
                        reviewsCount: reviewsCount || 0
                    },
                    recentActivity: activities.slice(0, 5),
                    preferences: {
                        notify_new_ads: link.permissions?.can_receive_notifications ?? true,
                        notify_requests: link.permissions?.can_receive_notifications ?? true,
                        notify_ratings: link.permissions?.can_receive_notifications ?? true
                    }
                };
            }));

            setChildren(childrenDataResolved);
        } catch (error: any) {
            console.error('Error loading parent dashboard data:', error);
            toast.error('Daten konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotification = async (childId: string, prefKey: keyof ChildData['preferences'], currentVal: boolean) => {
        try {
            const childIndex = children.findIndex(c => c.profile.id === childId);
            if (childIndex === -1) return;

            const updatedPreferences = {
                ...children[childIndex].preferences,
                [prefKey]: !currentVal
            };

            const { error } = await supabase
                .from('parent_links')
                .update({
                    permissions: {
                        can_view_ads: true,
                        can_view_ratings: true,
                        can_view_activity: true,
                        can_receive_notifications: updatedPreferences.notify_new_ads
                    }
                })
                .eq('id', children[childIndex].link_id);

            if (error) throw error;

            setChildren(children.map((c, idx) => 
                idx === childIndex ? { ...c, preferences: updatedPreferences } : c
            ));
            toast.success('Einstellungen aktualisiert');
        } catch (err: any) {
            toast.error('Änderung konnte nicht gespeichert werden: ' + err.message);
        }
    };

    const handleRemoveLink = async () => {
        if (!selectedLinkToDelete) return;
        try {
            const { error } = await supabase
                .from('parent_links')
                .delete()
                .eq('id', selectedLinkToDelete.id);

            if (error) throw error;

            toast.success(`Verknüpfung zu ${selectedLinkToDelete.name} aufgehoben.`);
            setChildren(children.filter(c => c.link_id !== selectedLinkToDelete.id));
            setSelectedLinkToDelete(null);
        } catch (err: any) {
            toast.error('Aufheben fehlgeschlagen: ' + err.message);
        }
    };

    if (profile && profile.role !== 'parent' && profile.role !== 'sv_admin') {
        return (
            <div className="max-w-md mx-auto py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <Shield size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Zugriff verweigert</h2>
                <p className="text-gray-500 text-sm">
                    Du musst als Elternteil registriert sein, um das Eltern-Dashboard zu nutzen.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary-hover">
                            <Users size={20} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Eltern-Dashboard</h1>
                    </div>
                    <p className="text-gray-500 text-sm">Behalte den Überblick über die Nachhilfe-Aktivitäten deines Kindes.</p>
                </div>
                <Button onClick={() => setIsLinkFlowOpen(true)} className="rounded-2xl gap-2 font-bold h-11 bg-primary text-black">
                    <Plus size={18} /> Kind verknüpfen
                </Button>
            </div>

            {loading ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 font-medium">Lade Kinder-Aktivitäten...</p>
                </div>
            ) : children.length === 0 ? (
                <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 py-16 text-center">
                    <CardContent className="space-y-4 max-w-md mx-auto">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                            <Users size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Keine Kinder verknüpft</h2>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Du hast noch kein Schülerkonto mit deinem Elternteil-Account verknüpft. Bitte klicke auf "Kind verknüpfen", um dein Kind einzuladen.
                        </p>
                        <Button onClick={() => setIsLinkFlowOpen(true)} className="rounded-2xl font-bold bg-primary text-black">
                            Jetzt Kind verknüpfen
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {children.map(child => (
                        <div key={child.profile.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Left card: Child profile & quick stats */}
                            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 lg:col-span-1">
                                <CardContent className="p-6 space-y-6">
                                    {/* Profile summary */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold text-xl flex items-center justify-center shrink-0">
                                            {child.profile.avatar_url ? (
                                                <img src={child.profile.avatar_url} className="w-14 h-14 rounded-2xl object-cover" />
                                            ) : (
                                                child.profile.display_name?.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-lg">{child.profile.display_name}</h3>
                                            <p className="text-xs text-gray-400 font-semibold mt-0.5">Klassenstufe: {child.profile.grade_level || '--'}</p>
                                        </div>
                                    </div>

                                    {/* Ratings if available */}
                                    {child.profile.average_rating > 0 && (
                                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-1.5 rounded-xl border border-yellow-100 dark:border-yellow-900/40 w-fit text-xs text-yellow-700 font-bold">
                                            <Star size={14} fill="currentColor" />
                                            {child.profile.average_rating.toFixed(1)} / 5 Sterne
                                        </div>
                                    )}

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-3 gap-3 border-t border-b dark:border-gray-800 py-4">
                                        <div className="text-center">
                                            <span className="text-xs text-gray-400 block mb-0.5">Anzeigen</span>
                                            <span className="font-extrabold text-lg flex items-center justify-center gap-1 text-gray-800 dark:text-gray-200">
                                                <FileText size={14} className="text-green-500" />
                                                {child.stats.adsCount}
                                            </span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-xs text-gray-400 block mb-0.5">Anfragen</span>
                                            <span className="font-extrabold text-lg flex items-center justify-center gap-1 text-gray-800 dark:text-gray-200">
                                                <MessageSquare size={14} className="text-blue-500" />
                                                {child.stats.requestsCount}
                                            </span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-xs text-gray-400 block mb-0.5">Reviews</span>
                                            <span className="font-extrabold text-lg flex items-center justify-center gap-1 text-gray-800 dark:text-gray-200">
                                                <Star size={14} className="text-amber-500" />
                                                {child.stats.reviewsCount}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Notification settings for this child */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Bell size={14} /> Benachrichtigungs-Präferenzen
                                        </h4>
                                        <div className="space-y-3">
                                            {[
                                                { key: 'notify_new_ads', label: 'Bei neuer Nachhilfe-Anzeige' },
                                                { key: 'notify_requests', label: 'Bei neuen Kontaktanfragen' },
                                                { key: 'notify_ratings', label: 'Bei neuen Bewertungen' },
                                            ].map((pref) => (
                                                <label key={pref.key} className="flex justify-between items-center text-sm cursor-pointer select-none">
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">{pref.label}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={(child.preferences as any)[pref.key]}
                                                        onChange={() => handleToggleNotification(child.profile.id, pref.key as any, (child.preferences as any)[pref.key])}
                                                        className="w-4 h-4 rounded text-primary accent-primary"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Remove link */}
                                    <Button
                                        onClick={() => setSelectedLinkToDelete({ id: child.link_id, name: child.profile.display_name || 'Kind' })}
                                        variant="outline"
                                        className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-100 dark:border-red-950/40 rounded-2xl gap-2 text-xs font-bold"
                                    >
                                        <UserX size={14} /> Verknüpfung aufheben
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Right card: Activity feed */}
                            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-gray-900 lg:col-span-2">
                                <CardHeader className="border-b dark:border-gray-800">
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                        <TrendingUp size={16} className="text-primary-hover" />
                                        Aktivitäts-Verlauf (Letzte Aktionen)
                                    </h3>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y dark:divide-gray-800">
                                        {child.recentActivity.length === 0 ? (
                                            <p className="text-gray-500 text-sm text-center py-16 italic">Noch keine Aktivitäten registriert.</p>
                                        ) : (
                                            child.recentActivity.map((act) => (
                                                <div key={act.id} className="p-5 flex items-start gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                    <div className={cn(
                                                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm',
                                                        act.type === 'ad' && 'bg-green-50 text-green-600 dark:bg-green-950/20',
                                                        act.type === 'request' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/20',
                                                        act.type === 'review' && 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                                                    )}>
                                                        {act.type === 'ad' && <FileText size={16} />}
                                                        {act.type === 'request' && <MessageSquare size={16} />}
                                                        {act.type === 'review' && <Star size={16} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-0.5">
                                                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
                                                            {act.title}
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                            {act.description}
                                                        </p>
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 pt-1 font-semibold">
                                                            <Calendar size={10} />
                                                            {new Date(act.timestamp).toLocaleString('de-DE')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* Parent Link Flow Modal */}
            <ParentLinkFlow
                isOpen={isLinkFlowOpen}
                onClose={() => setIsLinkFlowOpen(false)}
                onSuccess={fetchChildrenData}
            />

            {/* Delete verification Dialog */}
            <Dialog open={!!selectedLinkToDelete} onOpenChange={() => setSelectedLinkToDelete(null)}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 size={20} />
                            Verknüpfung aufheben?
                        </DialogTitle>
                        <DialogDescription>
                            Bist du sicher, dass du die Verknüpfung zu {selectedLinkToDelete?.name} löschen möchtest? 
                            Du kannst danach keine Statistiken oder Verläufe mehr einsehen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedLinkToDelete(null)} className="rounded-xl">Abbrechen</Button>
                        <Button onClick={handleRemoveLink} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">Verknüpfung löschen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
