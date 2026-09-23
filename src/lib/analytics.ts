import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from './api';

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

function getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    return 'Other';
}

// Dynamische Routen-Segmente (IDs) normalisieren, damit die Statistik
// Seiten gruppiert statt tausender Einzel-URLs („/ad/:id“ wie beim Hoster).
function normalizePath(raw: string): string {
    let path = raw.split('?')[0].split('#')[0] || '/';
    if (!path.startsWith('/')) path = '/' + path;
    path = path
        .replace(/^\/ad\/[^/]+/i, '/ad/:id')
        .replace(/^\/chat\/[^/]+/i, '/chat/:id')
        .replace(/^\/profile\/[^/]+/i, '/profile/:id')
        .replace(/^\/user\/[^/]+/i, '/user/:id');
    return path.length > 255 ? path.slice(0, 255) : path;
}

export function useAnalyticsTracker() {
    const location = useLocation();
    const lastTracked = useRef<string>('');

    useEffect(() => {
        // Anonyme Server-Statistik läuft immer mit (Art. 6 Abs. 1 lit. f DSGVO,
        // ohne IP/Personenbezug – siehe Datenschutz-/Cookies-Seite). Kein Consent-Gate.

        // HashRouter-sicher: React Router liefert den Pfad bereits geparst,
        // Fallback auf window.location.hash für volle Hash-Pfade.
        const raw = location.pathname && location.pathname !== '/'
            ? location.pathname + location.search
            : window.location.hash.replace(/^#/, '') || '/';
        const path = normalizePath(raw);

        // Doppel-Hits (StrictMode, schnelle Re-Renders) vermeiden
        if (path === lastTracked.current) return;
        lastTracked.current = path;

        const device_type = getDeviceType();
        const browser = getBrowserName();

        // Fire & forget über das eigene Backend (user_id wird serverseitig aus dem Token gelesen)
        apiRequest('/analytics.php?action=track', {
            method: 'POST',
            body: JSON.stringify({ path, device_type, browser }),
        }).then(({ error }) => {
            if (error && import.meta.env.DEV) {
                console.debug('[Analytics Tracker] error:', error.message);
            }
        });
    }, [location.pathname, location.search, location.hash]);
}
