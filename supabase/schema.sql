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

  -- Ensure workshop record is linked and approved for workshop_admin (Wan Legacy Motor)
  IF v_role = 'workshop_admin' THEN
    INSERT INTO public.workshops (id, owner_id, name, description, address, district, state, phone, status, verification_status, rating, is_partner, booking_enabled, is_open)
    VALUES (
      'b0000000-0000-0000-0000-000000000001',
      NEW.id,
      'Wan Legacy Motor',
      'Official RiderHood Collaboration Partner in Kulim. Specialized in superbike tuning, general servicing, tire replacements & performance parts.',
      'Ground Floor No. 55, Lorong Kota Kenari 1/1, 09000 Kulim, Kedah',
      'Kulim',
      'Kedah',
      '017-455 2184',
      'active',
      'approved',
      4.4,
      TRUE,
      TRUE,
      TRUE
    )
    ON CONFLICT (id) DO UPDATE SET owner_id = NEW.id, verification_status = 'approved', status = 'active', is_partner = TRUE, booking_enabled = TRUE;
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

-- ─── MOTORCYCLE PHOTOS ─────────────────────────────────────────
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

-- ─── WORKSHOPS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workshops (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
  is_partner            BOOLEAN NOT NULL DEFAULT FALSE,
  booking_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  operating_hours       JSONB,
  verification_status   TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected')),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schema migration helpers for existing database instance
ALTER TABLE public.workshops ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS operating_hours JSONB;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS state TEXT;

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

-- ─── INVENTORY TRANSACTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id             UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  workshop_id         UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('add','remove','set','service_used')),
  quantity            INTEGER NOT NULL,
  previous_quantity   INTEGER NOT NULL,
  new_quantity        INTEGER NOT NULL,
  reason              TEXT,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workshop_id     UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  motorcycle_id   UUID NOT NULL REFERENCES public.motorcycles(id) ON DELETE CASCADE,
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

-- Schema migration helpers for bookings table foreign keys
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_workshop_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE CASCADE;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_motorcycle_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_motorcycle_id_fkey FOREIGN KEY (motorcycle_id) REFERENCES public.motorcycles(id) ON DELETE CASCADE;

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
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('workshop_admin','super_admin'));
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
  USING (verification_status = 'approved' AND status = 'active' OR owner_id = auth.uid() OR get_my_role() = 'super_admin');
DROP POLICY IF EXISTS "workshops_owner_update" ON public.workshops;
CREATE POLICY "workshops_owner_update" ON public.workshops FOR UPDATE
  USING (owner_id = auth.uid() OR get_my_role() = 'super_admin');
DROP POLICY IF EXISTS "workshops_admin_all" ON public.workshops;
CREATE POLICY "workshops_admin_all"    ON public.workshops FOR ALL USING (owner_id = auth.uid() OR get_my_role() = 'super_admin');
DROP POLICY IF EXISTS "workshops_admin_insert" ON public.workshops;
CREATE POLICY "workshops_admin_insert" ON public.workshops FOR INSERT WITH CHECK (get_my_role() IN ('workshop_admin','super_admin'));

