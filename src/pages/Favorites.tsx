// Karten-Modul „Merkliste" für den Social-Strom: gemerkte Anzeige mit
// Ansehen/Entfernen und Teilen. Reine Darstellung – Daten und Aktionen
// kommen über Props aus useSocialStream (Social.tsx ist der einzige Importeur).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ExternalLink, Share2, GraduationCap, User } from 'lucide-react';
import { Button } from '../components/ui/button';
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
                    <TypeChip label="Merkliste" dotClass="bg-muted-foreground" icon={Heart} />
                    <StatusChip label="Gemerkt" dotClass="bg-muted-foreground" />
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="size-11 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
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
                            ? 'inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground'
                            : 'inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground'
                    }
                >
                    {ad.type === 'offer' ? <GraduationCap size={13} aria-hidden /> : <User size={13} aria-hidden />}
                    {ad.type === 'offer' ? 'Bietet' : 'Suche'}
                </span>
                <h3 className="min-w-0 truncate text-base font-semibold text-foreground">{ad.title}</h3>
            </div>

            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <GraduationCap size={13} aria-hidden />
                {ad.profiles?.display_name ? `${ad.profiles.display_name} · ` : ''}
                {gradeLabel(ad.profiles?.grade_level)}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
                {ad.subjects.map((s: string) => <SubjectChip key={s} subject={s as Subject} />)}
            </div>
            <p className="mt-3 line-clamp-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">{ad.short_description}</p>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className="font-sans text-sm font-semibold tabular-nums text-foreground">
                    {formatAdPrice(ad.price_details)}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        disabled={busy}
                        isLoading={busy}
                        className="h-11 rounded-lg border-border bg-card px-4 text-sm font-semibold text-muted-foreground hover:text-destructive"
                        onClick={() => void remove()}
                    >
                        Entfernen
                    </Button>
                    <Button
                        className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
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
        <div className="animate-pulse rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="h-6 w-20 rounded-full bg-muted" />
                <div className="h-11 w-11 rounded-full bg-muted" />
            </div>
            <div className="mt-4 space-y-2.5">
                <div className="h-4 w-3/5 rounded-full bg-border" />
                <div className="h-3 w-2/5 rounded-full bg-muted" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
                <div className="h-6 w-16 rounded-full bg-muted" />
                <div className="h-6 w-20 rounded-full bg-muted" />
            </div>
            <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded-full bg-muted" />
                <div className="h-3 w-4/5 rounded-full bg-muted" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                <div className="h-4 w-20 rounded-full bg-muted" />
                <div className="h-11 w-32 rounded-full bg-muted" />
            </div>
        </div>
    );
}
