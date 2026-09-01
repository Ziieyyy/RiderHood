import { supabase } from '../lib/supabase';
import type { Review, ReviewPhoto } from '../types/database';

// ─── Get workshop reviews with customer profiles ─────────────
export async function getWorkshopReviews(workshopId: string): Promise<Review[]> {
  // Try combined query with joined customer profile & review_photos
  const { data, error } = await supabase
    .from('reviews')
    .select('*, customer:profiles(id, full_name, avatar_url), photos:review_photos(*)')
    .eq('workshop_id', workshopId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (!error) {
    return (data ?? []) as Review[];
  }

  console.warn('getWorkshopReviews primary query failed, using fallback:', error.message);

  // Fallback query without embedded review_photos relation
  const { data: reviewsData, error: reviewsErr } = await supabase
    .from('reviews')
    .select('*, customer:profiles(id, full_name, avatar_url)')
    .eq('workshop_id', workshopId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (reviewsErr) throw reviewsErr;

  const reviews = (reviewsData ?? []) as Review[];
  if (reviews.length === 0) return reviews;

  // Attempt to fetch photos separately from review_photos if table exists
  try {
    const reviewIds = reviews.map((r) => r.id);
    const { data: photosData } = await supabase
      .from('review_photos')
      .select('*')
      .in('review_id', reviewIds);

    if (photosData && photosData.length > 0) {
      const photosByReviewId: Record<string, ReviewPhoto[]> = {};
      photosData.forEach((p: ReviewPhoto) => {
        if (!photosByReviewId[p.review_id]) photosByReviewId[p.review_id] = [];
        photosByReviewId[p.review_id].push(p);
      });
      reviews.forEach((r) => {
        r.photos = photosByReviewId[r.id] || [];
      });
    } else {
      reviews.forEach((r) => {
        r.photos = r.photos || [];
      });
    }
  } catch {
    reviews.forEach((r) => {
      r.photos = r.photos || [];
    });
  }

  return reviews;
}

// ─── Get review stats (average, count, star distribution) ────
export interface ReviewStats {
  average: number;
  count: number;
  distribution: { [key: number]: number }; // {1: n, 2: n, 3: n, 4: n, 5: n}
}

export async function getReviewStats(workshopId: string): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('workshop_id', workshopId)
    .eq('status', 'active');
  if (error) throw error;

  const reviews = data ?? [];
  const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  reviews.forEach((r: { rating: number }) => {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    total += r.rating;
  });

  return {
    average: reviews.length > 0 ? total / reviews.length : 0,
    count: reviews.length,
    distribution,
  };
}

// ─── Get completed bookings without a review for this customer ──
export async function getCompletedBookingsWithoutReview(
  customerId: string,
  workshopId?: string
): Promise<any[]> {
  // Get all completed bookings
  let query = supabase
    .from('bookings')
    .select('*, workshop:workshops(id, name), motorcycle:motorcycles(id, nickname, plate_number, brand, model)')
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('booking_date', { ascending: false });

  if (workshopId) {
    query = query.eq('workshop_id', workshopId);
  }

  const { data: bookings, error: bErr } = await query;
  if (bErr) throw bErr;

  if (!bookings || bookings.length === 0) return [];

  // Get existing reviews by this customer
  const { data: existingReviews, error: rErr } = await supabase
    .from('reviews')
    .select('booking_id')
    .eq('customer_id', customerId);
  if (rErr) throw rErr;

  const reviewedBookingIds = new Set((existingReviews ?? []).map((r: { booking_id: string }) => r.booking_id));

  // Filter out already-reviewed bookings
  return bookings.filter((b: { id: string }) => !reviewedBookingIds.has(b.id));
}

// ─── Check if customer can review a workshop ─────────────────
export async function canCustomerReview(customerId: string, workshopId: string): Promise<boolean> {
  try {
    const unreviewedBookings = await getCompletedBookingsWithoutReview(customerId, workshopId);
    return unreviewedBookings.length > 0;
  } catch {
    return false;
  }
}

// ─── Resilient Review Insertion with multi-tier fallback ─────
async function insertReviewWithFallback(payload: Record<string, any>): Promise<Review> {
  const attempts: Record<string, any>[] = [
    // Attempt 1: Full payload
    {
      customer_id: payload.customer_id,
      workshop_id: payload.workshop_id,
      booking_id: payload.booking_id || undefined,
      motorcycle_id: payload.motorcycle_id || undefined,
      rating: payload.rating,
      comment: payload.comment || null,
      status: payload.status || 'active',
    },
    // Attempt 2: Standard fields without motorcycle_id & status
    {
      customer_id: payload.customer_id,
      workshop_id: payload.workshop_id,
      booking_id: payload.booking_id || undefined,
      rating: payload.rating,
      comment: payload.comment || null,
    },
    // Attempt 3: Core review fields (customer_id, workshop_id, rating, comment)
    {
      customer_id: payload.customer_id,
      workshop_id: payload.workshop_id,
      rating: payload.rating,
      comment: payload.comment || null,
    },
    // Attempt 4: Fallback if table uses user_id instead of customer_id
    {
      user_id: payload.customer_id,
      workshop_id: payload.workshop_id,
      booking_id: payload.booking_id || undefined,
      rating: payload.rating,
      comment: payload.comment || null,
    },
    // Attempt 5: Minimal user_id
    {
      user_id: payload.customer_id,
      workshop_id: payload.workshop_id,
      rating: payload.rating,
      comment: payload.comment || null,
    },
  ];

  let lastError: any = null;

  for (const candidate of attempts) {
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(candidate)) {
      if (val !== undefined) cleanPayload[key] = val;
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert(cleanPayload)
        .select()
        .single();

      if (!error && data) {
        return data as Review;
      }
      lastError = error;
      console.warn('[insertReviewWithFallback] Candidate attempt notice:', error?.message);
    } catch (err: any) {
      lastError = err;
      console.warn('[insertReviewWithFallback] Candidate caught notice:', err?.message);
    }
  }

  throw lastError || new Error('Failed to submit review to database.');
}

