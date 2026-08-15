import { supabase } from '../lib/supabase';
import type { MotorcyclePhoto } from '../types/database';
import { updateMotorcycle } from './motorcycleService';

// ─── Get all photos belonging strictly to motorcycle_id ────────
export async function getMotorcyclePhotos(motorcycleId: string): Promise<MotorcyclePhoto[]> {
  try {
    const { data, error } = await supabase
      .from('motorcycle_photos')
      .select('*')
      .eq('motorcycle_id', motorcycleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('motorcycle_photos query note:', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('getMotorcyclePhotos exception:', err);
    return [];
  }
}

// ─── Upload photo to Supabase Storage & insert DB record ──────
export async function uploadMotorcyclePhoto(
  ownerId: string,
  motorcycleId: string,
  photoUrl: string,
  filePath?: string,
  caption?: string,
  isMain: boolean = false
): Promise<MotorcyclePhoto> {
  // 1. Insert into motorcycle_photos database table
  const { data, error } = await supabase
    .from('motorcycle_photos')
    .insert({
      motorcycle_id: motorcycleId,
      owner_id: ownerId,
      photo_url: photoUrl,
      file_path: filePath || null,
      caption: caption || null,
      is_main: isMain,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to insert photo metadata into database.');
  }

  // 2. If main cover or first photo, update motorcycle cover photo_url
  if (isMain) {
    await updateMotorcycle(motorcycleId, { photo_url: photoUrl });
  }

  return data;
}

// ─── Delete photo record and storage object ────────────────────
export async function deleteMotorcyclePhoto(
  photoId: string,
  filePath?: string | null
): Promise<void> {
  // 1. Delete storage object if path exists
  if (filePath) {
    try {
      await supabase.storage.from('motorcycle-photos').remove([filePath]);
    } catch (storageErr) {
      console.warn('Storage cleanup warning:', storageErr);
    }
  }

  // 2. Delete database record
  const { error } = await supabase
    .from('motorcycle_photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    throw new Error(error.message || 'Failed to delete photo from database.');
  }
}

// ─── Set photo as main cover ──────────────────────────────────
export async function setMainMotorcyclePhoto(
  motorcycleId: string,
  photoId: string,
  photoUrl: string
): Promise<void> {
  // Reset all is_main flags for this bike
  await supabase
    .from('motorcycle_photos')
    .update({ is_main: false })
    .eq('motorcycle_id', motorcycleId);

  // Set selected photo is_main = true
  await supabase
    .from('motorcycle_photos')
    .update({ is_main: true })
    .eq('id', photoId);

  // Update primary cover in motorcycles table
  await updateMotorcycle(motorcycleId, { photo_url: photoUrl });
}
