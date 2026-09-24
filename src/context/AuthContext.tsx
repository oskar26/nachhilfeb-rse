import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import type { Profile } from '../lib/types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    isAdmin: boolean;
    isCoachAdmin: boolean;
    isCoach: boolean;
    isParent: boolean;
    isVerified: boolean;
    /** null = noch unbekannt, true/false = aktive Kind-Verknüpfung vorhanden (nur für Eltern relevant) */
    parentLinkReady: boolean | null;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshParentLink: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isCoachAdmin: false,
    isCoach: false,
    isParent: false,
    isVerified: false,
    parentLinkReady: null,
    signOut: async () => { },
    refreshProfile: async () => { },
    refreshParentLink: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [parentLinkReady, setParentLinkReady] = useState<boolean | null>(null);

    // Kind-Verknüpfung serverseitig prüfen (AccessGuard D5): nur Eltern brauchen diese Info.
    const fetchParentLinkReady = async (role: string | undefined) => {
        if (role !== 'parent') {
            setParentLinkReady(null);
            return;
        }
        try {
            const { data, error } = await api.parentLinks.list();
            if (error) throw error;
            const links = Array.isArray(data) ? data : [];
            setParentLinkReady(links.some((l: any) => l?.status === 'active'));
        } catch (err) {
            console.error('Error fetching parent links:', err);
            setParentLinkReady(false);
        }
    };

    const fetchProfile = async (userId: string) => {
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
            );

            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const res: any = await Promise.race([fetchPromise, timeoutPromise]);
            const { data, error } = res || {};
            
            if (error) {
                console.error('Error fetching profile:', error);
                setProfile(null);
                setParentLinkReady(null);
            } else {
                setProfile(data as Profile);
                void fetchParentLinkReady((data as Profile | null)?.role);
            }
        } catch (err) {
            console.error('Catch error fetching profile:', err);
            setProfile(null);
            setParentLinkReady(null);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const refreshParentLink = async () => {
        await fetchParentLinkReady(profile?.role);
    };

    useEffect(() => {
        let isMounted = true;

        // Safety timeout to guarantee loading never stays stuck forever
        const safetyTimer = setTimeout(() => {
            if (isMounted) {
                setLoading(false);
            }
        }, 5000);

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted) return;
                
                setSession(session);
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setProfile(null);
                }
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

        // Listen for changes on auth state
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
                await fetchProfile(currentUser.id);
            } else if (!currentUser) {
                setProfile(null);
                setParentLinkReady(null);
            }
            // For INITIAL_SESSION, profile was already fetched in initAuth above
            setLoading(false);
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setParentLinkReady(null);
    };

    const isAdmin = profile?.role === 'sv_admin';
    const isCoachAdmin = profile?.role === 'sv_admin' || profile?.role === 'coach_admin';
    const isCoach = !!profile?.is_coach;
    const isParent = profile?.role === 'parent';
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
            isParent, 
            isVerified, 
            parentLinkReady,
            signOut, 
            refreshProfile,
            refreshParentLink
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
