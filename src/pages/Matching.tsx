// Karten-Modul „Matches" für den Social-Strom: Match-Karte mit Score,
// Fächer-Vergleich, Zeiten-Check und den Aktionen Übersehen/Kontakt.
// Reine Darstellung – Scoring (computeMatches) und Daten bleiben in
// src/lib/matching.ts bzw. useSocialStream; Dismiss/Seen-State liegt im Stream.

import { useState } from 'react';
import {
    X, MessageSquare,
    CalendarDays,
    BookOpen, GraduationCap, MapPin, Search, Euro
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { MatchScoreBadge } from '../components/social/MatchScoreBadge';
import { StreamCardShell } from '../components/social/StreamChips';
import { subjectLabelMap, type Subject } from '../components/SubjectChip';
import { avatarTone } from '../lib/avatar';
import { cn, formatAdPrice, type PriceDetails } from '../lib/utils';
import {
    emptyAvailability,
    formatGradeLabel,
    normalizeSubject,
    type Availability,
    type Match,
    type MatchAd,
} from '../lib/matching';

type CardAd = MatchAd & { price_details?: PriceDetails | null };

function subjectLabel(s: string): string {
    return subjectLabelMap[normalizeSubject(s) as Subject] ?? s;
}

export function MatchStreamCard({
    match,
    myAvail,
    seen,
    onContact,
    onDismiss,
}: {
    match: Match;
    myAvail?: Availability;
    mySubjects?: string[];
    seen: boolean;
    onContact: () => void;
    onDismiss: () => void;
}) {
    const { score, commonSubjects, availabilityMatches, gradeCompatibility } = match;
    const ad = match.ad as CardAd;
    const [showCalendar, setShowCalendar] = useState(false);

    const isOffer = ad.type === 'offer';
    const rightSubjects = (ad.subjects || []) as string[];

    return (
        <StreamCardShell>
            {/* Kopf: Person, Typ, Status, Score */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    {ad.profiles?.avatar_url ? (
                        <img src={ad.profiles.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                        <div className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${avatarTone(ad.profiles?.display_name)}`} aria-hidden>
                            {ad.profiles?.display_name?.[0]?.toUpperCase() ?? 'F'}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-extrabold text-foreground">
                            {ad.profiles?.display_name ?? 'Schülerin oder Schüler des FWG'}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                                {isOffer ? <GraduationCap size={12} aria-hidden /> : <Search size={12} aria-hidden />}
                                {isOffer ? 'Bietet' : 'Sucht'}
                            </span>
                            <span aria-hidden>·</span>
                            <span className="tabular-nums">{formatGradeLabel(ad.profiles?.grade_level || ad.grade_levels?.[0])}</span>
                            <span className="inline-flex items-center gap-1 font-semibold">
                                <span className={cn('size-1.5 rounded-full', seen ? 'bg-muted-foreground' : 'bg-primary')} aria-hidden />
                                {seen ? 'Gesehen' : 'Neu'}
                            </span>
                        </div>
                        {gradeCompatibility && <p className="mt-1 text-xs font-semibold text-foreground">{gradeCompatibility}</p>}
                    </div>
                </div>
                <MatchScoreBadge score={score} />
            </div>

            <p className="mt-2 line-clamp-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                {ad.short_description || ad.long_description || 'Keine Beschreibung angegeben.'}
            </p>

            {/* Eine Faktenzeile statt vier Pillen-Reihen */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground">
                {(commonSubjects.length > 0 || rightSubjects.length > 0) && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                        <BookOpen size={12} aria-hidden className="shrink-0" />
                        <span className="font-semibold text-foreground">{commonSubjects.length > 0 ? 'Gemeinsam:' : 'Fächer:'}</span>
                        <span className="truncate">{(commonSubjects.length > 0 ? commonSubjects : rightSubjects).map(subjectLabel).join(', ')}</span>
                    </span>
                )}
                <span className="inline-flex items-center gap-1">
                    <GraduationCap size={12} aria-hidden className="shrink-0" />
                    <span className="tabular-nums">{formatGradeLabel(ad.grade_levels?.[0])}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                    <Euro size={12} aria-hidden className="shrink-0" />
                    <span className="tabular-nums">{formatAdPrice(ad.price_details)}</span>
                </span>
                {ad.locations && ad.locations.length > 0 && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin size={12} className="shrink-0" aria-hidden />
                        <span className="truncate">{ad.locations.join(', ')}</span>
                    </span>
                )}
                {availabilityMatches > 0 && (
                    <Button variant="unstyled" size="unstyled"
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        aria-expanded={showCalendar}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-semibold text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                        title="Gemeinsame Zeiten ansehen"
                    >
                        <CalendarDays size={12} aria-hidden />
                        <span className="tabular-nums">{availabilityMatches}</span>
                        Zeiten
                    </Button>
                )}
            </div>

            {/* Inline-Verfügbarkeitsvergleich */}
            {showCalendar && (
                <div className="mt-3 rounded-card bg-muted/60 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <CalendarDays size={12} className="text-foreground" aria-hidden /> Gemeinsame Zeiten (grün markiert)
                        </span>
                        <span className="rounded-full bg-card px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                            {availabilityMatches} Treffer
                        </span>
                    </div>
                    <AvailabilityCalendar
                        availability={ad.profiles?.availability || emptyAvailability()}
                        matchWith={myAvail}
                        compact
                    />
                </div>
            )}

            {/* Aktionen */}
            <div className="mt-3 flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    onClick={onDismiss}
                    className="h-11 shrink-0 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                    <X size={15} /> Übersehen
                </Button>
                <Button
                    onClick={onContact}
                    className="h-11 flex-1 px-4 text-sm font-semibold"
                >
                    <MessageSquare size={15} /> Anzeige ansehen
                </Button>
            </div>
        </StreamCardShell>
    );
}

/** Helle Karten-Skelette für die Match-Karten. */
export function MatchSkeleton() {
    return (
        <div className="animate-pulse rounded-card bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="h-7 w-32 rounded-full bg-muted" />
                <div className="h-14 w-20 rounded-2xl bg-muted" />
            </div>
            <div className="mt-4 flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-border" />
                <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="h-4 w-1/2 rounded-full bg-border" />
                    <div className="h-3 w-1/3 rounded-full bg-muted" />
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="h-20 rounded-2xl bg-muted" />
                <div className="h-20 rounded-2xl bg-muted" />
            </div>
            <div className="mt-2.5 h-24 rounded-2xl bg-muted" />
            <div className="mt-4 flex gap-2.5">
                <div className="h-11 w-28 rounded-full bg-muted" />
                <div className="h-11 flex-1 rounded-full bg-muted" />
            </div>
        </div>
    );
}
