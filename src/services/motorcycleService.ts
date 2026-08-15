import { supabase } from '../lib/supabase';
import type { Motorcycle, UpdateMileagePayload } from '../types/database';

// ─── List all motorcycles for the current customer ───────────
export async function getMotorcycles(ownerId: string): Promise<Motorcycle[]> {
  const { data, error } = await supabase
    .from('motorcycles')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Get a single motorcycle ─────────────────────────────────
export async function getMotorcycle(id: string): Promise<Motorcycle | null> {
  const { data, error } = await supabase
    .from('motorcycles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

// ─── Create a motorcycle ──────────────────────────────────────
export async function createMotorcycle(payload: Partial<Motorcycle>): Promise<Motorcycle> {
  try {
    const nickname =
      payload.nickname?.trim() ||
      `${payload.brand ?? ''} ${payload.model ?? ''}`.trim() ||
      'My Motorcycle';

    const { data, error } = await supabase
      .from('motorcycles')
      .insert({
        ...payload,
        nickname,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Plate number "${payload.plate_number}" is already registered in your garage database.`);
      }
      if (error.code === '42501') {
        throw new Error('Permission denied. Please check your account session.');
      }
      throw new Error(error.message || 'Database error occurred while saving motorcycle.');
    }
    return data;
  } catch (err: any) {
    console.error('createMotorcycle error:', err);
    throw err;
  }
}

// ─── Update a motorcycle ──────────────────────────────────────
export async function updateMotorcycle(id: string, updates: Partial<Motorcycle>): Promise<Motorcycle> {
  const { data, error } = await supabase
    .from('motorcycles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Delete a motorcycle ──────────────────────────────────────
export async function deleteMotorcycle(id: string) {
  const { error } = await supabase
    .from('motorcycles')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Update mileage (validates no decrease) ───────────────────
export async function updateMileage({ motorcycle_id, new_mileage }: UpdateMileagePayload) {
  const current = await getMotorcycle(motorcycle_id);
  if (!current) throw new Error('Motorcycle not found');
  if (new_mileage < current.current_mileage) {
    throw new Error(`New mileage (${new_mileage} km) cannot be less than current mileage (${current.current_mileage} km).`);
  }

  // Log mileage change
  await supabase.from('mileage_logs').insert({
    motorcycle_id,
    previous_mileage: current.current_mileage,
    new_mileage,
    source: 'customer_update',
  });

  return updateMotorcycle(motorcycle_id, { current_mileage: new_mileage });
}
