import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { avatarTone, initials } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { Ban, Calendar, CalendarDays, ChevronLeft, EyeOff, Flag, MoreVertical, Settings2 } from 'lucide-react';
import styles from './chat-theme.module.css';

export interface ChatPartner {
    id?: string;
    display_name?: string | null;
    avatar_url?: string | null;
    grade_level?: string | null;
}

interface ChatHeaderProps {
    otherUser: ChatPartner | null;
    statusText: string;
    isBlocked: boolean;
    isBlockLoading: boolean;
    hasOtherUser: boolean;
    calendarOpen: boolean;
    showAppointments: boolean;
    showCalendar: boolean;
    onBack: () => void;
    onToggleCalendar: () => void;
    onOpenAppointment: () => void;
    onOpenTools: () => void;
    onReport: () => void;
    onToggleBlock: () => void;
    onHideChat: () => void;
    onHideAndLeave: () => void;
}

export default function ChatHeader({
    otherUser,
    statusText,
    isBlocked,
    isBlockLoading,
    hasOtherUser,
    calendarOpen,
    showAppointments,
    showCalendar,
    onBack,
    onToggleCalendar,
    onOpenAppointment,
    onOpenTools,
    onReport,
    onToggleBlock,
    onHideChat,
    onHideAndLeave,
}: ChatHeaderProps) {
    const displayName = otherUser?.display_name || 'Unbekannt';

    return (
        <header
            className={cn(
                'sticky top-0 z-30 shrink-0 pt-[max(0.5rem,env(safe-area-inset-top,0px))]',
                styles.header
            )}
        >
            <div className="mx-auto flex w-full max-w-3xl items-center gap-0.5 px-2 pb-2 sm:px-4 md:gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="size-11 shrink-0 rounded-full text-chat-text hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Zurück zu den Chats"
                    hapticStyle="light"
                >
                    <ChevronLeft size={22} aria-hidden />
                </Button>

                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-0.5">
                    <div
                        className={cn(
                            'grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold ring-1 ring-black/5 dark:ring-white/10',
                            otherUser?.avatar_url ? 'bg-muted' : avatarTone(otherUser?.display_name)
                        )}
                    >
                        {otherUser?.avatar_url ? (
                            <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            initials(otherUser?.display_name)
                        )}
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-[15px] font-bold leading-tight text-chat-text">{displayName}</h1>
                        <p className="truncate text-[13px] leading-tight text-chat-meta" title={statusText}>
                            {statusText}
                        </p>
                    </div>
                </div>

                {showCalendar && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleCalendar}
                        className={cn(
                            'size-11 shrink-0 rounded-full text-chat-text hover:bg-black/5 dark:hover:bg-white/10',
                            calendarOpen && 'bg-primary/20 hover:bg-primary/25'
                        )}
                        title={calendarOpen ? 'Terminpanel schließen' : 'Termine im Chat'}
                        aria-label={calendarOpen ? 'Terminpanel schließen' : 'Terminpanel öffnen'}
                        aria-pressed={calendarOpen}
                        hapticStyle="light"
                    >
                        <Calendar size={19} aria-hidden />
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger
                        aria-label="Weitere Optionen"
                        className="grid size-11 shrink-0 place-items-center rounded-full text-chat-text transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <MoreVertical size={20} aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="min-w-56 p-1">
                        {showAppointments && (
                            <DropdownMenuItem onClick={onOpenAppointment} className="min-h-11 gap-2.5 px-3">
                                <CalendarDays size={16} aria-hidden /> Termin vereinbaren
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={onOpenTools} className="min-h-11 gap-2.5 px-3">
                            <Settings2 size={16} aria-hidden /> Chat-Werkzeuge
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onReport} className="min-h-11 gap-2.5 px-3">
                            <Flag size={16} aria-hidden /> Nutzer melden
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={onToggleBlock}
                            disabled={isBlockLoading || !hasOtherUser}
                            className="min-h-11 gap-2.5 px-3"
                        >
                            <Ban size={16} aria-hidden /> {isBlocked ? 'Blockierung aufheben' : 'Nutzer blockieren'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onHideChat} className="min-h-11 gap-2.5 px-3">
                            <EyeOff size={16} aria-hidden /> Chat verbergen
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={onHideAndLeave} className="min-h-11 gap-2.5 px-3">
                            <EyeOff size={16} aria-hidden /> Chat verbergen und verlassen
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
