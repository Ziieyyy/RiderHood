import { supabase } from '../lib/supabase';
import type { Document, DocumentType } from '../types/database';

// ─── Get documents for a customer ─────────────────────────────
export async function getCustomerDocuments(customerId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Get documents for a motorcycle ───────────────────────────
export async function getMotorcycleDocuments(motorcycleId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('motorcycle_id', motorcycleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Create document record ──────────────────────────────────
export async function createDocument(payload: {
  customer_id: string;
  motorcycle_id?: string;
  title: string;
  type: DocumentType;
  file_path: string;
  file_url?: string;
  expiry_date?: string | null;
}): Promise<Document> {
  const sanitizedExpiryDate = payload.expiry_date && payload.expiry_date.trim() ? payload.expiry_date.trim() : null;
  const { data, error } = await supabase
    .from('documents')
    .insert({
      ...payload,
      expiry_date: sanitizedExpiryDate,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Update document record ──────────────────────────────────
export async function updateDocument(
  id: string,
  updates: Partial<{
    title: string;
    type: DocumentType;
    motorcycle_id: string | null;
    expiry_date: string | null;
    file_path: string;
    file_url: string;
  }>
): Promise<Document> {
  const sanitizedExpiryDate = updates.expiry_date && updates.expiry_date.trim() ? updates.expiry_date.trim() : null;
  const { data, error } = await supabase
    .from('documents')
    .update({
      ...updates,
      expiry_date: sanitizedExpiryDate,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Delete document ──────────────────────────────────────────
export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Upload file to Supabase Storage ──────────────────────────
export async function uploadDocument(
  bucket: string,
  path: string,
  file: Blob | ArrayBuffer,
  contentType: string,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ─── Delete file from Supabase Storage ────────────────────────
export async function deleteStorageFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

// ─── Calculate Dynamic Document Expiry Status ────────────────
export function getDocumentExpiryStatus(expiryDate?: string | null): {
  status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';
  label: string;
  daysRemaining: number | null;
} {
  if (!expiryDate || !expiryDate.trim()) {
    return { status: 'no_expiry', label: 'NO EXPIRY', daysRemaining: null };
  }

  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', label: 'EXPIRED', daysRemaining: diffDays };
  } else if (diffDays <= 30) {
    return { status: 'expiring_soon', label: `EXPIRING IN ${diffDays} DAYS`, daysRemaining: diffDays };
  } else {
    return { status: 'valid', label: 'VALID', daysRemaining: diffDays };
  }
}
