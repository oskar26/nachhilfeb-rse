import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { NativeSelect } from '../../components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
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
import {
    Trash2,
    Search,
    Sparkles,
    FileText,
    Eye,
    EyeOff,
    MoreHorizontal,
    RefreshCw,
    ExternalLink,
} from 'lucide-react';
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

const AD_PAGE_SIZE = 15;
const numberFormat = new Intl.NumberFormat('de-DE');

type AdFilter = 'all' | 'offer' | 'search';
type AdStatusFilter = 'all' | 'active' | 'hidden' | 'boosted';
type AdSort = 'newest' | 'oldest' | 'views';

function adIsArchived(ad: any): boolean {
    return ad?.is_archived === true || ad?.is_archived === 1 || ad?.is_archived === '1';
}

function adIsActive(ad: any): boolean {
    if (adIsArchived(ad)) return false;
    if (ad?.is_active === undefined || ad?.is_active === null) return true;
    return ad.is_active === true || ad.is_active === 1 || ad.is_active === '1';
}

function isBoostActive(ad: any): boolean {
    // is_boosted ist die serverseitig aufgelöste Wahrheit (boosted + Ablauf).
    if (ad?.is_boosted !== undefined && ad?.is_boosted !== null) {
        return ad.is_boosted === true || ad.is_boosted === 1 || ad.is_boosted === '1';
    }
    if (!ad?.boosted) return false;
    // Ältere Payloads liefern boosted ohne boosted_until; dann gilt der Flag.
    if (!ad.boosted_until) return true;
    return new Date(ad.boosted_until).getTime() > Date.now();
}

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

    // Legacy-URL aus der Zeit vor der Zusammenlegung: eigener coachlog-Tab.
    // Eine Seite, ein Tab – der Filter lebt jetzt in ?filter=coach.
    if (activeTab === 'coachlog') {
        return <Navigate to="?tab=auditlog&filter=coach" replace />;
    }

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

