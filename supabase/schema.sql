-- ============================================================
-- RiderHood Premium Moto Care – Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor for project: jmeffczykjgtzaabliwh
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','workshop_admin','super_admin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending','deleted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF NEW.email = 'riderhoodmotor@gmail.com' THEN
    v_role := 'super_admin';
  ELSIF NEW.email IN ('kazzorigins@gmail.com', 'khairazizizi@gmail.com') OR NEW.raw_user_meta_data->>'role' = 'workshop_admin' THEN
    v_role := 'workshop_admin';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), CASE WHEN v_role = 'super_admin' THEN 'Super Admin' WHEN v_role = 'workshop_admin' THEN 'Cemerlang Terbilang Workshop' ELSE 'Rider' END),
    NEW.raw_user_meta_data->>'phone',
    v_role,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active';

  -- Ensure workshop record is linked and approved for workshop_admin
  IF v_role = 'workshop_admin' THEN
    INSERT INTO public.workshops (id, owner_id, name, description, address, district, state, phone, status, verification_status, rating)
    VALUES (
      'b0000000-0000-0000-0000-000000000001',
      NEW.id,
      'Bengkel Motor Cemerlang Terbilang',
      'Specialized in superbike tuning, general servicing, tire replacements & performance parts.',
      'No 15, Jalan Industri PBU 1, Taman Perindustrian, 50480 Kuala Lumpur',
      'Kuala Lumpur',
      'Wilayah Persekutuan',
      '+60123456789',
      'active',
      'approved',
      4.9
    )
    ON CONFLICT (id) DO UPDATE SET owner_id = NEW.id, verification_status = 'approved', status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── MOTORCYCLES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.motorcycles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname          TEXT NOT NULL DEFAULT '',
  brand             TEXT NOT NULL,
  model             TEXT NOT NULL,
  year              INTEGER NOT NULL CHECK (year >= 1900),
  plate_number      TEXT NOT NULL,
  engine_cc         INTEGER,
  fuel_type         TEXT,
  transmission      TEXT,
  current_mileage   INTEGER NOT NULL DEFAULT 0 CHECK (current_mileage >= 0),
  engine_oil_type   TEXT,
  front_tyre_size   TEXT,
  rear_tyre_size    TEXT,
  photo_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, plate_number)
);

-- Fix for existing tables missing nickname default
ALTER TABLE public.motorcycles ALTER COLUMN nickname SET DEFAULT '';

-- ─── WORKSHOPS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workshops (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  phone                 TEXT,
  email                 TEXT,
  address               TEXT,
  district              TEXT,
  state                 TEXT,
  latitude              NUMERIC(10,7),
  longitude             NUMERIC(10,7),
  cover_image_url       TEXT,
  rating                NUMERIC(2,1) NOT NULL DEFAULT 0.0 CHECK (rating BETWEEN 0 AND 5),
  review_count          INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  opening_time          TIME,
  closing_time          TIME,
  is_open               BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status   TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected')),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SERVICES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id                 UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  description                 TEXT,
  category                    TEXT,
  price                       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  estimated_duration_minutes  INTEGER CHECK (estimated_duration_minutes >= 0),
  is_available                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PARTS INVENTORY ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id     UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  brand           TEXT,
  sku             TEXT,
  category        TEXT,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_stock   INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  unit            TEXT DEFAULT 'pcs',
  compatibility   TEXT,
  image_url       TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workshop_id, sku)
);

-- ─── BOOKINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  workshop_id     UUID NOT NULL REFERENCES public.workshops(id) ON DELETE SET NULL,
  motorcycle_id   UUID NOT NULL REFERENCES public.motorcycles(id) ON DELETE SET NULL,
  booking_date    DATE NOT NULL,
  booking_time    TIME NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','rejected','no_show')),
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKING SERVICES (price snapshots) ───────────────────────
CREATE TABLE IF NOT EXISTS public.booking_services (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id                UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id                UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name_snapshot     TEXT NOT NULL,
  price_snapshot            NUMERIC(10,2) NOT NULL CHECK (price_snapshot >= 0),
  quantity                  INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  duration_snapshot         INTEGER
);

