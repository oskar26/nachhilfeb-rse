/*
Direction contract — Social „Alles in einem Strom"
THESIS: Ein Arbeitsstrom statt drei Inseln: Anfragen, Matches und gemerkte Anzeigen laufen in einer einzigen, priorisierten Chronik zusammen — die dringlichste Aktion steht immer oben.
OWN-WORLD: FWG-Light Feed-Sprache: weiße Kartuschen (rounded-3xl, border-gray-200, shadow-soft) auf Papier #f8f9fa, Gelb #FACC15 nur als Akzent (CTA, Score, aktiver Filter), Inter-Body, Anton nur für den Seitentitel mit h-1 w-10 bg-primary-Strich, font-mono tabular-nums für Zahlen.
STORY: Öffnen → Titel und Typ-Filter als helle Pills, darunter sofort die erste offene Aktion. Scrollen → Chronik nach Dringlichkeit, jede Karte trägt Status und eine Primäraktion. Nichts versteckt sich hinter Wechseln.
FIRST VIEWPORT: Titel „Social" mit Filter-Pills (Alle/Anfragen/Matches/Merkliste inkl. Zähler), darunter beginnt der Stream mit der wichtigsten offenen Karte. Kein Hero, kein Marketing.
FORM: Karten als helle Kartuschen mit Typ-Punkt-Chip und Status-Chip (farbiger Punkt), Aktionen als Pill-Buttons ≥44px, eine Motion-Sprache: Karten-Reveal (fade + y-slide, expo ease-out) beim Laden/Filtern; aktive Filter-Pille mit layoutId-Gleiten.
FINISH: unreviewed and undocumented is unfinished; it is ready for review and documentation.
*/

import { useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { EyeOff, Heart, Inbox, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
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
    matches: 'Matches',
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
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 p-8 text-center text-sm font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                    Bitte einloggen, um deinen Strom zu sehen.
                </div>
            </div>
        );
    }

    const isEmpty = !stream.loading && tiers.length === 0;

    return (
        <div className="mx-auto w-full min-w-0 max-w-4xl space-y-4 p-4 pb-24 sm:p-6 overflow-x-clip">
            {/* Seitenkopf: Display-Titel mit gelbem Akzentstrich – mehr braucht der Strom nicht */}
            <header className="min-w-0">
                <h1 className="font-display text-2xl uppercase leading-none tracking-tight text-gray-900 dark:text-white">
                    Social
                </h1>
                <div className="mt-1.5 h-1 w-10 rounded-full bg-primary" aria-hidden />
                <p className="mt-3 max-w-[65ch] text-sm text-gray-500 dark:text-gray-400">
                    Anfragen, Matches und gemerkte Anzeigen in einem Strom – das Wichtigste zuerst.
                </p>
            </header>

            <SocialFilterPills
                ariaLabel="Strom nach Typ filtern"
                options={pills}
                value={filter}
                onChange={selectFilter}
            />
            <p className="sr-only" aria-live="polite">
                {counts[filter]} {counts[filter] === 1 ? 'Eintrag' : 'Einträge'} im Strom
            </p>

            {stream.hiddenIds.length > 0 && (filter === 'alle' || filter === 'anfragen') && (
                <button
                    type="button"
                    onClick={() => {
                        triggerHaptic('light');
                        stream.unhideAllChats();
                    }}
                    className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-full border border-dashed border-gray-200 bg-white px-4 text-xs font-bold text-gray-500 transition-colors hover:border-primary hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100 dark:focus-visible:ring-offset-gray-950"
                >
                    <EyeOff size={14} aria-hidden /> Verborgene Chats einblenden
                    <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-black tabular-nums text-amber-950">{stream.hiddenIds.length}</span>
                </button>
            )}

            {stream.dismissedIds.length > 0 && (filter === 'alle' || filter === 'matches') && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic('success');
                            stream.resetDismissed();
                        }}
                        className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-gray-200 bg-white px-4 text-xs font-bold tabular-nums text-gray-500 transition-colors hover:border-primary hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100 dark:focus-visible:ring-offset-gray-950"
                        title="Ausgeblendete Matches wiederherstellen"
                    >
                        <RotateCcw size={13} aria-hidden />
                        <span>{stream.dismissedIds.length} ausgeblendete {stream.dismissedIds.length === 1 ? 'Match' : 'Matches'} wiederherstellen</span>
                    </button>
                </div>
            )}

            {/* Loading: Karten-Skelette statt leerem Bildschirm */}
            {stream.loading && (
                <div className="space-y-4" role="status" aria-label="Dein Strom wird geladen">
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
                    title="Dein Strom konnte nicht geladen werden"
                    text={apiErrorMessage(stream.error, 'Verbindung zum Server fehlgeschlagen. Prüfe deine Internetverbindung und versuch es erneut.')}
                    action={
                        <Button onClick={stream.reload} className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-black">
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
                        filter === 'matches' ? 'Noch keine Matches'
                            : filter === 'merkliste' ? 'Merkliste ist leer'
                                : filter === 'anfragen' ? 'Keine Anfragen im Strom'
                                    : 'Dein Strom ist leer'
                    }
                    text={
                        filter === 'matches'
                            ? 'Sobald eine Anzeige zu deinen Fächern, Klassen und Freistunden passt, taucht sie hier auf.'
                            : filter === 'merkliste'
                                ? 'Merk Anzeigen aus dem Feed per Herz-Symbol – hier sammeln sie sich.'
                                : filter === 'anfragen'
                                    ? 'Sobald jemand Interesse an deiner Anzeige hat oder du eine Anfrage schickst, erscheint sie hier.'
                                    : 'Anfragen, Matches und gemerkte Anzeigen laufen hier zusammen. Starte mit einer Anzeige!'
                    }
                    action={
                        filter === 'merkliste' ? (
                            <Button onClick={() => navigate('/')} className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-black">
                                Anzeigen stöbern
                            </Button>
                        ) : (
                            <>
                                <Button onClick={() => navigate('/')} className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-black">
                                    Anzeigen stöbern
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/create-ad')}
                                    className="h-11 rounded-full border-gray-200 bg-white px-6 text-sm font-bold dark:border-gray-700 dark:bg-gray-900"
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
                <div id="social-stream" key={filter} className="min-w-0 space-y-4">
                    {tiers.map((tier, tierIndex) => (
                        <section key={tier.key} aria-label={tier.label} className="min-w-0 space-y-3">
                            <div className="flex items-center gap-3 px-1">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                    {tier.label}
                                </h2>
                                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" aria-hidden />
                                <span className="font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400">
                                    {tier.items.length}
                                    <span className="sr-only"> Einträge</span>
                                </span>
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
