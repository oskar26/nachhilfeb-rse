import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import type { ChatToolSettings } from '@/lib/chat-settings';
import { triggerHaptic } from '@/lib/haptics';
import { CalendarDays, CalendarRange, Smile, Zap } from 'lucide-react';

interface ChatToolsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: ChatToolSettings;
    onChange: (settings: ChatToolSettings) => void;
}

const TOOL_ITEMS: Array<{
    key: keyof ChatToolSettings;
    title: string;
    description: string;
    icon: React.ReactNode;
}> = [
    {
        key: 'appointments',
        title: 'Terminvorschläge',
        description: 'Strukturierte Terminkarten, Annehmen/Ablehnen und neue Vorschläge.',
        icon: <CalendarDays size={17} aria-hidden />,
    },
    {
        key: 'calendar',
        title: 'Kalender & .ics',
        description: 'Terminpanel und „In Kalender speichern“ für Vorschläge.',
        icon: <CalendarRange size={17} aria-hidden />,
    },
    {
        key: 'quickReplies',
        title: 'Schnellantworten',
        description: 'Starter im leeren Chat, Reaktionen und Termin-Schnellaktionen.',
        icon: <Zap size={17} aria-hidden />,
    },
    {
        key: 'emojiPicker',
        title: 'Emoji-Schnellzugriff',
        description: 'Emoji-Picker im Composer. Emojis bleiben normale Nachrichten.',
        icon: <Smile size={17} aria-hidden />,
    },
];

export default function ChatToolsDialog({ open, onOpenChange, settings, onChange }: ChatToolsDialogProps) {
    const update = (key: keyof ChatToolSettings, value: boolean) => {
        triggerHaptic('selection');
        onChange({ ...settings, [key]: value });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="max-h-[92dvh] w-[calc(100%-1rem)] gap-4 overflow-y-auto rounded-dialog p-4 sm:max-w-md sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Chat-Werkzeuge</DialogTitle>
                    <DialogDescription>
                        Blende Komfortfunktionen aus, ohne Nachrichten, Melden oder Blockieren zu verändern. Die Auswahl gilt nur auf diesem Gerät.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    {TOOL_ITEMS.map((item) => (
                        <div
                            key={item.key}
                            className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card/70 px-3 py-2.5"
                        >
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/20 text-foreground">
                                {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-tight text-foreground">{item.title}</p>
                                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.description}</p>
                            </div>
                            <Switch
                                checked={settings[item.key]}
                                onCheckedChange={(checked) => update(item.key, Boolean(checked))}
                                label={item.title}
                            />
                        </div>
                    ))}
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    Die Schalter ändern nur die Darstellung. Es werden keine Backend-Funktionen vorgetäuscht und keine Daten gelöscht.
                </p>

                <DialogFooter>
                    <Button type="button" className="min-h-11 rounded-full font-semibold" onClick={() => onOpenChange(false)}>
                        Fertig
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
