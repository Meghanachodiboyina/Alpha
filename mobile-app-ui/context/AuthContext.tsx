import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  isAuthenticated: boolean | null;
  hasCompletedOnboarding: boolean | null;
  session: Session | null;
  user: User | null;
  login: () => Promise<void>; // Kept for legacy signature, no-op usually
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: null,
  hasCompletedOnboarding: null,
  session: null,
  user: null,
  login: async () => {},
  logout: async () => {},
  completeOnboarding: async () => {},
  resetOnboarding: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const onboarding = await AsyncStorage.getItem('has_completed_onboarding');
        
        // Supabase session
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setIsAuthenticated(!!data.session);

        if (!data.session) {
          setHasCompletedOnboarding(false);
        } else {
          setHasCompletedOnboarding(onboarding === 'true');
        }
      } catch {
        setIsAuthenticated(false);
        setHasCompletedOnboarding(false);
      }
    };
    initAuth();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      
      if (!session) {
        setHasCompletedOnboarding(false);
      } else {
        const onboarding = await AsyncStorage.getItem('has_completed_onboarding');
        setHasCompletedOnboarding(onboarding === 'true');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    // Auth state is automatically managed by supabase.auth.onAuthStateChange
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      // AuthListener will handle state updates
    } catch (e) {
      console.error('Failed to logout', e);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('has_completed_onboarding', 'true');
      setHasCompletedOnboarding(true);
    } catch (e) {
      console.error('Failed to save onboarding completion', e);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('has_completed_onboarding');
      setHasCompletedOnboarding(false);
    } catch (e) {
      console.error('Failed to reset onboarding', e);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      hasCompletedOnboarding,
      session,
      user,
      login,
      logout,
      completeOnboarding,
      resetOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