-- ── SERVICES ──
DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "services_owner_write" ON public.services;
CREATE POLICY "services_owner_write" ON public.services FOR ALL
  USING (workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin');

-- ── PARTS ──
DROP POLICY IF EXISTS "parts_public_read" ON public.parts;
CREATE POLICY "parts_public_read" ON public.parts FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "parts_owner" ON public.parts;
CREATE POLICY "parts_owner" ON public.parts FOR ALL
  USING (workshop_id = get_my_workshop_id() OR get_my_role() = 'super_admin');

-- ── INVENTORY TRANSACTIONS ──
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_transactions_owner" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_owner" ON public.inventory_transactions FOR ALL
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
DROP POLICY IF EXISTS "maintenance_workshop_write" ON public.maintenance_records;
CREATE POLICY "maintenance_workshop_write" ON public.maintenance_records FOR INSERT WITH CHECK (get_my_role() IN ('workshop_admin','super_admin'));

-- ── MAINTENANCE ITEMS ──
DROP POLICY IF EXISTS "maintenance_items_via_record" ON public.maintenance_items;
CREATE POLICY "maintenance_items_via_record" ON public.maintenance_items FOR ALL
  USING (TRUE);

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

-- ── MOTORCYCLE PHOTOS ──
ALTER TABLE public.motorcycle_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "motorcycle_photos_own" ON public.motorcycle_photos;
CREATE POLICY "motorcycle_photos_own" ON public.motorcycle_photos FOR ALL USING (owner_id = auth.uid());

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
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (TRUE);

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
-- Workshop Admin Account: wanlegacymotor@gmail.com / khairul11!!

DO $$
DECLARE
  v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
  v_shop_admin_id UUID := 'a0000000-0000-0000-0000-000000000002';
  v_shop_id UUID := 'b0000000-0000-0000-0000-000000000001';
BEGIN
  -- Enable pgcrypto extension if not exists
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

  -- Safely unlink owner_id from existing workshops before resetting admin profiles (preserves workshops and existing bookings)
  UPDATE public.workshops SET owner_id = NULL WHERE owner_id IN (SELECT id FROM auth.users WHERE email IN ('kazzorigins@gmail.com', 'khairazizizi@gmail.com'));
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

  -- 2. Insert/Update Workshop Admin in auth.users & auth.identities
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'wanlegacymotor@gmail.com') THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt('khairul11!!', extensions.gen_salt('bf', 10)),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE email = 'wanlegacymotor@gmail.com';

    SELECT id INTO v_shop_admin_id FROM auth.users WHERE email = 'wanlegacymotor@gmail.com';
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
      v_shop_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'wanlegacymotor@gmail.com',
      extensions.crypt('khairul11!!', extensions.gen_salt('bf', 10)),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Wan Legacy Motor Admin","role":"workshop_admin"}'::jsonb,
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    );
  END IF;

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
    format('{"sub":"%s","email":"%s"}', v_shop_admin_id, 'wanlegacymotor@gmail.com')::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- 3. Upsert Super Admin Profile
  INSERT INTO public.profiles (id, email, full_name, role, status)
  SELECT id, email, 'RiderHood Super Admin', 'super_admin', 'active'
  FROM auth.users WHERE email = 'riderhoodmotor@gmail.com'
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin', status = 'active';

  -- 4. Upsert Workshop Admin Profile
  INSERT INTO public.profiles (id, email, full_name, role, status)
  SELECT id, email, 'Wan Legacy Motor Admin', 'workshop_admin', 'active'
  FROM auth.users WHERE email = 'wanlegacymotor@gmail.com'
  ON CONFLICT (id) DO UPDATE SET role = 'workshop_admin', status = 'active';

  -- 5. Seed Wan Legacy Motor (Sole Active RiderHood Partner in Kulim)
  INSERT INTO public.workshops (
    id, owner_id, name, description, address, district, state, phone, status, verification_status, rating, is_partner, booking_enabled, is_open, operating_hours
  )
  SELECT
    v_shop_id,
    id,
    'Wan Legacy Motor',
    'Official RiderHood Collaboration Partner in Kulim. Specialized in superbike tuning, general servicing, tire replacements & performance parts.',
    'Ground Floor No. 55, Lorong Kota Kenari 1/1, 09000 Kulim, Kedah',
    'Kulim',
    'Kedah',
    '017-455 2184',
    'active',
    'approved',
    4.4,
    TRUE,
    TRUE,
    TRUE,
    '[{"day":"Monday","isOpen":true,"openTime":"09:30 AM","closeTime":"06:30 PM"},{"day":"Tuesday","isOpen":true,"openTime":"09:30 AM","closeTime":"06:30 PM"},{"day":"Wednesday","isOpen":true,"openTime":"10:00 AM","closeTime":"07:00 PM"},{"day":"Thursday","isOpen":true,"openTime":"10:00 AM","closeTime":"07:00 PM"},{"day":"Friday","isOpen":false,"openTime":"10:00 AM","closeTime":"07:00 PM"},{"day":"Saturday","isOpen":true,"openTime":"10:00 AM","closeTime":"07:00 PM"},{"day":"Sunday","isOpen":true,"openTime":"10:00 AM","closeTime":"07:00 PM"}]'::jsonb
  FROM auth.users WHERE email = 'wanlegacymotor@gmail.com'
  ON CONFLICT (id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    phone = EXCLUDED.phone,
    rating = EXCLUDED.rating,
    is_partner = TRUE,
    booking_enabled = TRUE,
    verification_status = 'approved',
    status = 'active';

  -- 6. Seed 10 Directory-Only Kulim Workshops (No Booking, No Workshop Admin)
  INSERT INTO public.workshops (id, name, address, district, state, phone, rating, is_partner, booking_enabled, is_open, verification_status, status, operating_hours)
  VALUES
    (
      'b0000000-0000-0000-0000-000000000002',
      'LHMotor @ Kelang Lama',
      '65-68 Taman Manggis III, Jalan Kelang Lama, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '04-491 9800', 4.4, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Tuesday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Wednesday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Thursday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Friday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Saturday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Sunday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000003',
      'HK MOTOR KULIM, KEDAH',
      'No. 254, Jalan Tunku Putra, Taman Tunku Putra, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '04-494 4489', 4.4, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"09:30 AM","closeTime":"06:00 PM"},{"day":"Tuesday","isOpen":true,"openTime":"09:30 AM","closeTime":"06:00 PM"},{"day":"Wednesday","isOpen":true,"openTime":"09:30 AM","closeTime":"06:00 PM"},{"day":"Thursday","isOpen":true,"openTime":"09:30 AM","closeTime":"06:00 PM"},{"day":"Friday","isOpen":true,"openTime":"09:30 AM","closeTime":"06:00 PM"},{"day":"Saturday","isOpen":true,"openTime":"09:30 AM","closeTime":"06:00 PM"},{"day":"Sunday","isOpen":false,"openTime":"09:30 AM","closeTime":"06:00 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000004',
      'Eu Li Motor Sdn Bhd',
      '76 A, Lorong Kemuning 1, Taman Kemuning, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '04-491 0590', 4.5, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Tuesday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Wednesday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Thursday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Friday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Saturday","isOpen":true,"openTime":"09:30 AM","closeTime":"07:00 PM"},{"day":"Sunday","isOpen":false,"openTime":"09:30 AM","closeTime":"07:00 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000005',
      'Hai Motorcyle Enterprise',
      '588, Jalan Kemuning 1, Taman Kemuning, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '016-441 7740', 4.1, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"09:00 AM","closeTime":"06:30 PM"},{"day":"Tuesday","isOpen":true,"openTime":"09:00 AM","closeTime":"06:30 PM"},{"day":"Wednesday","isOpen":true,"openTime":"09:00 AM","closeTime":"06:30 PM"},{"day":"Thursday","isOpen":true,"openTime":"09:00 AM","closeTime":"06:30 PM"},{"day":"Friday","isOpen":true,"openTime":"09:00 AM","closeTime":"06:30 PM"},{"day":"Saturday","isOpen":true,"openTime":"09:00 AM","closeTime":"06:30 PM"},{"day":"Sunday","isOpen":true,"openTime":"09:00 AM","closeTime":"02:00 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000006',
      'Castrol Bike Point – Motor shop Yew Ngee',
      '2 & 3, Jalan Kelang Lama, Taman Manggis, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '012-477 8386', 4.0, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"09:00 AM","closeTime":"08:00 PM"},{"day":"Tuesday","isOpen":true,"openTime":"09:00 AM","closeTime":"08:00 PM"},{"day":"Wednesday","isOpen":true,"openTime":"09:00 AM","closeTime":"08:00 PM"},{"day":"Thursday","isOpen":true,"openTime":"09:00 AM","closeTime":"08:00 PM"},{"day":"Friday","isOpen":true,"openTime":"09:00 AM","closeTime":"08:00 PM"},{"day":"Saturday","isOpen":true,"openTime":"09:00 AM","closeTime":"08:00 PM"},{"day":"Sunday","isOpen":true,"openTime":"09:00 AM","closeTime":"08:00 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000007',
      'Castrol Bike Point – CSL Brothers – Soon Soon Lee Lee Motor Sdn Bhd',
      '5, Jalan Pandan Indah 1, Taman Pandan Indah, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '04-484 2492', 4.4, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"09:00 AM","closeTime":"09:00 PM"},{"day":"Tuesday","isOpen":true,"openTime":"09:00 AM","closeTime":"09:00 PM"},{"day":"Wednesday","isOpen":true,"openTime":"09:00 AM","closeTime":"09:00 PM"},{"day":"Thursday","isOpen":true,"openTime":"09:00 AM","closeTime":"09:00 PM"},{"day":"Friday","isOpen":true,"openTime":"09:00 AM","closeTime":"09:00 PM"},{"day":"Saturday","isOpen":true,"openTime":"09:00 AM","closeTime":"09:00 PM"},{"day":"Sunday","isOpen":true,"openTime":"09:00 AM","closeTime":"09:00 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000008',
      'Pit Stop Garage Motorsport',
      '34, Jalan Kemunting 1, Taman Kemunting, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '017-497 4961', 4.3, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"11:00 AM","closeTime":"08:00 PM"},{"day":"Tuesday","isOpen":true,"openTime":"11:00 AM","closeTime":"08:00 PM"},{"day":"Wednesday","isOpen":true,"openTime":"11:00 AM","closeTime":"08:00 PM"},{"day":"Thursday","isOpen":true,"openTime":"11:00 AM","closeTime":"08:00 PM"},{"day":"Friday","isOpen":true,"openTime":"03:00 PM","closeTime":"08:00 PM"},{"day":"Saturday","isOpen":true,"openTime":"11:00 AM","closeTime":"08:00 PM"},{"day":"Sunday","isOpen":false,"openTime":"11:00 AM","closeTime":"08:00 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000009',
      'Lian Motor / Lian Auto Parts Trading',
      '691, Tingkat Bawah, Lorong Kemuning, Taman Keranji 2, Kulim, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '012-566 9255', 4.3, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"01:00 PM","closeTime":"09:00 PM"},{"day":"Tuesday","isOpen":true,"openTime":"01:00 PM","closeTime":"09:00 PM"},{"day":"Wednesday","isOpen":true,"openTime":"01:00 PM","closeTime":"09:00 PM"},{"day":"Thursday","isOpen":true,"openTime":"01:00 PM","closeTime":"09:00 PM"},{"day":"Friday","isOpen":false,"openTime":"01:00 PM","closeTime":"09:00 PM"},{"day":"Saturday","isOpen":true,"openTime":"01:00 PM","closeTime":"09:00 PM"},{"day":"Sunday","isOpen":true,"openTime":"01:00 PM","closeTime":"09:00 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000010',
      'CKT MOTOR KULIM',
      '195-197, Tingkat Bawah, Jalan Lunas, Taman Seluang, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '016-861 1241', 4.9, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"10:15 AM","closeTime":"06:45 PM"},{"day":"Tuesday","isOpen":true,"openTime":"10:15 AM","closeTime":"06:45 PM"},{"day":"Wednesday","isOpen":true,"openTime":"10:15 AM","closeTime":"06:45 PM"},{"day":"Thursday","isOpen":true,"openTime":"10:15 AM","closeTime":"06:45 PM"},{"day":"Friday","isOpen":true,"openTime":"10:15 AM","closeTime":"06:45 PM"},{"day":"Saturday","isOpen":true,"openTime":"10:15 AM","closeTime":"06:45 PM"},{"day":"Sunday","isOpen":true,"openTime":"10:15 AM","closeTime":"06:45 PM"}]'::jsonb
    ),
    (
      'b0000000-0000-0000-0000-000000000011',
      'Chong Hun Motor Kulim Enterprise',
      '186K & 186L, Jalan Simpang Tiga Keladi, Keladi, 09000 Kulim, Kedah',
      'Kulim', 'Kedah', '04-492 7227', 4.7, FALSE, FALSE, TRUE, 'approved', 'active',
      '[{"day":"Monday","isOpen":true,"openTime":"08:30 AM","closeTime":"06:30 PM"},{"day":"Tuesday","isOpen":true,"openTime":"08:30 AM","closeTime":"06:30 PM"},{"day":"Wednesday","isOpen":true,"openTime":"08:30 AM","closeTime":"06:30 PM"},{"day":"Thursday","isOpen":true,"openTime":"08:30 AM","closeTime":"06:30 PM"},{"day":"Friday","isOpen":true,"openTime":"08:30 AM","closeTime":"06:30 PM"},{"day":"Saturday","isOpen":true,"openTime":"08:30 AM","closeTime":"06:30 PM"},{"day":"Sunday","isOpen":false,"openTime":"08:30 AM","closeTime":"06:30 PM"}]'::jsonb
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    phone = EXCLUDED.phone,
    rating = EXCLUDED.rating,
    is_partner = EXCLUDED.is_partner,
    booking_enabled = EXCLUDED.booking_enabled,
    operating_hours = EXCLUDED.operating_hours;
END $$;

-- ─── WORKSHOP REVIEW SYSTEM ADDITIONS ────────────────────────

-- Add google_review_url and optional Google fields to workshops
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_review_url TEXT;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_rating NUMERIC(2,1);
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS google_review_count INTEGER;

-- Add motorcycle_id to reviews (links review to the motorcycle used in the booking)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS motorcycle_id UUID REFERENCES public.motorcycles(id) ON DELETE SET NULL;

-- Seed Wan Legacy Motor google_review_url
UPDATE public.workshops
SET google_review_url = 'https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID'
WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- ─── REVIEW PHOTOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id   UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  file_path   TEXT,
  caption     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_photos_review ON public.review_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON public.reviews(booking_id);

-- RLS for review_photos
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_photos_public_read" ON public.review_photos;
CREATE POLICY "review_photos_public_read" ON public.review_photos FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "review_photos_owner_insert" ON public.review_photos;
CREATE POLICY "review_photos_owner_insert" ON public.review_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.customer_id = auth.uid()));