-- ─── MAINTENANCE RECORDS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motorcycle_id UUID NOT NULL REFERENCES public.motorcycles(id) ON DELETE CASCADE,
  workshop_id   UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  booking_id    UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  service_date  DATE NOT NULL,
  mileage       INTEGER NOT NULL CHECK (mileage >= 0),
  description   TEXT,
  total_cost    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  mechanic_notes TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MAINTENANCE ITEMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_record_id UUID NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
  service_id            UUID REFERENCES public.services(id) ON DELETE SET NULL,
  item_name             TEXT NOT NULL,
  cost                  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  notes                 TEXT
);

-- ─── MAINTENANCE REMINDERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_reminders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motorcycle_id         UUID NOT NULL REFERENCES public.motorcycles(id) ON DELETE CASCADE,
  customer_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  next_service_mileage  INTEGER CHECK (next_service_mileage >= 0),
  current_mileage       INTEGER CHECK (current_mileage >= 0),
  next_service_date     DATE,
  status                TEXT NOT NULL DEFAULT 'upcoming'
                          CHECK (status IN ('upcoming','due','overdue','completed','dismissed')),
  priority              TEXT DEFAULT 'normal',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MILEAGE LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mileage_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motorcycle_id     UUID NOT NULL REFERENCES public.motorcycles(id) ON DELETE CASCADE,
  previous_mileage  INTEGER NOT NULL CHECK (previous_mileage >= 0),
  new_mileage       INTEGER NOT NULL CHECK (new_mileage >= 0),
  source            TEXT DEFAULT 'customer_update',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EXPENSES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motorcycle_id UUID REFERENCES public.motorcycles(id) ON DELETE SET NULL,
  booking_id    UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  category      TEXT NOT NULL CHECK (category IN ('Maintenance','Fuel','Parts','Insurance','Road Tax','Other')),
  description   TEXT,
  amount        NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  expense_date  DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DOCUMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motorcycle_id UUID REFERENCES public.motorcycles(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('Insurance','Road Tax','Warranty','Service Receipt','Vehicle Document','Other')),
  file_path     TEXT NOT NULL,
  file_url      TEXT,
  expiry_date   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REVIEWS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workshop_id   UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  booking_id    UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  reply         TEXT,
  reply_at      TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id) -- one review per booking
);

-- Auto-update workshop rating after review INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.update_workshop_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_workshop_id UUID;
BEGIN
  v_workshop_id := COALESCE(NEW.workshop_id, OLD.workshop_id);
  UPDATE public.workshops
  SET
    rating       = (SELECT COALESCE(AVG(rating),0) FROM public.reviews WHERE workshop_id = v_workshop_id AND status = 'active'),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE workshop_id = v_workshop_id AND status = 'active'),
    updated_at   = NOW()
  WHERE id = v_workshop_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_workshop_rating();