// ─── Create review with optional photos ──────────────────────
export async function createReviewWithPhotos(
  review: Partial<Review>,
  photoUris: string[] = []
): Promise<Review> {
  const createdReview = await insertReviewWithFallback(review);

  // Insert review photos (if any)
  if (photoUris.length > 0 && createdReview.id) {
    try {
      const photoInserts = photoUris.map((uri, index) => ({
        review_id: createdReview.id,
        photo_url: uri,
        file_path: `review-images/${review.customer_id || 'user'}/${createdReview.id}_${index}.jpg`,
      }));

      const { error: photoErr } = await supabase
        .from('review_photos')
        .insert(photoInserts);

      if (photoErr) {
        console.warn('Failed to insert review photos (non-fatal):', photoErr.message);
      }
    } catch (photoErr) {
      console.warn('Failed to insert review photos (non-fatal):', photoErr);
    }
  }

  return createdReview;
}

// ─── Create review (simple, no photos) ───────────────────────
export async function createReview(payload: Partial<Review>): Promise<Review> {
  return insertReviewWithFallback(payload);
}

// ─── Reply to review (workshop admin) ────────────────────────
export async function replyToReview(reviewId: string, reply: string): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update({ reply, reply_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select().single();
  if (error) throw error;
  return data;
}

// ─── Moderate review (admin) ─────────────────────────────────
export async function moderateReview(reviewId: string, status: 'active' | 'removed'): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reviewId).select().single();
  if (error) throw error;
  return data;
}

// ─── Realtime Subscription for Reviews ───────────────────────
export function subscribeToRealtimeReviews(
  onReviewChange: (payload: any) => void,
  workshopId?: string
) {
  const channelName = workshopId ? `reviews_${workshopId}` : 'all_reviews';
  const filter = workshopId ? `workshop_id=eq.${workshopId}` : undefined;

  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reviews',
        filter,
      },
      (payload) => onReviewChange(payload)
    )
    .subscribe();
}

