import { supabase } from '../lib/supabase';
import type { Workshop } from '../types/database';

export interface GoogleReviewItem {
  id?: string;
  authorName: string;
  authorPhoto?: string;
  rating: number;
  relativeTime: string;
  text?: string;
  authorUri?: string;
}

export type GoogleFetchStatus = 'ok' | 'no_reviews' | 'unavailable' | 'unconfigured' | 'error';

export interface GooglePlaceDetailsResult {
  id: string;
  displayName: string;
  formattedAddress?: string;
  phone?: string;
  rating?: number;
  userRatingCount?: number;
  reviews: GoogleReviewItem[];
  googleMapsUrl?: string;
  weekdayHours?: string[];
  isOpenNow?: boolean;
  isCached?: boolean;
  lastSyncedAt?: string;
  status: GoogleFetchStatus;
  errorMessage?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours caching limit for metadata
const CLIENT_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 'AIzaSyD_bCE_mFIlwBDeieE9Pdh4118XB_7QctU';

/**
 * Fetch authentic Google Place details via Direct Google Places API (New) or Supabase Edge Function.
 * Strictly NEVER generates fake or mock reviews.
 */
export async function fetchGooglePlaceDetails(
  placeId: string,
  workshop?: Workshop | null,
  forceRefresh: boolean = false
): Promise<GooglePlaceDetailsResult | null> {
  const targetPlaceId = placeId || workshop?.google_place_id;

  if (!targetPlaceId) {
    return {
      id: workshop?.id || '',
      displayName: workshop?.name || 'Workshop',
      formattedAddress: workshop?.address || undefined,
      phone: workshop?.phone || undefined,
      rating: workshop?.google_rating ?? undefined,
      userRatingCount: workshop?.google_review_count ?? undefined,
      reviews: [],
      googleMapsUrl: workshop?.google_maps_url || undefined,
      isOpenNow: workshop?.is_open ?? true,
      status: 'unavailable',
      errorMessage: 'Google Place ID is missing for this workshop.',
    };
  }

  // 1. Try Direct Google Places API (New) fetch first
  const resourceName = targetPlaceId.startsWith('places/') ? targetPlaceId : `places/${targetPlaceId}`;
  const directUrl = `https://places.googleapis.com/v1/${resourceName}`;
  const fieldMask = 'id,displayName,formattedAddress,nationalPhoneNumber,regularOpeningHours,rating,userRatingCount,reviews,googleMapsUri';

  try {
    const directRes = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': CLIENT_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
    });

