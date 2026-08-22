--- ============================================================
-- RiderHood — Complete Spare Parts / Products & Inventory Schema
-- Migration: 20260822_create_product_catalog.sql
-- ============================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 0. WORKSHOPS ONLINE BOOKING COLUMN ──────────────────────
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS online_booking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT FALSE;

-- Synchronize Wan Legacy Motor as sole online booking partner
UPDATE public.workshops
SET online_booking_enabled = TRUE, booking_enabled = TRUE
WHERE id = 'b0000000-0000-0000-0000-000000000001' OR name ILIKE '%Wan Legacy%';

UPDATE public.workshops
SET online_booking_enabled = FALSE, booking_enabled = FALSE
WHERE id != 'b0000000-0000-0000-0000-000000000001' AND name NOT ILIKE '%Wan Legacy%';

-- ─── 1. PRODUCT CATEGORIES TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. PRODUCTS TABLE (MASTER CATALOGUE) ────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  specification TEXT,
  sku           TEXT NOT NULL UNIQUE,
  description   TEXT,
  unit          TEXT NOT NULL DEFAULT 'pcs',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_category_spec UNIQUE (category_id, specification)
);

-- ─── 3. WORKSHOP PRODUCTS (WORKSHOP-SPECIFIC PRICING & STOCK) ──
CREATE TABLE IF NOT EXISTS public.workshop_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id     UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock_quantity  INTEGER NOT NULL DEFAULT 10 CHECK (stock_quantity >= 0),
  minimum_stock   INTEGER NOT NULL DEFAULT 3 CHECK (minimum_stock >= 0),
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workshop_product UNIQUE (workshop_id, product_id)
);

-- ─── 4. INVENTORY TRANSACTIONS TABLE ─────────────────────────
-- Ensure inventory_transactions supports product_id references
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id         UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES public.products(id) ON DELETE CASCADE,
  part_id             UUID REFERENCES public.parts(id) ON DELETE CASCADE,
  quantity_change     INTEGER NOT NULL DEFAULT 0,
  transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return', 'damage', 'correction', 'add', 'remove', 'set', 'service_used')),
  previous_quantity   INTEGER NOT NULL DEFAULT 0,
  new_quantity        INTEGER NOT NULL DEFAULT 0,
  reason              TEXT,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to inventory_transactions if table existed previously
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_transactions' AND column_name = 'product_id') THEN
    ALTER TABLE public.inventory_transactions ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_transactions' AND column_name = 'quantity_change') THEN
    ALTER TABLE public.inventory_transactions ADD COLUMN quantity_change INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_transactions' AND column_name = 'transaction_type') THEN
    ALTER TABLE public.inventory_transactions ADD COLUMN transaction_type TEXT;
  END IF;
END $$;

-- Ensure unique constraint on services table for idempotent upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_workshop_service_name'
  ) THEN
    ALTER TABLE public.services ADD CONSTRAINT uq_workshop_service_name UNIQUE (workshop_id, name);
  END IF;
END $$;

-- ─── 5. SERVICE PRODUCTS (PACKAGE RELATIONSHIPS) ─────────────
CREATE TABLE IF NOT EXISTS public.service_products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id  UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_service_product UNIQUE (service_id, product_id)
);

-- ─── 6. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;

-- Product Categories Policies
DROP POLICY IF EXISTS "Public can view active product categories" ON public.product_categories;
CREATE POLICY "Public can view active product categories" ON public.product_categories
  FOR SELECT USING (is_active = TRUE OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'workshop_admin')
  ));

DROP POLICY IF EXISTS "Super admins can manage product categories" ON public.product_categories;
CREATE POLICY "Super admins can manage product categories" ON public.product_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- Products Policies
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (is_active = TRUE OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'workshop_admin')
  ));

DROP POLICY IF EXISTS "Super admins can manage products" ON public.products;
CREATE POLICY "Super admins can manage products" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- Workshop Products Policies
DROP POLICY IF EXISTS "Public can view available workshop products" ON public.workshop_products;
CREATE POLICY "Public can view available workshop products" ON public.workshop_products
  FOR SELECT USING (
    is_available = TRUE OR EXISTS (
      SELECT 1 FROM public.workshops 
      WHERE workshops.id = workshop_products.workshop_id 
      AND workshops.owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Workshop Admins manage their own products" ON public.workshop_products;
CREATE POLICY "Workshop Admins manage their own products" ON public.workshop_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workshops 
      WHERE workshops.id = workshop_products.workshop_id 
      AND workshops.owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

-- Inventory Transactions Policies
DROP POLICY IF EXISTS "Workshop Admins and Super Admins view transactions" ON public.inventory_transactions;
CREATE POLICY "Workshop Admins and Super Admins view transactions" ON public.inventory_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workshops 
      WHERE workshops.id = inventory_transactions.workshop_id 
      AND workshops.owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Workshop Admins insert transactions for their workshop" ON public.inventory_transactions;
CREATE POLICY "Workshop Admins insert transactions for their workshop" ON public.inventory_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workshops 
      WHERE workshops.id = inventory_transactions.workshop_id 
      AND workshops.owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

-- Service Products Policies
DROP POLICY IF EXISTS "Public can view service products" ON public.service_products;
CREATE POLICY "Public can view service products" ON public.service_products
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Workshop Admins and Super Admins manage service products" ON public.service_products;
CREATE POLICY "Workshop Admins and Super Admins manage service products" ON public.service_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.services 
      JOIN public.workshops ON workshops.id = services.workshop_id
      WHERE services.id = service_products.service_id 
      AND workshops.owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );
