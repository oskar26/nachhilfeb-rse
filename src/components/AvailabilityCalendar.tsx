import { Button } from '@/components/ui/button';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { Check, CalendarDays, ChevronUp, ChevronDown } from 'lucide-react';
import { DAYS, DAY_LABELS, SLOTS, generateSlots, emptyAvailability, countMatches, type Availability, type DayKey } from '../lib/availability';

// Verfügbarkeits-Logik liegt in lib/availability.ts (ohne React); hier nur Re-Export,
// damit bestehende Importe aus dieser Komponente unverändert funktionieren.
export { DAYS, DAY_LABELS, SLOTS, generateSlots, emptyAvailability, countMatches };
export type { DayKey, Availability };

interface AvailabilityCalendarProps {
    availability: Availability;
    onChange?: (a: Availability) => void; // If provided, calendar is editable
    matchWith?: Availability; // If provided, highlights overlap
    compact?: boolean;
}

export function AvailabilityCalendar({
    availability,
    onChange,
    matchWith,
    compact = false
}: AvailabilityCalendarProps) {
    const isEditable = !!onChange;
    const [showAll, setShowAll] = useState(isEditable);

    const toggle = (day: DayKey, slot: string) => {
        if (!onChange) return;
        if ('vibrate' in navigator) navigator.vibrate([15]);
        const current = availability[day] || [];
        const next = current.includes(slot)
            ? current.filter(s => s !== slot)
            : [...current, slot];
        onChange({ ...availability, [day]: next });
    };

    const isSelected = (day: DayKey, slot: string) =>
        (availability[day] || []).includes(slot);

    const isMatch = (day: DayKey, slot: string) =>
        matchWith ? (matchWith[day] || []).includes(slot) : false;

    // Filter active days and slots in read-only mode
    const activeDays = DAYS.filter(d =>
        (availability[d] || []).length > 0 || (matchWith ? (matchWith[d] || []).length > 0 : false)
    );

    const activeSlots = SLOTS.filter(slot =>
        DAYS.some(d => isSelected(d, slot) || isMatch(d, slot))
    );

    // If read-only and nothing is active, show empty state
    if (!isEditable && activeSlots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/30 p-6 text-center">
                <CalendarDays size={28} className="mb-2 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">
                    Keine Verfügbarkeiten eingetragen
                </p>
            </div>
        );
    }

    // Determine what is visible based on showAll
    const visibleDays = (showAll || isEditable || activeDays.length === 0) ? DAYS : activeDays;
    const visibleSlots = (showAll || isEditable || activeSlots.length === 0) ? SLOTS : activeSlots;
    const cellHeight = isEditable ? "h-11 min-h-11" : compact ? "h-6" : "h-7";

    return (
        <div className="-mx-2 overflow-x-auto px-2 pb-1">
            <div className={cn("mx-auto", compact ? "min-w-[280px]" : "min-w-[320px] max-w-full")}>
                <div
                    className="grid gap-px overflow-hidden rounded-xl border border-border bg-border text-center text-xs"
                    style={{ gridTemplateColumns: `44px repeat(${visibleDays.length}, minmax(${isEditable ? '2.75rem' : '0'}, 1fr))` }}
                >
                    {/* Header Row */}
                    <div className="sticky left-0 z-10 bg-muted/70 p-2" />
                    {visibleDays.map(d => (
                        <div key={d} className="bg-muted/70 py-2.5 font-semibold text-foreground/80">
                            {DAY_LABELS[d]}
                        </div>
                    ))}

                    {/* Rows */}
                    {visibleSlots.map((slot) => {
                        const isEvenHour = slot.endsWith(':00');
                        return (
                            <div key={slot} className="contents">
                                <div
                                    className={cn(
                                        "sticky left-0 z-10 flex select-none items-center justify-end bg-muted/70 pr-2 font-sans text-muted-foreground",
                                        isEvenHour ? (compact ? "py-1 text-[10px] font-semibold" : "py-1.5 text-xs font-semibold") : (compact ? "py-0.5 text-[8px]" : "py-1 text-[9px] text-muted-foreground/70")
                                    )}
                                >
                                    {isEvenHour ? slot : ''}
                                </div>
                                {visibleDays.map(d => {
                                    const sel = isSelected(d, slot);
                                    const match = isMatch(d, slot);

                                    let cellClass = "bg-card hover:bg-muted/60";
                                    let content = null;

                                    if (isEditable) {
                                        if (sel) {
                                            cellClass = "bg-foreground text-background hover:bg-foreground/90";
                                        }
                                    } else {
                                        if (sel && match) {
                                            cellClass = "flex items-center justify-center bg-emerald-500 text-white";
                                            content = <Check size={compact ? 10 : 14} strokeWidth={3} className="text-white" aria-hidden />;
                                        } else if (match) {
                                            cellClass = "bg-primary text-primary-foreground";
                                        } else if (sel) {
                                            cellClass = "bg-muted-foreground/40 text-foreground";
                                        }
                                    }

                                    return (
                                        <Button variant="unstyled" size="unstyled"
                                            key={d + slot}
                                            type="button"
                                            onClick={() => toggle(d, slot)}
                                            disabled={!isEditable}
                                            className={cn(
                                                "flex w-full items-center justify-center border-0 p-0 transition-colors",
                                                isEditable ? "cursor-pointer" : "cursor-default",
                                                cellHeight,
                                                cellClass
                                            )}
                                            aria-label={`${DAY_LABELS[d]} ${slot}`}
                                            aria-pressed={isEditable ? sel : undefined}
                                        >
                                            {content}
                                        </Button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Show toggle button in read-only mode if we have active slots but are hiding some */}
                {!isEditable && activeSlots.length < SLOTS.length && (
                    <div className="mt-3 text-center">
                        <Button variant="unstyled" size="unstyled"
                            type="button"
                            onClick={() => setShowAll(!showAll)}
                            className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-foreground hover:underline"
                        >
                            {showAll ? (
                                <span className="inline-flex items-center gap-1">Kalender einklappen <ChevronUp size={14} aria-hidden /></span>
                            ) : (
                                <span className="inline-flex items-center gap-1">Ganzen Kalender anzeigen ({SLOTS.length} Zeiten) <ChevronDown size={14} aria-hidden /></span>
                            )}
                        </Button>
                    </div>
                )}

                {isEditable && (
                    <p className="mt-2.5 text-center text-xs text-muted-foreground">
                        Tippe auf eine Zelle, um deine Verfügbarkeit zu markieren (8:00 – 22:00 Uhr)
                    </p>
                )}

                {matchWith && !isEditable && (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="flex size-3.5 items-center justify-center rounded bg-emerald-500 text-white"><Check size={8} strokeWidth={4} aria-hidden /></span>
                            Übereinstimmung
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-3.5 rounded bg-primary" />
                            Deine Zeit
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-3.5 rounded bg-muted-foreground/40" />
                            Deren Zeit
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
