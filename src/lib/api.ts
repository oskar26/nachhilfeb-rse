// ==============================================================================
// FWG Nachhilfebörse - Native API Client für ALL-INKL Backend
// ==============================================================================

const TOKEN_KEY = 'fwg_auth_token';
const USER_KEY = 'fwg_auth_user';

// Basis-URL für API-Anfragen
// Im Produktivbetrieb: /api
// Im Entwicklungsbetrieb: /api (über Vite Proxy) oder konfigurierbar über VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

export function getStoredUser(): any | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: any | null) {
    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(USER_KEY);
    }
}

// Übersetzt einen HTTP-Status in eine anzeigbare Standardmeldung (nur wenn das Backend keine liefert).
function defaultHttpMessage(status: number): string {
    if (status === 401) return 'Nicht angemeldet. Bitte melde dich erneut an.';
    if (status === 403) return 'Zugriff nicht erlaubt.';
    if (status === 404) return 'Nicht gefunden.';
    if (status === 429) return 'Zu viele Anfragen. Bitte kurz warten.';
    if (status >= 500) return `Server-Fehler (HTTP ${status}). Bitte später erneut versuchen.`;
    return `Fehler (${status}).`;
}

// Liefert die konkrete, anzeigbare Fehlermeldung für Fehler-Cards:
// Netz/Timeout vs. 403 vs. 5xx werden unterschieden (D4).
export function apiErrorMessage(error: any, fallback: string = 'Es ist ein Fehler aufgetreten. Bitte erneut versuchen.'): string {
    if (!error) return fallback;
    if (typeof error.message === 'string' && error.message.trim() !== '') {
        return error.message;
    }
    if (typeof error.status === 'number') {
        return defaultHttpMessage(error.status);
    }
    return fallback;
}

