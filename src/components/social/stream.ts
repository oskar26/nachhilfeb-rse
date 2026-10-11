// Social-Strom „Alles in einem Strom": Typen, localStorage-Helfer und reine
// Stream-Assembly. Bewusst React-frei – Daten-Hook (useSocialStream) und die
// Karten-Module (Requests/Matching/Favorites) teilen diese Strukturen.

import type { CustomContact } from '../CustomContacts';
import type { PriceDetails } from '../../lib/utils';
import type { Match } from '../../lib/matching';

// ── Typen ─────────────────────────────────────────────────────────

export interface RequestPerson {
    id?: string;
    display_name?: string | null;
    grade_level?: string | null;
    is_verified?: boolean;
    avatar_url?: string | null;
    phone_number?: string | null;
    email?: string | null;
    settings?: {
        phone_visible?: boolean;
        email_visible?: boolean;
        custom_contacts?: CustomContact[] | null;
    } | null;
}

export interface AdRequestItem {
    id: string;
    status: string;
    message?: string | null;
    created_at?: string;
    owner_id?: string;
    requester_id?: string;
    requester?: RequestPerson | null;
    owner?: RequestPerson | null;
    ads?: { id?: string; short_description?: string | null } | null;
}

export interface FavoriteAd {
    id: string;
    ad_id: string;
    created_at?: string;
    ads: {
        id: string;
        title: string;
        type: 'offer' | 'search';
        subjects: string[];
        grade_levels: string[];
        short_description: string;
        price_details?: PriceDetails | null;
        profiles?: {
            display_name: string;
            grade_level: string;
        };
    };
}

export type StreamFilter = 'alle' | 'anfragen' | 'matches' | 'merkliste';
export type RequestDirection = 'incoming' | 'outgoing';

export interface RequestStreamItem {
    kind: 'request';
    key: string;
    direction: RequestDirection;
    request: AdRequestItem;
    createdAt: number;
}

export interface MatchStreamItem {
    kind: 'match';
    key: string;
    match: Match;
    seen: boolean;
}

export interface FavoriteStreamItem {
    kind: 'favorite';
    key: string;
    favorite: FavoriteAd;
    createdAt: number;
}

export type StreamItem = RequestStreamItem | MatchStreamItem | FavoriteStreamItem;

export type StreamTierKey = 'offen' | 'laeuft' | 'matches' | 'wartet' | 'gemerkt' | 'archiv';

export interface StreamTier {
    key: StreamTierKey;
    label: string;
    items: StreamItem[];
}

export interface StreamInput {
    incoming: AdRequestItem[];
    outgoing: AdRequestItem[];
    matches: Match[];
    favorites: FavoriteAd[];
    hiddenIds: string[];
    seenIds: string[];
}

// ── localStorage: gesehene & übersehene Matches ───────────────────
// dismissed = bewusst ausgeblendet (bleibt draußen, wiederherstellbar)
// seen = im Strom bereits geöffnet/kontaktiert (sortiert hinter neuen)

const DISMISSED_KEY = 'matchingDismissed_v2';
const SEEN_KEY = 'matchingSeen_v1';

