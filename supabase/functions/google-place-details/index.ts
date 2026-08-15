// Supabase Edge Function: google-place-details
// Serves Google Places API (New) Place Details & Text Search securely without exposing API keys
// Strictly NEVER generates fake/mock Google review data.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-goog-api-key, x-goog-fieldmask",
};

interface GooglePlaceDetails {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{
    name?: string;
    relativePublishTimeDescription?: string;
    rating?: number;
    text?: { text: string };
    authorAttribution?: {
      displayName: string;
      uri?: string;
      photoUri?: string;
    };
  }>;
  googleMapsUri?: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    let placeId = url.searchParams.get("placeId") || url.searchParams.get("place_id");
    let action = url.searchParams.get("action") || "details";
    let textQuery = url.searchParams.get("query");

    // Also support JSON POST body if present
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.placeId || body.place_id) placeId = body.placeId || body.place_id;
        if (body.action) action = body.action;
        if (body.query) textQuery = body.query;
      } catch (_e) {
        // Ignored if body is empty
      }
    }

    // ─── ACTION 1: TEXT SEARCH (NEW) ─────────────────────────
    if (action === "search") {
      if (!textQuery) {
        return new Response(
          JSON.stringify({ error: "Missing required parameter 'query' for search." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!apiKey) {
        return new Response(
          JSON.stringify({
            status: "API_KEY_NOT_CONFIGURED",
            warning: "GOOGLE_PLACES_API_KEY secret is not set in Supabase.",
            places: [],
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const googleRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.googleMapsUri",
        },
        body: JSON.stringify({ textQuery }),
      });

      const searchData = await googleRes.json();
      return new Response(JSON.stringify(searchData), {
        status: googleRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION 2: PLACE DETAILS (NEW) ───────────────────────
    if (!placeId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter 'placeId'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          status: "API_KEY_NOT_CONFIGURED",
          error: "GOOGLE_PLACES_API_KEY is not set in Supabase secrets.",
          place: null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedResourceName = placeId.startsWith("places/")
      ? placeId
      : `places/${placeId}`;

    const fieldMask = [
      "id",
      "displayName",
      "formattedAddress",
      "nationalPhoneNumber",
      "regularOpeningHours",
      "rating",
      "userRatingCount",
      "reviews",
      "googleMapsUri",
    ].join(",");

    const googleRes = await fetch(
      `https://places.googleapis.com/v1/${formattedResourceName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
      }
    );

    if (!googleRes.ok) {
      const errText = await googleRes.text();
      return new Response(
        JSON.stringify({
          status: "GOOGLE_API_ERROR",
          httpStatus: googleRes.status,
          error: errText,
          place: null,
        }),
        { status: googleRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const placeDetails: GooglePlaceDetails = await googleRes.json();

    return new Response(
      JSON.stringify({
        status: "OK",
        place: placeDetails,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error", place: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
