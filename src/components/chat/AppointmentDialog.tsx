import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import {
    APPOINTMENT_LOCATIONS,
    APPOINTMENT_SUBJECTS,
    APPOINTMENT_TIMES,
    DEFAULT_APPOINTMENT_DURATION,
    DEFAULT_APPOINTMENT_LOCATION,
    addDaysToISODate,
    isAppointmentInPast,
    isValidISODate,
    todayISODate,
    type AppointmentDetails,
} from '@/lib/chat-appointments';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { CalendarDays, Check, Clock, MapPin } from 'lucide-react';

interface AppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    otherName?: string | null;
    initial?: Partial<AppointmentDetails> | null;
    onSend: (details: AppointmentDetails) => Promise<boolean>;
}

function uniqueOptions(options: readonly string[], current: string): string[] {
    return options.includes(current) ? [...options] : [current, ...options];
}

export default function AppointmentDialog({
    open,
    onOpenChange,
    otherName,
    initial,
    onSend,
}: AppointmentDialogProps) {
    const defaultSubject = initial?.subject?.trim() || APPOINTMENT_SUBJECTS[0];
    const [subject, setSubject] = useState(defaultSubject);
    const [date, setDate] = useState(initial?.date ?? '');
    const [time, setTime] = useState(initial?.time ?? '14:00');
    const [location, setLocation] = useState(initial?.location ?? DEFAULT_APPOINTMENT_LOCATION);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const today = todayISODate();
    const tomorrow = addDaysToISODate(today, 1);
    const nextWeek = addDaysToISODate(today, 7);
    const durationMinutes = initial?.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION;

    const dateOptions = [
        { label: 'Heute', value: today },
        { label: 'Morgen', value: tomorrow },
        { label: 'Nächste Woche', value: nextWeek },
    ];

    const selectDate = (value: string) => {
        triggerHaptic('selection');
        setDate(value);
        setError(null);
    };

    const selectTime = (value: string) => {
        triggerHaptic('selection');
        setTime(value);
        setError(null);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting) return;

        if (!subject.trim()) {
            setError('Bitte wähle ein Fach.');
            return;
        }
        if (!isValidISODate(date)) {
            setError('Bitte wähle ein gültiges Datum.');
            return;
        }
        if (!time) {
            setError('Bitte wähle eine Uhrzeit.');
            return;
        }
        if (isAppointmentInPast({ date, time })) {
            setError('Dieser Termin liegt in der Vergangenheit. Bitte wähle eine spätere Zeit.');
            return;
        }

        setError(null);
        setSubmitting(true);
        const sent = await onSend({
            subject: subject.trim(),
            date,
            time,
            durationMinutes,
            ...(location.trim() ? { location: location.trim() } : {}),
        });
        setSubmitting(false);
        if (sent) onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-h-[92dvh] w-[calc(100%-1rem)] gap-3 overflow-y-auto rounded-dialog p-4 sm:max-w-md sm:p-6"
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <CalendarDays className="text-muted-foreground" size={20} aria-hidden />
                        Nachhilfetermin vereinbaren
                    </DialogTitle>
                    <DialogDescription>
                        Schlage {otherName || 'deinem Lernpartner'} einen festen Nachhilfetermin vor. Der Vorschlag wird als normale Chatnachricht gesendet.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    <div className="space-y-1.5">
                        <Label htmlFor="appointment-subject" className="text-xs font-semibold text-foreground/80">Fach</Label>
                        <NativeSelect
                            id="appointment-subject"
                            value={subject}
                            onChange={(event) => { setSubject(event.target.value); setError(null); }}
                            className="w-full text-sm font-semibold"
                        >
                            {uniqueOptions(APPOINTMENT_SUBJECTS, subject).map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </NativeSelect>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="appointment-date" className="text-xs font-semibold text-foreground/80">Datum</Label>
                            <span className="text-[11px] text-muted-foreground">Schnellwahl</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {dateOptions.map((option) => {
                                const selected = date === option.value;
                                return (
                                    <Button
                                        key={option.label}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        hapticStyle={false}
                                        aria-pressed={selected}
                                        onClick={() => selectDate(option.value)}
                                        className={cn(
                                            'min-h-11 rounded-full border-border px-2 text-xs font-semibold',
                                            selected && 'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground'
                                        )}
                                    >
                                        {selected && <Check size={13} aria-hidden />}
                                        {option.label}
                                    </Button>
                                );
                            })}
                        </div>
                        <Input
                            id="appointment-date"
                            type="date"
                            value={date}
                            min={today}
                            onChange={(event) => { setDate(event.target.value); setError(null); }}
                            required
                            className="h-12"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="appointment-time" className="text-xs font-semibold text-foreground/80">Uhrzeit</Label>
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock size={12} aria-hidden /> 45 Min
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {APPOINTMENT_TIMES.map((option) => {
                                const selected = time === option;
                                return (
                                    <Button
                                        key={option}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        hapticStyle={false}
                                        aria-pressed={selected}
                                        onClick={() => selectTime(option)}
                                        className={cn(
                                            'min-h-11 min-w-16 rounded-full border-border px-3 text-xs font-semibold tabular-nums',
                                            selected && 'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground'
                                        )}
                                    >
                                        {option}
                                    </Button>
                                );
                            })}
                        </div>
                        <Input
                            id="appointment-time"
                            type="time"
                            value={time}
                            onChange={(event) => { setTime(event.target.value); setError(null); }}
                            required
                            className="h-12"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="appointment-location" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                            <MapPin size={12} aria-hidden /> Ort / Treffpunkt
                        </Label>
                        <NativeSelect
                            id="appointment-location"
                            value={location}
                            onChange={(event) => { setLocation(event.target.value); setError(null); }}
                            className="w-full text-sm"
                        >
                            {uniqueOptions(APPOINTMENT_LOCATIONS, location).map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </NativeSelect>
                    </div>

                    {error && (
                        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold leading-relaxed text-destructive">
                            {error}
                        </p>
                    )}

                    <DialogFooter className="pt-1">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="min-h-11 rounded-full"
                        >
                            Abbrechen
                        </Button>
                        <Button
                            type="submit"
                            isLoading={submitting}
                            className="min-h-11 rounded-full font-semibold"
                            hapticStyle={false}
                        >
                            Termin vorschlagen
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
