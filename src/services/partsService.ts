import { supabase } from '../lib/supabase';
import type { Part, WorkshopProduct } from '../types/database';
import {
  getWorkshopProducts,
  adjustWorkshopInventory,
  getInventoryHistory,
  computeStockStatus,
} from './productService';

export type { InventoryTransaction } from '../types/database';
export * from './productService';

/**
 * Fetches workshop parts/products mapped to the unified Part interface.
 * Reads from normalized workshop_products and products tables.
 */
export async function getWorkshopParts(
  workshopId?: string,
  options?: { onlyAvailable?: boolean; categoryId?: string; searchQuery?: string }
): Promise<Part[]> {
  try {
    // 1. Fetch from normalized workshop_products
    const workshopProducts = await getWorkshopProducts(workshopId, {
      onlyAvailable: options?.onlyAvailable,
      categoryId: options?.categoryId,
      searchQuery: options?.searchQuery,
    });

    if (workshopProducts.length > 0) {
      return workshopProducts.map((wp: WorkshopProduct) => ({
        id: wp.id,
        workshop_id: wp.workshop_id,
        product_id: wp.product_id,
        name: wp.product?.name || 'Product',
        brand: wp.product?.category?.name || 'Spare Part',
        sku: wp.product?.sku || null,
        category: wp.product?.category?.name || null,
        category_id: wp.product?.category_id || null,
        specification: wp.product?.specification || null,
        description: wp.product?.description || null,
        price: Number(wp.price ?? 0),
        stock_quantity: Number(wp.stock_quantity ?? 0),
        minimum_stock: Number(wp.minimum_stock ?? 3),
        unit: wp.product?.unit || 'pcs',
        compatibility: null,
        image_url: null,
        is_available: Boolean(wp.is_available ?? true),
        created_at: wp.created_at,
        updated_at: wp.updated_at,
        stock_status: computeStockStatus(wp.stock_quantity ?? 0, wp.minimum_stock ?? 3),
        workshop: wp.workshop,
        product: wp.product,
      }));
    }

    // 2. Fallback to legacy parts table if workshop_products has not been seeded yet
    let query = supabase.from('parts').select('*, workshop:workshops(*)');
    if (options?.onlyAvailable ?? false) {
      query = query.or('is_available.eq.true,is_available.is.null');
    }
    if (workshopId) {
      query = query.eq('workshop_id', workshopId);
    }
    const { data, error } = await query.order('name');
    if (error) {
      return [];
    }
    return (data ?? []).map((p) => ({
      ...p,
      price: Number(p.price ?? p.unit_price ?? 0),
      stock_quantity: Number(p.stock_quantity ?? 0),
      is_available: Boolean(p.is_available ?? true),
      stock_status: computeStockStatus(p.stock_quantity ?? 0, p.minimum_stock ?? 3),
    }));
  } catch (err) {
    console.error('Error in getWorkshopParts:', err);
    return [];
  }
}

/**
 * Creates a new part / workshop product.
 */
export async function createPart(payload: Partial<Part>): Promise<Part> {
  const { data, error } = await supabase
    .from('parts')
    .insert({ ...payload, is_available: true })
    .select()
    .single();
  if (error) throw error;
  return { ...data, stock_status: computeStockStatus(data.stock_quantity ?? 0, data.minimum_stock ?? 3) };
}

/**
 * Updates a workshop part / product.
 */
