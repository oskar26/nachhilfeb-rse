// Daten-Hook für den Social-Strom: lädt Anfragen, Matches und Merkliste
// (Datenquellen unverändert: supabase.from('ad_requests'), api.ads.list
// {match_context:true, all:true}, supabase.from('favorites')) und bündelt
// alle Aktionen (Status setzen, abschließen, bewerten, übersehen, entfernen,
// versteckte Chats). Die Karten-Module bleiben reine Darstellung.

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { getHiddenChatIds, unhideChatId } from '../../pages/Chat';
import {
    computeMatches,
    type Match,
    type MatchAd,
    type MatchProfile,
} from '../../lib/matching';
import {
    getDismissedMatchIds,
    setDismissedMatchIds,
    getSeenMatchIds,
    markMatchSeen,
    type AdRequestItem,
    type FavoriteAd,
    type RequestPerson,
} from './stream';

export type MyProfile = MatchProfile & { id?: string };

interface RatingState {
    open: boolean;
    targetUser: RequestPerson | null;
    adId: string | null;
}

export interface SocialStreamApi {
    loading: boolean;
    error: unknown;
    reload: () => void;
    incoming: AdRequestItem[];
    outgoing: AdRequestItem[];
    matches: Match[];
    favorites: FavoriteAd[];
    hiddenIds: string[];
    dismissedIds: string[];
    seenIds: string[];
    myProfile: MyProfile | null;
    userAds: MatchAd[];
    /** Optimistischer Status-Wechsel (akzeptieren/ablehnen) inkl. persistenter Speicherung. */
    handleStatus: (id: string, status: 'accepted' | 'rejected') => Promise<void>;
    /** Öffnet den Rating-Dialog für die jeweils andere Person der Anfrage. */
    handleComplete: (req: AdRequestItem) => void;
    rating: RatingState;
    setRatingOpen: (open: boolean) => void;
    dismissMatch: (adId: string) => void;
    resetDismissed: () => void;
    markSeen: (adId: string) => void;
    removeFavorite: (adId: string) => Promise<void>;
    sharingAd: { id: string; title: string } | null;
    setSharingAd: (ad: { id: string; title: string } | null) => void;
    unhideAllChats: () => void;
}

