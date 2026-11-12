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
                'h-auto gap-1 whitespace-nowrap font-medium text-muted-foreground',
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
                className
            )}
        >
            <BadgeCheck size={size === 'sm' ? 12 : 14} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Verifiziert
        </Badge>
    );
}
