import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

// ─── Users ────────────────────────────────────────────────────
export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function setUserStatus(userId: string, status: 'active' | 'suspended' | 'deleted') {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select().single();
  if (error) throw error;
  return data;
}

// ─── Platform Reports ─────────────────────────────────────────
export async function getPlatformStats() {
  const [users, workshops, bookings] = await Promise.all([
    supabase.from('profiles').select('id, role, status', { count: 'exact' }),
    supabase.from('workshops').select('id, verification_status, status', { count: 'exact' }),
    supabase.from('bookings').select('id, status', { count: 'exact' }),
  ]);

  return {
    totalUsers: users.count ?? 0,
    totalWorkshops: workshops.count ?? 0,
    totalBookings: bookings.count ?? 0,
    users: users.data ?? [],
    workshops: workshops.data ?? [],
    bookings: bookings.data ?? [],
  };
}

// ─── Admin: Get all parts across all workshops ────────────────
export async function getAllParts() {
  const { data, error } = await supabase
    .from('parts')
    .select('*, workshop:workshops(id, name)')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

// ─── Admin: Get all reviews across all workshops ──────────────
export async function getAllReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, customer:profiles(id, full_name), workshop:workshops(id, name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Admin: Get all services across all workshops ─────────────
export async function getAllServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*, workshop:workshops(id, name)')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

// ─── Admin: Broadcast notification to all users ───────────────
export async function broadcastNotification(title: string, message: string) {
  const { data: users, error: usersErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('status', 'active');
  if (usersErr) throw usersErr;
  if (!users || users.length === 0) return;

  const notifications = users.map((u) => ({
    user_id: u.id,
    type: 'system' as const,
    title,
    message,
    is_read: false,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) throw error;
}

// ─── Admin: Get recent system broadcast notifications ─────────
export async function getRecentBroadcasts() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'system')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  // Deduplicate by title+message (broadcasts go to all users)
  const seen = new Set<string>();
  return (data ?? []).filter((n) => {
    const key = `${n.title}|${n.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Audit Log ────────────────────────────────────────────────
export async function logAuditAction(payload: {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('audit_logs').insert(payload);
  if (error) console.error('[AuditLog] Failed:', error.message);
}

// ─── Subscribe to new workshop registrations (realtime) ──────
export function subscribeToNewWorkshops(onNew: (workshop: unknown) => void) {
  return supabase
    .channel('new_workshops')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'workshops' },
      (payload) => onNew(payload.new),
    )
    .subscribe();
}
