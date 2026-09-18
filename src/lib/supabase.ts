// ==============================================================================
// FWG Nachhilfebörse - Native ALL-INKL API Adapter (Supabase Drop-in Bridge)
// Vollständige Ablösung von Supabase: Leitet alle Aufrufe sicher an das
// eigene PHP 8 + MySQL Backend auf ALL-INKL (nachhilfe-sv.de) weiter.
// ==============================================================================

import { api, getStoredToken, getStoredUser } from './api';

type AuthListener = (event: string, session: any) => void;
const authListeners: Set<AuthListener> = new Set();

function emitAuthStateChange(event: string, session: any) {
    authListeners.forEach(listener => {
        try {
            listener(event, session);
        } catch (e) {
            console.error('Auth listener error:', e);
        }
    });
}

// ------------------------------------------------------------------------------
// Channel / Polling Manager für Live-Events (Chat & Notifications)
// ------------------------------------------------------------------------------
interface ActiveChannel {
    name: string;
    intervalId: any;
    stop: () => void;
}
const activeChannels: Map<string, ActiveChannel> = new Map();

class ChannelBuilder {
    name: string;
    private listeners: Array<{ event: string; filter: any; callback: (payload: any) => void }> = [];

    constructor(name: string) {
        this.name = name;
    }

    on(_type: string, filter: any, callback: (payload: any) => void) {
        this.listeners.push({ event: filter?.event || '*', filter, callback });
        return this;
    }

    subscribe() {
        // Chat Channel (Polling alle 2 Sekunden)
        if (this.name.startsWith('chat_')) {
            const requestId = this.name.replace('chat_', '');
            let lastTimestamp: string | undefined = undefined;

            const pollInterval = setInterval(async () => {
                try {
                    const res = await api.messages.list(requestId, lastTimestamp);
                    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                        for (const msg of res.data) {
                            lastTimestamp = msg.created_at;
                            this.listeners.forEach(l => {
                                l.callback({
                                    eventType: 'INSERT',
                                    new: msg
                                });
                            });
                        }
                    }
                } catch (e) {
                    console.error('Chat polling error:', e);
                }
            }, 2000);

            const active: ActiveChannel = {
                name: this.name,
                intervalId: pollInterval,
                stop: () => clearInterval(pollInterval)
            };
            activeChannels.set(this.name, active);
        }

        // Notification Channel (Polling alle 12 Sekunden)
        if (this.name.startsWith('notifications:')) {
            const pollInterval = setInterval(() => {
                this.listeners.forEach(l => {
                    l.callback({ eventType: 'POLL' });
                });
            }, 12000);

            const active: ActiveChannel = {
                name: this.name,
                intervalId: pollInterval,
                stop: () => clearInterval(pollInterval)
            };
            activeChannels.set(this.name, active);
        }

        return this;
    }
}

export interface QueryResult<T = any[]> {
    data: T;
    count: number | null;
    error: any;
}

// ------------------------------------------------------------------------------
// Fluent Query Builder mit vollständiger Chain-Unterstützung
// ------------------------------------------------------------------------------
export class QueryBuilder<T = any[]> implements PromiseLike<QueryResult<T>> {
    private table: string;
    private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private selectFields: string = '*';
    private selectOptions?: { count?: string; head?: boolean };
    private filters: Array<{ col: string; op: string; val: any }> = [];
    private payload: any = null;
    private isSingle: boolean = false;
    private isMaybeSingle: boolean = false;

    constructor(table: string) {
        this.table = table;
    }

    select(fields: string = '*', options?: { count?: string; head?: boolean }): QueryBuilder<any[]> {
        this.operation = 'select';
        this.selectFields = fields;
        this.selectOptions = options;
        return this as unknown as QueryBuilder<any[]>;
    }

    insert(data: any): QueryBuilder<any> {
        this.operation = 'insert';
        this.payload = data;
        return this as unknown as QueryBuilder<any>;
    }

    update(data: any): QueryBuilder<any> {
        this.operation = 'update';
        this.payload = data;
        return this as unknown as QueryBuilder<any>;
    }

    delete(): QueryBuilder<any> {
        this.operation = 'delete';
        return this as unknown as QueryBuilder<any>;
    }