DROP POLICY IF EXISTS "review_photos_owner_delete" ON public.review_photos;
CREATE POLICY "review_photos_owner_delete" ON public.review_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.customer_id = auth.uid()) OR get_my_role() = 'super_admin');

-- Add review_photos to realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'review_photos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.review_photos;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- RIDERHOOD SECURE PASSWORD RESET SYSTEM WITH 5-REQUEST RATE LIMITING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_limits (
  email_hash TEXT PRIMARY KEY,
  user_id UUID,
  request_count INT NOT NULL DEFAULT 1,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.password_reset_verifications (
  email_hash TEXT PRIMARY KEY,
  user_id UUID,
  code_hash TEXT,
  expires_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_limits_blocked ON public.password_reset_limits(blocked_until);
CREATE INDEX IF NOT EXISTS idx_pw_reset_verif_expires ON public.password_reset_verifications(expires_at);

ALTER TABLE public.password_reset_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct public access to limits" ON public.password_reset_limits;
CREATE POLICY "Deny direct public access to limits"
  ON public.password_reset_limits FOR ALL
  TO public
  USING (false);

DROP POLICY IF EXISTS "Deny direct public access to verifications" ON public.password_reset_verifications;
CREATE POLICY "Deny direct public access to verifications"
  ON public.password_reset_verifications FOR ALL
  TO public
  USING (false);

CREATE OR REPLACE FUNCTION public.request_password_reset_code(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_normalized_email TEXT;
  v_email_hash TEXT;
  v_user_id UUID;
  v_limit_record RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_window_interval INTERVAL := INTERVAL '15 minutes';
  v_cooldown_interval INTERVAL := INTERVAL '60 seconds';
  v_code_expiry_interval INTERVAL := INTERVAL '5 minutes';
  v_max_requests INT := 5;
  v_raw_code TEXT;
  v_code_hash TEXT;
  v_masked_email TEXT;
  v_remaining_seconds INT;
  v_at_idx INT;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email', 'message', 'Please enter a valid email address.');
  END IF;

  v_normalized_email := lower(trim(p_email));
  v_email_hash := encode(digest(v_normalized_email, 'sha256'), 'hex');

  v_at_idx := position('@' in v_normalized_email);
  IF v_at_idx > 2 THEN
    v_masked_email := substring(v_normalized_email from 1 for 1) || '***' || substring(v_normalized_email from v_at_idx - 1);
  ELSE
    v_masked_email := v_normalized_email;
  END IF;

  SELECT * INTO v_limit_record FROM public.password_reset_limits WHERE email_hash = v_email_hash FOR UPDATE;

  IF FOUND THEN
    IF v_limit_record.blocked_until IS NOT NULL AND v_limit_record.blocked_until > v_now THEN
      v_remaining_seconds := EXTRACT(EPOCH FROM (v_limit_record.blocked_until - v_now))::INT;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'rate_limited',
        'message', 'Too many verification code requests. Please try again later.',
        'retry_after_seconds', v_remaining_seconds,
        'remaining_minutes', CEIL(v_remaining_seconds / 60.0)
      );
    END IF;

    IF v_limit_record.last_requested_at + v_cooldown_interval > v_now THEN
      v_remaining_seconds := EXTRACT(EPOCH FROM ((v_limit_record.last_requested_at + v_cooldown_interval) - v_now))::INT;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'resend_cooldown',
        'message', 'Please wait before requesting another code.',
        'retry_after_seconds', v_remaining_seconds
      );
    END IF;

    IF v_limit_record.window_started_at + v_window_interval < v_now THEN
      UPDATE public.password_reset_limits
      SET request_count = 1,
          window_started_at = v_now,
          last_requested_at = v_now,
          blocked_until = NULL,
          updated_at = v_now
      WHERE email_hash = v_email_hash;
    ELSE
      IF v_limit_record.request_count >= v_max_requests THEN
        UPDATE public.password_reset_limits
        SET blocked_until = v_limit_record.window_started_at + v_window_interval,
            last_requested_at = v_now,
            updated_at = v_now
        WHERE email_hash = v_email_hash;

        v_remaining_seconds := EXTRACT(EPOCH FROM ((v_limit_record.window_started_at + v_window_interval) - v_now))::INT;
        RETURN jsonb_build_object(
          'success', false,
          'error', 'rate_limited',
          'message', 'Too many verification code requests. Please try again later.',
          'retry_after_seconds', v_remaining_seconds,
          'remaining_minutes', CEIL(v_remaining_seconds / 60.0)
        );
      ELSE
        UPDATE public.password_reset_limits
        SET request_count = v_limit_record.request_count + 1,
            last_requested_at = v_now,
            updated_at = v_now
        WHERE email_hash = v_email_hash;
      END IF;
    END IF;
  ELSE
    INSERT INTO public.password_reset_limits (email_hash, request_count, window_started_at, last_requested_at, created_at, updated_at)
    VALUES (v_email_hash, 1, v_now, v_now, v_now, v_now);
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_normalized_email LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'If an account exists for this email address, a verification code has been sent.',
      'cooldown_seconds', 60,
      'expires_in_seconds', 300,
      'masked_email', v_masked_email,
      'requests_remaining', GREATEST(0, v_max_requests - COALESCE(v_limit_record.request_count + 1, 1))
    );
  END IF;

  v_raw_code := lpad(((floor(random() * 900000) + 100000)::INT)::TEXT, 6, '0');
  v_code_hash := encode(digest(v_raw_code || v_email_hash || 'riderhood_salt_2026', 'sha256'), 'hex');

  INSERT INTO public.password_reset_verifications (
    email_hash,
    user_id,
    code_hash,
    expires_at,
    attempt_count,
    verified_at,
    reset_token_hash,
    reset_token_expires_at,
    created_at,
    updated_at
  )
  VALUES (
    v_email_hash,
    v_user_id,
    v_code_hash,
    v_now + v_code_expiry_interval,
    0,
    NULL,
    NULL,
    NULL,
    v_now,
    v_now
  )
  ON CONFLICT (email_hash) DO UPDATE
  SET user_id = v_user_id,
      code_hash = v_code_hash,
      expires_at = v_now + v_code_expiry_interval,
      attempt_count = 0,
      verified_at = NULL,
      reset_token_hash = NULL,
      reset_token_expires_at = NULL,
      updated_at = v_now;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'security',
    'Password Reset Verification Code',
    'Your 6-digit RiderHood verification code is ' || v_raw_code || '. It expires in 5 minutes.',
    jsonb_build_object('code', v_raw_code, 'expires_at', (v_now + v_code_expiry_interval))
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'If an account exists for this email address, a verification code has been sent.',
    'cooldown_seconds', 60,
    'expires_in_seconds', 300,
    'masked_email', v_masked_email,
    'requests_remaining', GREATEST(0, v_max_requests - COALESCE(v_limit_record.request_count + 1, 1))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_password_reset_code(p_email TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_normalized_email TEXT;
  v_email_hash TEXT;
  v_verif_record RECORD;
  v_input_hash TEXT;
  v_reset_token TEXT;
  v_token_hash TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_attempts_left INT;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' OR p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input', 'message', 'Please enter all 6 digits.');
  END IF;

  v_normalized_email := lower(trim(p_email));
  v_email_hash := encode(digest(v_normalized_email, 'sha256'), 'hex');

  SELECT * INTO v_verif_record FROM public.password_reset_verifications WHERE email_hash = v_email_hash FOR UPDATE;

  IF NOT FOUND OR v_verif_record.code_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code', 'message', 'Invalid or expired verification code.');
  END IF;

  IF v_verif_record.expires_at < v_now THEN
    UPDATE public.password_reset_verifications SET code_hash = NULL WHERE email_hash = v_email_hash;
    RETURN jsonb_build_object('success', false, 'error', 'code_expired', 'message', 'Your verification code has expired. Please request a new code.');
  END IF;

  IF v_verif_record.attempt_count >= 5 THEN
    UPDATE public.password_reset_verifications SET code_hash = NULL WHERE email_hash = v_email_hash;
    RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts', 'message', 'Too many incorrect attempts. Please request a new verification code.');
  END IF;

  v_input_hash := encode(digest(trim(p_code) || v_email_hash || 'riderhood_salt_2026', 'sha256'), 'hex');

  IF v_input_hash <> v_verif_record.code_hash THEN
    UPDATE public.password_reset_verifications
    SET attempt_count = v_verif_record.attempt_count + 1,
        updated_at = v_now
    WHERE email_hash = v_email_hash;

    v_attempts_left := 5 - (v_verif_record.attempt_count + 1);
    IF v_attempts_left <= 0 THEN
      UPDATE public.password_reset_verifications SET code_hash = NULL WHERE email_hash = v_email_hash;
      RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts', 'message', 'Too many incorrect attempts. Please request a new verification code.');
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'incorrect_code',
      'attempts_left', v_attempts_left,
      'message', 'Incorrect verification code. ' || v_attempts_left || ' attempts remaining.'
    );
  END IF;

  v_reset_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_reset_token || 'riderhood_token_salt_2026', 'sha256'), 'hex');

  UPDATE public.password_reset_verifications
  SET code_hash = NULL,
      verified_at = v_now,
      reset_token_hash = v_token_hash,
      reset_token_expires_at = v_now + INTERVAL '10 minutes',
      updated_at = v_now
  WHERE email_hash = v_email_hash;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Code verified successfully.',
    'reset_token', v_reset_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_password_reset(p_email TEXT, p_reset_token TEXT, p_new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_normalized_email TEXT;
  v_email_hash TEXT;
  v_verif_record RECORD;
  v_token_hash TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_pw_len INT;
BEGIN
  IF p_email IS NULL OR p_reset_token IS NULL OR p_new_password IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input', 'message', 'Missing required parameters.');
  END IF;

  v_normalized_email := lower(trim(p_email));
  v_email_hash := encode(digest(v_normalized_email, 'sha256'), 'hex');
  v_pw_len := length(p_new_password);

  IF v_pw_len < 12 THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must be at least 12 characters long.');
  END IF;

  IF p_new_password !~ '[A-Z]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must include at least one uppercase letter.');
  END IF;

  IF p_new_password !~ '[a-z]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must include at least one lowercase letter.');
  END IF;

  IF p_new_password !~ '[0-9]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must include at least one number.');
  END IF;

  IF p_new_password !~ '[^A-Za-z0-9]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must include at least one special character.');
  END IF;

  SELECT * INTO v_verif_record FROM public.password_reset_verifications WHERE email_hash = v_email_hash FOR UPDATE;

  IF NOT FOUND OR v_verif_record.reset_token_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_session', 'message', 'Invalid or expired password reset session.');
  END IF;

  IF v_verif_record.reset_token_expires_at < v_now THEN
    UPDATE public.password_reset_verifications SET reset_token_hash = NULL WHERE email_hash = v_email_hash;
    RETURN jsonb_build_object('success', false, 'error', 'session_expired', 'message', 'Password reset session has expired. Please start over.');
  END IF;

  v_token_hash := encode(digest(trim(p_reset_token) || 'riderhood_token_salt_2026', 'sha256'), 'hex');

  IF v_token_hash <> v_verif_record.reset_token_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token', 'message', 'Invalid reset token.');
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = v_now
  WHERE id = v_verif_record.user_id;

  UPDATE public.password_reset_verifications
  SET reset_token_hash = NULL,
      reset_token_expires_at = NULL,
      verified_at = NULL,
      updated_at = v_now
  WHERE email_hash = v_email_hash;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_verif_record.user_id,
    'security',
    'Password Changed Successfully',
    'Your RiderHood password was updated successfully. If you did not perform this action, please contact support immediately.',
    jsonb_build_object('updated_at', v_now)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_limits WHERE updated_at < NOW() - INTERVAL '30 days';
  DELETE FROM public.password_reset_verifications WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$;