    if (directRes.ok) {
      const place = await directRes.json();
      const rawReviews = place.reviews || [];

      const reviews: GoogleReviewItem[] = rawReviews.map((r: any, idx: number) => ({
        id: `g_rev_${place.id || targetPlaceId}_${idx}`,
        authorName: r.authorAttribution?.displayName || 'Google Reviewer',
        authorPhoto: r.authorAttribution?.photoUri || undefined,
        authorUri: r.authorAttribution?.uri || undefined,
        rating: Number(r.rating || 5),
        relativeTime: r.relativePublishTimeDescription || '',
        text: r.text?.text || r.originalText?.text || undefined,
      }));

      const result: GooglePlaceDetailsResult = {
        id: place.id || targetPlaceId,
        displayName: place.displayName?.text || workshop?.name || 'Workshop',
        formattedAddress: place.formattedAddress || workshop?.address || undefined,
        phone: place.nationalPhoneNumber || workshop?.phone || undefined,
        rating: place.rating !== undefined ? Number(place.rating) : (workshop?.google_rating ?? undefined),
        userRatingCount: place.userRatingCount !== undefined ? Number(place.userRatingCount) : (workshop?.google_review_count ?? undefined),
        reviews,
        googleMapsUrl: place.googleMapsUri || workshop?.google_maps_url || undefined,
        weekdayHours: place.regularOpeningHours?.weekdayDescriptions || undefined,
        isOpenNow: place.regularOpeningHours?.openNow ?? workshop?.is_open ?? true,
        isCached: false,
        lastSyncedAt: new Date().toISOString(),
        status: reviews.length > 0 ? 'ok' : 'no_reviews',
      };

      // Asynchronously update Supabase database metadata cache
      if (workshop?.id) {
        syncGoogleDataToSupabase(workshop.id, result).catch((e) =>
          console.log('[GooglePlaces] Metadata cache sync error:', e)
        );
      }

      return result;
    }
  } catch (directErr) {
    console.log('[GooglePlaces] Direct API fetch error, trying Edge Function proxy:', directErr);
  }

  // 2. Fallback to Supabase Edge Function Proxy if direct fetch is blocked
  try {
    const { data, error } = await supabase.functions.invoke('google-place-details', {
      body: { placeId: targetPlaceId, action: 'details' },
    });

    if (error || !data || !data.place) {
      return {
        id: targetPlaceId,
        displayName: workshop?.name || 'Workshop',
        rating: workshop?.google_rating ?? undefined,
        userRatingCount: workshop?.google_review_count ?? undefined,
        reviews: [],
        googleMapsUrl: workshop?.google_maps_url || undefined,
        status: 'error',
        errorMessage: error?.message || data?.error || 'Unable to load Google reviews.',
      };
    }

    const place = data.place;
    const rawReviews = place.reviews || [];

    const reviews: GoogleReviewItem[] = rawReviews.map((r: any, idx: number) => ({
      id: `g_rev_${place.id || targetPlaceId}_${idx}`,
      authorName: r.authorAttribution?.displayName || 'Google Reviewer',
      authorPhoto: r.authorAttribution?.photoUri || undefined,
      authorUri: r.authorAttribution?.uri || undefined,
      rating: Number(r.rating || 5),
      relativeTime: r.relativePublishTimeDescription || '',
      text: r.text?.text || r.originalText?.text || undefined,
    }));

    const result: GooglePlaceDetailsResult = {
      id: place.id || targetPlaceId,
      displayName: place.displayName?.text || workshop?.name || 'Workshop',
      formattedAddress: place.formattedAddress || workshop?.address || undefined,
      phone: place.nationalPhoneNumber || workshop?.phone || undefined,
      rating: place.rating !== undefined ? Number(place.rating) : (workshop?.google_rating ?? undefined),
      userRatingCount: place.userRatingCount !== undefined ? Number(place.userRatingCount) : (workshop?.google_review_count ?? undefined),
      reviews,
      googleMapsUrl: place.googleMapsUri || workshop?.google_maps_url || undefined,
      weekdayHours: place.regularOpeningHours?.weekdayDescriptions || undefined,
      isOpenNow: place.regularOpeningHours?.openNow ?? workshop?.is_open ?? true,
      isCached: false,
      lastSyncedAt: new Date().toISOString(),
      status: reviews.length > 0 ? 'ok' : 'no_reviews',
    };

    if (workshop?.id) {
      syncGoogleDataToSupabase(workshop.id, result).catch(() => {});
    }

    return result;
  } catch (edgeErr: any) {
    return {
      id: targetPlaceId,
      displayName: workshop?.name || 'Workshop',
      rating: workshop?.google_rating ?? undefined,
      userRatingCount: workshop?.google_review_count ?? undefined,
      reviews: [],
      googleMapsUrl: workshop?.google_maps_url || undefined,
      status: 'error',
      errorMessage: edgeErr?.message || 'Google reviews are temporarily unavailable.',
    };
  }
}

/**
 * Updates Supabase workshops table with fresh Google Places metadata (rating, review count, maps URL)
 */
async function syncGoogleDataToSupabase(workshopId: string, data: GooglePlaceDetailsResult) {
  const updates: Partial<Workshop> = {
    google_last_synced_at: new Date().toISOString(),
  };

  if (data.rating !== undefined) updates.google_rating = data.rating;
  if (data.userRatingCount !== undefined) updates.google_review_count = data.userRatingCount;
  if (data.googleMapsUrl) updates.google_maps_url = data.googleMapsUrl;

  await supabase.from('workshops').update(updates).eq('id', workshopId);
}

/**
 * Text Search (New) Place ID Discovery helper
 */
export async function discoverGooglePlaceId(workshop: Partial<Workshop>): Promise<string | null> {
  const queryParts = [workshop.name, workshop.address, workshop.district, workshop.state, 'Malaysia'].filter(Boolean);
  const textQuery = queryParts.join(', ');

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': CLIENT_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery }),
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (data.places && data.places.length > 0) {
      return data.places[0].id;
    }
    return null;
  } catch (err) {
    console.log('[GooglePlaces] Discover Place ID error:', err);
    return null;
  }
}
