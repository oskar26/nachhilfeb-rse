// Karten-Modul „Matches" für den Social-Strom: Match-Karte mit Score,
// Fächer-Vergleich, Freistunden-Check und den Aktionen Übersehen/Kontakt.
// Reine Darstellung – Scoring (computeMatches) und Daten bleiben in
// src/lib/matching.ts bzw. useSocialStream; Dismiss/Seen-State liegt im Stream.

import { useState } from 'react';
import {
    Sparkles, X, MessageSquare,
    CalendarDays, CheckCircle2,
    BookOpen, GraduationCap, MapPin, Search, Euro, Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
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
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                highlight
                    ? 'bg-primary text-amber-950'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
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
    const rightTitle = isOffer ? 'Er/sie bietet' : 'Er/sie sucht';
    const leftSubjects = (myAd?.subjects?.length ? myAd.subjects : (mySubjects ?? [])) as string[];
    const rightSubjects = (ad.subjects || []) as string[];

    return (
        <StreamCardShell>
            {/* Kopf: Typ-/Status-Chip links, großer Score rechts */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <TypeChip label="Match" dotClass="bg-emerald-500" icon={Zap} />
                    <StatusChip label={seen ? 'Gesehen' : 'Neu'} dotClass={seen ? 'bg-gray-400' : 'bg-primary'} />
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                            isOffer
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
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
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gray-100 text-base font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300" aria-hidden>
                        {ad.profiles?.display_name?.[0]?.toUpperCase() ?? 'F'}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="truncate text-base font-bold text-gray-900 dark:text-white">
                        {ad.profiles?.display_name ?? 'FWG Schüler/in'}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono tabular-nums">{formatGradeLabel(ad.profiles?.grade_level || ad.grade_levels?.[0])}</span>
                        {gradeCompatibility && (
                            <span className="font-semibold text-amber-700 dark:text-primary">{gradeCompatibility}</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Bezug zur eigenen Anzeige */}
            {myAd && (
                <div className="mt-3 rounded-2xl border border-dashed border-gray-200 px-3.5 py-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    Passend zu deiner Anzeige: <span className="font-bold">„{myAd.title || myAd.subjects.join(', ')}“</span>
                </div>
            )}

            {/* Kurzbeschreibung */}
            <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-gray-700 line-clamp-2 dark:text-gray-300">
                {ad.short_description || ad.long_description || 'Keine nähere Beschreibung angegeben.'}
            </p>

            {/* Gegenüberstellung: Du ↔ Gegenüber */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <BookOpen size={12} aria-hidden /> {leftTitle}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {leftSubjects.length > 0
                            ? leftSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} />)
                            : <span className="text-xs text-gray-600 dark:text-gray-400">Keine Fächer hinterlegt</span>}
                    </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <GraduationCap size={12} aria-hidden /> {rightTitle}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {rightSubjects.length > 0
                            ? rightSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} />)
                            : <span className="text-xs text-gray-600 dark:text-gray-400">Keine Fächer hinterlegt</span>}
                    </div>
                </div>
            </div>

            {/* Warum ihr zusammenpasst */}
            <div className="mt-2.5 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <Sparkles size={12} aria-hidden /> Warum ihr zusammenpasst
                </h4>
                {commonSubjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {commonSubjects.map(s => <SubjectPill key={s} label={subjectLabel(s)} highlight />)}
                    </div>
                )}
                <ul className="mt-2 space-y-1">
                    {matchReasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-green-600 dark:text-green-500" aria-hidden />
                            <span>{reason}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Meta-Zeile: Klasse · Preis · Ort · Freistunden */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-semibold dark:bg-gray-800">
                    <GraduationCap size={12} aria-hidden />
                    <span className="font-mono tabular-nums">{formatGradeLabel(ad.grade_levels?.[0])}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-semibold dark:bg-gray-800">
                    <Euro size={12} aria-hidden />
                    <span className="font-mono tabular-nums">{formatAdPrice(ad.price_details)}</span>
                </span>
                {ad.locations && ad.locations.length > 0 && (
                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-semibold dark:bg-gray-800">
                        <MapPin size={12} className="shrink-0" aria-hidden />
                        <span className="truncate">{ad.locations.join(', ')}</span>
                    </span>
                )}
                {availabilityMatches > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        aria-expanded={showCalendar}
                        className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-bold text-amber-900 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-primary dark:hover:bg-primary/15 dark:focus-visible:ring-offset-gray-900"
                        title="Gemeinsame Freistunden ansehen"
                    >
                        <CalendarDays size={12} aria-hidden />
                        <span className="font-mono tabular-nums">{availabilityMatches}</span>
                        Freistunden
                        <span className="text-[10px] underline">{showCalendar ? 'ausblenden' : 'ansehen'}</span>
                    </button>
                )}
            </div>

            {/* Inline-Verfügbarkeitsvergleich */}
            {showCalendar && (
                <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                            <CalendarDays size={12} className="text-green-600" aria-hidden /> Gemeinsame Zeiten (grün markiert)
                        </span>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black tabular-nums text-green-800 dark:bg-green-950/40 dark:text-green-300">
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
            <div className="mt-4 flex flex-wrap gap-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                    variant="outline"
                    onClick={onDismiss}
                    className="h-11 shrink-0 rounded-full border-gray-200 bg-white px-4 text-sm font-bold text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <X size={15} /> Übersehen
                </Button>
                <Button
                    onClick={onContact}
                    className="h-11 flex-1 rounded-full bg-primary px-4 text-sm font-bold text-black"
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
        <div className="animate-pulse rounded-3xl border border-gray-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
                <div className="h-7 w-32 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-14 w-20 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="h-4 w-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-2.5 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            <div className="mt-4 flex gap-2.5">
                <div className="h-11 w-28 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
    );
}
