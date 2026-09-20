import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import ParentLinkFlow from '../components/ParentLinkFlow';
import ParentConsentModal from '../components/ParentConsentModal';

interface ActivityItem {
    type: 'ad' | 'request' | 'review';
    title: string;
    description: string;
    timestamp: string;
}

interface ParentLink {
    id: string;
    parent_id: string;
    child_id: string;
    status: string;
    permissions: {
        can_view_ads: boolean;
        can_view_ratings: boolean;
        can_view_activity: boolean;
        can_receive_notifications: boolean;
    };
    created_at: string;
    linked_at: string | null;
    child: {
        id: string;
        full_name: string | null;
        display_name: string | null;
        first_name?: string | null;
        last_name?: string | null;
        grade_level: string | null;
        class_letter?: string | null;
        avatar_url: string | null;
        average_rating: number;
        stats?: {
            ads_count: number;
            requests_count: number;
            reviews_count: number;
        };
        recent_activity?: ActivityItem[];
    };
}

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
    recentActivity: Array<ActivityItem & { id: string }>;
    notify: boolean;
}

export default function ParentDashboard() {
    const { user, profile } = useAuth();
    const [children, setChildren] = useState<ChildData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLinkFlowOpen, setIsLinkFlowOpen] = useState(false);
    const [selectedLinkToDelete, setSelectedLinkToDelete] = useState<{ id: string; name: string } | null>(null);
    const [selectedConsentChild, setSelectedConsentChild] = useState<ChildData | null>(null);

    useEffect(() => {
        if (user) {
            fetchChildrenData();
        }
    }, [user]);

    const fetchChildrenData = async () => {
        setLoading(true);
        try {
            const { data, error } = await api.parentLinks.list();
            if (error) throw error;

            const links: ParentLink[] = (data as ParentLink[]) || [];
            const mapped: ChildData[] = links
                .filter(link => link.status === 'active')
                .map(link => {
                    const child = link.child || {};
                    const stats = child.stats || { ads_count: 0, requests_count: 0, reviews_count: 0 };
                    const activity = (child.recent_activity || []).map((a: ActivityItem, i: number) => ({
                        id: `${link.id}-${a.type}-${i}`,
                        type: a.type as ActivityItem['type'],
                        title: a.title,
                        description: a.description,
                        timestamp: a.timestamp,
                    }));
                    const permissions = link.permissions || {};
                    return {
                        link_id: link.id,
                        profile: {
                            id: child.id,
                            full_name: child.full_name ?? null,
                            display_name: child.display_name ?? child.full_name ?? 'Unbekannt',
                            grade_level: child.grade_level ?? null,
                            avatar_url: child.avatar_url ?? null,
                            average_rating: Number(child.average_rating) || 0,
                        },
                        stats: {
                            adsCount: Number(stats.ads_count) || 0,
                            requestsCount: Number(stats.requests_count) || 0,
                            reviewsCount: Number(stats.reviews_count) || 0,
                        },
                        recentActivity: activity,
                        notify: permissions.can_receive_notifications ?? true,
                    };
                });

            setChildren(mapped);
        } catch (error: any) {
            console.error('Error loading parent dashboard data:', error);
            toast.error('Daten konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotification = async (childId: string, currentVal: boolean) => {
        try {
            const childIndex = children.findIndex(c => c.profile.id === childId);
            if (childIndex === -1) return;
            const child = children[childIndex];
            const nextVal = !currentVal;

            const { error } = await api.parentLinks.update(child.link_id, {
                permissions: {
                    can_view_ads: true,
                    can_view_ratings: true,
                    can_view_activity: true,
                    can_receive_notifications: nextVal,
                },
            });
            if (error) throw error;

            setChildren(children.map((c, idx) =>
                idx === childIndex ? { ...c, notify: nextVal } : c
            ));
            toast.success('Einstellungen aktualisiert');
        } catch (err: any) {
            toast.error('Änderung konnte nicht gespeichert werden: ' + (err?.message || 'Unbekannter Fehler'));
        }
    };

    const handleRemoveLink = async () => {
        if (!selectedLinkToDelete) return;
        try {
            const { error } = await api.parentLinks.remove(selectedLinkToDelete.id);
            if (error) throw error;

            toast.success(`Verknüpfung zu ${selectedLinkToDelete.name} aufgehoben.`);
            setChildren(children.filter(c => c.link_id !== selectedLinkToDelete.id));
            setSelectedLinkToDelete(null);
        } catch (err: any) {
            toast.error('Aufheben fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler'));
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

                                    {child.profile.average_rating > 0 && (
                                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-1.5 rounded-xl border border-yellow-100 dark:border-yellow-900/40 w-fit text-xs text-yellow-700 font-bold">
                                            <Star size={14} fill="currentColor" />
                                            {child.profile.average_rating.toFixed(1)} / 5 Sterne
                                        </div>
                                    )}

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

                                    {/* Notification setting for this child */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Bell size={14} /> Benachrichtigungen
                                        </h4>
                                        <label className="flex justify-between items-center text-sm cursor-pointer select-none">
                                            <span className="font-medium text-gray-600 dark:text-gray-400">
                                                Bei neuen Anzeigen, Anfragen & Bewertungen benachrichtigen
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={child.notify}
                                                onChange={() => handleToggleNotification(child.profile.id, child.notify)}
                                                className="w-4 h-4 rounded text-primary accent-primary"
                                            />
                                        </label>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <Button
                                            onClick={() => setSelectedConsentChild(child)}
                                            variant="outline"
                                            className="w-full rounded-2xl gap-2 text-xs font-bold border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Shield size={14} className="text-primary-hover" /> Einverständniserklärung (PDF)
                                        </Button>

                                        <Button
                                            onClick={() => setSelectedLinkToDelete({ id: child.link_id, name: child.profile.display_name || 'Kind' })}
                                            variant="outline"
                                            className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-100 dark:border-red-950/40 rounded-2xl gap-2 text-xs font-bold"
                                        >
                                            <UserX size={14} /> Verknüpfung aufheben
                                        </Button>
                                    </div>
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
                                                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
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

            {/* Parent Consent Slip Modal */}
            <ParentConsentModal
                isOpen={!!selectedConsentChild}
                onClose={() => setSelectedConsentChild(null)}
                childName={selectedConsentChild?.profile.display_name || 'Kind'}
                parentName={profile?.display_name || profile?.first_name ? `${profile?.first_name} ${profile?.last_name}` : 'Elternteil'}
                gradeLevel={selectedConsentChild?.profile.grade_level}
            />
        </div>
    );
}