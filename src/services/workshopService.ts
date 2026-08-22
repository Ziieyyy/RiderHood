import { supabase } from '../lib/supabase';
import type { Workshop, Service } from '../types/database';

export interface WorkshopFilters {
  search?: string;
  latitude?: number;
  longitude?: number;
  isOpenNow?: boolean;
  serviceCategory?: string;
  partnerOnly?: boolean;
  district?: string;
  sortByRating?: boolean;
}

/**
 * Universal helper to determine if a workshop is authorized for online service bookings.
 * Wan Legacy Motor = true, All directory-only workshops = false.
 */
export function canBookWorkshop(workshop?: Partial<Workshop> | null): boolean {
  if (!workshop) return false;
  return Boolean(workshop.booking_enabled ?? (workshop as any).online_booking_enabled ?? false);
}

// ─── Get approved, active workshops (customer-facing) ─────────
export async function getWorkshops(filters: WorkshopFilters = {}): Promise<Workshop[]> {
  let query = supabase
    .from('workshops')
    .select('*')
    .eq('verification_status', 'approved')
    .eq('status', 'active')
    .order('is_partner', { ascending: false })
    .order('rating', { ascending: false });

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,district.ilike.%${filters.search}%`);
  }
  if (filters.isOpenNow) {
    query = query.eq('is_open', true);
  }
  if (filters.partnerOnly) {
    query = query.eq('booking_enabled', true);
  }
  if (filters.district) {
    query = query.ilike('district', `%${filters.district}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  let result = data ?? [];

  // Always pin Partner workshops (Wan Legacy Motor) to top, followed by highest rating
  result.sort((a, b) => {
    if (a.is_partner && !b.is_partner) return -1;
    if (!a.is_partner && b.is_partner) return 1;
    return Number(b.rating || 0) - Number(a.rating || 0);
  });

  // Client-side distance sort when GPS coordinates provided
  if (filters.latitude && filters.longitude) {
    result = result
      .filter((w) => w.latitude !== null && w.longitude !== null)
      .sort((a, b) => {
        if (a.is_partner && !b.is_partner) return -1;
        if (!a.is_partner && b.is_partner) return 1;
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

// ─── Get workshop for admin (owner or dev fallback) ───────────
export async function getMyWorkshop(ownerId: string): Promise<Workshop | null> {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching workshop for owner:', error);
    return null;
  }
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

export async function updateWorkshopStatus(id: string, isOpen: boolean) {
  return updateWorkshop(id, { is_open: isOpen });
}

// ─── Services for a workshop ──────────────────────────────────
export async function getWorkshopServices(
  workshopId?: string,
  options?: { onlyAvailable?: boolean }
): Promise<Service[]> {
  try {
    // 1. Query dedicated public.services table
    let query = supabase.from('services').select('*');
    if (options?.onlyAvailable ?? true) {
      query = query.eq('is_available', true);
    }
    if (workshopId) {
      query = query.eq('workshop_id', workshopId);
    }
    const { data, error } = await query.order('name');
    if (!error && data && data.length > 0) {
      return data;
    }

    // 2. Dual-source fallback: Query workshop_products and format service packages
    let wpQuery = supabase
      .from('workshop_products')
      .select(`
        *,
        product:products(
          id,
          name,
          specification,
          sku,
          description,
          category:product_categories(id, name)
        )
      `)
      .order('price', { ascending: false });

    if (options?.onlyAvailable ?? true) {
      wpQuery = wpQuery.eq('is_available', true);
    }
    if (workshopId) {
      wpQuery = wpQuery.eq('workshop_id', workshopId);
    }

    const { data: wpData, error: wpErr } = await wpQuery;
    if (!wpErr && wpData && wpData.length > 0) {
      return wpData.map((wp: any) => {
        const catName = wp.product?.category?.name || 'General Service';
        let duration = 30;
        if (catName.includes('Full Service')) duration = 60;
        else if (catName.includes('CVT')) duration = 45;
        else if (catName.includes('Throttle Body')) duration = 40;
        else if (catName.includes('Chain')) duration = 35;
        else if (catName.includes('Tayar')) duration = 25;

        return {
          id: wp.id,
          workshop_id: wp.workshop_id,
          name: wp.product?.name || 'Service Package',
          description: wp.product?.specification
            ? `Specification: ${wp.product.specification} • Genuine Workshop Service`
            : (wp.product?.description || 'Motorcycle diagnostic and maintenance service'),
          category: catName,
          price: Number(wp.price ?? 0),
          estimated_duration_minutes: duration,
          is_available: Boolean(wp.is_available ?? true),
          created_at: wp.created_at,
          updated_at: wp.updated_at,
        };
      });
    }

    return [];
  } catch (err) {
    console.error('Failed to query services:', err);
    return [];
  }
}

export async function createService(payload: Partial<Service>): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert({ ...payload, is_available: true })
    .select()
    .single();
  if (error) {
    console.error('Failed to create service package in Supabase:', error);
    throw error;
  }
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
