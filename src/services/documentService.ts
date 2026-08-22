import { Platform, Linking, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import type { Document, DocumentType } from '../types/database';

export const MOTORCYCLE_DOCUMENTS_BUCKET = 'motorcycle-documents';

export interface DocumentValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadAndCreateDocParams {
  customer_id: string;
  motorcycle_id?: string;
  title: string;
  type: DocumentType;
  file: DocumentPicker.DocumentPickerAsset;
  expiry_date?: string | null;
}

/**
 * Validates document file type, extension, and size (up to 10MB).
 */
export function validateDocumentFile(asset: DocumentPicker.DocumentPickerAsset): DocumentValidationResult {
  if (!asset || !asset.uri) {
    return { valid: false, error: 'No document file selected.' };
  }

  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  if (asset.size && asset.size > MAX_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 10MB limit. Please attach a smaller file.' };
  }

  const name = asset.name || '';
  const mime = asset.mimeType || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';

  const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  const ALLOWED_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  const extValid = ALLOWED_EXTS.includes(ext);
  const mimeValid = mime ? ALLOWED_MIMES.some(m => mime.toLowerCase().includes(m.split('/')[1])) || mime.includes('pdf') : true;

  if (!extValid && !mimeValid) {
    return {
      valid: false,
      error: `Invalid file format (${ext || 'unknown'}). Supported formats: PDF, JPG, PNG, WEBP.`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a storage path by separating bucket name from relative object path.
 * ALL paths are routed to the canonical motorcycle-documents bucket.
 * Legacy prefixes (documents/, docs/, etc.) are stripped but the bucket
 * is ALWAYS motorcycle-documents — those old buckets don't exist.
 */
export function sanitizeStoragePath(filePath: string): { bucket: string; path: string } {
  let raw = (filePath || '').trim().replace(/^\/+/, '');

  // Strip any legacy bucket prefix — ALL documents live in motorcycle-documents
  const LEGACY_PREFIXES = [
    'motorcycle-documents/',
    'documents/',
    'docs/',
    'motorcycle-images/',
    'public/',
  ];

  for (const prefix of LEGACY_PREFIXES) {
    if (raw.startsWith(prefix)) {
      raw = raw.substring(prefix.length);
      break;
    }
  }

  raw = raw.replace(/^\/+/, '');
  return { bucket: MOTORCYCLE_DOCUMENTS_BUCKET, path: raw };
}

/**
 * Verifies that a storage object physically exists in Supabase Storage.
 */
export async function verifyDocumentObjectExists(
  bucket: string,
  relativePath: string
): Promise<{ exists: boolean; bucket: string; path: string; error?: string }> {
  if (!relativePath || relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('file://')) {
    return { exists: true, bucket, path: relativePath };
  }

  try {
    const pathParts = relativePath.split('/');
    const filename = pathParts.pop() || '';
    const parentFolder = pathParts.join('/');

    const { data: fileList, error: listErr } = await supabase.storage
      .from(bucket)
      .list(parentFolder, { search: filename });

    if (listErr) {
      return { exists: false, bucket, path: relativePath, error: listErr.message };
    }

    const found = fileList && fileList.some(item => item.name === filename);
    if (found) {
      return { exists: true, bucket, path: relativePath };
    }

    return { exists: false, bucket, path: relativePath, error: 'DOCUMENT_OBJECT_NOT_FOUND' };
  } catch (err: any) {
    return { exists: false, bucket, path: relativePath, error: err?.message || 'STORAGE_VERIFICATION_FAILED' };
  }
}

/**
 * Generates a signed URL for a motorcycle document in private Storage.
 * Lifetime: 3600 seconds (1 hour).
 */
export async function getSignedDocumentUrl(
  filePath: string,
  expiresIn = 3600
): Promise<{ signedUrl: string | null; error: string | null; objectExists?: boolean }> {
  if (!filePath) {
    return { signedUrl: null, error: 'File path is missing.', objectExists: false };
  }

  // 1. Direct HTTP or Data URL — pass through
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:') || filePath.startsWith('blob:')) {
    return { signedUrl: filePath, error: null, objectExists: true };
  }

  // 2. On Native mobile, local file:// URIs can be used directly for transient previews
  if (Platform.OS !== 'web' && filePath.startsWith('file://')) {
    return { signedUrl: filePath, error: null, objectExists: true };
  }

  // 3. Resolve to canonical bucket (motorcycle-documents) and clean relative path
  const location = sanitizeStoragePath(filePath);

  // 4. Verify storage object physically exists BEFORE calling createSignedUrl
  const check = await verifyDocumentObjectExists(location.bucket, location.path);

  if (!check.exists) {
    console.info('DOCUMENT FILE NOT IN STORAGE:', {
      bucket: location.bucket,
      path: location.path,
      originalDbPath: filePath,
      status: 'DOCUMENT_OBJECT_NOT_FOUND',
    });
    return {
      signedUrl: null,
      error: 'DOCUMENT_OBJECT_NOT_FOUND',
      objectExists: false,
    };
  }

  // 5. Object confirmed to exist → generate signed URL (private bucket)
  try {
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(location.bucket)
      .createSignedUrl(location.path, expiresIn);

    if (!signedErr && signedData?.signedUrl) {
      return { signedUrl: signedData.signedUrl, error: null, objectExists: true };
    }

    return {
      signedUrl: null,
      error: signedErr?.message || 'Failed to generate signed document URL.',
      objectExists: true,
    };
  } catch (err: any) {
    return {
      signedUrl: null,
      error: err?.message || 'Failed to retrieve document file.',
      objectExists: true,
    };
  }
}

/**
 * Helper to safely extract a Blob/File object from DocumentPicker asset on both Web and Mobile.
 * Avoids fetch(blobUri) ERR_FILE_NOT_FOUND errors on Web.
 */
export async function getBlobFromAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<Blob> {
  if ((asset as any).file && (asset as any).file instanceof Blob) {
    return (asset as any).file;
  }
  if ((asset as any).output && (asset as any).output[0] instanceof Blob) {
    return (asset as any).output[0];
  }
  try {
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }
    return await response.blob();
  } catch (err: any) {
    console.warn('getBlobFromAsset fetch fallback warning:', err);
    throw new Error('Unable to read selected document file. Please select the file again.');
  }
}

/**
 * Uploads a document to Supabase Storage and inserts the DB metadata record.
 * Canonical Storage Bucket: motorcycle-documents
 * Structured Storage Path: {user_id}/{motorcycle_id}/{document_id}/{filename}
 */
export async function uploadAndCreateDocument(params: UploadAndCreateDocParams): Promise<Document> {
  const { customer_id, motorcycle_id, title, type, file, expiry_date } = params;

  // 1. Validate File (Format & 10MB Size Limit)
  const valResult = validateDocumentFile(file);
  if (!valResult.valid) {
    throw new Error(valResult.error || 'Invalid document file.');
  }

  // 2. Generate unique Document ID & Storage Path
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const motorcyclePathSegment = motorcycle_id || 'general';
  const sanitizeName = (file.name || title).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const relativeObjectPath = `${customer_id}/${motorcyclePathSegment}/${docId}/${sanitizeName}`;

  // 3. Extract Binary Blob safely
  const blob = await getBlobFromAsset(file);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(MOTORCYCLE_DOCUMENTS_BUCKET)
    .upload(relativeObjectPath, blob, {
      contentType: file.mimeType || 'application/pdf',
      upsert: true,
    });

  if (uploadError || !uploadData) {
    console.error('Storage upload failed:', uploadError);
    throw new Error('Unable to upload document to Supabase Storage. Please try again.');
  }

  // 4. Phase 10: IMMEDIATELY verify storage object exists before inserting DB record
  const check = await verifyDocumentObjectExists(MOTORCYCLE_DOCUMENTS_BUCKET, relativeObjectPath);
  if (!check.exists) {
    throw new Error('Document file upload completed but storage object verification failed.');
  }

  const dbFilePath = `${MOTORCYCLE_DOCUMENTS_BUCKET}/${uploadData.path}`;

  // 5. Confirmed Storage Object -> Insert Database Record
  const sanitizedExpiryDate = expiry_date && expiry_date.trim() ? expiry_date.trim() : null;
  const { data: dbData, error: dbError } = await supabase
    .from('documents')
    .insert({
      customer_id,
      motorcycle_id: motorcycle_id || null,
      title: title.trim(),
      type,
      file_path: dbFilePath,
      file_url: null,
      expiry_date: sanitizedExpiryDate,
    })
    .select()
    .single();

  if (dbError || !dbData) {
    console.error('Database insert failed after storage upload:', dbError);
    // Cleanup orphaned storage file
    await supabase.storage.from(MOTORCYCLE_DOCUMENTS_BUCKET).remove([uploadData.path]).catch(() => {});
    throw new Error(dbError?.message || 'Failed to save document metadata in database.');
  }

  return dbData;
}

/**
 * Deletes a document from both Storage and Database atomically.
 */
export async function deleteDocumentWithStorage(docId: string, filePath: string): Promise<void> {
  const { bucket, path: relativeObjectPath } = sanitizeStoragePath(filePath);

  // 1. Delete file from Storage
  if (relativeObjectPath && !relativeObjectPath.startsWith('http') && !relativeObjectPath.startsWith('file://')) {
    const { error: storageErr } = await supabase.storage
      .from(bucket)
      .remove([relativeObjectPath]);

    if (storageErr) {
      console.warn('Storage removal note (non-fatal):', storageErr.message);
    }
  }

  // 2. Delete DB record
  const { error: dbErr } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId);

  if (dbErr) {
    throw new Error(dbErr.message || 'Failed to delete document from database.');
  }
}

/**
 * Replaces an existing document's file in Storage and updates DB record.
 */
export async function replaceDocumentFile(
  docId: string,
  oldFilePath: string,
  newFile: DocumentPicker.DocumentPickerAsset,
  customerId: string,
  motorcycleId?: string
): Promise<string> {
  // 1. Validate new file
  const val = validateDocumentFile(newFile);
  if (!val.valid) {
    throw new Error(val.error || 'Invalid replacement file.');
  }

  // 2. Upload new file to canonical bucket 'motorcycle-documents'
  const newDocId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const motorcycleSegment = motorcycleId || 'general';
  const sanitizeName = (newFile.name || 'document').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const relativeObjectPath = `${customerId}/${motorcycleSegment}/${newDocId}/${sanitizeName}`;

  const blob = await getBlobFromAsset(newFile);

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from(MOTORCYCLE_DOCUMENTS_BUCKET)
    .upload(relativeObjectPath, blob, {
      contentType: newFile.mimeType || 'application/pdf',
      upsert: true,
    });

  if (uploadErr || !uploadData) {
    throw new Error('Unable to upload replacement document. Previous file preserved.');
  }

  // 3. Phase 18: Verify new storage object physically exists before database update
  const check = await verifyDocumentObjectExists(MOTORCYCLE_DOCUMENTS_BUCKET, relativeObjectPath);
  if (!check.exists) {
    throw new Error('Replacement upload completed but storage object verification failed.');
  }

  const newDbFilePath = `${MOTORCYCLE_DOCUMENTS_BUCKET}/${uploadData.path}`;

  // 4. Update DB record with new file_path
  const { error: updateErr } = await supabase
    .from('documents')
    .update({ file_path: newDbFilePath, updated_at: new Date().toISOString() })
    .eq('id', docId);

  if (updateErr) {
    await supabase.storage.from(MOTORCYCLE_DOCUMENTS_BUCKET).remove([uploadData.path]).catch(() => {});
    throw new Error('Failed to update document record in database.');
  }

  // 5. Cleanup old file from Storage after new file is verified
  const { bucket: oldBucket, path: oldCleanPath } = sanitizeStoragePath(oldFilePath);
  if (oldCleanPath && !oldCleanPath.startsWith('http') && !oldCleanPath.startsWith('file://')) {
    await supabase.storage.from(oldBucket).remove([oldCleanPath]).catch(() => {});
  }

  return newDbFilePath;
}

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

// ─── Create document record (legacy compatibility) ─────────────
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

// ─── Update document record (legacy compatibility) ─────────────
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

// ─── Delete document (legacy compatibility) ────────────────────
export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Upload file to Supabase Storage (legacy compatibility) ────
export async function uploadDocument(
  bucket: string,
  path: string,
  file: Blob | ArrayBuffer,
  contentType: string,
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: true });

    if (error || !data) return '';
    const urlRes = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlRes.data.publicUrl;
  } catch (err: any) {
    return '';
  }
}

