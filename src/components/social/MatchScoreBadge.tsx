import { Zap } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

type MatchTier = 'top' | 'good' | 'ok';

function matchTier(score: number): MatchTier {
    if (score >= 70) return 'top';
    if (score >= 40) return 'good';
    return 'ok';
}

const TIER_LABEL: Record<MatchTier, string> = {
    top: 'Sehr passend',
    good: 'Passend',
    ok: 'Passend',
};

/**
 * Großer Match-Score als gelbes Badge (Akzentfarbe) mit mono/tabular-nums Zahl.
 * Der Score bleibt das, was er ist: ein Highlight – nicht das ganze Layout.
 */
export function MatchScoreBadge({ score, className }: { score: number; className?: string }) {
    const tier = matchTier(score);
    return (
        <Badge
            variant="default"
            className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1 rounded-full border-0 px-3 text-xs font-bold',
                tier === 'top' ? 'bg-pastel-yellow text-pastel-yellow-foreground' : 'bg-pastel-mint text-pastel-mint-foreground',
                className
            )}
            aria-label={`Übereinstimmung ${score} Prozent: ${TIER_LABEL[tier]}`}
        >
            <Zap size={13} className="shrink-0" fill="currentColor" aria-hidden />
            <span className="tabular-nums">{score} % passend</span>
        </Badge>
    );
}
