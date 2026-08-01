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
  expiry_date?: string;
}): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert(payload)
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