function SummaryTile({
    label,
    value,
    hint,
    emphasis,
}: {
    label: string;
    value: number | null;
    hint: string;
    emphasis?: boolean;
}) {
    return (
        <div className="rounded-card border border-border bg-card p-3.5 shadow-soft sm:p-4">
            <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
            <p className={cn(
                'mt-1 text-2xl font-semibold tabular-nums tracking-tight',
                value === null && 'text-base font-medium text-muted-foreground',
                emphasis && value !== null && value > 0 && 'text-destructive'
            )}>
                {value === null ? 'Nicht verfügbar' : value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}

// Embedded Ads Management Sub-component
function AdManagement() {
    const [ads, setAds] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<AdFilter>('all');
    const [filterStatus, setFilterStatus] = useState<AdStatusFilter>('all');
    const [sortBy, setSortBy] = useState<AdSort>('newest');
    const [page, setPage] = useState(0);
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
            setAds(Array.isArray(adsData) ? adsData : []);
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
            void fetchAds();
        } catch (error: any) {
            toast.error('Löschen fehlgeschlagen: ' + error.message);
        }
    };

    const toggleVisibility = async (ad: any) => {
        try {
            const archived = adIsArchived(ad);
            const isActive = adIsActive(ad);
            const payload = archived
                ? { is_archived: false, is_active: true }
                : { is_active: !isActive };
            const { error } = await api.ads.update(ad.id, payload);
            if (error) throw error;
            toast.success(archived ? 'Anzeige wiederhergestellt' : isActive ? 'Anzeige versteckt' : 'Anzeige eingeblendet');
            void fetchAds();
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    const normalizedSearch = search.trim().toLowerCase();
    const filteredAds = ads.filter(ad => {
        const owner = ad.profiles?.display_name
            || `${ad.profiles?.first_name || ''} ${ad.profiles?.last_name || ''}`.trim();
        const matchesSearch = !normalizedSearch
            || String(ad.title || ad.short_description || '').toLowerCase().includes(normalizedSearch)
            || owner.toLowerCase().includes(normalizedSearch);
        const matchesType = filterType === 'all' || ad.type === filterType;
        const active = adIsActive(ad);
        const boosted = isBoostActive(ad);
        const matchesStatus = filterStatus === 'all'
            || (filterStatus === 'active' && active)
            || (filterStatus === 'hidden' && !active)
            || (filterStatus === 'boosted' && boosted);
        return matchesSearch && matchesType && matchesStatus;
    });

    const sortedAds = [...filteredAds].sort((a, b) => {
        if (sortBy === 'views') return (Number(b.view_count) || 0) - (Number(a.view_count) || 0);
        const aTime = new Date(a.created_at).getTime() || 0;
        const bTime = new Date(b.created_at).getTime() || 0;
        return sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
    });

    const totalPages = Math.max(1, Math.ceil(sortedAds.length / AD_PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const visibleAds = sortedAds.slice(safePage * AD_PAGE_SIZE, (safePage + 1) * AD_PAGE_SIZE);

    const totalAds = ads.length;
    const activeAds = ads.filter(ad => adIsActive(ad)).length;
    const hiddenAds = ads.filter(ad => !adIsActive(ad)).length;
    const boostedAds = ads.filter(isBoostActive).length;

    const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
        setPage(0);
        setter(value);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Anzeigen verwalten</h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        Alle Angebote und Gesuche · Gesamtbestand unabhängig von Suche und Filtern
                    </p>
                </div>
                <Button onClick={fetchAds} variant="outline" className="h-11 w-fit gap-2 text-[13px]">
                    <RefreshCw size={16} aria-hidden className={cn(loading && 'animate-spin')} /> Aktualisieren
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <SummaryTile label="Gesamt" value={loading || loadError ? null : totalAds} hint="Alle Anzeigen" />
                <SummaryTile label="Aktiv" value={loading || loadError ? null : activeAds} hint="Sichtbar im Feed" />
                <SummaryTile label="Versteckt" value={loading || loadError ? null : hiddenAds} hint="Inaktiv oder archiviert" />
                <SummaryTile label="Geboostet" value={loading || loadError ? null : boostedAds} hint="Aktive Hervorhebung" />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full min-w-0 lg:max-w-sm">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} aria-hidden />
                    <Input
                        placeholder="Anzeigen suchen nach Titel, Beschreibung, Name..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        className="h-11 pl-10 text-[13px]"
                        aria-label="Anzeigen durchsuchen"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap">
                    <NativeSelect
                        value={filterType}
                        onChange={e => { setPage(0); setFilterType(e.target.value as AdFilter); }}
                        wrapperClassName="w-[calc(50%-0.25rem)] sm:w-40"
                        className="w-full text-[13px]"
                        aria-label="Nach Typ filtern"
                    >
                        <option value="all">Alle Typen</option>
                        <option value="offer">Angebote</option>
                        <option value="search">Gesuche</option>
                    </NativeSelect>

                    <NativeSelect
                        value={filterStatus}
                        onChange={e => { setPage(0); setFilterStatus(e.target.value as AdStatusFilter); }}
                        wrapperClassName="w-[calc(50%-0.25rem)] sm:w-44"
                        className="w-full text-[13px]"
                        aria-label="Nach Status filtern"
                    >
                        <option value="all">Alle Status</option>
                        <option value="active">Aktiv</option>
                        <option value="hidden">Versteckt</option>
                        <option value="boosted">Geboostet</option>
                    </NativeSelect>

                    <NativeSelect
                        value={sortBy}
                        onChange={e => resetPage(setSortBy)(e.target.value as AdSort)}
                        wrapperClassName="w-[calc(50%-0.25rem)] sm:w-44"
                        className="w-full text-[13px]"
                        aria-label="Anzeigen sortieren"
                    >
                        <option value="newest">Neueste zuerst</option>
                        <option value="oldest">Älteste zuerst</option>
                        <option value="views">Meiste Aufrufe</option>
                    </NativeSelect>

                    <p className="ml-auto shrink-0 text-[13px] text-muted-foreground" aria-live="polite">
                        {sortedAds.length} Treffer
                    </p>
                </div>
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
                <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-border bg-card py-16 text-center">
                    <Spinner className="size-6 text-foreground" />
                    <p className="text-sm text-muted-foreground">Lade Anzeigen...</p>
                </div>
            ) : sortedAds.length === 0 ? (
                <Empty className="rounded-card border border-border bg-card py-16">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FileText aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>Keine Anzeigen gefunden</EmptyTitle>
                        <EmptyDescription>Passe Suche und Filter an oder lade die Liste neu.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Card className="rounded-card">
                    <CardContent padding="flush">
                        <Table className="text-[13px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="hidden pl-4 sm:table-cell">Typ</TableHead>
                                    <TableHead>Anzeige</TableHead>
                                    <TableHead className="hidden lg:table-cell">Anbieter</TableHead>
                                    <TableHead className="hidden md:table-cell">Datum</TableHead>
                                    <TableHead className="hidden sm:table-cell text-right">Aufrufe</TableHead>
                                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                                    <TableHead className="pr-2 text-right sm:pr-4">Aktionen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleAds.map(ad => {
                                    const archived = adIsArchived(ad);
                                    const active = adIsActive(ad);
                                    const boosted = isBoostActive(ad);
                                    const owner = ad.profiles?.display_name
                                        || `${ad.profiles?.first_name || ''} ${ad.profiles?.last_name || ''}`.trim()
                                        || 'Unbekannt';
                                    return (
                                        <TableRow key={ad.id} className={cn(!active && 'bg-muted/30')}>
                                            <TableCell className="hidden pl-4 sm:table-cell">
                                                <Badge variant={ad.type === 'offer' ? 'secondary' : 'outline'} className="font-medium">
                                                    {ad.type === 'offer' ? 'Bietet' : 'Sucht'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="w-full max-w-0 sm:max-w-[22rem]">
                                                <div className="flex min-w-0 flex-col gap-0.5">
                                                    <Link
                                                        to={`/ad/${ad.id}`}
                                                        className="block w-full max-w-full truncate text-[13px] font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                        title={ad.title || ad.short_description}
                                                    >
                                                        {ad.title || ad.short_description || 'Anzeige ohne Titel'}
                                                    </Link>
                                                    <span className="truncate text-xs text-muted-foreground lg:hidden">{owner}</span>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1 sm:hidden">
                                                        <Badge variant={ad.type === 'offer' ? 'secondary' : 'outline'} className="font-medium">
                                                            {ad.type === 'offer' ? 'Bietet' : 'Sucht'}
                                                        </Badge>
                                                        {archived ? (
                                                            <Badge variant="outline" className="font-medium text-muted-foreground">Archiviert</Badge>
                                                        ) : active ? (
                                                            <Badge variant="outline" className="font-medium">Aktiv</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="font-medium text-muted-foreground">Versteckt</Badge>
                                                        )}
                                                        {boosted && <Badge className="font-medium">Boost</Badge>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden max-w-[14rem] truncate lg:table-cell">{owner}</TableCell>
                                            <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">
                                                {ad.created_at ? new Date(ad.created_at).toLocaleDateString('de-DE') : '—'}
                                            </TableCell>
                                            <TableCell className="hidden text-right tabular-nums sm:table-cell" title={ad.view_count == null ? 'Keine Aufrufzahl im Payload' : undefined}>
                                                {ad.view_count == null ? '—' : numberFormat.format(Number(ad.view_count) || 0)}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {archived ? (
                                                        <Badge variant="outline" className="font-medium text-muted-foreground">Archiviert</Badge>
                                                    ) : active ? (
                                                        <Badge variant="outline" className="gap-1.5 font-medium">
                                                            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
                                                            Aktiv
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="gap-1.5 font-medium text-muted-foreground">
                                                            <span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden />
                                                            Versteckt
                                                        </Badge>
                                                    )}
                                                    {boosted && (
                                                        <Badge className="gap-1 font-medium">
                                                            Boost <Sparkles size={12} aria-hidden />
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-2 text-right sm:pr-4">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-11 w-11"
                                                                aria-label={`Aktionen für ${ad.title || 'Anzeige'}`}
                                                            />
                                                        }
                                                    >
                                                        <MoreHorizontal size={18} aria-hidden />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            className="min-h-11"
                                                            render={<Link to={`/ad/${ad.id}`} />}
                                                        >
                                                            <ExternalLink aria-hidden />
                                                            Anzeige öffnen
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="min-h-11" onClick={() => toggleVisibility(ad)}>
                                                            {archived || active ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                                                            {archived ? 'Wiederherstellen' : active ? 'Verstecken' : 'Einblenden'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            className="min-h-11"
                                                            onClick={() => setPendingDeleteId(ad.id)}
                                                        >
                                                            <Trash2 aria-hidden />
                                                            Endgültig löschen
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {!loading && !loadError && sortedAds.length > AD_PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button variant="outline" className="h-11" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                        Zurück
                    </Button>
                    <span className="text-[13px] font-medium text-muted-foreground">
                        Seite {safePage + 1} von {totalPages} · {sortedAds.length} Anzeigen
                    </span>
                    <Button variant="outline" className="h-11" disabled={safePage + 1 >= totalPages} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
                        Weiter
                    </Button>
                </div>
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