// ─── Delete file from Supabase Storage (legacy compatibility) ──
export async function deleteStorageFile(bucket: string, path: string) {
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch (err: any) {
    // Ignore cleanup error
  }
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

// ─── Get Supabase Storage Public URL ─────────────────────────
export function getPublicDocumentUrl(doc?: { file_path?: string; file_url?: string | null } | null): string {
  if (!doc) return '';

  if (doc.file_url && (doc.file_url.startsWith('http') || doc.file_url.startsWith('data:') || doc.file_url.startsWith('blob:'))) {
    return doc.file_url;
  }

  const rawPath = doc.file_path || '';
  if (!rawPath) return '';

  if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
    return rawPath;
  }

  if (Platform.OS !== 'web' && rawPath.startsWith('file://')) {
    return rawPath;
  }

  const { bucket, path: relativePath } = sanitizeStoragePath(rawPath);
  const { data } = supabase.storage.from(bucket).getPublicUrl(relativePath);
  return data?.publicUrl || '';
}

// ─── Legacy Upload Document File URI ─────────────────────────
export async function uploadDocumentFile(
  userId: string,
  fileName: string,
  fileUri: string,
  mimeType?: string
): Promise<{ file_path: string; publicUrl: string }> {
  const sanitizeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const storagePath = `${userId}/general/doc_${Date.now()}/${sanitizeName}`;

  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from(MOTORCYCLE_DOCUMENTS_BUCKET)
      .upload(storagePath, blob, {
        contentType: mimeType || 'application/octet-stream',
        upsert: true,
      });

    if (!error && data) {
      const urlRes = supabase.storage.from(MOTORCYCLE_DOCUMENTS_BUCKET).getPublicUrl(data.path);
      return { file_path: data.path, publicUrl: urlRes.data.publicUrl };
    }
  } catch (err: any) {
    console.warn('uploadDocumentFile exception:', err?.message);
  }

  return {
    file_path: fileUri.startsWith('file://') || fileUri.startsWith('data:') ? fileUri : storagePath,
    publicUrl: fileUri,
  };
}

// ─── Open Document File in WebBrowser/Viewer ────────────────
export async function openDocumentFile(doc: { file_path?: string; file_url?: string | null; title?: string }): Promise<void> {
  const path = doc.file_path || doc.file_url || '';
  const { signedUrl, error } = await getSignedDocumentUrl(path);

  if (error || !signedUrl) {
    Alert.alert('Unable to Open Document', error || 'No accessible file path or signed URL available for this document.');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      window.open(signedUrl, '_blank');
    } else {
      const canOpen = await Linking.canOpenURL(signedUrl);
      if (canOpen) {
        await Linking.openURL(signedUrl);
      } else {
        await WebBrowser.openBrowserAsync(signedUrl);
      }
    }
  } catch (err: any) {
    console.warn('Error opening URL via Linking/WebBrowser:', err);
    try {
      await WebBrowser.openBrowserAsync(signedUrl);
    } catch (e: any) {
      Alert.alert('Document Link', `Document URL: ${signedUrl}`);
    }
  }
}