export async function updatePart(id: string, updates: Partial<Part>): Promise<Part> {
  if (updates.stock_quantity !== undefined && updates.stock_quantity < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }

  // Attempt update in workshop_products first
  const { data: wpData } = await supabase
    .from('workshop_products')
    .update({
      price: updates.price,
      stock_quantity: updates.stock_quantity,
      is_available: updates.is_available,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, product:products(*, category:product_categories(*))')
    .single();

  if (wpData) {
    return {
      id: wpData.id,
      workshop_id: wpData.workshop_id,
      product_id: wpData.product_id,
      name: wpData.product?.name || 'Product',
      brand: wpData.product?.category?.name || 'Spare Part',
      sku: wpData.product?.sku || null,
      category: wpData.product?.category?.name || null,
      specification: wpData.product?.specification || null,
      description: wpData.product?.description || null,
      price: Number(wpData.price ?? 0),
      stock_quantity: Number(wpData.stock_quantity ?? 0),
      minimum_stock: Number(wpData.minimum_stock ?? 3),
      unit: wpData.product?.unit || 'pcs',
      compatibility: null,
      image_url: null,
      is_available: Boolean(wpData.is_available ?? true),
      created_at: wpData.created_at,
      updated_at: wpData.updated_at,
      stock_status: computeStockStatus(wpData.stock_quantity ?? 0, wpData.minimum_stock ?? 3),
    };
  }

  // Fallback update legacy parts table
  const { data, error } = await supabase
    .from('parts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return { ...data, stock_status: computeStockStatus(data.stock_quantity ?? 0, data.minimum_stock ?? 3) };
}

/**
 * Updates stock quantity and records an inventory audit transaction.
 */
export async function updateStockQuantity(
  partOrId: Part | string,
  action: 'add' | 'remove' | 'set',
  quantity: number,
  reason?: string,
  userId?: string
): Promise<Part> {
  const partId = typeof partOrId === 'string' ? partOrId : partOrId.id;

  try {
    const updatedWp = await adjustWorkshopInventory({
      workshopProductId: partId,
      action,
      quantity,
      reason,
      userId,
    });

    return {
      id: updatedWp.id,
      workshop_id: updatedWp.workshop_id,
      product_id: updatedWp.product_id,
      name: updatedWp.product?.name || 'Product',
      brand: updatedWp.product?.category?.name || 'Spare Part',
      sku: updatedWp.product?.sku || null,
      category: updatedWp.product?.category?.name || null,
      specification: updatedWp.product?.specification || null,
      description: updatedWp.product?.description || null,
      price: Number(updatedWp.price ?? 0),
      stock_quantity: Number(updatedWp.stock_quantity ?? 0),
      minimum_stock: Number(updatedWp.minimum_stock ?? 3),
      unit: updatedWp.product?.unit || 'pcs',
      compatibility: null,
      image_url: null,
      is_available: Boolean(updatedWp.is_available ?? true),
      created_at: updatedWp.created_at,
      updated_at: updatedWp.updated_at,
      stock_status: computeStockStatus(updatedWp.stock_quantity ?? 0, updatedWp.minimum_stock ?? 3),
    };
  } catch {
    // Fallback to legacy parts table
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
    if (action === 'add') newQty = prevQty + quantity;
    else if (action === 'remove') newQty = Math.max(0, prevQty - quantity);
    else if (action === 'set') newQty = Math.max(0, quantity);

    const updated = await updatePart(part.id, { stock_quantity: newQty });

    try {
      await supabase.from('inventory_transactions').insert({
        part_id: part.id,
        workshop_id: part.workshop_id,
        type: action,
        transaction_type: action,
        quantity: Math.abs(quantity),
        quantity_change: newQty - prevQty,
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
}

/**
 * Fetches inventory audit transactions.
 */
export async function getInventoryTransactions(partIdOrWorkshopId: string) {
  const history = await getInventoryHistory({
    workshopId: partIdOrWorkshopId,
  });
  if (history.length > 0) {
    return history.map((t) => ({
      id: t.id,
      part_id: t.product_id || t.part_id || '',
      workshop_id: t.workshop_id,
      type: (t.transaction_type || t.type || 'adjustment') as any,
      quantity: Math.abs(t.quantity_change ?? t.quantity ?? 0),
      previous_quantity: t.previous_quantity,
      new_quantity: t.new_quantity,
      reason: t.reason || undefined,
      created_by: t.created_by || undefined,
      created_at: t.created_at,
      product: t.product,
    }));
  }

  const { data } = await supabase
    .from('inventory_transactions')
    .select('*')
    .or(`part_id.eq.${partIdOrWorkshopId},workshop_id.eq.${partIdOrWorkshopId}`)
    .order('created_at', { ascending: false });

  return data ?? [];
}

/**
 * Soft deletes / disables a part.
 */
export async function deletePart(id: string): Promise<void> {
  // Update workshop_products if present
  await supabase
    .from('workshop_products')
    .update({ is_available: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  // Update legacy parts table if present
  await supabase
    .from('parts')
    .update({ is_available: false, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export const softDeletePart = deletePart;
