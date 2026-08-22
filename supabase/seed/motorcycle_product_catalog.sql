-- ============================================================
-- RiderHood — Master Motorcycle Products & Pricing Catalogue Seed
-- Database Seed: motorcycle_product_catalog.sql
-- Exactly 15 Categories, 43 Unique Products, 430 Workshop Prices
-- ============================================================

DO $$
DECLARE
  v_lh_id     UUID;
  v_hk_id     UUID;
  v_hai_id    UUID;
  v_yn_id     UUID;
  v_csl_id    UUID;
  v_pit_id    UUID;
  v_lian_id   UUID;
  v_ckt_id    UUID;
  v_ch_id     UUID;
  v_wan_id    UUID;

  v_cat_oil_id     UUID;
  v_cat_gear_id    UUID;
  v_cat_chain_id   UUID;
  v_cat_tyref_id   UUID;
  v_cat_tyrer_id   UUID;
  v_cat_brake_id   UUID;
  v_cat_cvt_id     UUID;
  v_cat_spark_id   UUID;
  v_cat_bat_id     UUID;
  v_cat_tb_id      UUID;
  v_cat_cool_id    UUID;
  v_cat_bf_id      UUID;
  v_cat_fork_id    UUID;
  v_cat_2t_id      UUID;
  v_cat_svc_id     UUID;

