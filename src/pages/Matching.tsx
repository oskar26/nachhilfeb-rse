// Karten-Modul „Matches" für den Social-Strom: Match-Karte mit Score,
// Fächer-Vergleich, Zeiten-Check und den Aktionen Übersehen/Kontakt.
// Reine Darstellung – Scoring (computeMatches) und Daten bleiben in
// src/lib/matching.ts bzw. useSocialStream; Dismiss/Seen-State liegt im Stream.

import { useState } from 'react';
import {
    Sparkles, X, MessageSquare,
    CalendarDays, CheckCircle2,
    BookOpen, GraduationCap, MapPin, Search, Euro, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { MatchScoreBadge } from '../components/social/MatchScoreBadge';
import { StreamCardShell, StatusChip, TypeChip } from '../components/social/StreamChips';
import { subjectLabelMap, type Subject } from '../components/SubjectChip';
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

/** Fächer-Chip: helle graue Pille; per `highlight` gelb (Score-/Treffer-Akzent). */
function SubjectPill({ label, highlight = false }: { label: string; highlight?: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                highlight
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
            )}
        >
            {highlight && <CheckCircle2 size={11} aria-hidden />}
            {label}
        </span>
    );
}

export function MatchStreamCard({
    match,
    myAvail,
    mySubjects,
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
    const { myAd, score, commonSubjects, availabilityMatches, gradeCompatibility, matchReasons } = match;
    const ad = match.ad as CardAd;
    const [showCalendar, setShowCalendar] = useState(false);

    const isOffer = ad.type === 'offer';
    const leftTitle = isOffer ? 'Du suchst' : 'Du bietest';
    const rightTitle = isOffer ? 'Bietet Nachhilfe' : 'Sucht Nachhilfe';
    const leftSubjects = (myAd?.subjects?.length ? myAd.subjects : (mySubjects ?? [])) as string[];
    const rightSubjects = (ad.subjects || []) as string[];

    return (
        <StreamCardShell>
            {/* Kopf: Typ-/Status-Chip links, großer Score rechts */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <TypeChip label="Vorschlag" dotClass="bg-primary" icon={Zap} />
                    <StatusChip label={seen ? 'Gesehen' : 'Neu'} dotClass={seen ? 'bg-muted-foreground' : 'bg-primary'} />
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                            isOffer
                                ? 'border border-primary/25 bg-primary/15 text-brand-ink dark:text-primary'
                                : 'border border-border bg-muted text-muted-foreground'
                        )}
                    >
                        {isOffer ? <GraduationCap size={13} aria-hidden /> : <Search size={13} aria-hidden />}
                        {isOffer ? 'Bietet' : 'Sucht Nachhilfe'}
                    </span>
                    {ad.profiles?.is_verified && <VerifiedPill />}
                </div>
                <MatchScoreBadge score={score} />
            </div>

            {/* Person */}
            <div className="mt-4 flex items-center gap-3">
                {ad.profiles?.avatar_url ? (
                    <img src={ad.profiles.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-base font-semibold text-muted-foreground" aria-hidden>
                        {ad.profiles?.display_name?.[0]?.toUpperCase() ?? 'F'}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                        {ad.profiles?.display_name ?? 'Schülerin oder Schüler des FWG'}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="font-mono tabular-nums">{formatGradeLabel(ad.profiles?.grade_level || ad.grade_levels?.[0])}</span>
                        {gradeCompatibility && (
                            <span className="font-semibold text-brand-ink dark:text-primary">{gradeCompatibility}</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Bezug zur eigenen Anzeige */}
            {myAd && (
                <div className="mt-3 rounded-xl border border-dashed border-border px-3.5 py-2 text-xs text-muted-foreground">
                    Passend zu deiner Anzeige: <span className="font-semibold">„{myAd.title || myAd.subjects.join(', ')}“</span>
                </div>
            )}

            {/* Kurzbeschreibung */}
            <p className="mt-3 line-clamp-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                {ad.short_description || ad.long_description || 'Keine Beschreibung angegeben.'}
            </p>

            {/* Gegenüberstellung: Du ↔ Gegenüber */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <BookOpen size={12} aria-hidden /> {leftTitle}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {leftSubjects.length > 0
                            ? leftSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} />)
                            : <span className="text-xs text-muted-foreground">Keine Fächer hinterlegt</span>}
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <GraduationCap size={12} aria-hidden /> {rightTitle}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {rightSubjects.length > 0
                            ? rightSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} />)
                            : <span className="text-xs text-muted-foreground">Keine Fächer hinterlegt</span>}
                    </div>
                </div>
            </div>

            {/* Warum ihr zusammenpasst */}
            <div className="mt-2.5 rounded-xl border border-border bg-muted/40 p-3.5">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Sparkles size={12} aria-hidden /> Warum ihr zusammenpasst
                </h4>
                {commonSubjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {commonSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} highlight />)}
                    </div>
                )}
                <ul className="mt-2 space-y-1">
                    {matchReasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-foreground/80">
                            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-brand-ink dark:text-primary" aria-hidden />
                            <span>{reason}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Meta-Zeile: Klasse · Preis · Ort · Zeiten */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-semibold">
                    <GraduationCap size={12} aria-hidden />
                    <span className="font-mono tabular-nums">{formatGradeLabel(ad.grade_levels?.[0])}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-semibold">
                    <Euro size={12} aria-hidden />
                    <span className="font-mono tabular-nums">{formatAdPrice(ad.price_details)}</span>
                </span>
                {ad.locations && ad.locations.length > 0 && (
                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-semibold">
                        <MapPin size={12} className="shrink-0" aria-hidden />
                        <span className="truncate">{ad.locations.join(', ')}</span>
                    </span>
                )}
                {availabilityMatches > 0 && (
                    <Button variant="unstyled" size="unstyled"
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        aria-expanded={showCalendar}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-semibold text-brand-ink transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-primary"
                        title="Gemeinsame Zeiten ansehen"
                    >
                        <CalendarDays size={12} aria-hidden />
                        <span className="font-mono tabular-nums">{availabilityMatches}</span>
                        Zeiten
                        <span className="text-xs underline">{showCalendar ? 'ausblenden' : 'ansehen'}</span>
                    </Button>
                )}
            </div>

            {/* Inline-Verfügbarkeitsvergleich */}
            {showCalendar && (
                <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <CalendarDays size={12} className="text-brand-ink dark:text-primary" aria-hidden /> Gemeinsame Zeiten (grün markiert)
                        </span>
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-ink dark:text-primary">
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
            <div className="mt-4 flex flex-wrap gap-2.5 border-t border-border pt-4">
                <Button
                    variant="outline"
                    onClick={onDismiss}
                    className="h-11 shrink-0 rounded-full border-border bg-card px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                    <X size={15} /> Übersehen
                </Button>
                <Button
                    onClick={onContact}
                    className="h-11 flex-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                    <MessageSquare size={15} /> Kontakt aufnehmen
                </Button>
            </div>
        </StreamCardShell>
    );
}

/** Helle Karten-Skelette für die Match-Karten. */
export function MatchSkeleton() {
    return (
        <div className="animate-pulse rounded-2xl border border-border bg-card p-5 shadow-soft">
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
