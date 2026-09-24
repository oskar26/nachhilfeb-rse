import { BadgeCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VerifiedPillProps {
    /** sm = kompakte Pills in Kartenlisten, md = Kopfbereiche/Profile (A2) */
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Einheitliche „Verifiziert“-Pille (A2). Ersetzt die sechs inline gebauten
 * Badges in Feed, Matching, PublicProfile, AdDetails, Landing und Profile;
 * der Stempel-Look (.stamp-ring) bleibt Coaching/NotFound/Demo vorbehalten.
 */
export function VerifiedPill({ size = 'sm', className }: VerifiedPillProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-100 font-bold text-green-800 dark:border-green-800/60 dark:bg-green-950/40 dark:text-green-300',
                size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
                className
            )}
        >
            <BadgeCheck size={size === 'sm' ? 12 : 14} className="shrink-0" aria-hidden="true" />
            Verifiziert
        </span>
    );
}
