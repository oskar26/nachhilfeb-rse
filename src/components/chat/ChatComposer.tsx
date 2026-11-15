import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COMPOSER_EMOJIS, appendEmoji } from '@/lib/chat-emoji';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { CalendarDays, EyeOff, Plus, Send, Smile } from 'lucide-react';
import styles from './chat-theme.module.css';

interface ChatComposerProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onOpenAppointment: () => void;
    onHideChat: () => void;
    isBlocked: boolean;
    isSending: boolean;
    showAppointments: boolean;
    showEmojiPicker: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function ChatComposer({
    value,
    onChange,
    onSend,
    onOpenAppointment,
    onHideChat,
    isBlocked,
    isSending,
    showAppointments,
    showEmojiPicker,
    inputRef,
}: ChatComposerProps) {
    const [emojiOpen, setEmojiOpen] = useState(false);

    const insertEmoji = (emoji: string) => {
        triggerHaptic('selection');
        onChange(appendEmoji(value, emoji));
        setEmojiOpen(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onSend();
    };

    return (
        <div className="shrink-0 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-4">
            <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
                <div className={cn('flex w-full items-end gap-0.5 rounded-[28px] px-1 py-1', styles.composer)}>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            aria-label="Weitere Aktionen"
                            className="grid size-11 shrink-0 place-items-center rounded-full text-[#5f5a48] transition-colors hover:bg-black/5 focus-visible:outline-none dark:text-muted-foreground dark:hover:bg-white/10"
                        >
                            <Plus size={20} aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="top" sideOffset={8} className="min-w-56 p-1">
                            {showAppointments && (
                                <DropdownMenuItem
                                    onClick={() => {
                                        triggerHaptic('selection');
                                        onOpenAppointment();
                                    }}
                                    className="min-h-11 gap-2.5 px-3"
                                >
                                    <CalendarDays size={16} aria-hidden /> Termin vorschlagen
                                </DropdownMenuItem>
                            )}
                            {showAppointments && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                                onClick={() => {
                                    triggerHaptic('selection');
                                    onHideChat();
                                }}
                                className="min-h-11 gap-2.5 px-3"
                            >
                                <EyeOff size={16} aria-hidden /> Chat verbergen
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                event.preventDefault();
                                onSend();
                            }
                        }}
                        rows={1}
                        placeholder={isBlocked ? 'Nachrichten blockiert' : 'Nachricht schreiben'}
                        className="field-sizing-content max-h-32 min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-3 text-base leading-5 text-foreground shadow-none outline-none placeholder:text-[#8a8471] focus-visible:outline-none disabled:opacity-60 dark:placeholder:text-muted-foreground/80 sm:text-[15px]"
                        autoComplete="off"
                        aria-label="Nachricht schreiben"
                        disabled={isBlocked}
                    />

                    {showEmojiPicker && (
                        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                            <PopoverTrigger
                                aria-label="Emoji einfügen"
                                disabled={isBlocked}
                                className="grid size-11 shrink-0 place-items-center rounded-full text-[#5f5a48] transition-colors hover:bg-black/5 focus-visible:outline-none disabled:opacity-50 dark:text-muted-foreground dark:hover:bg-white/10"
                            >
                                <Smile size={20} aria-hidden />
                            </PopoverTrigger>
                            <PopoverContent align="end" side="top" sideOffset={8} className="w-auto p-2">
                                <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">Emoji einfügen</p>
                                <div className="grid grid-cols-6 gap-0.5">
                                    {COMPOSER_EMOJIS.map((emoji) => (
                                        <Button
                                            key={emoji}
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            hapticStyle={false}
                                            aria-label={`Emoji ${emoji} einfügen`}
                                            onClick={() => insertEmoji(emoji)}
                                            className="size-11 rounded-full text-xl leading-none hover:bg-muted"
                                        >
                                            <span aria-hidden>{emoji}</span>
                                        </Button>
                                    ))}
                                </div>
                                <p className="px-1 pt-1 text-xs leading-tight text-muted-foreground">Wird als Text gesendet.</p>
                            </PopoverContent>
                        </Popover>
                    )}

                    <Button
                        type="submit"
                        size="icon"
                        hapticStyle={false}
                        isLoading={isSending}
                        disabled={!value.trim() || isBlocked}
                        aria-label="Nachricht senden"
                        title="Nachricht senden"
                        className="size-11 shrink-0 rounded-full bg-chat-send text-primary-foreground shadow-soft hover:bg-primary-hover hover:text-primary-foreground"
                    >
                        <Send size={18} className="ml-0.5" aria-hidden />
                    </Button>
                </div>
            </form>
        </div>
    );
}