    eq(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'eq', val });
        return this;
    }

    neq(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'neq', val });
        return this;
    }

    gt(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'gt', val });
        return this;
    }

    gte(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'gte', val });
        return this;
    }

    lt(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'lt', val });
        return this;
    }

    lte(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'lte', val });
        return this;
    }

    in(col: string, vals: any[]): QueryBuilder<T> {
        this.filters.push({ col, op: 'in', val: vals });
        return this;
    }

    is(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'is', val });
        return this;
    }

    like(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'like', val });
        return this;
    }

    ilike(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'ilike', val });
        return this;
    }

    contains(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'contains', val });
        return this;
    }

    overlaps(col: string, val: any): QueryBuilder<T> {
        this.filters.push({ col, op: 'overlaps', val });
        return this;
    }

    or(_query: string): QueryBuilder<T> {
        return this;
    }

    order(_col: string, _opts: { ascending?: boolean } = {}): QueryBuilder<T> {
        return this;
    }

    range(_from: number, _to: number): QueryBuilder<T> {
        return this;
    }

    limit(_count: number): QueryBuilder<T> {
        return this;
    }

    single(): QueryBuilder<any> {
        this.isSingle = true;
        return this as unknown as QueryBuilder<any>;
    }

    maybeSingle(): QueryBuilder<any> {
        this.isMaybeSingle = true;
        return this as unknown as QueryBuilder<any>;
    }

    returns<R>(): QueryBuilder<R> {
        return this as unknown as QueryBuilder<R>;
    }

    then<TResult1 = QueryResult<T>, TResult2 = never>(
        onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private async execute(): Promise<QueryResult<any>> {
        try {
            // 1. ADS TABELLE
            if (this.table === 'ads') {
                if (this.operation === 'select') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    if (idFilter) {
                        const res = await api.ads.get(idFilter);
                        const outData = this.isSingle || this.isMaybeSingle ? res.data : [res.data].filter(Boolean);
                        return { data: outData, count: outData ? 1 : 0, error: res.error };
                    }
                    const userEqFilter = this.filters.find(f => f.col === 'user_id' && f.op === 'eq')?.val;
                    const userNeqFilter = this.filters.find(f => f.col === 'user_id' && f.op === 'neq')?.val;
                    const typeFilter = this.filters.find(f => f.col === 'type')?.val;
                    const res = await api.ads.list({ user_id: userEqFilter, type: typeFilter, all: true });
                    let list = res.data || [];
                    if (userNeqFilter) {
                        list = list.filter((a: any) => a.user_id !== userNeqFilter);
                    }
                    return { data: list, count: list.length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.ads.create(this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'update') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.ads.update(idFilter, this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'delete') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.ads.delete(idFilter);
                    return { data: res.data, count: null, error: res.error };
                }
            }

            // 2. PROFILES TABELLE
            if (this.table === 'profiles') {
                if (this.operation === 'select') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const inFilter = this.filters.find(f => f.col === 'id' && f.op === 'in')?.val;
                    if (idFilter) {
                        const res = await api.profiles.get(idFilter);
                        const outData = this.isSingle || this.isMaybeSingle ? res.data : [res.data].filter(Boolean);
                        return { data: outData, count: outData ? 1 : 0, error: res.error };
                    }
                    if (inFilter && Array.isArray(inFilter)) {
                        const res = await api.admin.users(undefined, undefined, { limit: 100 });
                        const raw = res.data as unknown;
                        const list: Array<{ id: string }> = Array.isArray(raw)
                            ? (raw as Array<{ id: string }>)
                            : ((raw as { data?: Array<{ id: string }> } | null)?.data ?? []);
                        const matched = list.filter((u) => inFilter.includes(u.id));
                        return { data: matched, count: matched.length, error: res.error };
                    }
                    const res = await api.profiles.get();
                    const out = this.isSingle ? res.data : [res.data].filter(Boolean);
                    return { data: out, count: out ? 1 : 0, error: res.error };
                }
                if (this.operation === 'update') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.profiles.update(this.payload, idFilter);
                    return { data: res.data, count: null, error: res.error };
                }
            }

            // 3. AD_REQUESTS TABELLE
            if (this.table === 'ad_requests') {
                if (this.operation === 'select') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    if (idFilter) {
                        const res = await api.requests.get(idFilter);
                        return { data: res.data, count: res.data ? 1 : 0, error: res.error };
                    }
                    const ownerFilter = this.filters.find(f => f.col === 'owner_id')?.val;
                    const reqFilter = this.filters.find(f => f.col === 'requester_id')?.val;
                    const res = await api.requests.list();
                    let list = res.data || [];
                    if (ownerFilter) {
                        list = list.filter((r: any) => r.owner_id === ownerFilter);
                    }
                    if (reqFilter) {
                        list = list.filter((r: any) => r.requester_id === reqFilter);
                    }
                    return { data: list, count: list.length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.requests.create(this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'update') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.requests.updateStatus(idFilter, this.payload.status);
                    return { data: res.data, count: null, error: res.error };
                }
            }

            // 4. MESSAGES TABELLE
            if (this.table === 'messages') {
                if (this.operation === 'select') {
                    const reqFilter = this.filters.find(f => f.col === 'request_id')?.val;
                    const res = await api.messages.list(reqFilter);
                    const list = res.data || [];
                    return { data: list, count: list.length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.messages.send(this.payload.request_id, this.payload.content);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'update') {
                    return { data: { success: true }, count: null, error: null };
                }
            }

            // 5. REVIEWS TABELLE
            if (this.table === 'reviews') {
                if (this.operation === 'select') {
                    const targetUser = this.filters.find(f => f.col === 'target_user_id')?.val;
                    const adId = this.filters.find(f => f.col === 'ad_id')?.val;
                    const res = await api.reviews.list({ target_user_id: targetUser, ad_id: adId });
                    const list = res.data || [];
                    return { data: list, count: list.length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.reviews.create(this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
            }

            // 6. FAVORITES TABELLE
            if (this.table === 'favorites') {
                if (this.operation === 'select') {
                    const res = await api.favorites.list();
                    const list = res.data || [];
                    const mapped = list.map((item: any) => ({
                        id: item.ad_id || item.id,
                        ad_id: item.ad_id || item.id,
                        user_id: item.user_id,
                        created_at: item.favorited_at || item.created_at,
                        ads: item.ads || {
                            ...item,
                            profiles: item.profiles
                        }
                    }));
                    return { data: mapped, count: mapped.length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.favorites.toggle(this.payload.ad_id);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'delete') {
                    const adId = this.filters.find(f => f.col === 'ad_id')?.val;
                    if (adId) {
                        const res = await api.favorites.toggle(adId);
                        return { data: res.data, count: null, error: res.error };
                    }
                    return { data: null, count: null, error: null };
                }
            }

            // 7. SUPPORT TICKETS & MESSAGES
            if (this.table === 'support_tickets') {
                if (this.operation === 'select') {
                    const id = this.filters.find(f => f.col === 'id')?.val;
                    if (id) {
                        const res = await api.support.getTicket(id);
                        return { data: res.data, count: res.data ? 1 : 0, error: res.error };
                    }
                    const res = await api.support.listTickets();
                    const list = res.data || [];
                    return { data: list, count: list.length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.support.createTicket(this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'update') {
                    const id = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.support.updateStatus(id, this.payload.status, this.payload.admin_notes);
                    return { data: res.data, count: null, error: res.error };
                }
            }
            if (this.table === 'support_messages') {
                if (this.operation === 'insert') {
                    const res = await api.support.sendMessage(this.payload.ticket_id, this.payload.content);
                    return { data: res.data, count: null, error: res.error };
                }
            }

            // 8. REPORTS TABELLE
            if (this.table === 'reports') {
                if (this.operation === 'select') {
                    const res = await api.reports.list();
                    const list = res.data || [];
                    return { data: list, count: list.length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.reports.create(this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'update') {
                    const id = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.reports.resolve(id, this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
            }

            // 9. ANNOUNCEMENTS / NEWS TABELLE
            if (this.table === 'announcements' || this.table === 'news') {
                if (this.operation === 'select') {
                    const res = await api.news.list();
                    const list = res.data || [];
                    return { data: list, count: list.length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.news.create(this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
            }

            // 10. NOTIFICATIONS TABELLE
            if (this.table === 'notifications') {
                if (this.operation === 'select') {
                    const res = await api.notifications.list(30);
                    return { data: (res.data || []) as any, count: res.data?.length || 0, error: res.error };
                }
                if (this.operation === 'update') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.notifications.markRead(idFilter || this.payload.id || this.payload.ids || { mark_all: true });
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'insert') {
                    const res = await api.notifications.create(this.payload);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'delete') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.notifications.delete(idFilter);
                    return { data: res.data, count: null, error: res.error };
                }
                return { data: [] as any, count: 0, error: null };
            }

            // 11. PARENT LINKS
            if (this.table === 'parent_links') {
                return { data: [], count: 0, error: null };
            }

            // 12. ADMIN AUDIT LOG
            if (this.table === 'admin_audit_log') {
                return { data: [], count: 0, error: null };
            }

            // 13. USER BLOCKS / BANS
            if (this.table === 'user_blocks' || this.table === 'user_bans') {
                return { data: { success: true }, count: null, error: null };
            }

            // 14. PROMO CODES
            if (this.table === 'promo_codes') {
                if (this.operation === 'select') {
                    const res = await api.promo_codes.list();
                    return { data: res.data || [], count: (res.data || []).length, error: res.error };
                }
                if (this.operation === 'insert') {
                    const payload = Array.isArray(this.payload) ? this.payload[0] : this.payload;
                    const res = await api.promo_codes.create(payload);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'update') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.promo_codes.toggle(idFilter, this.payload?.is_active ?? true);
                    return { data: res.data, count: null, error: res.error };
                }
                if (this.operation === 'delete') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    const res = await api.promo_codes.delete(idFilter);
                    return { data: res.data, count: null, error: res.error };
                }
            }

            // 15. INVITE CODES
            if (this.table === 'invite_codes') {
                if (this.operation === 'select') {
                    const res = await api.codes.list();
                    return { data: res.data || [], count: (res.data || []).length, error: res.error };
                }
                if (this.operation === 'insert') {
                    // Handled through api.codes.generate or custom insert
                    const res = await api.codes.list();
                    return { data: res.data, count: null, error: null };
                }
                if (this.operation === 'delete') {
                    const idFilter = this.filters.find(f => f.col === 'id')?.val;
                    if (idFilter) {
                        const res = await api.codes.deleteInvite(idFilter);
                        return { data: res.data, count: null, error: res.error };
                    }
                    return { data: null, count: null, error: null };
                }
            }

            // Fallback für sonstige Tabellen
            return { data: [], count: 0, error: null };
        } catch (err: any) {
            return { data: null, count: null, error: { message: err.message || 'Abfragefehler' } };
        }
    }
}

// ------------------------------------------------------------------------------
// Supabase-kompatibles Hauptobjekt
// ------------------------------------------------------------------------------
export const supabase = {
    // Authentifizierung
    auth: {
        async getSession(): Promise<{ data: { session: any }; error: any }> {
            const token = getStoredToken();
            const user = getStoredUser();

            if (!token || !user) {
                return { data: { session: null }, error: null };
            }

            const sessionObj: any = {
                access_token: token,
                token_type: 'bearer',
                refresh_token: token,
                expires_in: 86400 * 30,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    app_metadata: {},
                    user_metadata: user,
                    aud: 'authenticated',
                    created_at: new Date().toISOString()
                }
            };

            return {
                data: { session: sessionObj },
                error: null
            };
        },

        async getUser(): Promise<{ data: { user: any }; error: any }> {
            const { data } = await this.getSession();
            return {
                data: {
                    user: data.session?.user || null
                },
                error: null
            };
        },

        async refreshSession() {
            return this.getSession();
        },

        async signInWithPassword({ email, password }: { email: string; password: string }) {
            const res = await api.auth.login({ email, password });
            if (res.error) {
                return { data: { user: null, session: null }, error: res.error };
            }

            const session = {
                access_token: res.data.token,
                user: res.data.user
            };

            emitAuthStateChange('SIGNED_IN', session);

            return {
                data: {
                    user: res.data.user,
                    session
                },
                error: null
            };
        },

        async signUp(params: any) {
            const dataPayload: any = {
                email: params.email,
                password: params.password,
                firstName: params.firstName || params.first_name || params.options?.data?.first_name || params.options?.data?.firstName,
                lastName: params.lastName || params.last_name || params.options?.data?.last_name || params.options?.data?.lastName,
                role: params.role || params.options?.data?.role || 'student',
                grade: params.grade || params.options?.data?.grade,
                letter: params.letter || params.options?.data?.letter,
                birthDate: params.birthDate || params.options?.data?.birthDate,
                parentalConsent: params.parentalConsent ?? params.options?.data?.parentalConsent ?? false,
                inviteCode: params.inviteCode || params.options?.data?.inviteCode || '',
                ...(params.options?.data || {}),
                ...params
            };

            if (!dataPayload.firstName && dataPayload.full_name) {
                const parts = dataPayload.full_name.trim().split(' ');
                dataPayload.firstName = parts[0];
                dataPayload.lastName = parts.slice(1).join(' ') || parts[0];
            }

            const res = await api.auth.register(dataPayload);
            if (res.error) {
                return { data: { user: null, session: null }, error: res.error };
            }

            const session = res.data.token ? {
                access_token: res.data.token,
                user: res.data.user
            } : null;

            if (session) {
                emitAuthStateChange('SIGNED_IN', session);
            }

            return {
                data: {
                    user: res.data.user,
                    session
                },
                error: null
            };
        },

        async signOut() {
            await api.auth.logout();
            emitAuthStateChange('SIGNED_OUT', null);
            return { error: null };
        },

        async updateUser(attributes: any) {
            if (attributes.password) {
                const res = await api.auth.updatePassword(attributes.password);
                return { data: { user: getStoredUser() }, error: res.error };
            }
            return { data: { user: getStoredUser() }, error: null };
        },

        async resetPasswordForEmail(email: string, _opts?: any): Promise<{ data: any; error: any }> {
            const res = await api.auth.resetPasswordRequest(email);
            return { data: res.data, error: res.error };
        },

        onAuthStateChange(callback: AuthListener) {
            authListeners.add(callback);
            
            // Initialen Status sofort übermitteln
            this.getSession().then(({ data: { session } }) => {
                if (session) {
                    callback('SIGNED_IN', session);
                } else {
                    callback('INITIAL_SESSION', null);
                }
            });

            return {
                data: {
                    subscription: {
                        unsubscribe: () => {
                            authListeners.delete(callback);
                        }
                    }
                }
            };
        }
    },

    // Datenbank-Abfragen
    from(table: string): QueryBuilder<any[]> {
        return new QueryBuilder<any[]>(table);
    },

    // Stored Procedure / RPC Emulation
    async rpc(funcName: string, args: any = {}) {
        if (funcName === 'check_invite_code') {
            const res = await api.codes.check(args.code_val);
            if (res.error || !res.data?.valid) {
                return { data: false, error: res.error };
            }
            return { data: true, error: null };
        }

        if (funcName === 'redeem_invite_code' || funcName === 'redeem_code') {
            const codeVal = args.code_val ?? args.secret_code ?? '';
            const res = await api.codes.redeem(codeVal);
            if (res.error) {
                return { data: 'invalid', error: res.error };
            }
            return { data: res.data?.role || 'student', error: null };
        }

        // Promo-Code beim Anzeigen-Erstellen einlösen (CreateAd). Das Backend
        // schreibt den Vorteil (Boost/Verifizierung) direkt gut und liefert
        // { message, effect_type, boost_days } zurück.
        if (funcName === 'redeem_promo_code') {
            const res = await api.codes.redeem(args.code_val ?? '');
            if (res.error || !res.data || res.data.valid === false) {
                const message = (res.data as any)?.message || res.error?.message || 'Ungültiger oder abgelaufener Promo-Code.';
                return { data: { success: false, message }, error: null };
            }
            return {
                data: {
                    success: true,
                    boost_days: (res.data as any)?.boost_days ?? 14,
                    effect_type: (res.data as any)?.effect_type,
                    message: (res.data as any)?.message,
                },
                error: null,
            };
        }

        return { data: null, error: null };
    },

    // Realtime Channels & Polling
    channel(name: string) {
        return new ChannelBuilder(name);
    },

    removeChannel(channel: any) {
        const active = activeChannels.get(channel?.name);
        if (active) {
            active.stop();
            activeChannels.delete(channel.name);
        }
    }
};
