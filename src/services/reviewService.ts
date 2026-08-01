import { supabase } from '../lib/supabase';
import type { Review } from '../types/database';

export async function getWorkshopReviews(workshopId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, customer:profiles(id, full_name, avatar_url)')
    .eq('workshop_id', workshopId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function createReview(payload: Partial<Review>): Promise<Review> {
  const { data, error } = await supabase.from('reviews').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function replyToReview(reviewId: string, reply: string): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update({ reply, reply_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select().single();
  if (error) throw error;
  return data;
}

export async function moderateReview(reviewId: string, status: 'active' | 'removed'): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reviewId).select().single();
  if (error) throw error;
  return data;
}
