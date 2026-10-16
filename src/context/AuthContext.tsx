import { createContext, useContext, useEffect, useState } from 'react';
import { api, getStoredToken, getStoredUser } from '../lib/api';
import type { Profile } from '../lib/types';

// Lokale Auth-Typen (Ersatz für die früheren Supabase-Typen User/Session).
export interface AuthUser {
    id: string;
    email?: string;
    [key: string]: any;
}

export interface AuthSession {
    access_token?: string;
    user: AuthUser;
    [key: string]: any;
}

interface AuthContextType {
    user: AuthUser | null;
    session: AuthSession | null;
    profile: Profile | null;
    loading: boolean;
    isAdmin: boolean;
    isCoachAdmin: boolean;
    isCoach: boolean;
    isVerified: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isCoachAdmin: false,
    isCoach: false,
    isVerified: false,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
            );

            const res: any = await Promise.race([api.profiles.get(userId), timeoutPromise]);
            const { data, error } = res || {};

            if (error) {
                console.error('Error fetching profile:', error);
                setProfile(null);
            } else {
                setProfile(data as Profile);
            }
        } catch (err) {
            console.error('Catch error fetching profile:', err);
            setProfile(null);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        let isMounted = true;

        // Safety timeout to guarantee loading never stays stuck forever
        const safetyTimer = setTimeout(() => {
            if (isMounted) {
                setLoading(false);
            }
        }, 5000);

        // Liest die lokal gespeicherte Session (Token + User) – Ersatz für das frühere getSession().
        const applyStoredSession = async () => {
            const token = getStoredToken();
            const storedUser = getStoredUser();
            const currentUser = token && storedUser ? (storedUser as AuthUser) : null;

            if (!isMounted) return;

            setSession(currentUser ? { access_token: token ?? undefined, user: currentUser } : null);
            setUser(currentUser);
            if (currentUser) {
                await fetchProfile(currentUser.id);
            } else {
                setProfile(null);
            }
        };

        const initAuth = async () => {
            try {
                await applyStoredSession();
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
            }
        };

        initAuth();

        // Ersatz für das frühere Auth-Abo: Login/Registrierung melden den
        // Wechsel über ein Fenster-Event; die Session wird dann frisch aus dem Storage gelesen.
        const handleAuthChanged = async () => {
            if (!isMounted) return;
            try {
                await applyStoredSession();
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        window.addEventListener('fwg:auth-changed', handleAuthChanged);

        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
            window.removeEventListener('fwg:auth-changed', handleAuthChanged);
        };
    }, []);

    const signOut = async () => {
        await api.auth.logout();
        setUser(null);
        setSession(null);
        setProfile(null);
        window.dispatchEvent(new Event('fwg:auth-changed'));
    };

    const isAdmin = profile?.role === 'sv_admin';
    const isCoachAdmin = profile?.role === 'sv_admin' || profile?.role === 'coach_admin';
    const isCoach = !!profile?.is_coach;
    const isVerified = profile?.is_verified ?? false;

    return (
        <AuthContext.Provider value={{
            user,
            session,
            profile,
            loading,
            isAdmin,
            isCoachAdmin,
            isCoach,
            isVerified,
            signOut,
            refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
