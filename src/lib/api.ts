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

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type') || '';
        let json: any = null;

        if (contentType.includes('application/json')) {
            json = await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) {
                return { data: null, error: { message: text || `HTTP Fehler ${response.status}` } };
            }
            return { data: text as any, error: null };
        }

        if (!response.ok) {
            return {
                data: null,
                error: {
                    message: json?.error || `Fehler (${response.status})`,
                    status: response.status,
                    details: json?.details
                }
            };
        }

        return { data: json, error: null };
    } catch (err: any) {
        console.error(`API Request Fehler bei ${endpoint}:`, err);
        return {
            data: null,
            error: {
                message: err.message || 'Verbindung zum Server fehlgeschlagen. Bitte Internetverbindung prüfen.'
            }
        };
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

        logout() {
            setStoredToken(null);
            setStoredUser(null);
            return Promise.resolve({ data: { success: true }, error: null });
        }
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

        async generate(count: number, role: string, prefix?: string) {
            return apiRequest('/codes.php?action=generate', {
                method: 'POST',
                body: JSON.stringify({ count, role, prefix })
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

        async users(search?: string, role?: string) {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (role) params.append('role', role);
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
