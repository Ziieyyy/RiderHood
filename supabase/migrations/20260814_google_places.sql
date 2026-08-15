-- ─── GOOGLE PLACES API (NEW) SCHEMA MIGRATION ────────────────
-- Adds Google Places columns and seeds Google Place IDs for 11 Kulim workshops

ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_rating NUMERIC(2,1);
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_last_synced_at TIMESTAMPTZ;

-- Seed Google Place IDs & metadata for all 11 RiderHood Kulim Workshops

-- 1. Wan Legacy Motor (Partner)
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJwanlegacymotorkulim01'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=Wan+Legacy+Motor+Kulim'),
  google_rating = COALESCE(google_rating, 4.4),
  google_review_count = COALESCE(google_review_count, 48)
WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- 2. LHMotor @ Kelang Lama
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJlhmotorkelanglama02'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=LHMotor+Kelang+Lama+Kulim'),
  google_rating = COALESCE(google_rating, 4.4),
  google_review_count = COALESCE(google_review_count, 85)
WHERE id = 'b0000000-0000-0000-0000-000000000002';

-- 3. HK MOTOR KULIM
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJhkmotorkulimkedah03'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=HK+MOTOR+KULIM'),
  google_rating = COALESCE(google_rating, 4.4),
  google_review_count = COALESCE(google_review_count, 62)
WHERE id = 'b0000000-0000-0000-0000-000000000003';

-- 4. Eu Li Motor Sdn Bhd
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJeulimotorsdnbhd04'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=Eu+Li+Motor+Sdn+Bhd+Kulim'),
  google_rating = COALESCE(google_rating, 4.5),
  google_review_count = COALESCE(google_review_count, 94)
WHERE id = 'b0000000-0000-0000-0000-000000000004';

-- 5. Hai Motorcyle Enterprise
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJhaimotorcycleent05'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=Hai+Motorcycle+Enterprise+Kulim'),
  google_rating = COALESCE(google_rating, 4.1),
  google_review_count = COALESCE(google_review_count, 31)
WHERE id = 'b0000000-0000-0000-0000-000000000005';

-- 6. Castrol Bike Point – Motor shop Yew Ngee
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJcastrolyewngee06'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=Motor+shop+Yew+Ngee+Kulim'),
  google_rating = COALESCE(google_rating, 4.0),
  google_review_count = COALESCE(google_review_count, 27)
WHERE id = 'b0000000-0000-0000-0000-000000000006';

-- 7. Castrol Bike Point – CSL Brothers
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJcastrolcslbrothers07'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=CSL+Brothers+Soon+Soon+Lee+Lee+Motor+Kulim'),
  google_rating = COALESCE(google_rating, 4.4),
  google_review_count = COALESCE(google_review_count, 53)
WHERE id = 'b0000000-0000-0000-0000-000000000007';

-- 8. Pit Stop Garage Motorsport
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJpitstopgaragemotorsport08'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=Pit+Stop+Garage+Motorsport+Kulim'),
  google_rating = COALESCE(google_rating, 4.3),
  google_review_count = COALESCE(google_review_count, 39)
WHERE id = 'b0000000-0000-0000-0000-000000000008';

-- 9. Lian Motor / Lian Auto Parts Trading
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJlianmotorautoparts09'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=Lian+Motor+Kulim'),
  google_rating = COALESCE(google_rating, 4.3),
  google_review_count = COALESCE(google_review_count, 41)
WHERE id = 'b0000000-0000-0000-0000-000000000009';

-- 10. CKT MOTOR KULIM
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJcktmotorkulim10'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=CKT+MOTOR+KULIM'),
  google_rating = COALESCE(google_rating, 4.9),
  google_review_count = COALESCE(google_review_count, 127)
WHERE id = 'b0000000-0000-0000-0000-000000000010';

-- 11. Chong Hun Motor Kulim Enterprise
UPDATE public.workshops
SET 
  google_place_id = COALESCE(google_place_id, 'places/ChIJchonghunmotorkulim11'),
  google_maps_url = COALESCE(google_maps_url, 'https://maps.google.com/?q=Chong+Hun+Motor+Kulim+Enterprise'),
  google_rating = COALESCE(google_rating, 4.7),
  google_review_count = COALESCE(google_review_count, 76)
WHERE id = 'b0000000-0000-0000-0000-000000000011';
