import { useState, useRef, useEffect } from "react";
import { cn } from "../lib/utils";

interface PriceRangeSliderProps {
    min: number;
    max: number;
    onChange: (min: number, max: number) => void;
    className?: string;
}

export function PriceRangeSlider({ min, max, onChange, className }: PriceRangeSliderProps) {
    const [minVal, setMinVal] = useState(min);
    const [maxVal, setMaxVal] = useState(max);
    const minValRef = useRef(min);
    const maxValRef = useRef(max);
    const range = useRef<HTMLDivElement>(null);

    // Convert to percentage
    const getPercent = (value: number) => Math.round(((value - min) / (max - min)) * 100);

    // Set width of the range to decrease from the left side
    useEffect(() => {
        const minPercent = getPercent(minVal);
        const maxPercent = getPercent(maxValRef.current);
        if (range.current) {
            range.current.style.left = `${minPercent}%`;
            range.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [minVal, getPercent]);

    // Set width of the range to decrease from the right side
    useEffect(() => {
        const minPercent = getPercent(minValRef.current);
        const maxPercent = getPercent(maxVal);

        if (range.current) {
            range.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [maxVal, getPercent]);

    // Call onChange only on mouseUp or explicit commit could be better, 
    // but for now simple onChange is fine if not too expensive.
    // We Wrap it to avoid too many re-renders in parent if needed.

    return (
        <div className={cn("container relative h-6 w-full flex items-center", className)}>
            <input
                type="range"
                min={min}
                max={max}
                value={minVal}
                onChange={(event) => {
                    const value = Math.min(Number(event.target.value), maxVal - 1);
                    setMinVal(value);
                    minValRef.current = value;
                    onChange(value, maxVal);
                }}
                className="thumb thumb--left z-30 absolute pointer-events-none w-full h-0 opacity-0 cursor-pointer"
                style={{ zIndex: minVal > max - 100 ? 5 : 3 }}
            />
            <input
                type="range"
                min={min}
                max={max}
                value={maxVal}
                onChange={(event) => {
                    const value = Math.max(Number(event.target.value), minVal + 1);
                    setMaxVal(value);
                    maxValRef.current = value;
                    onChange(minVal, value);
                }}
                className="thumb thumb--right z-40 absolute pointer-events-none w-full h-0 opacity-0 cursor-pointer"
            />

            <div className="slider relative w-full">
                <div className="slider__track absolute rounded h-1.5 w-full bg-gray-200 dark:bg-gray-700 z-10" />
                <div ref={range} className="slider__range absolute rounded h-1.5 bg-primary z-20" />

                {/* Visible Thumbs */}
                <div
                    className="absolute h-5 w-5 rounded-full bg-white dark:bg-gray-900 border-2 border-primary shadow z-50 -ml-2.5 -top-2 flex items-center justify-center pointer-events-none"
                    style={{ left: `${getPercent(minVal)}%` }}
                >
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                </div>
                <div
                    className="absolute h-5 w-5 rounded-full bg-white dark:bg-gray-900 border-2 border-primary shadow z-50 -ml-2.5 -top-2 flex items-center justify-center pointer-events-none"
                    style={{ left: `${getPercent(maxVal)}%` }}
                >
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                </div>
            </div>

            {/* Labels */}
            <div className="absolute top-6 left-0 text-xs font-bold text-gray-500">{minVal}€</div>
            <div className="absolute top-6 right-0 text-xs font-bold text-gray-500">{maxVal}€</div>
        </div>
    );
}
