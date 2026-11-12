

import { useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { EyeOff, Heart, Inbox, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/social/EmptyState';
import { SocialFilterPills, type SocialFilterOption } from '../components/social/SocialFilterPills';
import { useSocialStream } from '../components/social/useSocialStream';
import {
    buildStream,
    countStream,
    type StreamFilter,
    type StreamItem,
} from '../components/social/stream';
import { IncomingRequestCard, OutgoingRequestCard, RequestSkeleton } from './Requests';
import { MatchStreamCard, MatchSkeleton } from './Matching';
import { FavoriteStreamCard, FavoriteSkeleton } from './Favorites';
import { RatingDialog } from '../components/RatingDialog';
import ShareDialog from '../components/ShareDialog';
import { apiErrorMessage } from '../lib/api';
import { triggerHaptic } from '../lib/haptics';
import { emptyAvailability } from '../lib/matching';
import { useAuth } from '../context/AuthContext';

type InitialTab = 'requests' | 'matches' | 'watchlist';

const INITIAL_FILTER: Record<InitialTab, StreamFilter> = {
    requests: 'anfragen',
    matches: 'matches',
    watchlist: 'merkliste',
};

// ?tab= akzeptiert die neuen Filter-Schlüssel UND die alten Tab-Werte
// (Deep-Links aus Layout/Chat bleiben gültig). Geschrieben werden die alten
// Werte – so bleibt die Sidebar-Highlight-Logik in Layout.tsx synchron,
// die nur 'requests' | 'matches' | 'watchlist' kennt. Für „Alle" braucht es
// einen expliziten Marker (auf /requests & co. würde fehlendes ?tab den
// Pfad-Filter zurückholen).
const TAB_FILTER: Record<string, StreamFilter> = {
    alle: 'alle',
    all: 'alle',
    anfragen: 'anfragen',
    requests: 'anfragen',
    matches: 'matches',
    matching: 'matches',
    merkliste: 'merkliste',
    watchlist: 'merkliste',
    favorites: 'merkliste',
};

const FILTER_TAB: Record<StreamFilter, string> = {
    alle: 'alle',
    anfragen: 'requests',
    matches: 'matches',
    merkliste: 'watchlist',
};

const FILTER_LABEL: Record<StreamFilter, string> = {
    alle: 'Alle',
    anfragen: 'Anfragen',
    matches: 'Vorschläge',
    merkliste: 'Merkliste',
};

/**
 * Der eine Autoren-Motion-Moment: Karten-Reveal (fade + y-slide, expo ease-out)
 * beim Laden und Filtern. Ohne Bewegungswunsch bleibt der sichtbare Default.
 */
function StreamReveal({ index, children }: { index: number; children: ReactNode }) {
    const reduceMotion = useReducedMotion();
    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 6) * 0.05 }}
            className="min-w-0"
        >
            {children}
        </motion.div>
    );
}

