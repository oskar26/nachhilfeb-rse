import { useEffect } from 'react';
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

export function useAnalyticsTracker() {
    const location = useLocation();

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        // Strictly only track if user accepted cookies
        if (consent !== 'accepted') return;

        const path = location.pathname;
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
    }, [location.pathname]);
}
