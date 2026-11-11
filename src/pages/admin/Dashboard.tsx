import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { Trash2, Search, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';

// Subpages
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';
import AdminChat from './AdminChat';
import AdminCodes from './AdminCodes';
import AdminAuditLog from './AdminAuditLog';
import AdminNews from './AdminNews';

import AdminAnalytics from './AdminAnalytics';
import AdminSupport from './AdminSupport';

export default function SVDashboard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';

    const handleOpenChat = (u1: string, u2: string, rId: string) => {
        setSearchParams({
            tab: 'chat',
            userId1: u1,
            userId2: u2,
            reportId: rId
        });
    };

    switch (activeTab) {
        case 'overview':
            return <AdminOverview />;
        case 'support':
            return <AdminSupport />;
        case 'users':
            return <AdminUsers />;
        case 'reports':
            return <AdminReports onOpenChat={handleOpenChat} />;
        case 'chat':
            return (
                <AdminChat
                    userId1={searchParams.get('userId1')}
                    userId2={searchParams.get('userId2')}
                    reportId={searchParams.get('reportId')}
                    onBack={() => setSearchParams({ tab: 'reports' })}
                />
            );
        case 'codes':
            return <AdminCodes />;
        case 'auditlog':
            return <AdminAuditLog />;
        case 'coachlog':
            return <AdminAuditLog defaultFilter="coach" />;
        case 'news':
            return <AdminNews />;
        case 'ads':
            return <AdManagement />;
        case 'analytics':
            return <AdminAnalytics />;
        default:
            return <AdminOverview />;
    }
}

// Embedded Ads Management Sub-component
function AdManagement() {
    const [ads, setAds] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // Anzeigen bringen ihre eingebetteten Profildaten bereits mit (ads.php: profiles) – kein separater profiles-Lookup nötig.
            const { data: adsData, error: adsError } = await api.ads.list({ all: true });

            if (adsError) throw adsError;
            setAds(adsData || []);
        } catch (err) {
            console.error(err);
            setLoadError('Anzeigen konnten nicht geladen werden.');
            toast.error('Anzeigen konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const deleteAd = async (id: string) => {
        try {
            const { error } = await api.ads.delete(id);
            if (error) throw error;
            toast.success('Anzeige gelöscht');
            fetchAds();
        } catch (error: any) {
            toast.error('Löschen fehlgeschlagen: ' + error.message);
        }
    };

    const toggleHide = async (id: string, current: boolean) => {
        try {
            const { error } = await api.ads.update(id, { is_hidden: !current });
            if (error) throw error;
            toast.success(current ? 'Anzeige eingeblendet' : 'Anzeige versteckt');
            fetchAds();
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    const filteredAds = ads.filter(ad =>
        (ad.short_description?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (ad.profiles?.display_name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-md">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} aria-hidden />
                    <Input
                        placeholder="Anzeigen suchen nach Beschreibung, Name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-11 pl-11"
                        aria-label="Anzeigen durchsuchen"
                    />
                </div>
                <p className="text-sm text-muted-foreground">
                    Gesamt: <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 font-semibold tabular-nums text-foreground">{ads.length} Anzeigen</span>
                </p>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Anzeigen nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={fetchAds}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {loadError ? null : loading ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
                    <Spinner className="size-6 text-brand-ink dark:text-primary" />
                    <p className="text-sm text-muted-foreground">Lade Anzeigen...</p>
                </div>
            ) : filteredAds.length === 0 ? (
                <Empty className="border border-border bg-card py-16">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FileText aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>Keine Anzeigen gefunden</EmptyTitle>
                        <EmptyDescription>Passe die Suche an oder lade die Liste neu.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Card className="shadow-soft">
                    <CardContent className="p-0">
                        <ul className="divide-y divide-border">
                            {filteredAds.map(ad => (
                                <li key={ad.id} className={cn(
                                    'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
                                    ad.is_hidden && 'bg-muted/40'
                                )}>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant={ad.type === 'offer' ? 'secondary' : 'outline'}>
                                                {ad.type === 'offer' ? 'Bietet' : 'Sucht'}
                                            </Badge>
                                            <span className="min-w-0 break-words text-sm font-semibold text-foreground">{ad.short_description}</span>
                                            {ad.is_hidden && <Badge variant="destructive">Versteckt</Badge>}
                                            {ad.boosted && (
                                                <Badge>
                                                    Geboostet <Sparkles size={16} aria-hidden />
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Von <span className="font-medium text-foreground">{ad.profiles?.display_name || `${ad.profiles?.first_name || ''} ${ad.profiles?.last_name || ''}`}</span> • {new Date(ad.created_at).toLocaleDateString('de-DE')}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        <Button size="sm" variant="outline" className="h-11" onClick={() => toggleHide(ad.id, ad.is_hidden)}>
                                            {ad.is_hidden ? 'Einblenden' : 'Verstecken'}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="h-11 w-11"
                                            onClick={() => setPendingDeleteId(ad.id)}
                                            aria-label="Anzeige löschen"
                                            title="Anzeige löschen"
                                        >
                                            <Trash2 size={16} aria-hidden />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <AlertDialog
                open={pendingDeleteId !== null}
                onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anzeige löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Anzeige wird endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                if (pendingDeleteId) void deleteAd(pendingDeleteId);
                                setPendingDeleteId(null);
                            }}
                        >
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