BEGIN
  -- ─── STEP 0: ENSURE ALL 11 WORKSHOPS EXIST WITH BOOKING FLAGS ──
  INSERT INTO public.workshops (id, name, address, district, state, phone, rating, is_partner, booking_enabled, online_booking_enabled, is_open, verification_status, status)
  VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Wan Legacy Motor', 'Ground Floor No. 55, Lorong Kota Kenari 1/1, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '017-455 2184', 4.4, TRUE, TRUE, TRUE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000002', 'LHMotor @ Kelang Lama', '65-68 Taman Manggis III, Jalan Kelang Lama, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '04-491 9800', 4.4, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000003', 'HK MOTOR KULIM, KEDAH', 'No. 254, Jalan Tunku Putra, Taman Tunku Putra, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '04-494 4489', 4.4, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000004', 'Eu Li Motor Sdn Bhd', '76 A, Lorong Kemuning 1, Taman Kemuning, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '04-491 0590', 4.5, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000005', 'Hai Motorcycle Enterprise', '588, Jalan Kemuning 1, Taman Kemuning, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '016-441 7740', 4.1, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000006', 'Castrol Bike Point – Motor shop Yew Ngee', '2 & 3, Jalan Kelang Lama, Taman Manggis, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '012-477 8386', 4.0, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000007', 'Castrol Bike Point – CSL Brothers – Soon Soon Lee Lee Motor Sdn Bhd', '5, Jalan Pandan Indah 1, Taman Pandan Indah, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '04-484 2492', 4.4, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000008', 'Pit Stop Garage Motorsport', '34, Jalan Kemunting 1, Taman Kemunting, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '017-497 4961', 4.3, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000009', 'Lian Motor / Lian Auto Parts Trading', '691, Tingkat Bawah, Lorong Kemuning, Taman Keranji 2, Kulim, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '012-566 9255', 4.3, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000010', 'CKT MOTOR KULIM', '195-197, Tingkat Bawah, Jalan Lunas, Taman Seluang, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '016-861 1241', 4.9, FALSE, FALSE, FALSE, TRUE, 'approved', 'active'),
    ('b0000000-0000-0000-0000-000000000011', 'Chong Hun Motor Kulim Enterprise', '186K & 186L, Jalan Simpang Tiga Keladi, Keladi, 09000 Kulim, Kedah', 'Kulim', 'Kedah', '04-492 7227', 4.7, FALSE, FALSE, FALSE, TRUE, 'approved', 'active')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    is_partner = EXCLUDED.is_partner,
    booking_enabled = EXCLUDED.booking_enabled,
    online_booking_enabled = EXCLUDED.online_booking_enabled;

  -- ─── STEP 1: RESOLVE WORKSHOP UUIDs BY NAME OR ID ───────────
  SELECT id INTO v_lh_id   FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000002' OR name ILIKE '%LHMotor%' LIMIT 1;
  SELECT id INTO v_hk_id   FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000003' OR name ILIKE '%HK MOTOR%' LIMIT 1;
  SELECT id INTO v_hai_id  FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000005' OR name ILIKE '%Hai Motor%' LIMIT 1;
  SELECT id INTO v_yn_id   FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000006' OR name ILIKE '%Yew Ngee%' LIMIT 1;
  SELECT id INTO v_csl_id  FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000007' OR name ILIKE '%CSL Brothers%' OR name ILIKE '%Soon Soon Lee%' LIMIT 1;
  SELECT id INTO v_pit_id  FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000008' OR name ILIKE '%Pit Stop%' LIMIT 1;
  SELECT id INTO v_lian_id FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000009' OR name ILIKE '%Lian Motor%' LIMIT 1;
  SELECT id INTO v_ckt_id  FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000010' OR name ILIKE '%CKT MOTOR%' LIMIT 1;
  SELECT id INTO v_ch_id   FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000011' OR name ILIKE '%Chong Hun%' LIMIT 1;
  SELECT id INTO v_wan_id  FROM public.workshops WHERE id = 'b0000000-0000-0000-0000-000000000001' OR name ILIKE '%Wan Legacy%' LIMIT 1;

  -- ─── STEP 2: INSERT / UPSERT ALL 15 CATEGORIES ──────────────
  INSERT INTO public.product_categories (name, description, is_active)
  VALUES
    ('Minyak Hitam', 'Engine 4T motorcycle lubricants and oils (Mineral, Semi-Synthetic, Fully Synthetic)', TRUE),
    ('Gear Oil', 'Scooter and motorcycle final drive transmission gear lubricants', TRUE),
    ('Chain & Sprocket', 'Drive chains, front and rear sprockets (Standard, Heavy Duty, Racing)', TRUE),
    ('Tayar Depan', 'Motorcycle front tires and sport compounds', TRUE),
    ('Tayar Belakang', 'Motorcycle rear tires and performance compounds', TRUE),
    ('Brake Pad', 'Disc brake pads (Standard, Semi-Metallic, Ceramic)', TRUE),
    ('CVT', 'Automatic scooter CVT transmission servicing, cleaning, and overhaul packages', TRUE),
    ('Spark Plug', 'Engine ignition spark plugs (Standard, Platinum, Iridium)', TRUE),
    ('Bateri', 'Motorcycle starter batteries (Conventional, Maintenance Free, Gel)', TRUE),
    ('Throttle Body', 'Fuel injection throttle body cleaning, servicing, and calibration', TRUE),
    ('Coolant', 'Engine radiator cooling fluids (Standard, Long Life)', TRUE),
    ('Brake Fluid', 'Hydraulic brake fluid (DOT 3, DOT 4)', TRUE),
    ('Fork Oil', 'Front suspension telescopic fork damping oils (Standard, Heavy Duty)', TRUE),
    ('2T', 'Two-stroke engine injection and premix oils', TRUE),
    ('Full Service', 'Comprehensive complete motorcycle periodic inspection and maintenance packages', TRUE)
  ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = TRUE;

  -- Capture Category IDs
  SELECT id INTO v_cat_oil_id   FROM public.product_categories WHERE name = 'Minyak Hitam';
  SELECT id INTO v_cat_gear_id  FROM public.product_categories WHERE name = 'Gear Oil';
  SELECT id INTO v_cat_chain_id FROM public.product_categories WHERE name = 'Chain & Sprocket';
  SELECT id INTO v_cat_tyref_id FROM public.product_categories WHERE name = 'Tayar Depan';
  SELECT id INTO v_cat_tyrer_id FROM public.product_categories WHERE name = 'Tayar Belakang';
  SELECT id INTO v_cat_brake_id FROM public.product_categories WHERE name = 'Brake Pad';
  SELECT id INTO v_cat_cvt_id   FROM public.product_categories WHERE name = 'CVT';
  SELECT id INTO v_cat_spark_id FROM public.product_categories WHERE name = 'Spark Plug';
  SELECT id INTO v_cat_bat_id   FROM public.product_categories WHERE name = 'Bateri';
  SELECT id INTO v_cat_tb_id    FROM public.product_categories WHERE name = 'Throttle Body';
  SELECT id INTO v_cat_cool_id  FROM public.product_categories WHERE name = 'Coolant';
  SELECT id INTO v_cat_bf_id    FROM public.product_categories WHERE name = 'Brake Fluid';
  SELECT id INTO v_cat_fork_id  FROM public.product_categories WHERE name = 'Fork Oil';
  SELECT id INTO v_cat_2t_id    FROM public.product_categories WHERE name = '2T';
  SELECT id INTO v_cat_svc_id   FROM public.product_categories WHERE name = 'Full Service';

  -- ─── STEP 3: INSERT / UPSERT ALL 43 PRODUCTS WITH STABLE SKUs ─
  
  -- Category 1: Minyak Hitam (7 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_oil_id, 'Minyak Hitam 10W-30 Mineral', '10W-30 Mineral', 'OIL-10W30-MIN', 'bottle', TRUE),
    (v_cat_oil_id, 'Minyak Hitam 10W-40 Mineral', '10W-40 Mineral', 'OIL-10W40-MIN', 'bottle', TRUE),
    (v_cat_oil_id, 'Minyak Hitam 20W-50 Mineral', '20W-50 Mineral', 'OIL-20W50-MIN', 'bottle', TRUE),
    (v_cat_oil_id, 'Minyak Hitam 10W-40 Semi Syn', '10W-40 Semi Syn', 'OIL-10W40-SEMI', 'bottle', TRUE),
    (v_cat_oil_id, 'Minyak Hitam 15W-50 Semi Syn', '15W-50 Semi Syn', 'OIL-15W50-SEMI', 'bottle', TRUE),
    (v_cat_oil_id, 'Minyak Hitam 10W-40 Fully Syn', '10W-40 Fully Syn', 'OIL-10W40-FULL', 'bottle', TRUE),
    (v_cat_oil_id, 'Minyak Hitam 10W-50 Fully Syn', '10W-50 Fully Syn', 'OIL-10W50-FULL', 'bottle', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 2: Gear Oil (2 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_gear_id, 'Gear Oil Standard', 'Standard', 'GEAR-OIL-STD', 'tube', TRUE),
    (v_cat_gear_id, 'Gear Oil Premium', 'Premium', 'GEAR-OIL-PREM', 'tube', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 3: Chain & Sprocket (4 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_chain_id, 'Chain & Sprocket 420 Standard', '420 Standard', 'CHAIN-420-STD', 'set', TRUE),
    (v_cat_chain_id, 'Chain & Sprocket 428 Standard', '428 Standard', 'CHAIN-428-STD', 'set', TRUE),
    (v_cat_chain_id, 'Chain & Sprocket 428 Heavy Duty', '428 Heavy Duty', 'CHAIN-428-HD', 'set', TRUE),
    (v_cat_chain_id, 'Chain & Sprocket 520 Racing', '520 Racing', 'CHAIN-520-RAC', 'set', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 4: Tayar Depan (4 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_tyref_id, 'Tayar Depan 70/90-17 Standard', '70/90-17 Standard', 'TIRE-F-7090-17-STD', 'unit', TRUE),
    (v_cat_tyref_id, 'Tayar Depan 80/90-17 Standard', '80/90-17 Standard', 'TIRE-F-8090-17-STD', 'unit', TRUE),
    (v_cat_tyref_id, 'Tayar Depan 80/90-17 Sport', '80/90-17 Sport', 'TIRE-F-8090-17-SPT', 'unit', TRUE),
    (v_cat_tyref_id, 'Tayar Depan 90/80-17 Sport', '90/80-17 Sport', 'TIRE-F-9080-17-SPT', 'unit', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 5: Tayar Belakang (4 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_tyrer_id, 'Tayar Belakang 80/90-17 Standard', '80/90-17 Standard', 'TIRE-R-8090-17-STD', 'unit', TRUE),
    (v_cat_tyrer_id, 'Tayar Belakang 90/80-17 Standard', '90/80-17 Standard', 'TIRE-R-9080-17-STD', 'unit', TRUE),
    (v_cat_tyrer_id, 'Tayar Belakang 100/80-17 Sport', '100/80-17 Sport', 'TIRE-R-10080-17-SPT', 'unit', TRUE),
    (v_cat_tyrer_id, 'Tayar Belakang 110/70-17 Sport', '110/70-17 Sport', 'TIRE-R-11070-17-SPT', 'unit', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 6: Brake Pad (3 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_brake_id, 'Brake Pad Standard', 'Standard', 'BRAKE-PAD-STD', 'pair', TRUE),
    (v_cat_brake_id, 'Brake Pad Semi-Metallic', 'Semi-Metallic', 'BRAKE-PAD-SEMI', 'pair', TRUE),
    (v_cat_brake_id, 'Brake Pad Ceramic', 'Ceramic', 'BRAKE-PAD-CERAMIC', 'pair', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 7: CVT (3 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_cvt_id, 'CVT Cleaning', 'Cleaning', 'CVT-CLEANING', 'package', TRUE),
    (v_cat_cvt_id, 'CVT Service', 'Service', 'CVT-SERVICE', 'package', TRUE),
    (v_cat_cvt_id, 'CVT Overhaul', 'Overhaul', 'CVT-OVERHAUL', 'package', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 8: Spark Plug (3 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_spark_id, 'Spark Plug Standard', 'Standard', 'SPARK-PLUG-STD', 'pcs', TRUE),
    (v_cat_spark_id, 'Spark Plug Platinum', 'Platinum', 'SPARK-PLUG-PLAT', 'pcs', TRUE),
    (v_cat_spark_id, 'Spark Plug Iridium', 'Iridium', 'SPARK-PLUG-IRID', 'pcs', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 9: Bateri (3 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_bat_id, 'Bateri Conventional', 'Conventional', 'BAT-CONV', 'unit', TRUE),
    (v_cat_bat_id, 'Bateri Maintenance Free', 'Maintenance Free', 'BAT-MF', 'unit', TRUE),
    (v_cat_bat_id, 'Bateri Gel', 'Gel', 'BAT-GEL', 'unit', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 10: Throttle Body (2 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_tb_id, 'Throttle Body Cleaning', 'Cleaning', 'TB-CLEANING', 'service', TRUE),
    (v_cat_tb_id, 'Throttle Body Service', 'Service', 'TB-SERVICE', 'service', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 11: Coolant (2 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_cool_id, 'Coolant Standard', 'Standard', 'COOLANT-STD', 'bottle', TRUE),
    (v_cat_cool_id, 'Coolant Long Life', 'Long Life', 'COOLANT-LL', 'bottle', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 12: Brake Fluid (2 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_bf_id, 'Brake Fluid DOT 3', 'DOT 3', 'BRAKE-FLUID-DOT3', 'bottle', TRUE),
    (v_cat_bf_id, 'Brake Fluid DOT 4', 'DOT 4', 'BRAKE-FLUID-DOT4', 'bottle', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 13: Fork Oil (2 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_fork_id, 'Fork Oil Standard', 'Standard', 'FORK-OIL-STD', 'bottle', TRUE),
    (v_cat_fork_id, 'Fork Oil Heavy Duty', 'Heavy Duty', 'FORK-OIL-HD', 'bottle', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 14: 2T (3 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_2t_id, '2T Standard', 'Standard', '2T-OIL-STD', 'bottle', TRUE),
    (v_cat_2t_id, '2T Semi Synthetic', 'Semi Synthetic', '2T-OIL-SEMI', 'bottle', TRUE),
    (v_cat_2t_id, '2T Fully Synthetic', 'Fully Synthetic', '2T-OIL-FULL', 'bottle', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- Category 15: Full Service (2 products)
  INSERT INTO public.products (category_id, name, specification, sku, unit, is_active)
  VALUES
    (v_cat_svc_id, 'Full Service Basic', 'Basic', 'FULL-SVC-BASIC', 'package', TRUE),
    (v_cat_svc_id, 'Full Service Premium', 'Premium', 'FULL-SVC-PREM', 'package', TRUE)
  ON CONFLICT (sku) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    specification = EXCLUDED.specification,
    unit = EXCLUDED.unit,
    is_active = TRUE;

  -- ─── STEP 4: SEED WORKSHOP-SPECIFIC PRICES (430 RECORDS) ────

  -- Helper Temporary Table for Matrix Insertion
  CREATE TEMP TABLE temp_workshop_matrix (
    sku         TEXT,
    lh_price    NUMERIC,
    hk_price    NUMERIC,
    hai_price   NUMERIC,
    yn_price    NUMERIC,
    csl_price   NUMERIC,
    pit_price   NUMERIC,
    lian_price  NUMERIC,
    ckt_price   NUMERIC,
    ch_price    NUMERIC,
    wan_price   NUMERIC
  ) ON COMMIT DROP;

  INSERT INTO temp_workshop_matrix (sku, lh_price, hk_price, hai_price, yn_price, csl_price, pit_price, lian_price, ckt_price, ch_price, wan_price)
  VALUES
    -- Minyak Hitam
    ('OIL-10W30-MIN',   25, 23, 22, 25, 28,  32, 22, 26, 25, 25),
    ('OIL-10W40-MIN',   28, 26, 25, 28, 31,  35, 25, 29, 28, 28),
    ('OIL-20W50-MIN',   25, 24, 23, 25, 29,  33, 23, 26, 25, 25),
    ('OIL-10W40-SEMI',  40, 38, 35, 40, 43,  52, 35, 41, 40, 40),
    ('OIL-15W50-SEMI',  42, 40, 38, 42, 46,  55, 38, 44, 42, 42),
    ('OIL-10W40-FULL',  55, 52, 50, 55, 59,  68, 50, 56, 54, 55),
    ('OIL-10W50-FULL',  60, 58, 55, 60, 64,  75, 55, 61, 59, 60),
    -- Gear Oil
    ('GEAR-OIL-STD',    15, 15, 12, 15, 18,  20, 12, 16, 15, 18),
    ('GEAR-OIL-PREM',   22, 20, 18, 22, 25,  28, 18, 23, 21, 25),
    -- Chain & Sprocket
    ('CHAIN-420-STD',  145, 140, 130, 145, 155, 185, 130, 145, 140, 150),
    ('CHAIN-428-STD',  150, 145, 135, 150, 165, 200, 135, 150, 145, 160),
    ('CHAIN-428-HD',   175, 170, 160, 175, 190, 225, 160, 175, 170, 180),
    ('CHAIN-520-RAC',  210, 200, 195, 210, 225, 260, 195, 215, 205, 220),
    -- Tayar Depan
    ('TIRE-F-7090-17-STD', 70, 65, 60, 70, 80,  95, 60, 70, 65, 75),
    ('TIRE-F-8090-17-STD', 75, 70, 65, 75, 85, 100, 65, 75, 70, 80),
    ('TIRE-F-8090-17-SPT', 85, 80, 75, 85, 95, 110, 75, 85, 80, 90),
    ('TIRE-F-9080-17-SPT', 95, 90, 85, 95, 105, 120, 85, 95, 90, 100),
    -- Tayar Belakang
    ('TIRE-R-8090-17-STD',  85,  80,  75,  85,  95, 115,  75,  85,  80,  90),
    ('TIRE-R-9080-17-STD',  90,  85,  80,  90, 100, 120,  80,  90,  85,  95),
    ('TIRE-R-10080-17-SPT', 105, 100,  95, 105, 115, 135,  95, 105, 100, 110),
    ('TIRE-R-11070-17-SPT', 115, 110, 105, 115, 125, 150, 105, 115, 110, 120),
    -- Brake Pad
    ('BRAKE-PAD-STD',     40, 38, 35, 40, 45, 55, 35, 42, 40, 45),
    ('BRAKE-PAD-SEMI',    50, 48, 45, 50, 55, 65, 45, 52, 50, 55),
    ('BRAKE-PAD-CERAMIC', 65, 62, 58, 65, 70, 80, 58, 68, 65, 70),
    -- CVT
    ('CVT-CLEANING',      45,  45,  40,  45,  50,  60,  40,  45,  45,  50),
    ('CVT-SERVICE',       65,  65,  60,  65,  70,  85,  60,  68,  65,  70),
    ('CVT-OVERHAUL',     110, 105, 100, 110, 120, 140, 100, 115, 110, 120),
    -- Spark Plug
    ('SPARK-PLUG-STD',    15, 15, 12, 15, 18, 20, 12, 15, 15, 18),
    ('SPARK-PLUG-PLAT',   28, 28, 25, 28, 30, 35, 25, 28, 28, 30),
    ('SPARK-PLUG-IRID',   35, 35, 32, 35, 38, 45, 32, 36, 35, 35),
    -- Bateri
    ('BAT-CONV',          55, 55, 50, 55, 60, 70, 50, 55, 55, 60),
    ('BAT-MF',            65, 65, 60, 65, 70, 80, 60, 68, 65, 65),
    ('BAT-GEL',           80, 78, 75, 80, 85, 95, 75, 82, 80, 85),
    -- Throttle Body
    ('TB-CLEANING',       50, 45, 40, 50, 55, 65, 40, 50, 45, 55),
    ('TB-SERVICE',        70, 65, 60, 70, 75, 85, 60, 70, 65, 75),
    -- Coolant
    ('COOLANT-STD',       20, 18, 18, 20, 22, 25, 18, 20, 20, 22),
    ('COOLANT-LL',        28, 25, 25, 28, 30, 35, 25, 28, 27, 30),
    -- Brake Fluid
    ('BRAKE-FLUID-DOT3',  15, 15, 12, 15, 18, 20, 12, 16, 15, 18),
    ('BRAKE-FLUID-DOT4',  18, 18, 16, 18, 22, 25, 16, 20, 18, 22),
    -- Fork Oil
    ('FORK-OIL-STD',      20, 20, 18, 20, 22, 25, 18, 20, 20, 22),
    ('FORK-OIL-HD',       30, 28, 27, 30, 32, 35, 27, 30, 29, 32),
    -- 2T
    ('2T-OIL-STD',        15, 15, 13, 15, 18, 20, 13, 15, 15, 18),
    ('2T-OIL-SEMI',       25, 24, 22, 25, 28, 30, 22, 25, 25, 28),
    ('2T-OIL-FULL',       35, 33, 30, 35, 38, 40, 30, 35, 34, 38),
    -- Full Service
    ('FULL-SVC-BASIC',   100,  95,  90, 100, 115, 140,  90, 105, 100, 110),
    ('FULL-SVC-PREM',    135, 130, 120, 135, 150, 180, 120, 140, 135, 150);

  -- Insert workshop_products for each workshop
  -- 1. LHMotor
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_lh_id, p.id, m.lh_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 2. HK MOTOR
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_hk_id, p.id, m.hk_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 3. Hai Motorcycle
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_hai_id, p.id, m.hai_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 4. Yew Ngee
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_yn_id, p.id, m.yn_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 5. CSL Brothers
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_csl_id, p.id, m.csl_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 6. Pit Stop
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_pit_id, p.id, m.pit_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 7. Lian Motor
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_lian_id, p.id, m.lian_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 8. CKT Motor
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_ckt_id, p.id, m.ckt_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 9. Chong Hun
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_ch_id, p.id, m.ch_price, 15, 3, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- 10. Wan Legacy Motor (Our Primary Online Booking Partner)
  INSERT INTO public.workshop_products (workshop_id, product_id, price, stock_quantity, minimum_stock, is_available)
  SELECT v_wan_id, p.id, m.wan_price, 25, 5, TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  ON CONFLICT (workshop_id, product_id) DO UPDATE SET price = EXCLUDED.price;

  -- ─── STEP 5: POPULATE PUBLIC.SERVICES FOR WAN LEGACY & WORKSHOPS ──
  -- 1. Wan Legacy Motor (Bookable Services)
  INSERT INTO public.services (workshop_id, name, description, category, price, estimated_duration_minutes, is_available)
  SELECT 
    v_wan_id,
    p.name,
    CASE 
      WHEN p.specification IS NOT NULL THEN 'Specification: ' || p.specification || ' • Official Wan Legacy Service Package'
      ELSE 'Complete diagnostic, servicing, and installation package.'
    END,
    c.name,
    m.wan_price,
    CASE 
      WHEN c.name = 'Full Service' THEN 60
      WHEN c.name = 'CVT' THEN 45
      WHEN c.name = 'Throttle Body' THEN 40
      WHEN c.name = 'Chain & Sprocket' THEN 35
      WHEN c.name LIKE 'Tayar%' THEN 25
      ELSE 30
    END,
    TRUE
  FROM temp_workshop_matrix m
  JOIN public.products p ON p.sku = m.sku
  JOIN public.product_categories c ON c.id = p.category_id
  ON CONFLICT (workshop_id, name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    is_available = TRUE;

  RAISE NOTICE 'Product and Service catalogue seeding completed successfully!';
END $$;