function readIdList(key: string): string[] {
    try {
        const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

function writeIdList(key: string, ids: string[]) {
    try {
        localStorage.setItem(key, JSON.stringify(ids));
    } catch {
        /* localStorage voll oder gesperrt – Stream läuft trotzdem */
    }
}

export function getDismissedMatchIds(): string[] {
    return readIdList(DISMISSED_KEY);
}

export function setDismissedMatchIds(ids: string[]): void {
    writeIdList(DISMISSED_KEY, ids);
}

export function getSeenMatchIds(): string[] {
    return readIdList(SEEN_KEY);
}

export function markMatchSeen(id: string): void {
    const ids = getSeenMatchIds();
    if (ids.includes(id)) return;
    writeIdList(SEEN_KEY, [...ids, id]);
}

// ── Helfer ────────────────────────────────────────────────────────

export function gradeLabel(grade?: string | null): string {
    if (!grade) return 'Klasse ?';
    return ['EF', 'Q1', 'Q2'].includes(grade) ? `Stufe ${grade}` : `Klasse ${grade}`;
}

/** Status-Meta für Anfragen (Punkt-Farbe + Label) – eine Quelle für alle Karten. */
export const REQUEST_STATUS: Record<string, { label: string; dotClass: string }> = {
    pending: { label: 'Ausstehend', dotClass: 'bg-primary' },
    accepted: { label: 'Akzeptiert', dotClass: 'bg-green-500' },
    rejected: { label: 'Abgelehnt', dotClass: 'bg-red-500' },
    completed: { label: 'Erledigt', dotClass: 'bg-gray-400' },
};

export function requestStatusMeta(status: string): { label: string; dotClass: string } {
    return REQUEST_STATUS[status] ?? REQUEST_STATUS.pending;
}

function timeOf(iso?: string): number {
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isNaN(t) ? 0 : t;
}

function newestFirst(a: number, b: number): number {
    return b - a;
}

function itemTime(item: StreamItem): number {
    return item.kind === 'match' ? 0 : item.createdAt;
}

const TIER_LABEL: Record<StreamTierKey, string> = {
    offen: 'Aktion nötig',
    laeuft: 'Kontakt läuft',
    matches: 'Neue Matches',
    wartet: 'Wartet auf Antwort',
    gemerkt: 'Gemerkte Anzeigen',
    archiv: 'Abgeschlossen',
};

const TIER_ORDER: StreamTierKey[] = ['offen', 'laeuft', 'matches', 'wartet', 'gemerkt', 'archiv'];

// ── Stream-Assembly ───────────────────────────────────────────────
// Dringlichkeits-Tier + neueste zuerst. Versteckte Chats und
// übersehene Matches bleiben draußen. Tier-Reihenfolge:
// 1 eingehend offen · 2 akzeptiert · 3 Matches · 4 ausgehend wartend
// 5 Merkliste · (abgelehnt/erledigt landen am Ende im Archiv)

export function buildStream(input: StreamInput, filter: StreamFilter): StreamTier[] {
    const { incoming, outgoing, matches, favorites, hiddenIds, seenIds } = input;

    const buckets: Record<StreamTierKey, StreamItem[]> = {
        offen: [],
        laeuft: [],
        matches: [],
        wartet: [],
        gemerkt: [],
        archiv: [],
    };

    for (const request of incoming) {
        if (hiddenIds.includes(request.id)) continue;
        const direction: RequestDirection = 'incoming';
        const item: RequestStreamItem = {
            kind: 'request',
            key: `req-${request.id}`,
            direction,
            request,
            createdAt: timeOf(request.created_at),
        };
        if (request.status === 'pending') buckets.offen.push(item);
        else if (request.status === 'accepted') buckets.laeuft.push(item);
        else buckets.archiv.push(item);
    }

    for (const request of outgoing) {
        if (hiddenIds.includes(request.id)) continue;
        const direction: RequestDirection = 'outgoing';
        const item: RequestStreamItem = {
            kind: 'request',
            key: `req-${request.id}`,
            direction,
            request,
            createdAt: timeOf(request.created_at),
        };
        if (request.status === 'accepted') buckets.laeuft.push(item);
        else if (request.status === 'pending') buckets.wartet.push(item);
        else buckets.archiv.push(item);
    }

    for (const match of matches) {
        buckets.matches.push({
            kind: 'match',
            key: `match-${match.ad.id}`,
            match,
            seen: seenIds.includes(match.ad.id),
        });
    }

    for (const favorite of favorites) {
        buckets.gemerkt.push({
            kind: 'favorite',
            key: `fav-${favorite.ad_id || favorite.id}`,
            favorite,
            createdAt: timeOf(favorite.created_at),
        });
    }

    buckets.offen.sort((a, b) => newestFirst(itemTime(a), itemTime(b)));
    buckets.laeuft.sort((a, b) => newestFirst(itemTime(a), itemTime(b)));
    buckets.wartet.sort((a, b) => newestFirst(itemTime(a), itemTime(b)));
    buckets.archiv.sort((a, b) => newestFirst(itemTime(a), itemTime(b)));
    buckets.gemerkt.sort((a, b) => newestFirst(itemTime(a), itemTime(b)));
    // Unbesichtigte Matches vor gesehenen, danach Score
    buckets.matches.sort((a, b) => {
        const ma = a as MatchStreamItem;
        const mb = b as MatchStreamItem;
        if (ma.seen !== mb.seen) return ma.seen ? 1 : -1;
        return mb.match.score - ma.match.score;
    });

    const visibleTier = (key: StreamTierKey): boolean => {
        if (filter === 'alle') return true;
        if (filter === 'matches') return key === 'matches';
        if (filter === 'merkliste') return key === 'gemerkt';
        return key === 'offen' || key === 'laeuft' || key === 'wartet' || key === 'archiv';
    };

    return TIER_ORDER
        .filter(key => visibleTier(key) && buckets[key].length > 0)
        .map(key => ({ key, label: TIER_LABEL[key], items: buckets[key] }));
}

/** Zähler je Typ-Filter – Grundlage der Filter-Pills. */
export function countStream(input: StreamInput): Record<StreamFilter, number> {
    const hidden = new Set(input.hiddenIds);
    const requests = [...input.incoming, ...input.outgoing].filter(r => !hidden.has(r.id)).length;
    const matches = input.matches.length;
    const merkliste = input.favorites.length;
    return {
        alle: requests + matches + merkliste,
        anfragen: requests,
        matches,
        merkliste,
    };
}
