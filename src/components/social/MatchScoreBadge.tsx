import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

type MatchTier = 'top' | 'good' | 'ok';

function matchTier(score: number): MatchTier {
    if (score >= 70) return 'top';
    if (score >= 40) return 'good';
    return 'ok';
}

const TIER_LABEL: Record<MatchTier, string> = {
    top: 'Top Match',
    good: 'Guter Match',
    ok: 'Passend',
};

/**
 * Großer Match-Score als gelbes Badge (Akzentfarbe) mit mono/tabular-nums Zahl.
 * Der Score bleibt das, was er ist: ein Highlight – nicht das ganze Layout.
 */
export function MatchScoreBadge({ score, className }: { score: number; className?: string }) {
    const tier = matchTier(score);
    return (
        <div
            className={cn(
                'inline-flex shrink-0 flex-col items-center rounded-2xl bg-primary px-3.5 py-2 text-amber-950',
                className
            )}
            aria-label={`Match-Score ${score} Prozent – ${TIER_LABEL[tier]}`}
        >
            <span className="flex items-center gap-1 font-mono text-2xl font-black leading-none tabular-nums">
                <Zap size={16} className="shrink-0" fill="currentColor" aria-hidden />
                {score}
                <span className="text-base">%</span>
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                {TIER_LABEL[tier]}
            </span>
        </div>
    );
}
