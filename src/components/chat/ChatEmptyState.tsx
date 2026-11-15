import { Button } from '@/components/ui/button';
import { PAGE_ENTER } from '@/lib/motion';
import { MessageCircle, Sparkles } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import styles from './chat-theme.module.css';

interface ChatEmptyStateProps {
    otherName?: string | null;
    showStarters: boolean;
    onStarter: (text: string) => void;
}

const STARTERS = [
    'Hallo! 👋',
    'Wann hast du Zeit?',
    'Ich brauche Hilfe bei den Hausaufgaben.',
];

export default function ChatEmptyState({ otherName, showStarters, onStarter }: ChatEmptyStateProps) {
    const reduceMotion = useReducedMotion();
    const name = otherName || 'deinem Lernpartner';

    return (
        <m.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : PAGE_ENTER}
            className="grid min-h-full place-items-center px-3 py-10"
        >
            <div className={cn('w-full max-w-sm rounded-[28px] px-5 py-6 text-center', styles.emptyCard)}>
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/25 text-[#18181b] ring-1 ring-black/5 dark:bg-primary/20 dark:text-primary">
                    <MessageCircle size={28} aria-hidden />
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground">Sag Hallo</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-chat-meta">
                    Noch keine Nachrichten. Schreib {name} die erste Nachricht – eine Begrüßung oder eine Frage zum Fach reicht.
                </p>

                {showStarters && (
                    <div className="mt-5 flex flex-col gap-2">
                        {STARTERS.map((starter) => (
                            <Button
                                key={starter}
                                type="button"
                                variant="outline"
                                size="sm"
                                hapticStyle="selection"
                                onClick={() => onStarter(starter)}
                                className="min-h-11 justify-start rounded-full border-black/5 bg-white/80 px-4 text-left text-[13px] font-medium text-[#3f3a24] shadow-none hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-foreground dark:hover:bg-white/15"
                            >
                                <Sparkles size={14} className="text-primary" aria-hidden />
                                {starter}
                            </Button>
                        ))}
                    </div>
                )}

                <p className="mt-5 text-xs leading-relaxed text-chat-meta">
                    Nachrichten werden über HTTPS übertragen und auf Servern in Deutschland gespeichert. Bitte beachte unsere{' '}
                    <a
                        href="#/nutzungsbedingungen"
                        className="font-semibold text-chat-text underline underline-offset-4"
                    >
                        Nutzungsbedingungen
                    </a>
                    .
                </p>
            </div>
        </m.div>
    );
}
