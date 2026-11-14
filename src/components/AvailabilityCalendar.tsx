import { Button } from '@/components/ui/button';
import { cn } from '../lib/utils';
import { useState, type FocusEvent } from 'react';
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
    const lastSlotIndex = visibleSlots.length - 1;
    const lastDayIndex = visibleDays.length - 1;
    const timeColumnWidth = 52;

    // Bei schmalen Viewports liegt die letzte Tagesspalte im horizontalen
    // Scrollbereich. Beim Tastaturfokus vollständig einblenden, damit der
    // Fokusring nicht am Scrollrand abgeschnitten wird.
    const revealFocusedCell = (event: FocusEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        if (target.tagName !== 'BUTTON') return;
        const container = event.currentTarget;
        const cell = target.getBoundingClientRect();
        const view = container.getBoundingClientRect();
        const rail = timeColumnWidth + 6;
        if (cell.left < view.left + rail) {
            container.scrollLeft -= view.left + rail - cell.left;
        } else if (cell.right > view.right - 8) {
            container.scrollLeft += cell.right - (view.right - 8);
        }
    };

    return (
        <div className="mx-auto w-full min-w-0">
            {/* Nur das Raster scrollt. Legende und Umschalter liegen außerhalb,
                damit ihr Fokusring nicht am Scroll-Container abgeschnitten wird. */}
            <div
                className="overflow-x-auto scroll-pt-1.5 scroll-pr-1.5 scroll-pb-1.5 scroll-pl-14"
                onFocusCapture={revealFocusedCell}
            >
                <div className="w-max min-w-full p-1.5">
                    <div
                        className={cn(
                            "grid gap-px rounded-xl border border-border bg-border text-center text-xs",
                            isEditable && "min-w-max"
                        )}
                        style={{ gridTemplateColumns: `${timeColumnWidth}px repeat(${visibleDays.length}, minmax(${isEditable ? '2.75rem' : '0'}, 1fr))` }}
                    >
                        {/* Header Row */}
                        <div className="sticky left-0 z-10 rounded-tl-xl bg-muted/70 p-2" />
                        {visibleDays.map((d, dayIndex) => (
                            <div
                                key={d}
                                className={cn(
                                    "bg-muted/70 py-2.5 font-semibold text-foreground/80",
                                    dayIndex === lastDayIndex && "rounded-tr-xl"
                                )}
                            >
                                {DAY_LABELS[d]}
                            </div>
                        ))}

                        {/* Rows */}
                        {visibleSlots.map((slot, slotIndex) => {
                            const isEvenHour = slot.endsWith(':00');
                            return (
                                <div key={slot} className="contents">
                                    <div
                                        className={cn(
                                            "sticky left-0 z-10 flex select-none items-center justify-center whitespace-nowrap bg-muted/70 px-1 font-sans text-[13px] tabular-nums text-muted-foreground",
                                            isEvenHour ? (compact ? "py-1 font-semibold" : "py-1.5 font-semibold") : "py-1",
                                            slotIndex === lastSlotIndex && "rounded-bl-xl"
                                        )}
                                    >
                                        {isEvenHour ? slot : ''}
                                    </div>
                                    {visibleDays.map((d, dayIndex) => {
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
                                                    "flex w-full scroll-m-1.5 items-center justify-center border-0 p-0 transition-colors focus-visible:z-20",
                                                    isEditable ? "cursor-pointer" : "cursor-default",
                                                    cellHeight,
                                                    cellClass,
                                                    slotIndex === lastSlotIndex && dayIndex === lastDayIndex && "rounded-br-xl"
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
                </div>
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
    );
}
