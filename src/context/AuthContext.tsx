import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as authService from '../services/authService';
import type { Profile, UserRole } from '../types/database';

// ─── Storage Keys & Constants ─────────────────────────────────
const CACHED_PROFILE_KEY = '@riderhood_cached_profile';
const SESSION_LAST_ACTIVE_KEY = '@riderhood_session_last_active';
// 30 days in milliseconds (1 month continuous session window)
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────

export type LoginErrorType =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'invalid_email'
  | 'rate_limit'
  | 'suspended'
  | 'pending'
  | 'deleted'
  | 'network_error'
  | 'unknown';

export interface LoginResult {
  success: boolean;
  profile?: Profile | null;
  errorType?: LoginErrorType;
  errorMessage?: string;
}

interface AuthContextType {
  user: Profile | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  isLoading: false,
  isInitialized: false,
  login: async () => ({ success: false, errorType: 'unknown' }),
  logout: async () => {},
  refreshProfile: async () => {},
});

// ─── Storage Helpers ──────────────────────────────────────────

async function touchSessionActivity(): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_LAST_ACTIVE_KEY, Date.now().toString());
  } catch (err) {
    console.warn('[AuthContext] Failed to touch session activity:', err);
  }
}

async function saveCachedProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('[AuthContext] Failed to cache profile:', err);
  }
}

async function clearLocalSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CACHED_PROFILE_KEY, SESSION_LAST_ACTIVE_KEY]);
  } catch (err) {
    console.warn('[AuthContext] Failed to clear local session:', err);
  }
}

// ─── Provider ────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load profile from Supabase — role is sourced from DB, not the frontend
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profile = await authService.getProfile(userId);

      // Check account status — suspended/deleted users should not have active sessions
      if (profile && (profile.status === 'suspended' || profile.status === 'deleted')) {
        await clearLocalSession();
        await authService.signOut();
        setUser(null);
        return;
      }

      if (profile) {
        setUser(profile);
        await saveCachedProfile(profile);
        await touchSessionActivity();
      }
    } catch {
      // If network fails, retain existing state if available
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const session = await authService.getSession();
    if (session?.user?.id) {
      await loadProfile(session.user.id);
    }
  }, [loadProfile]);

  // Initial cold-start bootstrap & auth listener with 1-month session window
  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const [cachedProfileStr, lastActiveStr] = await Promise.all([
          AsyncStorage.getItem(CACHED_PROFILE_KEY),
          AsyncStorage.getItem(SESSION_LAST_ACTIVE_KEY),
        ]);

        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : null;
        const now = Date.now();

        // Check if previous session exceeded 30 days of inactivity
        if (lastActive && (now - lastActive > SESSION_LIFETIME_MS)) {
          console.log('[AuthContext] Session expired after 1 month of inactivity. Signing out.');
          await clearLocalSession();
          await authService.signOut();
          if (isMounted) {
            setUser(null);
            setIsInitialized(true);
          }
          return;
        }

        // Fast hydrated state from cache
        if (cachedProfileStr && isMounted) {
          try {
            const cachedProfile = JSON.parse(cachedProfileStr) as Profile;
            setUser(cachedProfile);
          } catch {
            // Ignore parse errors
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Error reading cached session:', err);
      }
    };

    bootstrapAuth();

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          // Check 1-month session inactivity
          const lastActiveStr = await AsyncStorage.getItem(SESSION_LAST_ACTIVE_KEY);
          const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : null;
          const now = Date.now();

          if (lastActive && (now - lastActive > SESSION_LIFETIME_MS)) {
            console.log('[AuthContext] Expired session detected during auth change. Signing out.');
            await clearLocalSession();
            await authService.signOut();
            if (isMounted) {
              setUser(null);
              setIsInitialized(true);
            }
            return;
          }

          await touchSessionActivity();
          await loadProfile(session.user.id);
        } else {
          await clearLocalSession();
          if (isMounted) {
            setUser(null);
          }
        }

        if (isMounted) {
          setIsInitialized(true);
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ─── Login ──────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      const { user: authUser } = await authService.signIn({ email, password });
      if (!authUser) {
        return {
          success: false,
          errorType: 'invalid_credentials',
          errorMessage: 'Incorrect email or password. Please check your details and try again.',
        };
      }

      // Query profiles table — role and status come from the DB, NOT frontend inputs
      const profileData = await authService.getProfile(authUser.id);

      if (!profileData) {
        return {
          success: false,
          errorType: 'unknown',
          errorMessage: 'Profile not found. Please contact support.',
        };
      }

      // Check account status
      if (profileData.status === 'suspended') {
        await clearLocalSession();
        await authService.signOut();
        return {
          success: false,
          errorType: 'suspended',
          errorMessage: 'Your account has been suspended. Please contact RiderHood support.',
        };
      }

      if (profileData.status === 'deleted') {
        await clearLocalSession();
        await authService.signOut();
        return {
          success: false,
          errorType: 'deleted',
          errorMessage: 'This account has been deleted. Please contact support if you believe this is an error.',
        };
      }

      if (profileData.status === 'pending') {
        await clearLocalSession();
        await authService.signOut();
        return {
          success: false,
          errorType: 'pending',
          errorMessage: 'Your account is still awaiting approval. You will be notified once approved.',
        };
      }

      // Persist session timestamp and cached profile for seamless 1-month persistence
      await saveCachedProfile(profileData);
      await touchSessionActivity();

      setUser(profileData);
      return { success: true, profile: profileData };
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string; status?: number };

      let errorType: LoginErrorType = 'invalid_credentials';
      let errorMessage = 'Incorrect email or password. Please check your details and try again.';

      const msg = (error?.message || '').toLowerCase();
      const code = (error?.code || '').toLowerCase();

      if (msg.includes('confirm') || msg.includes('not confirmed') || code.includes('email_not_confirmed')) {
        errorType = 'email_not_confirmed';
        errorMessage = 'Your email address has not been confirmed yet. Please check your inbox and verify your email before logging in.';
      } else if (msg.includes('rate') || msg.includes('too many') || error?.status === 429) {
        errorType = 'rate_limit';
        errorMessage = 'Security rate limit reached. Please wait a few moments before trying again.';
      } else if (msg.includes('invalid email') || msg.includes('email format')) {
        errorType = 'invalid_email';
        errorMessage = 'Please enter a practical valid email address.';
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
        errorType = 'network_error';
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }

      return { success: false, errorType, errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────
  const logout = async () => {
    setIsLoading(true);
    try {
      await clearLocalSession();
      await authService.signOut();
    } catch (err) {
      console.warn('[AuthContext] SignOut error:', err);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        role: user?.role ?? null,
        isLoading,
        isInitialized,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

