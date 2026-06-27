import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    isAdmin: boolean;
    isParent: boolean;
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
    isParent: false,
    isVerified: false,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

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
        }, 2000);

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
            if (currentUser && event !== 'INITIAL_SESSION') {
                await fetchProfile(currentUser.id);
            } else if (!currentUser) {
                setProfile(null);
            }
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
    };

    const isAdmin = profile?.role === 'sv_admin';
    const isParent = profile?.role === 'parent';
    const isVerified = profile?.is_verified ?? false;

    return (
        <AuthContext.Provider value={{ 
            user, 
            session, 
            profile, 
            loading, 
            isAdmin, 
            isParent, 
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
