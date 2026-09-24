import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../../lib/api';

interface ApiResult<T> {
    data: T | null;
    error: unknown;
}

/**
 * Kleiner Laden-Zustand pro Kind-Tab: wechselt das Kind, lädt neu, hält
 * Lade-/Fehlerzustand und einen `reload`-Trigger für Mutationen bereit.
 */
export function useChildFetch<T>(
    fetcher: (childId: string) => Promise<ApiResult<T[]>>,
    childId: string
) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    useEffect(() => {
        if (!childId) {
            setItems([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetcher(childId)
            .then(({ data, error: err }) => {
                if (cancelled || !alive.current) return;
                if (err) {
                    setError(apiErrorMessage(err, 'Daten konnten nicht geladen werden.'));
                    setItems([]);
                } else {
                    setItems(Array.isArray(data) ? data : data ? [data] : []);
                }
            })
            .catch((err) => {
                if (cancelled || !alive.current) return;
                setError(apiErrorMessage(err, 'Daten konnten nicht geladen werden.'));
                setItems([]);
            })
            .finally(() => {
                if (!cancelled && alive.current) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childId, tick]);

    const reload = useCallback(() => setTick((t) => t + 1), []);

    return { items, loading, error, reload };
}