export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ data: T | null; error: any }> {
    const token = getStoredToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });

        const contentType = response.headers.get('content-type') || '';
        let json: any = null;

        if (contentType.includes('application/json')) {
            json = await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) {
                return { data: null, error: { message: defaultHttpMessage(response.status), status: response.status, code: null, rawText: text || null } };
            }
            // 200, aber kein JSON (z. B. PHP-Quelle bei fehlendem PHP-Runtime oder Proxy-Fehlerseite):
            // Niemals Rohtext als data durchreichen – das vergiftet alle Consumer (z. B. News-Modal).
            if (!text.trim()) {
                return { data: null, error: null };
            }
            return { data: null, error: { message: 'Unerwartete Server-Antwort (kein JSON).', status: response.status } };
        }

        if (!response.ok) {
            if (response.status === 401) {
                // Abgelaufenes/ungültiges Token: Session lokal verwerfen, damit AuthContext neu lädt
                try {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                } catch { /* ignore */ }
            }
            const code = json?.code || json?.details?.code || null;
            // Belt-and-Braces (D5): Backend-Guard hat zugeschlagen, obwohl der Client-State
            // noch „ok“ sagt -> Gate-UI über das Custom-Event sofort nachziehen.
            if ((code === 'not_verified' || code === 'parent_link_required') && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('fwg:access-denied', { detail: { code } }));
            }
            return {
                data: null,
                error: {
                    message: json?.error || defaultHttpMessage(response.status),
                    status: response.status,
                    code,
                    details: json?.details
                }
            };
        }

        return { data: json, error: null };
    } catch (err: any) {
        const isTimeout = err?.name === 'AbortError';
        return {
            data: null,
            error: {
                message: isTimeout
                    ? 'Zeitüberschreitung: Der Server antwortet nicht. Bitte erneut versuchen.'
                    : 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.',
                status: undefined,
                code: isTimeout ? 'timeout' : 'network',
                isNetwork: !isTimeout || undefined
            }
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

// ------------------------------------------------------------------------------
// Typisierte API-Funktionen
// ------------------------------------------------------------------------------
export const api = {
    // Authentifizierung
    auth: {
        async register(payload: any) {
            const res = await apiRequest('/auth.php?action=register', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.data?.token) {
                setStoredToken(res.data.token);
                setStoredUser(res.data.user);
            }
            return res;
        },

        async login(credentials: { email: string; password: string }) {
            const res = await apiRequest('/auth.php?action=login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            if (res.data?.token) {
                setStoredToken(res.data.token);
                setStoredUser(res.data.user);
            }
            return res;
        },

        async me() {
            return apiRequest('/auth.php?action=me');
        },

        async updatePassword(newPassword: string, token?: string) {
            return apiRequest('/auth.php?action=update_password', {
                method: 'POST',
                body: JSON.stringify({ password: newPassword, token })
            });
        },

        async resetPasswordRequest(email: string) {
            return apiRequest('/auth.php?action=reset_password_request', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
        },

        async verifyEmail(email: string, code: string) {
            const res = await apiRequest('/auth.php?action=verify_email', {
                method: 'POST',
                body: JSON.stringify({ email, code })
            });
            if (res.data?.token) {
                setStoredToken(res.data.token);
                setStoredUser(res.data.user);
            }
            return res;
        },

        async resendCode(email: string) {
            return apiRequest('/auth.php?action=resend_code', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
        },

        logout() {
            setStoredToken(null);
            setStoredUser(null);
            return Promise.resolve({ data: { success: true }, error: null });
        },
    },

    // Server-Selbsttest (öffentlich lesbar, enthält keine Secrets)
    health: {
        async status() {
            return apiRequest('/health.php?format=json');
        },
        async testmail() {
            return apiRequest('/health.php?action=testmail', { method: 'POST' });
        },
    },

    // Anzeigen
    ads: {
        async list(filters: { type?: string; subject?: string; grade?: string; search?: string; user_id?: string; all?: boolean } = {}) {
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.subject) params.append('subject', filters.subject);
            if (filters.grade) params.append('grade', filters.grade);
            if (filters.search) params.append('search', filters.search);
            if (filters.user_id) params.append('user_id', filters.user_id);
            if (filters.all) params.append('all', '1');

            const query = params.toString() ? `?${params.toString()}` : '';
            return apiRequest(`/ads.php${query}`);
        },

        async get(id: string) {
            return apiRequest(`/ads.php?id=${encodeURIComponent(id)}`);
        },

        async create(adData: any) {
            return apiRequest('/ads.php', {
                method: 'POST',
                body: JSON.stringify(adData)
            });
        },

        async update(id: string, adData: any) {
            return apiRequest(`/ads.php?id=${encodeURIComponent(id)}`, {
                method: 'PUT',
                body: JSON.stringify(adData)
            });
        },

        async delete(id: string) {
            return apiRequest(`/ads.php?id=${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });
        },

        // Anonymer Aufruf-Zähler (DSGVO-sparsam: keine IP, keine User-ID).
        // Fehler werden still ignoriert – Tracking darf nie die Anzeige blockieren.
        async trackView(id: string) {
            try {
                await apiRequest('/ads.php?action=view', {
                    method: 'POST',
                    body: JSON.stringify({ ad_id: id })
                });
            } catch {
                /* Tracking ist Best-Effort */
            }
        }
    },

    // Anfragen
    requests: {
        async list() {
            return apiRequest('/requests.php');
        },

        async get(id: string) {
            return apiRequest(`/requests.php?id=${encodeURIComponent(id)}`);
        },

        async create(requestData: { ad_id: string; message: string; role?: string }) {
            return apiRequest('/requests.php', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });
        },

        async updateStatus(id: string, status: 'pending' | 'accepted' | 'rejected' | 'completed') {
            return apiRequest(`/requests.php?id=${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        }
    },

    // Chat-Nachrichten
    messages: {
        async list(requestId: string, after?: string) {
            let url = `/messages.php?request_id=${encodeURIComponent(requestId)}`;
            if (after) url += `&after=${encodeURIComponent(after)}`;
            return apiRequest(url);
        },

        async send(requestId: string, content: string) {
            return apiRequest('/messages.php', {
                method: 'POST',
                body: JSON.stringify({ request_id: requestId, content })
            });
        }
    },

    // Profile
    profiles: {
        async get(id?: string) {
            const url = id ? `/profiles.php?id=${encodeURIComponent(id)}` : '/profiles.php';
            return apiRequest(url);
        },

        async update(profileData: any, id?: string) {
            const url = id ? `/profiles.php?id=${encodeURIComponent(id)}` : '/profiles.php';
            return apiRequest(url, {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
        }
    },

    // Bewertungen
    reviews: {
        async list(params: { target_user_id?: string; ad_id?: string }) {
            const search = new URLSearchParams();
            if (params.target_user_id) search.append('target_user_id', params.target_user_id);
            if (params.ad_id) search.append('ad_id', params.ad_id);
            return apiRequest(`/reviews.php?${search.toString()}`);
        },

        async create(reviewData: { target_user_id: string; rating: number; comment?: string; ad_id?: string }) {
            return apiRequest('/reviews.php', {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });
        }
    },

    // Favoriten
    favorites: {
        async list() {
            return apiRequest('/favorites.php');
        },

        async toggle(adId: string) {
            return apiRequest('/favorites.php', {
                method: 'POST',
                body: JSON.stringify({ ad_id: adId })
            });
        }
    },

    // Codes
    codes: {
        async check(code: string) {
            return apiRequest('/codes.php?action=check', {
                method: 'POST',
                body: JSON.stringify({ code })
            });
        },

        async redeem(code: string) {
            return apiRequest('/codes.php?action=redeem', {
                method: 'POST',
                body: JSON.stringify({ code })
            });
        },

        async list() {
            return apiRequest('/codes.php?action=list');
        },

        async generate(count: number, role: string, prefix?: string, expiry_days?: number, max_uses?: number | null) {
            return apiRequest('/codes.php?action=generate', {
                method: 'POST',
                body: JSON.stringify({ count, role, prefix, expiry_days, max_uses })
            });
        },

        async deleteInvite(id: string) {
            return apiRequest('/codes.php?action=delete_invite', {
                method: 'POST',
                body: JSON.stringify({ id })
            });
        }
    },

    // Promo-Codes
    promo_codes: {
        async list() {
            return apiRequest('/codes.php?action=promo_list');
        },

        async create(data: {
            code: string;
            effect_type: string;
            push_level: string;
            boost_days: number;
            max_uses?: number | null;
            target_group?: string;
            description?: string;
            expires_at?: string | null;
            expiry_days?: number;
        }) {
            return apiRequest('/codes.php?action=promo_create', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async toggle(id: string, isActive: boolean) {
            return apiRequest('/codes.php?action=promo_toggle', {
                method: 'POST',
                body: JSON.stringify({ id, is_active: isActive })
            });
        },

        async delete(id: string) {
            return apiRequest('/codes.php?action=promo_delete', {
                method: 'POST',
                body: JSON.stringify({ id })
            });
        },

        async listRedemptions() {
            return apiRequest('/codes.php?action=promo_redemptions');
        },

        async revoke(data: { redemption_id?: string; user_id?: string }) {
            return apiRequest('/codes.php?action=promo_revoke', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
    },

    // Schüler-Coaching AG (Frau Balistreri)
    coach: {
        async listStudents() {
            return apiRequest('/profiles.php?action=coach_students');
        },

        async listLogs() {
            return apiRequest('/profiles.php?action=coach_log');
        },

        async setCoachStatus(userId: string, isCoach: boolean) {
            return apiRequest(`/profiles.php?id=${encodeURIComponent(userId)}`, {
                method: 'PUT',
                body: JSON.stringify({ is_coach: isCoach })
            });
        },

        async getCoachInfo() {
            return apiRequest('/profiles.php?action=coach_info');
        },

        async updateCoachInfo(data: { title: string; description: string; time: string; room: string; is_visible?: boolean }) {
            return apiRequest('/profiles.php?action=coach_info', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async getCoachingPage() {
            return apiRequest('/profiles.php?action=coaching_page');
        },

        async updateCoachingPage(data: Record<string, string>) {
            return apiRequest('/profiles.php?action=coaching_page', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
    },

    // Eltern-Verknüpfung
    parentLinks: {
        async lookupCode(code: string) {
            return apiRequest(`/profiles.php?action=lookup_code&code=${encodeURIComponent(code)}`);
        },

        async searchChildren(params: { q?: string; grade_level?: string; birth_date?: string }) {
            const s = new URLSearchParams();
            if (params.q) s.append('q', params.q);
            if (params.grade_level) s.append('grade_level', params.grade_level);
            if (params.birth_date) s.append('birth_date', params.birth_date);
            return apiRequest(`/profiles.php?action=search_children&${s.toString()}`);
        },

        async ensureCode() {
            return apiRequest('/profiles.php?action=ensure_parent_code', {
                method: 'POST',
                body: JSON.stringify({})
            });
        },

        async list() {
            return apiRequest('/profiles.php?action=parent_links');
        },

        async create(data: { child_id: string; permissions?: Record<string, boolean> }) {
            return apiRequest('/profiles.php?action=parent_links', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async update(linkId: string, data: { permissions?: Record<string, boolean>; status?: string }) {
            return apiRequest('/profiles.php?action=parent_links', {
                method: 'PATCH',
                body: JSON.stringify({ link_id: linkId, ...data })
            });
        },

        async remove(linkId: string) {
            return apiRequest('/profiles.php?action=parent_links', {
                method: 'DELETE',
                body: JSON.stringify({ link_id: linkId })
            });
        }
    },

    // Moderation: Filter-Overrides (Profanity 2.0 Training)
    moderation: {
        async getOverrides() {
            return apiRequest('/moderation.php?action=overrides');
        },

        async setOverride(data: { word: string; effect: 'allow' | 'deny' }) {
            return apiRequest('/moderation.php?action=override', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async deleteOverride(word: string) {
            return apiRequest('/moderation.php?action=override_delete', {
                method: 'POST',
                body: JSON.stringify({ word })
            });
        }
    },

    // Support
    support: {
        async listTickets() {
            return apiRequest('/support.php');
        },

        async getTicket(id: string) {
            return apiRequest(`/support.php?ticket_id=${encodeURIComponent(id)}`);
        },

        async createTicket(ticketData: { title: string; description: string; type?: string; priority?: string; device_info?: any }) {
            return apiRequest('/support.php', {
                method: 'POST',
                body: JSON.stringify(ticketData)
            });
        },

        async sendMessage(ticketId: string, content: string) {
            return apiRequest('/support.php?action=message', {
                method: 'POST',
                body: JSON.stringify({ ticket_id: ticketId, content })
            });
        },

        async updateStatus(ticketId: string, status: string, adminNotes?: string) {
            return apiRequest(`/support.php?ticket_id=${encodeURIComponent(ticketId)}`, {
                method: 'PATCH',
                body: JSON.stringify({ status, admin_notes: adminNotes })
            });
        }
    },

    // Meldungen
    reports: {
        async create(reportData: any) {
            return apiRequest('/reports.php', {
                method: 'POST',
                body: JSON.stringify(reportData)
            });
        },

        async list() {
            return apiRequest('/reports.php');
        },

        async resolve(id: string, resolution: any) {
            return apiRequest(`/reports.php?id=${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: JSON.stringify(resolution)
            });
        }
    },

    // Admin
    admin: {
        async overview() {
            return apiRequest('/admin.php?action=overview');
        },

        async getDashboardStats() {
            return apiRequest('/admin.php?action=overview');
        },

        async users(search?: string, role?: string, opts?: { limit?: number; offset?: number; status?: string }) {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (role && role !== 'all') params.append('role', role);
            if (opts?.status && opts.status !== 'all') params.append('status', opts.status);
            if (opts?.limit !== undefined) params.append('limit', String(opts.limit));
            if (opts?.offset !== undefined) params.append('offset', String(opts.offset));
            return apiRequest(`/admin.php?action=users&${params.toString()}`);
        },

        async banUser(data: { user_id: string; is_banned: boolean; ban_type?: string; ban_reason?: string; banned_until?: string | null }) {
            return apiRequest('/admin.php?action=ban_user', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async verifyUser(userId: string, isVerified: boolean) {
            return apiRequest('/admin.php?action=verify_user', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, is_verified: isVerified })
            });
        },

        async setRole(userId: string, role: string) {
            return apiRequest('/admin.php?action=set_role', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, role })
            });
        },

        async deleteUser(userId: string) {
            return apiRequest('/admin.php?action=delete_user', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId })
            });
        },

        async auditLog(limit: number = 50, offset: number = 0, filterAction?: string) {
            const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
            if (filterAction) params.append('filter_action', filterAction);
            return apiRequest(`/admin.php?action=auditlog&${params.toString()}`);
        },

        async parentLinks(userId: string) {
            return apiRequest(`/admin.php?action=parent_links&user_id=${encodeURIComponent(userId)}`);
        }
    },

    // Gespeicherte Suchen (B4)
    savedSearches: {
        async list() {
            return apiRequest('/saved_searches.php');
        },

        async save(query: unknown) {
            return apiRequest('/saved_searches.php', {
                method: 'POST',
                body: JSON.stringify({ query })
            });
        },

        async remove(id: string) {
            return apiRequest(`/saved_searches.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        }
    },

    // Analytics (Tracking öffentlich, Stats nur SV-Admin)
    analytics: {
        async track(path: string, deviceType: string, browser: string) {
            return apiRequest('/analytics.php?action=track', {
                method: 'POST',
                body: JSON.stringify({ path, device_type: deviceType, browser })
            });
        },

        async trackCategory(subject: string) {
            return apiRequest('/analytics.php?action=track_category', {
                method: 'POST',
                body: JSON.stringify({ subject })
            });
        },

        async popularSubjects() {
            return apiRequest('/analytics.php?action=popular_subjects');
        },

        async stats(days: 7 | 30 | 90 = 30) {
            return apiRequest(`/analytics.php?action=stats&days=${days}`);
        },

        async summary() {
            return apiRequest('/analytics.php?action=summary');
        }
    },

    // News / Ankündigungen
    news: {
        async list() {
            return apiRequest('/news.php');
        },

        async create(data: { title: string; content: string; is_pinned?: boolean }) {
            return apiRequest('/news.php', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async delete(id: string) {
            return apiRequest(`/news.php?id=${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });
        }
    },

    // Benachrichtigungen (In-App & E-Mail Triggers)
    notifications: {
        async list(limit: number = 30) {
            return apiRequest(`/notifications.php?limit=${limit}`);
        },

        async create(data: { user_id?: string; type: string; title: string; message?: string; body?: string; data?: any; link?: string }) {
            return apiRequest('/notifications.php', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async markRead(idOrIds: string | string[] | { id?: string; ids?: string[]; mark_all?: boolean }) {
            let body: any = {};
            if (typeof idOrIds === 'string') {
                body = { id: idOrIds };
            } else if (Array.isArray(idOrIds)) {
                body = { ids: idOrIds };
            } else {
                body = idOrIds;
            }
            return apiRequest('/notifications.php', {
                method: 'PUT',
                body: JSON.stringify(body)
            });
        },

        async delete(id: string) {
            return apiRequest(`/notifications.php?id=${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });
        }
    }
};
