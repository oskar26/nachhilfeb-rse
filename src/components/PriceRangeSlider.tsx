import { Slider } from '@/components/ui/slider';
import { cn } from '../lib/utils';

interface PriceRangeSliderProps {
    min: number;
    max: number;
    value: { min: number; max: number };
    onChange: (min: number, max: number) => void;
    className?: string;
}

/**
 * Zwei-Griff-Preisspanne auf Basis des shadcn/Base-UI-Sliders.
 * Der Slider liefert 44-px-Touchflächen über die Thumb-Polsterung.
 */
export function PriceRangeSlider({ min, max, value, onChange, className }: PriceRangeSliderProps) {
    const minVal = Math.min(Math.max(value.min, min), max);
    const maxVal = Math.min(Math.max(value.max, min), max);

    return (
        <div className={cn("relative w-full pb-6 pt-2", className)}>
            <Slider
                min={min}
                max={max}
                step={1}
                minStepsBetweenValues={1}
                value={[minVal, maxVal]}
                onValueChange={(next) => {
                    const [nextMin, nextMax] = next as number[];
                    if (nextMin !== minVal || nextMax !== maxVal) onChange(nextMin, nextMax);
                }}
                aria-label="Preisspanne"
            />
            <div className="mt-3 flex items-center justify-between text-xs font-semibold tabular-nums text-muted-foreground">
                <span>{minVal}€</span>
                <span>{maxVal}€</span>
            </div>
        </div>
    );
}