-- ─── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('booking','maintenance','workshop','system','promotion','security')),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_motorcycles_owner ON public.motorcycles(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_workshop ON public.bookings(workshop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date     ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_services_workshop ON public.services(workshop_id);
CREATE INDEX IF NOT EXISTS idx_parts_workshop    ON public.parts(workshop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_workshop  ON public.reviews(workshop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_workshops_status  ON public.workshops(verification_status, status);
CREATE INDEX IF NOT EXISTS idx_audit_actor       ON public.audit_logs(actor_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motorcycles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_services  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- Helper: get caller's role from profiles
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: get caller's workshop id
CREATE OR REPLACE FUNCTION public.get_my_workshop_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.workshops WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- ── PROFILES ──
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid() OR get_my_role() = 'super_admin');
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"  ON public.profiles FOR ALL USING (get_my_role() = 'super_admin');

-- ── MOTORCYCLES ──
DROP POLICY IF EXISTS "motorcycles_own" ON public.motorcycles;
CREATE POLICY "motorcycles_own" ON public.motorcycles FOR ALL USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "motorcycles_workshop_read" ON public.motorcycles;
CREATE POLICY "motorcycles_workshop_read" ON public.motorcycles FOR SELECT
  USING (get_my_role() IN ('workshop_admin','super_admin'));

-- ── WORKSHOPS (public read of approved only) ──
DROP POLICY IF EXISTS "workshops_public_read" ON public.workshops;
CREATE POLICY "workshops_public_read" ON public.workshops FOR SELECT
  USING (verification_status = 'approved' AND status = 'active' OR get_my_role() IN ('workshop_admin','super_admin'));
DROP POLICY IF EXISTS "workshops_owner_update" ON public.workshops;
CREATE POLICY "workshops_owner_update" ON public.workshops FOR UPDATE
  USING (owner_id = auth.uid() OR get_my_role() = 'super_admin');
DROP POLICY IF EXISTS "workshops_admin_all" ON public.workshops;
CREATE POLICY "workshops_admin_all"    ON public.workshops FOR ALL USING (get_my_role() = 'super_admin');
DROP POLICY IF EXISTS "workshops_admin_insert" ON public.workshops;
CREATE POLICY "workshops_admin_insert" ON public.workshops FOR INSERT WITH CHECK (get_my_role() IN ('workshop_admin','super_admin'));

-- ── SERVICES ──
DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "services_owner_write" ON public.services;
CREATE POLICY "services_owner_write" ON public.services FOR ALL
  USING (workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin');

-- ── PARTS ──
DROP POLICY IF EXISTS "parts_owner" ON public.parts;
CREATE POLICY "parts_owner" ON public.parts FOR ALL
  USING (workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin');

-- ── BOOKINGS ──
DROP POLICY IF EXISTS "bookings_customer_own" ON public.bookings;
CREATE POLICY "bookings_customer_own" ON public.bookings FOR SELECT USING (customer_id = auth.uid());
DROP POLICY IF EXISTS "bookings_customer_insert" ON public.bookings;
CREATE POLICY "bookings_customer_insert" ON public.bookings FOR INSERT WITH CHECK (customer_id = auth.uid());
DROP POLICY IF EXISTS "bookings_workshop_read" ON public.bookings;
CREATE POLICY "bookings_workshop_read" ON public.bookings FOR SELECT
  USING (workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin');
DROP POLICY IF EXISTS "bookings_workshop_update" ON public.bookings;
CREATE POLICY "bookings_workshop_update" ON public.bookings FOR UPDATE
  USING (workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin');

-- ── BOOKING SERVICES ──
DROP POLICY IF EXISTS "booking_services_read" ON public.booking_services;
CREATE POLICY "booking_services_read" ON public.booking_services FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin')));
DROP POLICY IF EXISTS "booking_services_insert" ON public.booking_services;
CREATE POLICY "booking_services_insert" ON public.booking_services FOR INSERT WITH CHECK (TRUE);

-- ── MAINTENANCE RECORDS ──
DROP POLICY IF EXISTS "maintenance_customer_own" ON public.maintenance_records;
CREATE POLICY "maintenance_customer_own"  ON public.maintenance_records FOR ALL USING (customer_id = auth.uid());
DROP POLICY IF EXISTS "maintenance_workshop_read" ON public.maintenance_records;
CREATE POLICY "maintenance_workshop_read" ON public.maintenance_records FOR SELECT
  USING (workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin');

-- ── MAINTENANCE ITEMS ──
DROP POLICY IF EXISTS "maintenance_items_via_record" ON public.maintenance_items;
CREATE POLICY "maintenance_items_via_record" ON public.maintenance_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.maintenance_records mr WHERE mr.id = maintenance_record_id AND mr.customer_id = auth.uid()));

-- ── REMINDERS ──
DROP POLICY IF EXISTS "reminders_own" ON public.maintenance_reminders;
CREATE POLICY "reminders_own" ON public.maintenance_reminders FOR ALL USING (customer_id = auth.uid());

-- ── MILEAGE LOGS ──
DROP POLICY IF EXISTS "mileage_logs_own" ON public.mileage_logs;
CREATE POLICY "mileage_logs_own" ON public.mileage_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.motorcycles m WHERE m.id = motorcycle_id AND m.owner_id = auth.uid()));

-- ── EXPENSES ──
DROP POLICY IF EXISTS "expenses_own" ON public.expenses;
CREATE POLICY "expenses_own" ON public.expenses FOR ALL USING (customer_id = auth.uid());

-- ── DOCUMENTS ──
DROP POLICY IF EXISTS "documents_own" ON public.documents;
CREATE POLICY "documents_own" ON public.documents FOR ALL USING (customer_id = auth.uid());

-- ── REVIEWS ──
DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "reviews_customer_insert" ON public.reviews;
CREATE POLICY "reviews_customer_insert" ON public.reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
DROP POLICY IF EXISTS "reviews_workshop_reply" ON public.reviews;
CREATE POLICY "reviews_workshop_reply"  ON public.reviews FOR UPDATE
  USING (workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin');

-- ── NOTIFICATIONS ──
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- ── AUDIT LOGS ──
DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_logs;
CREATE POLICY "audit_admin_read"   ON public.audit_logs FOR SELECT USING (get_my_role() = 'super_admin');
DROP POLICY IF EXISTS "audit_system_write" ON public.audit_logs;
CREATE POLICY "audit_system_write" ON public.audit_logs FOR INSERT WITH CHECK (TRUE);

-- ─── REALTIME ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workshops') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workshops;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── STORAGE BUCKETS ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars',           'avatars',           TRUE),
  ('motorcycle-images', 'motorcycle-images', TRUE),
  ('workshop-images',   'workshop-images',   TRUE),
  ('documents',         'documents',         FALSE),
  ('service-receipts',  'service-receipts',  FALSE),
  ('review-images',     'review-images',     TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: customers can only access their own private files
DROP POLICY IF EXISTS "avatars_owner" ON storage.objects;
CREATE POLICY "avatars_owner" ON storage.objects FOR ALL
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "docs_owner" ON storage.objects;
CREATE POLICY "docs_owner" ON storage.objects FOR ALL
  USING (bucket_id = 'documents' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

-- ─── SEED ACCOUNTS & INITIAL DATA ──────────────────────────────
-- Super Admin Account: riderhoodmotor@gmail.com / RiderHoodMotor1!
-- Workshop Admin Account: kazzorigins@gmail.com / khairul11!!

DO $$
DECLARE
  v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
  v_shop_admin_id UUID := 'a0000000-0000-0000-0000-000000000002';
  v_shop_id UUID := 'b0000000-0000-0000-0000-000000000001';
BEGIN
  -- Enable pgcrypto extension if not exists
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

  -- Delete existing Workshop Admin accounts for clean creation
  DELETE FROM public.workshops WHERE owner_id IN (SELECT id FROM auth.users WHERE email IN ('kazzorigins@gmail.com', 'khairazizizi@gmail.com'));
  DELETE FROM public.profiles WHERE email IN ('kazzorigins@gmail.com', 'khairazizizi@gmail.com');
  DELETE FROM auth.users WHERE email IN ('kazzorigins@gmail.com', 'khairazizizi@gmail.com');

  -- 1. Insert/Update Super Admin in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'riderhoodmotor@gmail.com') THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt('RiderHoodMotor1!', extensions.gen_salt('bf', 10)),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE email = 'riderhoodmotor@gmail.com';
  ELSE
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    )
    VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'riderhoodmotor@gmail.com',
      extensions.crypt('RiderHoodMotor1!', extensions.gen_salt('bf', 10)),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Super Admin","role":"super_admin"}'::jsonb,
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    );
  END IF;

  -- 2. Insert Workshop Admin in auth.users & auth.identities
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_shop_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'kazzorigins@gmail.com',
    extensions.crypt('khairul11!!', extensions.gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Cemerlang Terbilang Workshop","role":"workshop_admin"}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_shop_admin_id,
    v_shop_admin_id,
    v_shop_admin_id::text,
    format('{"sub":"%s","email":"%s"}', v_shop_admin_id, 'kazzorigins@gmail.com')::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Upsert Super Admin Profile
  INSERT INTO public.profiles (id, email, full_name, role, status)
  SELECT id, email, 'RiderHood Super Admin', 'super_admin', 'active'
  FROM auth.users WHERE email = 'riderhoodmotor@gmail.com'
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin', status = 'active';

  -- 4. Upsert Workshop Admin Profile
  INSERT INTO public.profiles (id, email, full_name, role, status)
  SELECT id, email, 'Cemerlang Terbilang Workshop', 'workshop_admin', 'active'
  FROM auth.users WHERE email = 'kazzorigins@gmail.com'
  ON CONFLICT (id) DO UPDATE SET role = 'workshop_admin', status = 'active';

  -- 5. Create Workshop linked to Workshop Admin
  INSERT INTO public.workshops (id, owner_id, name, description, address, district, state, phone, status, verification_status, rating)
  SELECT
    v_shop_id,
    id,
    'Bengkel Motor Cemerlang Terbilang',
    'Specialized in superbike tuning, general servicing, tire replacements & performance parts.',
    'No 15, Jalan Industri PBU 1, Taman Perindustrian, 50480 Kuala Lumpur',
    'Kuala Lumpur',
    'Wilayah Persekutuan',
    '+60123456789',
    'active',
    'approved',
    4.9
  FROM auth.users WHERE email = 'kazzorigins@gmail.com'
  ON CONFLICT (id) DO UPDATE SET verification_status = 'approved', status = 'active';
END $$;
