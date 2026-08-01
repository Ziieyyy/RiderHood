import { supabase } from '../lib/supabase';
import type { Workshop, Service } from '../types/database';

export interface WorkshopFilters {
  search?: string;
  latitude?: number;
  longitude?: number;
  isOpenNow?: boolean;
  serviceCategory?: string;
}

// ─── Get approved, active workshops (customer-facing) ─────────
export async function getWorkshops(filters: WorkshopFilters = {}): Promise<Workshop[]> {
  let query = supabase
    .from('workshops')
    .select('*')
    .eq('verification_status', 'approved')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,district.ilike.%${filters.search}%`);
  }
  if (filters.isOpenNow) {
    query = query.eq('is_open', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  let result = data ?? [];

  // Client-side distance sort when GPS coordinates provided
  if (filters.latitude && filters.longitude) {
    result = result
      .filter((w) => w.latitude !== null && w.longitude !== null)
      .sort((a, b) => {
        const distA = getDistanceKm(filters.latitude!, filters.longitude!, a.latitude!, a.longitude!);
        const distB = getDistanceKm(filters.latitude!, filters.longitude!, b.latitude!, b.longitude!);
        return distA - distB;
      });
  }

  return result;
}

// ─── Get a single workshop ────────────────────────────────────
export async function getWorkshop(id: string): Promise<Workshop | null> {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

// ─── Get workshop for admin (owner only) ─────────────────────
export async function getMyWorkshop(ownerId: string): Promise<Workshop | null> {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('owner_id', ownerId)
    .single();
  if (error) return null;
  return data;
}

// ─── Create workshop (workshop admin registration) ────────────
export async function createWorkshop(payload: Partial<Workshop>): Promise<Workshop> {
  const { data, error } = await supabase
    .from('workshops')
    .insert({ ...payload, verification_status: 'pending', status: 'active' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Update workshop ──────────────────────────────────────────
export async function updateWorkshop(id: string, updates: Partial<Workshop>): Promise<Workshop> {
  const { data, error } = await supabase
    .from('workshops')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Admin: Get all workshops ─────────────────────────────────
export async function getAllWorkshops(): Promise<Workshop[]> {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Admin: Approve / Reject / Suspend ───────────────────────
export async function setWorkshopVerification(
  id: string,
  verification_status: 'approved' | 'rejected',
) {
  return updateWorkshop(id, { verification_status });
}

export async function setWorkshopStatus(id: string, status: 'active' | 'suspended' | 'closed') {
  return updateWorkshop(id, { status });
}

// ─── Services for a workshop ──────────────────────────────────
export async function getWorkshopServices(workshopId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('workshop_id', workshopId)
    .eq('is_available', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createService(payload: Partial<Service>): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateService(id: string, updates: Partial<Service>): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

// ─── Haversine distance helper ────────────────────────────────
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
