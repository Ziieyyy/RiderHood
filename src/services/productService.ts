import { supabase } from '../lib/supabase';
import type {
  ProductCategory,
  Product,
  WorkshopProduct,
  InventoryTransaction,
  InventoryTransactionType,
  ServiceProduct,
  StockStatus,
} from '../types/database';

/**
 * Computes live stock status based on stock quantity and minimum stock threshold.
 */
export function computeStockStatus(stockQty = 0, minStock = 3): StockStatus {
  if (stockQty <= 0) return 'OUT_OF_STOCK';
  if (stockQty <= minStock) return 'LOW_STOCK';
  return 'IN_STOCK';
}

// ─── 1. PRODUCT CATEGORIES ────────────────────────────────────

export async function getProductCategories(onlyActive = true): Promise<ProductCategory[]> {
  let query = supabase.from('product_categories').select('*').order('name');
  if (onlyActive) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching product categories:', error);
    return [];
  }
  return data ?? [];
}

export async function createProductCategory(payload: {
  name: string;
  description?: string;
}): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from('product_categories')
    .insert({
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProductCategory(
  id: string,
  updates: Partial<ProductCategory>
): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from('product_categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProductCategory(id: string): Promise<void> {
  // Soft delete category to preserve historical references
  const { error } = await supabase
    .from('product_categories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ─── 2. MASTER PRODUCT CATALOGUE ──────────────────────────────

export async function getProducts(options?: {
  categoryId?: string;
  searchQuery?: string;
  onlyActive?: boolean;
}): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*, category:product_categories(*)')
    .order('name');

  if (options?.onlyActive ?? true) {
    query = query.eq('is_active', true);
  }
  if (options?.categoryId && options.categoryId !== 'All') {
    query = query.eq('category_id', options.categoryId);
  }
  if (options?.searchQuery) {
    query = query.or(`name.ilike.%${options.searchQuery}%,specification.ilike.%${options.searchQuery}%,sku.ilike.%${options.searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data ?? [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:product_categories(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createProduct(payload: {
  category_id: string;
  name: string;
  specification?: string;
  sku: string;
  description?: string;
  unit?: string;
}): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      category_id: payload.category_id,
      name: payload.name.trim(),
      specification: payload.specification?.trim() || null,
      sku: payload.sku.trim().toUpperCase(),
      description: payload.description?.trim() || null,
      unit: payload.unit?.trim() || 'pcs',
      is_active: true,
    })
    .select('*, category:product_categories(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:product_categories(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  // Soft delete product to protect historical invoices, bookings & audit trails
  const { error } = await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ─── 3. WORKSHOP PRODUCTS (PRICES & STOCK) ─────────────────────

export async function getWorkshopProducts(
  workshopId?: string,
  options?: {
    categoryId?: string;
    searchQuery?: string;
    onlyAvailable?: boolean;
    stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  }
): Promise<WorkshopProduct[]> {
  let query = supabase
    .from('workshop_products')
    .select(`
      *,
      product:products(
        *,
        category:product_categories(*)
      ),
      workshop:workshops(id, name, district, state, phone, rating, is_partner, booking_enabled)
    `)
    .order('created_at', { ascending: false });

  if (workshopId) {
    query = query.eq('workshop_id', workshopId);
  }
  if (options?.onlyAvailable ?? false) {
    query = query.eq('is_available', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching workshop products:', error);
    return [];
  }

  let results: WorkshopProduct[] = (data ?? []).map((wp) => ({
    ...wp,
    price: Number(wp.price ?? 0),
    stock_quantity: Number(wp.stock_quantity ?? 0),
    minimum_stock: Number(wp.minimum_stock ?? 3),
    is_available: Boolean(wp.is_available ?? true),
    stock_status: computeStockStatus(wp.stock_quantity ?? 0, wp.minimum_stock ?? 3),
  }));

  // Filter in-memory for joined category & search if needed
  if (options?.categoryId && options.categoryId !== 'All') {
    results = results.filter((r) => r.product?.category_id === options.categoryId || r.product?.category?.name === options.categoryId);
  }

  if (options?.searchQuery) {
    const q = options.searchQuery.toLowerCase();
    results = results.filter((r) => {
      const nameMatch = r.product?.name?.toLowerCase().includes(q);
      const specMatch = r.product?.specification?.toLowerCase().includes(q);
      const skuMatch = r.product?.sku?.toLowerCase().includes(q);
      const catMatch = r.product?.category?.name?.toLowerCase().includes(q);
      return nameMatch || specMatch || skuMatch || catMatch;
    });
  }

  if (options?.stockStatus && options.stockStatus !== 'all') {
    results = results.filter((r) => {
      if (options.stockStatus === 'in_stock') return r.stock_status === 'IN_STOCK';
      if (options.stockStatus === 'low_stock') return r.stock_status === 'LOW_STOCK';
      if (options.stockStatus === 'out_of_stock') return r.stock_status === 'OUT_OF_STOCK';
      return true;
    });
  }

  return results;
}

export async function getWorkshopProductById(id: string): Promise<WorkshopProduct | null> {
  const { data, error } = await supabase
    .from('workshop_products')
    .select(`
      *,
      product:products(
        *,
        category:product_categories(*)
      ),
      workshop:workshops(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return {
    ...data,
    price: Number(data.price ?? 0),
    stock_quantity: Number(data.stock_quantity ?? 0),
    minimum_stock: Number(data.minimum_stock ?? 3),
    is_available: Boolean(data.is_available ?? true),
    stock_status: computeStockStatus(data.stock_quantity ?? 0, data.minimum_stock ?? 3),
  };
}

export async function updateWorkshopProductPrice(
  workshopProductId: string,
  price: number
): Promise<WorkshopProduct> {
  if (price < 0) {
    throw new Error('Price cannot be negative.');
  }

  const { data, error } = await supabase
    .from('workshop_products')
    .update({ price, updated_at: new Date().toISOString() })
    .eq('id', workshopProductId)
    .select(`
      *,
      product:products(
        *,
        category:product_categories(*)
      )
    `)
    .single();

  if (error) throw error;
  return {
    ...data,
    price: Number(data.price ?? 0),
    stock_status: computeStockStatus(data.stock_quantity ?? 0, data.minimum_stock ?? 3),
  };
}

export async function updateWorkshopProductAvailability(
  workshopProductId: string,
  isAvailable: boolean
): Promise<WorkshopProduct> {
  const { data, error } = await supabase
    .from('workshop_products')
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq('id', workshopProductId)
    .select(`
      *,
      product:products(
        *,
        category:product_categories(*)
      )
    `)
    .single();

  if (error) throw error;
  return {
    ...data,
    stock_status: computeStockStatus(data.stock_quantity ?? 0, data.minimum_stock ?? 3),
  };
}

// ─── 4. INVENTORY STOCK ADJUSTMENT & TRANSACTIONS ──────────────

export interface AdjustStockParams {
  workshopProductId: string;
  action: 'add' | 'remove' | 'set';
  quantity: number;
  reason?: string;
  userId?: string;
  transactionType?: InventoryTransactionType;
}

export async function adjustWorkshopInventory(
  params: AdjustStockParams
): Promise<WorkshopProduct> {
  const { workshopProductId, action, quantity, reason, userId, transactionType } = params;

  // 1. Fetch current workshop product record
  const { data: current, error: fetchErr } = await supabase
    .from('workshop_products')
    .select('*')
    .eq('id', workshopProductId)
    .single();

  if (fetchErr || !current) {
    throw new Error('Workshop product not found.');
  }

  const prevQty = Number(current.stock_quantity ?? 0);
  let newQty = prevQty;
  let qtyChange = 0;

  if (action === 'add') {
    qtyChange = Math.abs(quantity);
    newQty = prevQty + qtyChange;
  } else if (action === 'remove') {
    qtyChange = -Math.abs(quantity);
    newQty = Math.max(0, prevQty - Math.abs(quantity));
  } else if (action === 'set') {
    newQty = Math.max(0, quantity);
    qtyChange = newQty - prevQty;
  }

  // 2. Update stock quantity in workshop_products
  const { data: updated, error: updateErr } = await supabase
    .from('workshop_products')
    .update({
      stock_quantity: newQty,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workshopProductId)
    .select(`
      *,
      product:products(
        *,
        category:product_categories(*)
      )
    `)
    .single();

  if (updateErr || !updated) {
    throw updateErr || new Error('Failed to update stock quantity.');
  }

  // 3. Log audit entry in inventory_transactions
  try {
    const finalType: InventoryTransactionType = transactionType || action;
    await supabase.from('inventory_transactions').insert({
      workshop_id: current.workshop_id,
      product_id: current.product_id,
      quantity_change: qtyChange,
      transaction_type: finalType,
      previous_quantity: prevQty,
      new_quantity: newQty,
      reason: reason?.trim() || `Manual stock ${action}`,
      created_by: userId || null,
    });
  } catch (logErr) {
    console.warn('Inventory transaction log warning (non-fatal):', logErr);
  }

  return {
    ...updated,
    price: Number(updated.price ?? 0),
    stock_quantity: newQty,
    stock_status: computeStockStatus(newQty, updated.minimum_stock ?? 3),
  };
}

export async function getInventoryHistory(options?: {
  workshopId?: string;
  productId?: string;
}): Promise<InventoryTransaction[]> {
  let query = supabase
    .from('inventory_transactions')
    .select(`
      *,
      product:products(id, name, specification, sku, unit),
      workshop:workshops(id, name),
      user_profile:profiles(id, full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (options?.workshopId) {
    query = query.eq('workshop_id', options.workshopId);
  }
  if (options?.productId) {
    query = query.eq('product_id', options.productId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching inventory transactions:', error);
    return [];
  }
  return data ?? [];
}

// ─── 5. SERVICE PRODUCTS (PACKAGE INTEGRATION) ────────────────

export async function getServiceProducts(serviceId: string): Promise<ServiceProduct[]> {
  const { data, error } = await supabase
    .from('service_products')
    .select('*, product:products(*, category:product_categories(*))')
    .eq('service_id', serviceId);

  if (error) {
    console.error('Error fetching service products:', error);
    return [];
  }
  return data ?? [];
}

export async function linkServiceProduct(
  serviceId: string,
  productId: string,
  quantity = 1
): Promise<ServiceProduct> {
  const { data, error } = await supabase
    .from('service_products')
    .insert({
      service_id: serviceId,
      product_id: productId,
      quantity,
    })
    .select('*, product:products(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function unlinkServiceProduct(serviceId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from('service_products')
    .delete()
    .eq('service_id', serviceId)
    .eq('product_id', productId);

  if (error) throw error;
}
