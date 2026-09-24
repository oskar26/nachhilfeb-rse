import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Users,
    Plus,
    ShieldCheck,
    LayoutDashboard,
    Megaphone,
    Inbox,
    Target,
    Heart,
    Star,
    Settings2,
    Sparkles,
    UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, apiErrorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { TabBar, type TabBarItem } from '../components/ui/TabBar';
import ParentLinkFlow from '../components/ParentLinkFlow';
import ParentConsentModal from '../components/ParentConsentModal';
import { ChildSwitcher } from '../components/parent/ChildSwitcher';
import { ChildHeroCard } from '../components/parent/ChildHeroCard';
import { OverviewTab } from '../components/parent/OverviewTab';
import { AdsTab } from '../components/parent/AdsTab';
import { RequestsTab } from '../components/parent/RequestsTab';
import { MatchesTab } from '../components/parent/MatchesTab';
import { FavoritesTab } from '../components/parent/FavoritesTab';
import { ReviewsTab } from '../components/parent/ReviewsTab';
import { ChildSettingsTab } from '../components/parent/ChildSettingsTab';
import type { ChildView, ParentLinkRecord, ParentPermissions } from '../components/parent/types';

const DEFAULT_PERMISSIONS: ParentPermissions = {
    can_view_ads: true,
    can_view_ratings: true,
    can_view_activity: true,
    can_receive_notifications: true
};

type TabKey = 'overview' | 'ads' | 'requests' | 'matches' | 'favorites' | 'reviews' | 'settings';

const TAB_LABELS: Record<TabKey, string> = {
    overview: 'Überblick',
    ads: 'Anzeigen',
    requests: 'Anfragen',
    matches: 'Matches',
    favorites: 'Merkliste',
    reviews: 'Bewertungen',
    settings: 'Kind-Einstellungen'
};

/**
 * Eltern-Leitstand: ein Ort für alles rund um die verknüpften Kinder –
 * Anzeigen, Anfragen, Matches, Merkliste, Bewertungen und Kind-Einstellungen.
 */
