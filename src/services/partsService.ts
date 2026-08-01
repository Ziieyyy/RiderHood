import { supabase } from '../lib/supabase';
import type { Part } from '../types/database';

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

function computeStockStatus(p: Part): StockStatus {
  if (p.stock_quantity === 0) return 'OUT_OF_STOCK';
  if (p.stock_quantity <= p.minimum_stock) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export async function getWorkshopParts(workshopId: string): Promise<Part[]> {
  const { data, error } = await supabase
    .from('parts').select('*').eq('workshop_id', workshopId).order('name');
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, stock_status: computeStockStatus(p) }));
}

export async function createPart(payload: Partial<Part>): Promise<Part> {
  const { data, error } = await supabase.from('parts').insert(payload).select().single();
  if (error) throw error;
  return { ...data, stock_status: computeStockStatus(data) };
}

export async function updatePart(id: string, updates: Partial<Part>): Promise<Part> {
  if (updates.stock_quantity !== undefined && updates.stock_quantity < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }
  const { data, error } = await supabase
    .from('parts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return { ...data, stock_status: computeStockStatus(data) };
}

export async function deletePart(id: string) {
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) throw error;
}
