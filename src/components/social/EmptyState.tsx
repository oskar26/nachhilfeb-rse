import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    text: ReactNode;
    action?: ReactNode;
    tone?: 'neutral' | 'error';
}

/**
 * Heller Leer-/Fehlerzustand im Feed-Stil: Icon im gelben Kreis, Titel,
 * kurzer Text, gelber CTA – ohne Stempel, Rotationen oder Poster-Motive.
 */
export function EmptyState({ icon: Icon, title, text, action, tone = 'neutral' }: EmptyStateProps) {
    return (
        <div
            role={tone === 'error' ? 'alert' : undefined}
            className={cn(
                'flex flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center shadow-soft sm:p-12',
                tone === 'error'
                    ? 'border-destructive/25'
                    : 'border-border'
            )}
        >
            <div
                className={cn(
                    'mb-5 grid size-16 place-items-center rounded-full',
                    tone === 'error'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary text-primary-foreground'
                )}
                aria-hidden
            >
                <Icon size={26} />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{text}</p>
            {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
        </div>
    );
}