export default function ParentDashboard() {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [children, setChildren] = useState<ChildView[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string>('');
    const [tab, setTab] = useState<TabKey>('overview');

    const [isLinkFlowOpen, setIsLinkFlowOpen] = useState(false);
    const [selectedLinkToDelete, setSelectedLinkToDelete] = useState<ChildView | null>(null);
    const [selectedConsentChild, setSelectedConsentChild] = useState<ChildView | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isAllowed = profile?.role === 'parent' || profile?.role === 'sv_admin';

    const fetchChildrenData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const { data, error } = await api.parentLinks.list();
            if (error) throw error;

            const links = (data || []) as ParentLinkRecord[];
            const views: ChildView[] = links
                .filter((l) => l.status === 'active' && l.child)
                .map((l) => ({
                    linkId: l.id,
                    linkedAt: l.linked_at || l.created_at,
                    permissions: { ...DEFAULT_PERMISSIONS, ...(l.permissions || {}) },
                    profile: l.child
                }));

            setChildren(views);
            setActiveId((prev) => {
                if (prev && views.some((v) => v.profile.id === prev)) return prev;
                return views[0]?.profile.id || '';
            });
        } catch (e) {
            setFetchError(apiErrorMessage(e, 'Verknüpfte Kinder konnten nicht geladen werden.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAllowed) fetchChildrenData();
    }, [isAllowed, fetchChildrenData]);

    const activeChild = useMemo(
        () => children.find((c) => c.profile.id === activeId) || children[0] || null,
        [children, activeId]
    );

    const handleRemoveLink = async () => {
        if (!selectedLinkToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await api.parentLinks.remove(selectedLinkToDelete.linkId);
            if (error) throw error;
            toast.success('Verknüpfung wurde aufgehoben');
            setSelectedLinkToDelete(null);
            await fetchChildrenData();
        } catch {
            toast.error('Verknüpfung konnte nicht aufgehoben werden');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isAllowed) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16">
                <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                    <ShieldCheck size={32} className="mx-auto text-gray-300" aria-hidden />
                    <h1 className="mt-4 font-display text-2xl uppercase tracking-tight">Zugriff verweigert</h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Dieser Bereich ist Eltern-Accounts und der SV-Verwaltung vorbehalten.
                    </p>
                    <Button variant="primary" className="mt-6 rounded-xl font-bold" onClick={() => navigate('/')}>
                        Zur Startseite
                    </Button>
                </div>
            </div>
        );
    }

    const tabItems: TabBarItem<TabKey>[] = [
        { key: 'overview', label: TAB_LABELS.overview, icon: LayoutDashboard },
        { key: 'ads', label: TAB_LABELS.ads, icon: Megaphone, count: activeChild?.profile.stats.ads_count },
        { key: 'requests', label: TAB_LABELS.requests, icon: Inbox, count: activeChild?.profile.stats.requests_count },
        { key: 'matches', label: TAB_LABELS.matches, icon: Target },
        { key: 'favorites', label: TAB_LABELS.favorites, icon: Heart, count: activeChild?.profile.stats.favorites_count },
        { key: 'reviews', label: TAB_LABELS.reviews, icon: Star, count: activeChild?.profile.stats.reviews_count },
        { key: 'settings', label: TAB_LABELS.settings, icon: Settings2 }
    ];

    return (
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
            {/* ── Kopfbereich ─────────────────────────────────────── */}
            <header className="rounded-[28px] border border-gray-100 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-gray-400">
                            <Users size={13} aria-hidden /> Eltern-Bereich
                        </p>
                        <h1 className="mt-2 font-display text-4xl uppercase leading-[0.9] tracking-tight text-gray-950 sm:text-5xl dark:text-gray-50">
                            Eltern-Dashboard
                        </h1>
                        <div className="mt-3 h-1 w-24 bg-primary" />
                        <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            Alles zu Ihren Kindern an einem Ort: aktuelle Anzeigen, Anfragen, passende Matches,
                            die Merkliste und die wichtigsten Einstellungen – synchron mit dem Kinderkonto.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800 dark:bg-green-950/40 dark:text-green-300">
                            <ShieldCheck size={14} aria-hidden /> Eltern-Account verifiziert
                        </span>
                        <Button variant="primary" size="lg" className="rounded-xl font-bold" onClick={() => setIsLinkFlowOpen(true)}>
                            <Plus size={18} aria-hidden /> Kind verknüpfen
                        </Button>
                    </div>
                </div>
            </header>

            {/* ── Inhalt ──────────────────────────────────────────── */}
            {loading ? (
                <div className="mt-8 space-y-4">
                    <div className="h-16 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
                    <div className="h-72 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
                </div>
            ) : fetchError ? (
                <div className="mt-8 rounded-3xl border border-red-100 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
                    <p className="text-sm font-bold text-red-800 dark:text-red-300">{fetchError}</p>
                    <Button variant="outline" className="mt-4 rounded-xl font-bold" onClick={fetchChildrenData}>
                        Erneut versuchen
                    </Button>
                </div>
            ) : children.length === 0 ? (
                <EmptyParentState onLink={() => setIsLinkFlowOpen(true)} />
            ) : (
                <>
                    <div className="mt-8">
                        <ChildSwitcher
                            children={children}
                            activeId={activeChild?.profile.id || ''}
                            onSelect={(id) => {
                                setActiveId(id);
                                setTab('overview');
                            }}
                            onAdd={() => setIsLinkFlowOpen(true)}
                        />
                    </div>

                    {activeChild && (
                        <>
                            <TabBar
                                items={tabItems}
                                value={tab}
                                onChange={setTab}
                                ariaLabel="Ansicht für das gewählte Kind"
                                idPrefix="parent"
                                className="mt-8"
                            />

                            <div className="mt-6 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
                                <ChildHeroCard
                                    child={activeChild}
                                    onEditProfile={() => setTab('settings')}
                                    onConsent={() => setSelectedConsentChild(activeChild)}
                                    onUnlink={() => setSelectedLinkToDelete(activeChild)}
                                />

                                <div
                                    className="min-w-0"
                                    role="tabpanel"
                                    id={`parent-tabpanel-${tab}`}
                                    aria-labelledby={`parent-tab-${tab}`}
                                >
                                    {tab === 'overview' && <OverviewTab child={activeChild} />}
                                    {tab === 'ads' && <AdsTab child={activeChild} />}
                                    {tab === 'requests' && <RequestsTab child={activeChild} />}
                                    {tab === 'matches' && <MatchesTab child={activeChild} />}
                                    {tab === 'favorites' && <FavoritesTab child={activeChild} />}
                                    {tab === 'reviews' && <ReviewsTab child={activeChild} />}
                                    {tab === 'settings' && <ChildSettingsTab child={activeChild} onSaved={fetchChildrenData} />}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── Modals ──────────────────────────────────────────── */}
            {isLinkFlowOpen && (
                <ParentLinkFlow
                    isOpen={isLinkFlowOpen}
                    onClose={() => setIsLinkFlowOpen(false)}
                    onSuccess={() => {
                        setIsLinkFlowOpen(false);
                        fetchChildrenData();
                    }}
                />
            )}

            <Dialog open={Boolean(selectedLinkToDelete)} onClose={() => setSelectedLinkToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Verknüpfung aufheben?</DialogTitle>
                        <DialogDescription>
                            Sie verlieren den Zugriff auf Anzeigen, Anfragen und Einstellungen von{' '}
                            <strong>{selectedLinkToDelete?.profile.display_name || 'diesem Kind'}</strong>. Die Verknüpfung kann später neu aufgebaut werden.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setSelectedLinkToDelete(null)}>
                            Abbrechen
                        </Button>
                        <Button variant="destructive" className="rounded-xl font-bold" disabled={isDeleting} onClick={handleRemoveLink}>
                            {isDeleting ? 'Wird aufgehoben …' : 'Verknüpfung aufheben'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedConsentChild && (
                <ParentConsentModal
                    isOpen
                    onClose={() => setSelectedConsentChild(null)}
                    childName={selectedConsentChild.profile.display_name || selectedConsentChild.profile.full_name || 'Kind'}
                    parentName={profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Elternteil'}
                    gradeLevel={selectedConsentChild.profile.grade_level}
                    linkedDate={selectedConsentChild.linkedAt || undefined}
                />
            )}
        </div>
    );
}

/** Noch kein Kind verknüpft – nächster Schritt in drei klaren Stufen. */
function EmptyParentState({ onLink }: { onLink: () => void }) {
    return (
        <div className="mt-8 rounded-[28px] border border-dashed border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/25 text-yellow-800 dark:bg-primary/15 dark:text-yellow-300">
                <Sparkles size={26} aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-2xl uppercase tracking-tight text-gray-950 dark:text-gray-50">
                Noch kein Kind verknüpft
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Sobald Sie Ihr Kind verknüpfen, sehen Sie hier die Anzeigen, Anfragen, Matches und die Merkliste –
                und können Profil und Einstellungen mitbetreuen.
            </p>

            <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
                <StepCard n={1} title="Code anfordern" hint="Ihr Kind findet den 6-stelligen Code unter Einstellungen → Eltern-Verknüpfung." />
                <StepCard n={2} title="Code eingeben" hint="Alternativ suchen Sie Ihr Kind direkt über Name, Klasse und Geburtsdatum." />
                <StepCard n={3} title="Übersicht nutzen" hint="Anzeigen, Anfragen und Einstellungen sind sofort synchron verfügbar." />
            </div>

            <Button variant="primary" size="lg" className="mt-8 rounded-xl font-bold" onClick={onLink}>
                <UserPlus size={18} aria-hidden /> Kind verknüpfen
            </Button>
        </div>
    );
}

function StepCard({ n, title, hint }: { n: number; title: string; hint: string }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-950 font-mono text-xs font-bold text-white dark:bg-gray-100 dark:text-gray-900">
                {n}
            </span>
            <p className="mt-2 text-sm font-bold text-gray-950 dark:text-gray-50">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{hint}</p>
        </div>
    );
}
