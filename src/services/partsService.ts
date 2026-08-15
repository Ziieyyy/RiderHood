import { supabase } from '../lib/supabase';
import type { Part } from '../types/database';

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryTransaction {
  id: string;
  part_id: string;
  workshop_id: string;
  type: 'add' | 'remove' | 'set' | 'service_used';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  created_by?: string;
  created_at: string;
}

function computeStockStatus(p: Part): StockStatus {
  const qty = p.stock_quantity ?? 0;
  const minStock = p.minimum_stock ?? 0;
  if (qty === 0) return 'OUT_OF_STOCK';
  if (qty <= minStock) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export async function getWorkshopParts(
  workshopId?: string,
  options?: { onlyAvailable?: boolean }
): Promise<Part[]> {
  let query = supabase.from('parts').select('*');
  if (options?.onlyAvailable ?? true) {
    query = query.or('is_available.eq.true,is_available.is.null');
  }
  if (workshopId) {
    query = query.eq('workshop_id', workshopId);
  }
  const { data, error } = await query.order('name');
  if (error) {
    console.error('Error fetching workshop parts:', error);
    return [];
  }
  return (data ?? []).map((p) => ({
    ...p,
    price: Number(p.price ?? p.unit_price ?? 0),
    stock_quantity: p.stock_quantity ?? 0,
    is_available: p.is_available ?? true,
    stock_status: computeStockStatus(p),
  }));
}

export async function createPart(payload: Partial<Part>): Promise<Part> {
  const { data, error } = await supabase
    .from('parts')
    .insert({ ...payload, is_available: true })
    .select()
    .single();
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
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return { ...data, stock_status: computeStockStatus(data) };
}

export async function updateStockQuantity(
  partOrId: Part | string,
  action: 'add' | 'remove' | 'set',
  quantity: number,
  reason?: string,
  userId?: string
): Promise<Part> {
  let part: Part;
  if (typeof partOrId === 'string') {
    const { data, error } = await supabase.from('parts').select('*').eq('id', partOrId).single();
    if (error || !data) throw new Error('Part not found');
    part = data as Part;
  } else {
    part = partOrId;
  }

  const prevQty = part.stock_quantity;
  let newQty = prevQty;

  if (action === 'add') {
    newQty = prevQty + quantity;
  } else if (action === 'remove') {
    newQty = Math.max(0, prevQty - quantity);
  } else if (action === 'set') {
    newQty = Math.max(0, quantity);
  }

  // Update part stock
  const updated = await updatePart(part.id, { stock_quantity: newQty });

  // Log inventory transaction
  try {
    await supabase.from('inventory_transactions').insert({
      part_id: part.id,
      workshop_id: part.workshop_id,
      type: action,
      quantity: Math.abs(quantity),
      previous_quantity: prevQty,
      new_quantity: newQty,
      reason: reason ?? null,
      created_by: userId ?? null,
    });
  } catch (err) {
    console.warn('Failed to log inventory transaction:', err);
  }

  return updated;
}

export async function getInventoryTransactions(partIdOrWorkshopId: string): Promise<InventoryTransaction[]> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .or(`part_id.eq.${partIdOrWorkshopId},workshop_id.eq.${partIdOrWorkshopId}`)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function deletePart(id: string) {
  const { error } = await supabase
    .from('parts')
    .update({ is_available: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export const softDeletePart = deletePart;
