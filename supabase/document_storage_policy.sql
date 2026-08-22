-- ============================================================
-- RiderHood — Motorcycle Documents Bucket, Photos Table & RLS
-- Execute in Supabase SQL Editor
-- ============================================================

-- 1. Create Dedicated Storage Bucket for Motorcycle Documents (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'motorcycle-documents',
  'motorcycle-documents',
  FALSE, -- Private bucket (Access via Signed URLs)
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760;

-- 2. Storage Objects RLS Policy for motorcycle-documents Bucket
-- Path format: {user_id}/{motorcycle_id}/{document_id}/{filename}
DROP POLICY IF EXISTS "Motorcycle Docs Storage Policy" ON storage.objects;
CREATE POLICY "Motorcycle Docs Storage Policy" ON storage.objects FOR ALL
  USING (
    bucket_id = 'motorcycle-documents' 
    AND (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('super_admin', 'workshop_admin')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'motorcycle-documents' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- 3. Enable RLS on Database Documents Table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User Documents DB Policy" ON public.documents;
CREATE POLICY "User Documents DB Policy" ON public.documents FOR ALL
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('super_admin', 'workshop_admin')
    )
  )
  WITH CHECK (
    customer_id = auth.uid()
  );

-- 4. Create motorcycle_photos Table (if missing)
CREATE TABLE IF NOT EXISTS public.motorcycle_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motorcycle_id   UUID NOT NULL REFERENCES public.motorcycles(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url       TEXT NOT NULL,
  file_path       TEXT,
  caption         TEXT,
  is_main         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.motorcycle_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "motorcycle_photos_own" ON public.motorcycle_photos;
CREATE POLICY "motorcycle_photos_own" ON public.motorcycle_photos FOR ALL 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
