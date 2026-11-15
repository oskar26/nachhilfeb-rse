import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { avatarTone, initials } from '@/lib/avatar';
import { parseAppointmentMessage, type AppointmentDetails, type AppointmentLocalStatus } from '@/lib/chat-appointments';
import { QUICK_REACTION_EMOJIS, QUICK_REACTION_LABELS, isLargeEmojiMessage } from '@/lib/chat-emoji';
import { chatTimestampISO, formatChatTime } from '@/lib/chat-grouping';
import type { ChatMessage } from '@/lib/chat-messages';
import { cn } from '@/lib/utils';
import { Ban, Check, CheckCheck, MoreVertical, Pencil, SmilePlus, Trash2 } from 'lucide-react';
import AppointmentCard from './AppointmentCard';
import type { ChatPartner } from './ChatHeader';
import styles from './chat-theme.module.css';

interface MessageBubbleProps {
    message: ChatMessage;
    isMe: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    otherUser: ChatPartner | null;
    editing: boolean;
    editContent: string;
    onEditContentChange: (value: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onDelete: () => void;
    onQuickMessage: (text: string) => void;
    onAcceptAppointment: (details: AppointmentDetails) => void;
    onDeclineAppointment: (details: AppointmentDetails) => void;
    onCounterAppointment: (details: AppointmentDetails) => void;
    appointmentStatus: AppointmentLocalStatus;
    showAppointments: boolean;
    showCalendar: boolean;
    showQuickReplies: boolean;
    quickBusy?: boolean;
}

export default function MessageBubble({
    message,
    isMe,
    isFirstInGroup,
    isLastInGroup,
    otherUser,
    editing,
    editContent,
    onEditContentChange,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    onQuickMessage,
    onAcceptAppointment,
    onDeclineAppointment,
    onCounterAppointment,
    appointmentStatus,
    showAppointments,
    showCalendar,
    showQuickReplies,
    quickBusy = false,
}: MessageBubbleProps) {
    if (message.is_deleted) {
        return (
            <div className="my-2 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium leading-tight text-chat-meta shadow-sm backdrop-blur-sm dark:bg-black/25">
                    <Ban size={12} aria-hidden /> Nachricht auf diesem Gerät ausgeblendet.
                </span>
            </div>
        );
    }

    const appointment = !editing && showAppointments ? parseAppointmentMessage(message.content) : null;
    const emojiOnly = !editing && !appointment && isLargeEmojiMessage(message.content);
    const time = formatChatTime(message.created_at);
    const senderName = isMe ? 'Du' : (otherUser?.display_name || 'Kontakt');
    const metaTone = isMe ? 'text-[#5a4a00]' : 'text-chat-meta';

    const meta = (
        <div
            className={cn(
                'flex flex-wrap items-center justify-end gap-1 text-xs leading-tight',
                emojiOnly && 'mx-auto w-fit rounded-full bg-white/70 px-2 py-1 text-[#5a5140] backdrop-blur-sm dark:bg-black/30 dark:text-[#d6d2c4]',
                metaTone
            )}
        >
            {message.edited_at && <span className="italic">bearbeitet</span>}
            <time dateTime={chatTimestampISO(message.created_at)} className="tabular-nums" title={time}>
                {time}
            </time>
            {isMe && (
                <span
                    className="ml-0.5 inline-flex"
                    title={message.read_at ? 'Gelesen' : 'Gesendet'}
                    aria-label={message.read_at ? 'Gelesen' : 'Gesendet'}
                >
                    {message.read_at
                        ? <CheckCheck size={14} className="text-[#166534]" aria-hidden />
                        : <Check size={14} className="text-[#5f4a00]" aria-hidden />}
                </span>
            )}
        </div>
    );

    const bubble = editing ? (
        <div className="min-w-[15rem] space-y-2">
            <Textarea
                value={editContent}
                onChange={(event) => onEditContentChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        onSaveEdit();
                    }
                    if (event.key === 'Escape') onCancelEdit();
                }}
                className="min-h-20 w-full resize-none border-black/10 bg-white/90 text-sm text-[#18181b] focus-visible:border-black/20"
                rows={2}
                autoFocus
                aria-label="Nachricht bearbeiten"
            />
            <div className="flex justify-end gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={onCancelEdit}
                    className="min-h-11 rounded-full border-black/10 bg-white/70 px-4 text-xs text-[#18181b] shadow-none hover:bg-white"
                >
                    Abbrechen
                </Button>
                <Button
                    size="sm"
                    type="button"
                    onClick={onSaveEdit}
                    className="min-h-11 rounded-full bg-[#18181b] px-4 text-xs font-semibold text-white hover:bg-[#2d2d2d] hover:text-white"
                >
                    Speichern
                </Button>
            </div>
        </div>
    ) : appointment ? (
        <AppointmentCard
            details={appointment}
            isMe={isMe}
            otherName={otherUser?.display_name}
            status={appointmentStatus}
            showCalendar={showCalendar}
            showQuickReplies={showQuickReplies}
            onAccept={() => onAcceptAppointment(appointment)}
            onDecline={() => onDeclineAppointment(appointment)}
            onCounter={() => onCounterAppointment(appointment)}
            acceptDisabled={quickBusy}
        />
    ) : (
        <div className={cn('whitespace-pre-wrap break-words', emojiOnly ? 'px-1 text-[42px] leading-none' : 'pr-1')}>
            {message.content}
        </div>
    );

    return (
        <div className={cn('group/message flex w-full items-end gap-1', isMe ? 'justify-end' : 'justify-start')}>
            {!isMe && (
                <span className="mb-0.5 size-7 shrink-0 self-end" aria-hidden>
                    {isLastInGroup && (
                        <span className={cn('grid size-7 place-items-center overflow-hidden rounded-full text-xs font-bold ring-1 ring-black/5 dark:ring-white/10', otherUser?.avatar_url ? 'bg-muted' : avatarTone(otherUser?.display_name))}>
                            {otherUser?.avatar_url
                                ? <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
                                : initials(otherUser?.display_name)}
                        </span>
                    )}
                </span>
            )}

            <div
                className={cn(
                    'relative max-w-full break-words text-[15px] leading-[1.4]',
                    emojiOnly
                        ? 'min-w-0 bg-transparent px-0 py-0 shadow-none'
                        : cn(
                            'min-w-[5.5rem] rounded-[18px] px-3 py-2',
                            isMe ? 'bg-chat-own text-primary-foreground' : 'bg-chat-other text-foreground',
                            isMe ? styles.bubbleOwn : styles.bubbleReceived,
                            isLastInGroup && (isMe ? 'rounded-br-[5px]' : 'rounded-bl-[5px]')
                        ),
                    appointment && 'p-2.5',
                    isMe
                        ? 'max-w-[min(calc(100%_-_3.25rem),34rem)]'
                        : 'max-w-[min(calc(100%_-_5.5rem),34rem)]'
                )}
            >
                {!emojiOnly && isLastInGroup && (
                    <svg
                        aria-hidden
                        viewBox="0 0 8 13"
                        className={cn(
                            'pointer-events-none absolute bottom-0 h-3 w-2',
                            isMe ? '-right-[6px] fill-chat-own' : '-left-[6px] -scale-x-100 fill-chat-other'
                        )}
                    >
                        <path d="M0 0L8 13H0Z" />
                    </svg>
                )}

                {isFirstInGroup && <span className="sr-only">{senderName} schreibt: </span>}
                {bubble}
                {!editing && meta}
            </div>

            {(showQuickReplies || isMe) && (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        aria-label={isMe ? 'Nachrichtaktionen' : 'Auf Nachricht reagieren'}
                        disabled={quickBusy}
                        className={cn(
                            'mb-0.5 grid size-11 shrink-0 place-items-center rounded-full text-chat-meta transition-opacity hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10 lg:size-8 lg:opacity-0 lg:group-hover/message:opacity-100 lg:focus-visible:opacity-100'
                        )}
                    >
                        {isMe ? <MoreVertical size={17} aria-hidden /> : <SmilePlus size={17} aria-hidden />}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isMe ? 'end' : 'start'} side="top" sideOffset={6} className="w-[17.5rem] p-2">
                        {showQuickReplies && (
                            <>
                                <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">Schnell reagieren</p>
                                <div className="grid grid-cols-6 gap-0.5">
                                    {QUICK_REACTION_EMOJIS.map((emoji) => (
                                        <DropdownMenuItem
                                            key={emoji}
                                            disabled={quickBusy}
                                            aria-label={`Mit ${QUICK_REACTION_LABELS[emoji] ?? emoji} reagieren`}
                                            onClick={() => onQuickMessage(emoji)}
                                            className="grid size-11 place-items-center rounded-full p-0 text-xl"
                                        >
                                            <span aria-hidden>{emoji}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                                <p className="px-1 pt-1.5 text-xs leading-tight text-muted-foreground">Wird als normale Nachricht gesendet.</p>
                            </>
                        )}
                        {isMe && (
                            <>
                                {showQuickReplies && <DropdownMenuSeparator />}
                                <DropdownMenuItem onClick={onStartEdit} className="min-h-11 gap-2.5 px-3">
                                    <Pencil size={15} aria-hidden /> Bearbeiten
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={onDelete} className="min-h-11 gap-2.5 px-3">
                                    <Trash2 size={15} aria-hidden /> Ausblenden
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
