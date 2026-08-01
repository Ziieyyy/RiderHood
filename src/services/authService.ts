import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthCredentials {
  full_name: string;
  phone?: string;
}

// ─── Sign Up ────────────────────────────────────────────────
export async function signUp({ email, password, full_name, phone }: RegisterPayload) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone, role: 'customer' },
    },
  });
  if (error) throw error;
  return data;
}

// ─── Sign In ─────────────────────────────────────────────────
export async function signIn({ email, password }: AuthCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ─── Sign Out ─────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Get Current Session ──────────────────────────────────────
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ─── Get Profile (role is sourced from DB, NOT frontend) ──────
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

// ─── Update Profile ───────────────────────────────────────────
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Request Password Reset ────────────────────────────────────
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// ─── Update User Password ──────────────────────────────────────
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

// ─── Resend Email Confirmation ─────────────────────────────────
export async function resendConfirmationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  if (error) throw error;
}

// ─── Listen to Auth State Changes ─────────────────────────────
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
