// Karten-Modul „Merkliste" für den Social-Strom: gemerkte Anzeige mit
// Ansehen/Entfernen und Teilen. Reine Darstellung – Daten und Aktionen
// kommen über Props aus useSocialStream (Social.tsx ist der einzige Importeur).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ExternalLink, Share2, GraduationCap, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SubjectChip, type Subject } from '../components/SubjectChip';
import { formatAdPrice } from '../lib/utils';
import { gradeLabel, type FavoriteAd } from '../components/social/stream';
import { StreamCardShell, StatusChip, TypeChip } from '../components/social/StreamChips';

export function FavoriteStreamCard({
    favorite,
    onRemove,
    onShare,
}: {
    favorite: FavoriteAd;
    onRemove: (adId: string) => Promise<void> | void;
    onShare: (ad: { id: string; title: string }) => void;
}) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const ad = favorite.ads;

    const remove = async () => {
        setBusy(true);
        try {
            await onRemove(ad.id);
        } finally {
            setBusy(false);
        }
    };

    return (
        <StreamCardShell>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <TypeChip label="Merkliste" dotClass="bg-rose-500" icon={Heart} />
                    <StatusChip label="Gemerkt" dotClass="bg-gray-400" />
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 shrink-0 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    onClick={() => onShare({ id: ad.id, title: ad.title })}
                    title="Anzeige teilen"
                    aria-label="Anzeige teilen"
                >
                    <Share2 size={16} />
                </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                    className={
                        ad.type === 'offer'
                            ? 'inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    }
                >
                    {ad.type === 'offer' ? <GraduationCap size={13} aria-hidden /> : <User size={13} aria-hidden />}
                    {ad.type === 'offer' ? 'Bietet' : 'Suche'}
                </span>
                <h3 className="min-w-0 truncate text-base font-bold text-gray-900 dark:text-white">{ad.title}</h3>
            </div>

            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <GraduationCap size={13} aria-hidden />
                {ad.profiles?.display_name ? `${ad.profiles.display_name} · ` : ''}
                {gradeLabel(ad.profiles?.grade_level)}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
                {ad.subjects.map((s: string) => <SubjectChip key={s} subject={s as Subject} />)}
            </div>
            <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-gray-700 line-clamp-2 dark:text-gray-300">{ad.short_description}</p>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <span className="font-mono text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatAdPrice(ad.price_details)}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        disabled={busy}
                        isLoading={busy}
                        className="h-11 rounded-full border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 hover:text-red-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        onClick={() => void remove()}
                    >
                        Entfernen
                    </Button>
                    <Button
                        className="h-11 rounded-full bg-primary px-4 text-sm font-bold text-black"
                        onClick={() => navigate(`/ad/${ad.id}`)}
                    >
                        Ansehen <ExternalLink size={14} />
                    </Button>
                </div>
            </div>
        </StreamCardShell>
    );
}

/** Helles Karten-Skelett für die Merklisten-Karten. */
export function FavoriteSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-gray-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
                <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 w-11 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 space-y-2.5">
                <div className="h-4 w-3/5 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-2/5 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
                <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <div className="h-4 w-20 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 w-32 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
    );
}
