import { cn } from '../lib/utils';
import { useState } from 'react';
import { Check } from 'lucide-react';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type Availability = Record<DayKey, string[]>; // string[] is array of slot keys like "13:30"

export const DAY_LABELS: Record<DayKey, string> = {
    mon: 'Mo', tue: 'Di', wed: 'Mi', thu: 'Do', fri: 'Fr', sat: 'Sa', sun: 'So'
};
export const DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Generate slots from 13:30 to 22:00 in 30min steps
export function generateSlots(): string[] {
    const all: string[] = [];
    let hour = 13, min = 30;
    while (hour < 22 || (hour === 22 && min === 0)) {
        all.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        min += 30;
        if (min === 60) { min = 0; hour++; }
    }
    return all;
}

export const SLOTS = generateSlots();

export function emptyAvailability(): Availability {
    return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}

export function countMatches(myAvail: Availability, theirAvail: Availability): number {
    let count = 0;
    for (const day of DAYS) {
        const mine = new Set(myAvail[day] || []);
        for (const slot of theirAvail[day] || []) {
            if (mine.has(slot)) count++;
        }
    }
    return count;
}

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
            <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <span className="text-gray-400 dark:text-gray-600 text-3xl mb-2">📅</span>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Keine Verfügbarkeiten eingetragen
                </p>
            </div>
        );
    }

    // Determine what is visible based on showAll
    const visibleDays = (showAll || isEditable || activeDays.length === 0) ? DAYS : activeDays;
    const visibleSlots = (showAll || isEditable || activeSlots.length === 0) ? SLOTS : activeSlots;
    const cellHeight = compact ? "h-5" : "h-7";

    return (
        <div className="overflow-x-auto -mx-2 px-2">
            <div className={cn("mx-auto", compact ? "min-w-[280px]" : "min-w-[320px] max-w-full")}>
                <div 
                    className="grid gap-px bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden text-center text-xs border border-gray-200 dark:border-gray-700 shadow-sm"
                    style={{ gridTemplateColumns: `56px repeat(${visibleDays.length}, 1fr)` }}
                >
                    {/* Header Row */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-2" />
                    {visibleDays.map(d => (
                        <div key={d} className="bg-gray-50 dark:bg-gray-900 py-2.5 font-bold text-gray-600 dark:text-gray-300">
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
                                        "bg-gray-50 dark:bg-gray-900 flex items-center justify-end pr-2 text-gray-400 font-mono select-none",
                                        isEvenHour ? (compact ? "py-1 text-[10px] font-semibold" : "py-1.5 text-xs font-semibold") : (compact ? "py-0.5 text-[8px]" : "py-1 text-[9px] text-gray-300 dark:text-gray-600")
                                    )}
                                >
                                    {isEvenHour ? slot : ''}
                                </div>
                                {visibleDays.map(d => {
                                    const sel = isSelected(d, slot);
                                    const match = isMatch(d, slot);
                                    
                                    let cellClass = "bg-white dark:bg-gray-900";
                                    let content = null;

                                    if (isEditable) {
                                        if (sel) {
                                            cellClass = "bg-primary text-primary-foreground";
                                        }
                                    } else {
                                        if (sel && match) {
                                            cellClass = "bg-emerald-500 text-white flex items-center justify-center";
                                            content = <Check size={compact ? 10 : 12} strokeWidth={3} className="text-white animate-in scale-in duration-200" />;
                                        } else if (match) {
                                            cellClass = "bg-primary text-primary-foreground";
                                        } else if (sel) {
                                            cellClass = "bg-blue-400 dark:bg-blue-500 text-white";
                                        }
                                    }

                                    return (
                                        <button
                                            key={d + slot}
                                            type="button"
                                            onClick={() => toggle(d, slot)}
                                            disabled={!isEditable}
                                            className={cn(
                                                "w-full transition-all flex items-center justify-center border-0 p-0 outline-none",
                                                isEditable && "hover:opacity-85 active:scale-95 cursor-pointer",
                                                !isEditable && "cursor-default",
                                                cellHeight,
                                                cellClass
                                            )}
                                            aria-label={`${DAY_LABELS[d]} ${slot}`}
                                        >
                                            {content}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Show toggle button in read-only mode if we have active slots but are hiding some */}
                {!isEditable && activeSlots.length < SLOTS.length && (
                    <div className="text-center mt-3">
                        <button 
                            type="button"
                            onClick={() => setShowAll(!showAll)} 
                            className="text-xs font-semibold text-primary-hover hover:underline inline-flex items-center gap-1"
                        >
                            {showAll ? 'Kalender einklappen 👆' : `Ganzen Kalender anzeigen (${SLOTS.length} Zeiten) 👇`}
                        </button>
                    </div>
                )}

                {isEditable && (
                    <p className="text-[11px] text-gray-400 text-center mt-2.5">
                        Tippe auf eine Zelle, um deine Verfügbarkeit zu markieren (13:30 – 22:00 Uhr)
                    </p>
                )}

                {matchWith && !isEditable && (
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400 justify-center flex-wrap">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold"><Check size={8} strokeWidth={4} /></span> 
                            Übereinstimmung
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-primary" /> 
                            Deine Zeit
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-blue-400 dark:bg-blue-500" /> 
                            Deren Zeit
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
