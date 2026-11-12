import { BadgeCheck } from 'lucide-react';
import { Badge } from './badge';
import { cn } from '../../lib/utils';

interface VerifiedPillProps {
    /** sm = kompakte Badges in Kartenlisten, md = Kopfbereiche/Profile */
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Einheitliches neutrales „Verifiziert“-Badge.
 */
export function VerifiedPill({ size = 'sm', className }: VerifiedPillProps) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'h-auto gap-1 whitespace-nowrap border-transparent bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
                size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
                className
            )}
        >
            <BadgeCheck size={size === 'sm' ? 13 : 14} className="shrink-0" aria-hidden="true" />
            Verifiziert
        </Badge>
    );
}
