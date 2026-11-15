import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { downloadICSFile } from '@/lib/calendar';
import {
    formatAppointmentTime,
    type AppointmentLocalStatus,
    type AppointmentTimelineEntry,
} from '@/lib/chat-appointments';
import { cn } from '@/lib/utils';
import { CalendarPlus, CalendarRange, Clock, Download, MapPin, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarPanelProps {
    variant: 'desktop' | 'mobile';
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointments: AppointmentTimelineEntry[];
    otherName?: string | null;
    canCreateAppointment: boolean;
    onNewAppointment: () => void;
    onGoToMessage: (messageId: string) => void;
}

const STATUS_META: Record<AppointmentLocalStatus, { label: string; className: string }> = {
    proposed: {
        label: 'Offen',
        className: 'border-[#e5d9ae] bg-[#f6edc9] text-[#6b5c1a]',
    },
    accepted: {
        label: 'Bestätigt',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
    },
    declined: {
        label: 'Abgelehnt',
        className: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
    },
    countered: {
        label: 'Neu vorgeschlagen',
        className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
    },
};

function AppointmentRow({
    appointment,
    muted,
    onGoToMessage,
}: {
    appointment: AppointmentTimelineEntry;
    muted?: boolean;
    onGoToMessage: (messageId: string) => void;
}) {
    const status = STATUS_META[appointment.status];
    const handleDownload = () => {
        downloadICSFile({
            title: `FWG Nachhilfe: ${appointment.details.subject}`,
            description: `Nachhilfetermin: ${appointment.details.subject}`,
            startDate: appointment.start,
            durationMinutes: appointment.details.durationMinutes,
            ...(appointment.details.location ? { location: appointment.details.location } : {}),
        });
        toast.success('Kalenderdatei erstellt.');
    };

    return (
        <div className={cn(
            'rounded-[18px] border border-black/5 bg-white/85 p-3 shadow-[0_1px_1px_rgb(60_50_15_/_0.03),0_6px_18px_rgb(60_50_15_/_0.045)] dark:border-white/10 dark:bg-[#1d1f24]/90',
            muted && 'bg-white/65 dark:bg-[#1d1f24]/65'
        )}>
            <div className="flex items-start gap-3">
                <div className={cn(
                    'grid w-12 shrink-0 place-items-center rounded-[14px] border px-1 py-1.5 text-center',
                    muted
                        ? 'border-black/5 bg-black/[0.03] text-muted-foreground dark:border-white/10 dark:bg-white/5'
                        : 'border-[#efe4c0] bg-[#fffdf4] text-[#18181b]'
                )}>
                    <span className="text-[11px] font-semibold uppercase leading-none text-[#8a7318]">
                        {appointment.start.toLocaleDateString('de-DE', { month: 'short' })}
                    </span>
                    <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
                        {appointment.start.toLocaleDateString('de-DE', { day: '2-digit' })}
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <p className="min-w-0 truncate text-[14px] font-bold leading-tight text-foreground">
                            {appointment.details.subject}
                        </p>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight', status.className)}>
                            {status.label}
                        </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-foreground/80">
                        <Clock size={12} aria-hidden /> {formatAppointmentTime(appointment.details)}
                    </p>
                    {appointment.details.location && (
                        <p className="mt-0.5 flex items-start gap-1 text-[12px] leading-snug text-muted-foreground">
                            <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden />
                            <span className="min-w-0 break-words">{appointment.details.location}</span>
                        </p>
                    )}
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={`Termin ${appointment.details.subject} in Kalender speichern`}
                    onClick={handleDownload}
                >
                    <Download size={16} aria-hidden />
                </Button>
            </div>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 min-h-11 w-full justify-start rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => onGoToMessage(appointment.messageId)}
            >
                <MessageSquare size={14} aria-hidden /> Im Chat anzeigen
            </Button>
        </div>
    );
}

