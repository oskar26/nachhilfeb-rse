import * as React from 'react';
import { cn } from '../../lib/utils';

interface OtpInputProps {
    value: string;
    onChange: (value: string) => void;
    /** Wird aufgerufen, sobald alle Boxen gefüllt sind (Auto-Submit). */
    onComplete?: (value: string) => void;
    length?: number;
    /** true = nur Ziffern (E-Mail-Code), false = A–Z/0–9 (Kind-Code). */
    numeric?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
    ariaLabel?: string;
    className?: string;
}

/**
 * Code-Eingabe mit einzelnen Boxen (D3): Auto-Advance, Paste-Unterstützung,
 * Auto-Submit bei vollständiger Eingabe, Pfeiltasten/Backspace wie gewohnt.
 */
export function OtpInput({
    value,
    onChange,
    onComplete,
    length = 6,
    numeric = false,
    disabled,
    autoFocus,
    ariaLabel = 'Bestätigungscode',
    className,
}: OtpInputProps) {
    const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

    const sanitize = React.useCallback(
        (raw: string) => raw.toUpperCase().replace(numeric ? /[^0-9]/g : /[^A-Z0-9]/g, ''),
        [numeric]
    );

    const chars = React.useMemo(() => {
        const arr = sanitize(value).slice(0, length).split('');
        while (arr.length < length) arr.push('');
        return arr;
    }, [value, length, sanitize]);

    const focusIndex = (index: number) => {
        const clamped = Math.max(0, Math.min(length - 1, index));
        inputsRef.current[clamped]?.focus();
    };

    const commit = (next: string, from: number) => {
        const cleaned = sanitize(next).slice(0, length);
        if (cleaned === value) return;
        onChange(cleaned);
        focusIndex(from);
        if (cleaned.length === length) onComplete?.(cleaned);
    };

    const handleInput = (index: number, raw: string) => {
        const cleaned = sanitize(raw);
        if (!cleaned) return;
        if (index >= value.length) {
            // Leere Box (auch weiter rechts) angeklickt: Zeichen hängt hinten an.
            commit(value + cleaned, index + cleaned.length);
        } else {
            commit(value.slice(0, index) + cleaned + value.slice(index + cleaned.length), index + cleaned.length);
        }
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace') {
            event.preventDefault();
            if (index < value.length) {
                commit(value.slice(0, index) + value.slice(index + 1), index);
            } else {
                commit(value.slice(0, Math.max(0, index - 1)), index - 1);
            }
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            focusIndex(index - 1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            focusIndex(index + 1);
        }
    };

    const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        const text = sanitize(event.clipboardData.getData('text'));
        if (!text) return;
        const next = index === 0 ? text : value.slice(0, index) + text;
        commit(next, text.length >= length ? length - 1 : index + text.length);
    };

    return (
        <div role="group" aria-label={ariaLabel} className={cn('flex items-center justify-center gap-2', className)}>
            {chars.map((char, index) => (
                <input
                    key={index}
                    ref={el => { inputsRef.current[index] = el; }}
                    type="text"
                    inputMode={numeric ? 'numeric' : 'text'}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    autoFocus={autoFocus && index === 0}
                    disabled={disabled}
                    value={char}
                    maxLength={1}
                    aria-label={`${ariaLabel}, Stelle ${index + 1}`}
                    onChange={e => handleInput(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={e => handlePaste(index, e)}
                    onFocus={e => e.currentTarget.select()}
                    className="h-14 w-11 rounded-xl border-2 border-gray-200 bg-gray-50 text-center font-mono text-xl font-bold uppercase text-gray-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white sm:w-12"
                />
            ))}
        </div>
    );
}
