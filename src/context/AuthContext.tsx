import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../services/authService';
import type { Profile, UserRole } from '../types/database';

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

// ─── Provider ────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load profile from Supabase — role is sourced from DB, not the frontend
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profile = await authService.getProfile(userId);

      // Check account status — suspended/deleted users should not have sessions
      if (profile && (profile.status === 'suspended' || profile.status === 'deleted')) {
        await authService.signOut();
        setUser(null);
        return;
      }

      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const session = await authService.getSession();
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [loadProfile]);

  // Listen for Supabase auth state changes (session restore on app start)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setUser(null);
        }
        setIsInitialized(true);
      },
    );
    return () => subscription.unsubscribe();
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
        await authService.signOut();
        return {
          success: false,
          errorType: 'suspended',
          errorMessage: 'Your account has been suspended. Please contact RiderHood support.',
        };
      }

      if (profileData.status === 'deleted') {
        await authService.signOut();
        return {
          success: false,
          errorType: 'deleted',
          errorMessage: 'This account has been deleted. Please contact support if you believe this is an error.',
        };
      }

      if (profileData.status === 'pending') {
        await authService.signOut();
        return {
          success: false,
          errorType: 'pending',
          errorMessage: 'Your account is still awaiting approval. You will be notified once approved.',
        };
      }

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
        errorMessage = 'Please enter a valid email address.';
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
      await authService.signOut();
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