function PanelBody({
    appointments,
    canCreateAppointment,
    onNewAppointment,
    onGoToMessage,
}: {
    appointments: AppointmentTimelineEntry[];
    canCreateAppointment: boolean;
    onNewAppointment: () => void;
    onGoToMessage: (messageId: string) => void;
}) {
    const upcoming = appointments.filter((appointment) => appointment.isUpcoming);
    const past = appointments.filter((appointment) => !appointment.isUpcoming);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-foreground">
                    Kommende Termine
                </p>
                {canCreateAppointment && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 rounded-full bg-white/80 px-3 text-xs font-semibold dark:bg-white/10"
                        onClick={onNewAppointment}
                    >
                        <CalendarPlus size={15} aria-hidden /> Neu
                    </Button>
                )}
            </div>

            {upcoming.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-black/10 bg-white/45 px-4 py-6 text-center dark:border-white/15 dark:bg-white/5">
                    <CalendarRange size={24} className="mx-auto text-muted-foreground" aria-hidden />
                    <p className="mt-2 text-sm font-semibold text-foreground">Keine kommenden Termine</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        Terminvorschläge aus dem Chat erscheinen hier automatisch.
                    </p>
                    {canCreateAppointment && (
                        <Button
                            type="button"
                            size="sm"
                            className="mt-3 min-h-11 rounded-full px-4 text-xs font-semibold"
                            onClick={onNewAppointment}
                        >
                            Termin vorschlagen
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {upcoming.map((appointment) => (
                        <AppointmentRow
                            key={`${appointment.messageId}-${appointment.details.date}-${appointment.details.time}`}
                            appointment={appointment}
                            onGoToMessage={onGoToMessage}
                        />
                    ))}
                </div>
            )}

            {past.length > 0 && (
                <details className="group">
                    <summary className="min-h-11 cursor-pointer list-none rounded-full px-2 py-3 text-[12px] font-semibold text-muted-foreground hover:text-foreground">
                        Vergangene Termine ({past.length})
                    </summary>
                    <div className="mt-1 space-y-2">
                        {past.map((appointment) => (
                            <AppointmentRow
                                key={`${appointment.messageId}-${appointment.details.date}-${appointment.details.time}`}
                                appointment={appointment}
                                muted
                                onGoToMessage={onGoToMessage}
                            />
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}

export default function CalendarPanel({
    variant,
    open,
    onOpenChange,
    appointments,
    otherName,
    canCreateAppointment,
    onNewAppointment,
    onGoToMessage,
}: CalendarPanelProps) {
    if (variant === 'desktop') {
        if (!open) return null;
        return (
            <aside
                aria-label="Termine im Chat"
                className="hidden h-full w-[21rem] shrink-0 flex-col border-l border-black/5 bg-[#fffdf8]/85 backdrop-blur-md dark:border-white/10 dark:bg-[#141519]/90 md:flex"
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold leading-tight text-foreground">Termine</h2>
                        <p className="truncate text-[12px] text-muted-foreground">
                            {otherName ? `Mit ${otherName}` : 'Aus diesem Chat'}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                        aria-label="Terminpanel schließen"
                        onClick={() => onOpenChange(false)}
                    >
                        <X size={18} aria-hidden />
                    </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    <PanelBody
                        appointments={appointments}
                        canCreateAppointment={canCreateAppointment}
                        onNewAppointment={onNewAppointment}
                        onGoToMessage={onGoToMessage}
                    />
                </div>
            </aside>
        );
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                showCloseButton={false}
                className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-[28px] border-x border-t border-border bg-[#fffdf8] p-0 dark:bg-[#141519] md:hidden"
            >
                <SheetHeader className="shrink-0 border-b border-black/5 px-4 pb-3 pt-4 pr-14 dark:border-white/10">
                    <SheetTitle className="text-left text-base font-bold text-foreground">Termine</SheetTitle>
                    <SheetDescription className="text-left text-[12px] text-muted-foreground">
                        {otherName ? `Terminvorschläge mit ${otherName}` : 'Terminvorschläge aus diesem Chat'}
                    </SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                    <PanelBody
                        appointments={appointments}
                        canCreateAppointment={canCreateAppointment}
                        onNewAppointment={onNewAppointment}
                        onGoToMessage={onGoToMessage}
                    />
                </div>
                <button
                    type="button"
                    aria-label="Terminpanel schließen"
                    onClick={() => onOpenChange(false)}
                    className="absolute right-2 top-3 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                >
                    <X size={18} aria-hidden />
                </button>
            </SheetContent>
        </Sheet>
    );
}