export function useSocialStream(userId: string | undefined): SocialStreamApi {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [incoming, setIncoming] = useState<AdRequestItem[]>([]);
    const [outgoing, setOutgoing] = useState<AdRequestItem[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [favorites, setFavorites] = useState<FavoriteAd[]>([]);
    const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
    const [userAds, setUserAds] = useState<MatchAd[]>([]);
    const [hiddenIds, setHiddenIds] = useState<string[]>(() => getHiddenChatIds());
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => getDismissedMatchIds());
    const [seenIds, setSeenIds] = useState<string[]>(() => getSeenMatchIds());
    const [rating, setRating] = useState<RatingState>({ open: false, targetUser: null, adId: null });
    const [sharingAd, setSharingAd] = useState<{ id: string; title: string } | null>(null);

    const requestSeq = useRef(0);

    const loadAll = useCallback(() => {
        if (!userId) return;
        const seq = ++requestSeq.current;
        void (async () => {
            try {
                const [incRes, outRes, profRes, myAdsRes, candRes, favRes] = await Promise.all([
                    supabase
                        .from('ad_requests')
                        .select('*, requester:requester_id(id, display_name, grade_level, is_verified, avatar_url, phone_number, email, settings), ads(id, short_description)')
                        .eq('owner_id', userId)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('ad_requests')
                        .select('*, owner:owner_id(id, display_name, phone_number, email, settings), ads(id, short_description)')
                        .eq('requester_id', userId)
                        .order('created_at', { ascending: false }),
                    supabase.from('profiles').select('*').eq('id', userId).single(),
                    supabase.from('ads').select('*').eq('user_id', userId).eq('is_active', true),
                    api.ads.list({ match_context: true, all: true }),
                    supabase.from('favorites').select('*, ads(*)').eq('user_id', userId).order('created_at', { ascending: false }),
                ]);
                if (seq !== requestSeq.current) return;

                const firstError = incRes.error ?? outRes.error ?? profRes.error ?? myAdsRes.error ?? favRes.error ?? candRes.error;
                if (firstError) throw firstError;

                const incList = (incRes.data ?? []) as unknown as AdRequestItem[];
                const outList = (outRes.data ?? []) as unknown as AdRequestItem[];
                const profile = (profRes.data ?? null) as MyProfile | null;
                const mine = (myAdsRes.data ?? []) as unknown as MatchAd[];
                const candidates = ((candRes.data ?? []) as unknown as MatchAd[]).filter(
                    c => c.user_id !== userId && c.is_active !== false
                );
                const favRaw = (favRes.data ?? []) as unknown as Array<Record<string, unknown>>;

                const favList: FavoriteAd[] = favRaw.map(f => {
                    const adData = (f.ads || f) as Record<string, unknown>;
                    const profileData = (adData.profiles as FavoriteAd['ads']['profiles']) || {
                        display_name: (adData.display_name as string) || 'FWG Nutzer',
                        grade_level: (adData.user_grade as string) || (adData.grade_level as string),
                    };
                    return {
                        id: (f.id as string) || (f.ad_id as string) || '',
                        ad_id: (f.ad_id as string) || (f.id as string) || '',
                        created_at: (f.created_at as string) || undefined,
                        ads: {
                            ...(adData as unknown as FavoriteAd['ads']),
                            title: (adData.title as string) || (adData.short_description as string) || 'Nachhilfeanzeige',
                            profiles: profileData,
                        },
                    };
                }).filter(f => f.ads && (f.ads.short_description || f.ads.title));

                setIncoming(incList);
                setOutgoing(outList);
                setMyProfile(profile);
                setUserAds(mine);
                setFavorites(favList);
                setMatches(computeMatches({
                    myAds: mine,
                    candidateAds: candidates,
                    profile,
                    userId,
                    dismissedIds: getDismissedMatchIds(),
                }));
                setHiddenIds(getHiddenChatIds());
                setError(null);
            } catch (e) {
                if (seq !== requestSeq.current) return;
                setError(e);
            } finally {
                if (seq === requestSeq.current) setLoaded(true);
            }
        })();
    }, [userId]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const reload = useCallback(() => {
        setLoaded(false);
        setError(null);
        loadAll();
    }, [loadAll]);

    const handleStatus = useCallback(async (id: string, status: 'accepted' | 'rejected') => {
        // Optimistisch: Karte wandert sofort im Strom, Persistenz läuft mit.
        setIncoming(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
        setOutgoing(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
        const { error: updateError } = await supabase.from('ad_requests').update({ status }).eq('id', id);
        if (updateError) {
            toast.error('Status konnte nicht gespeichert werden. Bitte versuch es erneut.');
            loadAll();
        }
    }, [loadAll]);

    const handleComplete = useCallback((req: AdRequestItem) => {
        const targetUser: RequestPerson | null = req.requester_id === userId ? (req.owner ?? null) : (req.requester ?? null);
        setRating({ open: true, targetUser, adId: req.ads?.id ?? null });
    }, [userId]);

    const setRatingOpen = useCallback((open: boolean) => {
        setRating(prev => ({ ...prev, open }));
    }, []);

    const dismissMatch = useCallback((adId: string) => {
        const next = [...getDismissedMatchIds(), adId];
        setDismissedMatchIds(next);
        setDismissedIds(next);
        // Optimistisch: Karte sofort aus dem Strom, Neuberechnung erst beim Reload.
        setMatches(prev => prev.filter(m => m.ad.id !== adId));
    }, []);

    const resetDismissed = useCallback(() => {
        setDismissedMatchIds([]);
        setDismissedIds([]);
        loadAll();
    }, [loadAll]);

    const markSeen = useCallback((adId: string) => {
        markMatchSeen(adId);
        setSeenIds(getSeenMatchIds());
    }, []);

    const removeFavorite = useCallback(async (adId: string) => {
        try {
            const { error: delError } = await supabase.from('favorites').delete().eq('ad_id', adId).eq('user_id', userId);
            if (!delError) {
                setFavorites(prev => prev.filter(f => f.ad_id !== adId));
                toast.success('Aus Merkliste entfernt');
            } else {
                toast.error('Fehler beim Entfernen. Bitte versuch es erneut.');
            }
        } catch {
            toast.error('Fehler beim Entfernen. Bitte versuch es erneut.');
        }
    }, [userId]);

    const unhideAllChats = useCallback(() => {
        getHiddenChatIds().forEach(unhideChatId);
        setHiddenIds([]);
    }, []);

    return {
        loading: Boolean(userId) && !loaded,
        error,
        reload,
        incoming,
        outgoing,
        matches,
        favorites,
        hiddenIds,
        dismissedIds,
        seenIds,
        myProfile,
        userAds,
        handleStatus,
        handleComplete,
        rating,
        setRatingOpen,
        dismissMatch,
        resetDismissed,
        markSeen,
        removeFavorite,
        sharingAd,
        setSharingAd,
        unhideAllChats,
    };
}