export default function Social({ initialTab }: { initialTab?: InitialTab }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    // Aktiver Typ-Filter: ?tab= > Pfad (/requests, /matches, /favorites) > initialTab > alle
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const pathFilter: StreamFilter | null =
        pathname === '/matches' || pathname === '/matching' ? 'matches'
            : pathname === '/favorites' || pathname === '/watchlist' ? 'merkliste'
                : pathname === '/requests' ? 'anfragen'
                    : null;
    const requestedFilter = TAB_FILTER[searchParams.get('tab') ?? ''] ?? null;
    const filter: StreamFilter = requestedFilter ?? pathFilter ?? (initialTab ? INITIAL_FILTER[initialTab] : 'alle');

    const stream = useSocialStream(user?.id);

    const tiers = useMemo(
        () => buildStream({
            incoming: stream.incoming,
            outgoing: stream.outgoing,
            matches: stream.matches,
            favorites: stream.favorites,
            hiddenIds: stream.hiddenIds,
            seenIds: stream.seenIds,
        }, filter),
        [stream.incoming, stream.outgoing, stream.matches, stream.favorites, stream.hiddenIds, stream.seenIds, filter]
    );

    const counts = useMemo(() => countStream({
        incoming: stream.incoming,
        outgoing: stream.outgoing,
        matches: stream.matches,
        favorites: stream.favorites,
        hiddenIds: stream.hiddenIds,
        seenIds: stream.seenIds,
    }), [stream.incoming, stream.outgoing, stream.matches, stream.favorites, stream.hiddenIds, stream.seenIds]);

    const selectFilter = (next: string) => {
        if (!(next in FILTER_LABEL)) return;
        triggerHaptic('selection');
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', FILTER_TAB[next as StreamFilter] ?? next);
        setSearchParams(nextParams, { replace: true });
    };

    const pills: SocialFilterOption[] = (['alle', 'anfragen', 'matches', 'merkliste'] as StreamFilter[])
        .map(key => ({ key, label: FILTER_LABEL[key], count: counts[key] }));

    const renderItem = (item: StreamItem) => {
        if (item.kind === 'request') {
            return item.direction === 'incoming'
                ? (
                    <IncomingRequestCard
                        req={item.request}
                        onStatus={stream.handleStatus}
                        onComplete={stream.handleComplete}
                    />
                )
                : (
                    <OutgoingRequestCard
                        req={item.request}
                        onComplete={stream.handleComplete}
                    />
                );
        }
        if (item.kind === 'match') {
            return (
                <MatchStreamCard
                    match={item.match}
                    myAvail={stream.myProfile?.availability || emptyAvailability()}
                    mySubjects={stream.myProfile?.subjects}
                    seen={item.seen}
                    onContact={() => {
                        stream.markSeen(item.match.ad.id);
                        navigate(`/ad/${item.match.ad.id}`);
                    }}
                    onDismiss={() => stream.dismissMatch(item.match.ad.id)}
                />
            );
        }
        return (
            <FavoriteStreamCard
                favorite={item.favorite}
                onRemove={stream.removeFavorite}
                onShare={ad => stream.setSharingAd(ad)}
            />
        );
    };

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm font-semibold text-muted-foreground">
                    Bitte melde dich an, um deine Übersicht zu sehen.
                </div>
            </div>
        );
    }

    const isEmpty = !stream.loading && tiers.length === 0;

    return (
        <div className="mx-auto w-full min-w-0 max-w-app space-y-6 overflow-x-clip p-4 pb-24 sm:p-6">
            <header className="min-w-0">
                <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
                    {initialTab === 'requests' ? 'Anfragen' : 'Social'}
                </h1>
                <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-muted-foreground">
                    Anfragen, Vorschläge und gemerkte Anzeigen auf einer Seite. Das Wichtigste steht oben.
                </p>
            </header>

            <SocialFilterPills
                ariaLabel="Übersicht nach Typ filtern"
                options={pills}
                value={filter}
                onChange={selectFilter}
            />
            <p className="sr-only" aria-live="polite">
                {counts[filter]} {counts[filter] === 1 ? 'Eintrag' : 'Einträge'} in der Übersicht
            </p>

            {stream.hiddenIds.length > 0 && (filter === 'alle' || filter === 'anfragen') && (
                <Button variant="unstyled" size="unstyled"
                    type="button"
                    onClick={() => {
                        triggerHaptic('light');
                        stream.unhideAllChats();
                    }}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-card px-4 text-xs font-semibold text-muted-foreground shadow-soft transition-colors hover:bg-muted hover:text-foreground"
                >
                    <EyeOff size={14} aria-hidden /> Verborgene Chats einblenden
                    <span className="rounded-md bg-muted px-2 py-0.5 font-sans text-xs font-semibold tabular-nums text-muted-foreground">{stream.hiddenIds.length}</span>
                </Button>
            )}

            {stream.dismissedIds.length > 0 && (filter === 'alle' || filter === 'matches') && (
                <div className="flex justify-center">
                    <Button variant="unstyled" size="unstyled"
                        type="button"
                        onClick={() => {
                            triggerHaptic('success');
                            stream.resetDismissed();
                        }}
                        className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-full bg-card px-4 text-xs font-semibold tabular-nums text-muted-foreground shadow-soft transition-colors hover:bg-muted hover:text-foreground"
                        title="Ausgeblendete Vorschläge wiederherstellen"
                    >
                        <RotateCcw size={13} aria-hidden />
                        <span>{stream.dismissedIds.length} ausgeblendete {stream.dismissedIds.length === 1 ? 'Vorschlag' : 'Vorschläge'} wiederherstellen</span>
                    </Button>
                </div>
            )}

            {/* Loading: Karten-Skelette statt leerem Bildschirm */}
            {stream.loading && (
                <div className="space-y-4" role="status" aria-label="Deine Übersicht wird geladen">
                    <RequestSkeleton />
                    <MatchSkeleton />
                    <FavoriteSkeleton />
                </div>
            )}

            {/* Fehler: Problem + Weg zurück */}
            {!stream.loading && Boolean(stream.error) && (
                <EmptyState
                    icon={Inbox}
                    tone="error"
                    title="Die Übersicht konnte nicht geladen werden"
                    text={apiErrorMessage(stream.error, 'Verbindung zum Server fehlgeschlagen. Prüfe deine Internetverbindung und versuch es erneut.')}
                    action={
                        <Button onClick={stream.reload} className="h-11 rounded-lg px-6 text-sm font-semibold">
                            Erneut versuchen
                        </Button>
                    }
                />
            )}

            {/* Leerzustand passend zum aktiven Filter */}
            {isEmpty && !stream.error && (
                <EmptyState
                    icon={filter === 'matches' ? Sparkles : filter === 'merkliste' ? Heart : Inbox}
                    title={
                        filter === 'matches' ? 'Noch keine Vorschläge'
                            : filter === 'merkliste' ? 'Merkliste ist leer'
                                : filter === 'anfragen' ? 'Keine Anfragen in der Übersicht'
                                    : 'Noch keine Einträge'
                    }
                    text={
                        filter === 'matches'
                            ? 'Sobald eine Anzeige zu deinen Fächern, Klassen und deiner Verfügbarkeit passt, erscheint sie hier.'
                            : filter === 'merkliste'
                                ? 'Merke Anzeigen in der Übersicht über das Herz-Symbol. Sie erscheinen dann hier.'
                                : filter === 'anfragen'
                                    ? 'Sobald jemand Interesse an deiner Anzeige hat oder du eine Anfrage schickst, erscheint sie hier.'
                                    : 'Anfragen, Vorschläge und gemerkte Anzeigen findest du hier. Erstelle eine Anzeige.'
                    }
                    action={
                        filter === 'merkliste' ? (
                            <Button onClick={() => navigate('/')} className="h-11 rounded-lg px-6 text-sm font-semibold">
                                Anzeigen stöbern
                            </Button>
                        ) : (
                            <>
                                <Button onClick={() => navigate('/')} className="h-11 rounded-lg px-6 text-sm font-semibold">
                                    Anzeigen stöbern
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/create-ad')}
                                    className="h-11 rounded-lg px-6 text-sm font-semibold"
                                >
                                    Anzeige erstellen
                                </Button>
                            </>
                        )
                    }
                />
            )}

            {/* Der Strom: Dringlichkeits-Tier mit sichtbaren Trennern, jede Karte mit Primäraktion */}
            {!stream.loading && !isEmpty && !stream.error && (
                <div id="social-stream" key={filter} className="min-w-0 space-y-6">
                    {tiers.map((tier, tierIndex) => (
                        <section key={tier.key} aria-label={tier.label} className="min-w-0 space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <h2 className="inline-flex items-center gap-2 rounded-full bg-pastel-gray px-3.5 py-1.5 text-[13px] font-bold text-pastel-gray-foreground">
                                    {tier.label}
                                    <span className="rounded-full bg-card px-2 py-0.5 text-xs tabular-nums">
                                        {tier.items.length}
                                        <span className="sr-only"> Einträge</span>
                                    </span>
                                </h2>
                            </div>
                            {tier.items.map((item, index) => (
                                <StreamReveal key={item.key} index={tierIndex + index}>
                                    {renderItem(item)}
                                </StreamReveal>
                            ))}
                        </section>
                    ))}
                </div>
            )}

            <RatingDialog
                open={stream.rating.open}
                onOpenChange={stream.setRatingOpen}
                targetUser={stream.rating.targetUser ?? undefined}
                adId={stream.rating.adId}
                onSuccess={() => stream.setRatingOpen(false)}
            />

            {stream.sharingAd && (
                <ShareDialog
                    adId={stream.sharingAd.id}
                    adTitle={stream.sharingAd.title}
                    isOpen={stream.sharingAd !== null}
                    onClose={() => stream.setSharingAd(null)}
                />
            )}
        </div>
    );
}
