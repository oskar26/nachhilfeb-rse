import { Button } from '@/components/ui/button';
import { downloadICSFile } from '@/lib/calendar';
import {
    appointmentStartDate,
    formatAppointmentDate,
    formatAppointmentTime,
    type AppointmentDetails,
    type AppointmentLocalStatus,
} from '@/lib/chat-appointments';
import { CalendarDays, CalendarClock, Check, Clock, Download, MapPin, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import styles from './chat-theme.module.css';

interface AppointmentCardProps {
    details: AppointmentDetails;
    isMe: boolean;
    otherName?: string | null;
    status: AppointmentLocalStatus;
    showCalendar: boolean;
    showQuickReplies: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onCounter: () => void;
    acceptDisabled?: boolean;
}

const STATUS_META: Record<AppointmentLocalStatus, { label: string; className: string }> = {
    proposed: { label: 'Offen', className: 'border-[#e5d9ae] bg-[#f6edc9] text-[#6b5c1a]' },
    accepted: { label: 'Bestätigt', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    declined: { label: 'Abgelehnt', className: 'border-rose-200 bg-rose-50 text-rose-800' },
    countered: { label: 'Neu', className: 'border-amber-200 bg-amber-50 text-amber-800' },
};

function Row({
    icon,
    children,
    label,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
    label: string;
}) {
    return (
        <div className="flex items-start gap-2">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-[#8a7318]" aria-hidden>
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-xs font-medium leading-tight text-[#7b6c3a]">{label}</p>
                <p className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-[#2c2818]">{children}</p>
            </div>
        </div>
    );
}

export default function AppointmentCard({
    details,
    isMe,
    otherName,
    status,
    showCalendar,
    showQuickReplies,
    onAccept,
    onDecline,
    onCounter,
    acceptDisabled = false,
}: AppointmentCardProps) {
    const statusMeta = STATUS_META[status];
    const hasActions = showCalendar || showQuickReplies;

    const handleDownload = () => {
        const start = appointmentStartDate(details);
        if (!start) {
            toast.error('Datum oder Uhrzeit des Termins ist ungültig.');
            return;
        }
        downloadICSFile({
            title: `FWG Nachhilfe: ${details.subject}`,
            description: [
                `Nachhilfetermin mit ${otherName || 'deinem Lernpartner'}`,
                details.format ? `Format: ${details.format}` : null,
                details.location ? `Ort: ${details.location}` : null,
            ].filter(Boolean).join('\n'),
            startDate: start,
            durationMinutes: details.durationMinutes,
            ...(details.location ? { location: details.location } : {}),
        });
    };

    return (
        <div
            className={cn('w-full min-w-[15rem] rounded-[16px] p-3 text-left', styles.appointmentCard)}
            role="group"
            aria-label={`Terminvorschlag ${details.subject}, Status ${statusMeta.label}`}
        >
            <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/30 text-[#18181b]">
                    <CalendarDays size={17} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight text-[#8a7318]">Terminvorschlag</p>
                    <p className="truncate text-[15px] font-bold leading-tight text-[#18181b]">{details.subject}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold leading-tight', statusMeta.className)}>
                        {statusMeta.label}
                    </span>
                    <span className="text-xs font-semibold tabular-nums leading-tight text-[#8b8168]">{details.durationMinutes} Min</span>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <Row icon={<CalendarDays size={14} />} label="Datum">
                    {formatAppointmentDate(details.date)}
                </Row>
                <Row icon={<Clock size={14} />} label="Uhrzeit">
                    {formatAppointmentTime(details)}
                </Row>
                {details.location && (
                    <Row icon={<MapPin size={14} />} label="Ort">
                        {details.location}
                    </Row>
                )}
                {details.format && (
                    <Row icon={<Video size={14} />} label="Format">
                        {details.format}
                    </Row>
                )}
            </div>

            {hasActions && <div className={cn('my-3 border-t', styles.appointmentDivider)} />}

            {showCalendar && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    hapticStyle="light"
                    onClick={handleDownload}
                    className="min-h-11 w-full justify-center gap-1.5 rounded-full border-black/10 bg-white/70 px-3 text-xs font-semibold text-[#2c2818] shadow-none hover:bg-white dark:border-black/10 dark:bg-white/70 dark:text-[#2c2818] dark:hover:bg-white dark:hover:text-[#2c2818]"
                >
                    <Download size={15} aria-hidden /> In Kalender speichern (.ics)
                </Button>
            )}

            {showQuickReplies && (
                <div className={cn('grid grid-cols-2 gap-2', showCalendar && 'mt-2')}>
                    {!isMe ? (
                        <>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                hapticStyle={false}
                                disabled={acceptDisabled || status === 'accepted'}
                                onClick={onAccept}
                                className="min-h-11 rounded-full px-3 text-xs font-semibold"
                            >
                                <Check size={15} aria-hidden /> Passt
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                hapticStyle={false}
                                disabled={acceptDisabled || status === 'declined'}
                                onClick={onDecline}
                                className="min-h-11 rounded-full border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-800 shadow-none hover:bg-rose-100 hover:text-rose-900 disabled:opacity-50 dark:border-rose-200 dark:bg-rose-50 dark:text-rose-800 dark:hover:bg-rose-100 dark:hover:text-rose-900"
                            >
                                <X size={15} aria-hidden /> Passt nicht
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                hapticStyle="selection"
                                onClick={onCounter}
                                className="col-span-2 min-h-11 rounded-full border-black/10 bg-white/60 px-3 text-xs font-semibold text-[#2c2818] shadow-none hover:bg-white dark:border-black/10 dark:bg-white/60 dark:text-[#2c2818] dark:hover:bg-white dark:hover:text-[#2c2818]"
                            >
                                <CalendarClock size={15} aria-hidden /> Anderen Termin vorschlagen
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            hapticStyle="selection"
                            onClick={onCounter}
                            className="col-span-2 min-h-11 rounded-full border-black/10 bg-white/60 px-3 text-xs font-semibold text-[#2c2818] shadow-none hover:bg-white dark:border-black/10 dark:bg-white/60 dark:text-[#2c2818] dark:hover:bg-white dark:hover:text-[#2c2818]"
                        >
                            <CalendarClock size={15} aria-hidden /> Weiteren Termin vorschlagen
                        </Button>
                    )}
                </div>
            )}

            {hasActions && (
                <p className="mt-2 text-center text-xs leading-tight text-[#8b8168]">
                    {!showQuickReplies
                        ? 'Schnellantworten sind in den Chat-Werkzeugen aus.'
                        : isMe
                            ? (status === 'accepted'
                                ? 'Lokal als bestätigt erkannt.'
                                : status === 'declined'
                                    ? 'Lokal als abgelehnt erkannt.'
                                    : status === 'countered'
                                        ? 'Es liegt ein neuer Terminvorschlag vor.'
                                        : 'Wartet auf Rückmeldung.')
                            : 'Antworten werden als normale Chatnachricht gesendet.'}
                </p>
            )}
            {!showQuickReplies && !showCalendar && (
                <p className="mt-2 text-xs leading-tight text-[#8b8168]">
                    Terminkarten sind schreibgeschützt. Alle Funktionen lassen sich in den Chat-Werkzeugen einschalten.
                </p>
            )}
        </div>
    );
}
