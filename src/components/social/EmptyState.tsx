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
                'flex flex-col items-center justify-center rounded-3xl border bg-white p-8 text-center shadow-soft dark:bg-gray-900 sm:p-12',
                tone === 'error'
                    ? 'border-red-200 dark:border-red-900/50'
                    : 'border-gray-200 dark:border-gray-800'
            )}
        >
            <div
                className={cn(
                    'mb-5 grid h-16 w-16 place-items-center rounded-full',
                    tone === 'error'
                        ? 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400'
                        : 'bg-primary text-amber-950'
                )}
                aria-hidden
            >
                <Icon size={26} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">{text}</p>
            {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
        </div>
    );
}
