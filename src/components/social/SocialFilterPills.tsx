import { Button } from '@/components/ui/button';
import { cn } from '../../lib/utils';

export interface SocialFilterOption {
    key: string;
    label: string;
    count?: number;
}

interface SocialFilterPillsProps {
    options: SocialFilterOption[];
    value: string;
    onChange: (key: string) => void;
    ariaLabel: string;
}

export function SocialFilterPills({ options, value, onChange, ariaLabel }: SocialFilterPillsProps) {
    return (
        <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
            {options.map(option => {
                const isActive = option.key === value;
                return (
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        key={option.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                            if (!isActive) onChange(option.key);
                        }}
                        className={cn(
                            'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                            isActive
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        <span>{option.label}</span>
                        {typeof option.count === 'number' && (
                            <span
                                className={cn(
                                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none tabular-nums',
                                    isActive ? 'bg-white/70 text-primary-foreground' : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {option.count}
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    );
}
