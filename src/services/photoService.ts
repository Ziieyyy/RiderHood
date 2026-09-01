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
      if (!error.message.includes('schema cache') && !error.message.includes('does not exist')) {
        console.warn('motorcycle_photos query note:', error.message);
      }
      return [];
    }
    return data ?? [];
  } catch (err) {
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
  let finalPhotoUrl = photoUrl;
  let finalFilePath = filePath || null;

  // Attempt uploading local photo URI to Supabase Storage buckets with graceful fallback
  if (photoUrl && (photoUrl.startsWith('file://') || photoUrl.startsWith('blob:') || photoUrl.startsWith('data:'))) {
    const bucketsToTry = ['motorcycle-images', 'public', 'documents'];
    const storagePath = filePath || `${ownerId}/${motorcycleId}_${Date.now()}.jpg`;

    for (const b of bucketsToTry) {
      try {
        await supabase.storage.createBucket(b, { public: true }).catch(() => {});
        const response = await fetch(photoUrl);
        const blob = await response.blob();

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(b)
          .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage.from(b).getPublicUrl(uploadData.path);
          finalPhotoUrl = urlData.publicUrl;
          finalFilePath = `${b}/${uploadData.path}`;
          break;
        }
      } catch (err: any) {
        console.warn(`Photo upload storage notice for bucket "${b}":`, err?.message);
      }
    }
  }

  // 1. Insert into motorcycle_photos database table
  const { data, error } = await supabase
    .from('motorcycle_photos')
    .insert({
      motorcycle_id: motorcycleId,
      owner_id: ownerId,
      photo_url: finalPhotoUrl,
      file_path: finalFilePath,
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
    await updateMotorcycle(motorcycleId, { photo_url: finalPhotoUrl });
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
      await supabase.storage.from('motorcycle-images').remove([filePath]).catch(() => {});
      await supabase.storage.from('motorcycle-photos').remove([filePath]).catch(() => {});
    } catch (storageErr) {
      console.warn('Storage cleanup warning (non-fatal):', storageErr);
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

// ─── Generic helper to upload any local URI/blob to Supabase Storage ───
export async function uploadPhotoUriToStorage(
  userId: string,
  folder: string,
  photoUri: string
): Promise<string> {
  if (!photoUri) return photoUri;

  // If it's already an external HTTPS url (and not a local blob), no need to upload
  if (photoUri.startsWith('https://') && !photoUri.includes('blob:')) {
    return photoUri;
  }

  if (photoUri.startsWith('file://') || photoUri.startsWith('blob:') || photoUri.startsWith('data:') || photoUri.startsWith('http://localhost')) {
    const bucketsToTry = ['avatars', 'motorcycle-images', 'public', 'documents'];
    const storagePath = `${folder}/${userId}_${Date.now()}.jpg`;

    for (const b of bucketsToTry) {
      try {
        await supabase.storage.createBucket(b, { public: true }).catch(() => {});
        const response = await fetch(photoUri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(b)
          .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage.from(b).getPublicUrl(uploadData.path);
          if (urlData?.publicUrl) {
            return urlData.publicUrl;
          }
        }
      } catch (err: any) {
        console.warn(`Storage upload note for bucket "${b}":`, err?.message);
      }
    }
  }

  return photoUri;
}

// ─── Upload Profile Avatar (CRUD: Create/Update Avatar) ──────
export async function uploadProfileAvatar(userId: string, photoUri: string): Promise<string> {
  const publicUrl = await uploadPhotoUriToStorage(userId, 'avatars', photoUri);

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.warn('Update profile avatar DB error:', error.message);
  }

  return publicUrl;
}

// ─── Remove Profile Avatar (CRUD: Delete Avatar) ──────────────
export async function removeProfileAvatar(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to remove avatar photo.');
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


