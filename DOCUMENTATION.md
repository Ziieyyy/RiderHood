# 🏍️ RiderHood Premium Moto Care — Master System Documentation

> **Version:** 1.0.0  
> **Platform:** Expo (SDK 54/57+), React Native, TypeScript, Expo Router v6  
> **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)  
> **Target Audience:** Developers, System Architects, Workshop Partners & Administrators  

---

## 📖 Table of Contents

1. [Executive System Overview](#1-executive-system-overview)
2. [System Architecture & Tech Stack](#2-system-architecture--tech-stack)
3. [User Personas & Role-Based Portals](#3-user-personas--role-based-portals)
4. [Routing, Navigation & Security Architecture](#4-routing-navigation--security-architecture)
5. [Complete Data Model & Database Schema](#5-complete-data-model--database-schema)
6. [Services & Business Logic Layer](#6-services--business-logic-layer)
7. [External Integrations & Realtime Subscriptions](#7-external-integrations--realtime-subscriptions)
8. [Design System & UI Aesthetics](#8-design-system--ui-aesthetics)
9. [Project Directory & File Structure](#9-project-directory--file-structure)
10. [Environment Configuration & Deployment Guide](#10-environment-configuration--deployment-guide)

---

## 1. Executive System Overview

**RiderHood Premium Moto Care** is an enterprise-grade, multi-tenant mobile application designed to connect motorcycle owners (Riders), motorcycle workshop labs, and system super-administrators in a unified digital ecosystem.

### Core Objectives
* **For Riders (Customers):** Provide a digital garage experience with engine telemetry monitoring, maintenance reminder alerts, online service appointment booking, expense tracking, and digital document management (insurance/road tax/receipts).
* **For Workshop Owners (Workshops):** Provide a complete workshop management lab for incoming booking queues, service rate configuration, parts inventory SKU management, customer directory management, and verified review management.
* **For Platform Administrators (Super Admins):** Provide a centralized command center to govern platform metrics, moderate users, verify workshop partners, oversee platform-wide bookings, broadcast system notices, and manage parts/service taxonomies.

---

## 2. System Architecture & Tech Stack

RiderHood is engineered as a **single unified cross-platform mobile codebase** supporting iOS, Android, and Web using modern React Native and Expo standards.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RIDERHOOD MOBILE APPLICATION                       │
│              (Expo SDK 54/57+ • React Native 0.81 • TypeScript 5.7)           │
├──────────────────────────────────┬──────────────────────────────────────────┤
│    Expo Router v6 File Routes    │        Global Context & UI Layer         │
│  • /(auth)      • /(customer)    │  • AuthContext (Role & Session State)     │
│  • /(workshop)  • /(admin)       │  • Theme Tokens & Health Gauges          │
└──────────────────────────────────┴──────────────────────────────────────────┘
                                      │
                         Supabase JS SDK v2 / REST API
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                           SUPABASE BACKEND CLOUD                            │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│  Supabase Auth   │  PostgreSQL DB   │ Supabase Storage │ Supabase Realtime  │
│  Role Metadata   │  17 SQL Tables   │ Bike/Doc Buckets │ Booking / Partner  │
└──────────────────┴──────────────────┴──────────────────┴────────────────────┘
                                      │
                    External API & Edge Function Integration
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                    Google Places API (New v1) & Edge Functions               │
│         Places Search • Place Details • Authentic Reviews • Working Hours   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Breakdown

| Layer | Technology | Purpose & Usage |
| :--- | :--- | :--- |
| **Framework** | [Expo SDK 54/57+](https://docs.expo.dev/) | Cross-platform runtime, native modules, web export |
| **Mobile Core** | React Native 0.81, React 19 | UI engine with Worklets and Reanimated v4 |
| **Navigation** | Expo Router v6 | File-based routing with layout route guards |
| **Language** | TypeScript 5.7 | End-to-end typed contracts and database interface types |
| **Database** | PostgreSQL (Supabase) | Multi-tenant schema with Foreign Keys and Row Level Security |
| **Authentication**| Supabase Auth | JWT-based auth linked with `public.profiles` role table |
| **Storage** | Supabase Storage | File uploads for bike photos, receipts, documents, reviews |
| **Realtime** | Supabase Realtime WebSocket | Live updates for incoming bookings and partner applications |
| **External APIs** | Google Places API (New) | Automatic workshop metadata, ratings, opening hours, reviews |

---

## 3. User Personas & Role-Based Portals

RiderHood serves three primary personas through role-based UI flows within a single app executable.

```
                  ┌───────────────────────────────┐
                  │      Unified Login Page       │
                  │       `/(auth)/welcome`       │
                  └───────────────┬───────────────┘
                                  │ Authenticate & Resolve Role
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
    ┌──────────────────┐┌──────────────────┐┌──────────────────┐
    │     Customer     ││  Workshop Admin  ││   Super Admin    │
    │  `/(customer)/*` ││  `/(workshop)/*` ││   `/(admin)/*`   │
    └──────────────────┘└──────────────────┘└──────────────────┘
```

### 1. 🏍️ Customer (Rider) Portal
* **Telemetry Dashboard (`/home`):** View active motorcycle, live health circular gauges (Engine oil, brakes, tyres, chain), current mileage, and quick booking access.
* **Workshop Discovery (`/workshops` & `/workshop-details`):** Search nearby certified workshops, view ratings, operational status, opening hours, Google reviews, and service options.
* **Appointment Booking (`/booking`):** Select motorcycle, workshop, desired services, pick date and time slot, and submit booking.
* **Digital Garage (`/garage`, `/setup-motorcycle`):** Register multiple motorcycles, specify engine CC, tyre sizes, engine oil type, upload photos.
* **Service History & Invoices (`/history`):** View past service records, itemized parts, mechanic notes, cost breakdowns, and digital receipts.
* **Maintenance & Reminders (`/maintenance`):** Track mileage logs, upcoming service triggers (e.g. oil change every 3,000 km), and mark reminders completed.
* **Document Wallet (`/documents`):** Digital vault for storing Insurance, Road Tax, Receipts, and Warranties with expiration warnings.
* **Expense Manager (`/expenses`):** Log and track financial expenditure categorized by Fuel, Parts, Maintenance, Insurance, and Road Tax.
* **Reviews & Feedback:** Rate completed workshop appointments and upload service proof photos.

### 2. 🛠️ Workshop Partner Portal
* **Workshop Dashboard (`/dashboard`):** Operational KPI overview (Today's bookings, revenue, service bay queue, pending reviews).
* **Booking Management Queue (`/bookings`):** Interactive booking workflow board:
  * Status Flow: `pending` ➔ `confirmed` ➔ `in_progress` ➔ `completed` (or `cancelled` / `rejected`).
* **Service Package Catalog (`/services`):** Configure labor packages, service descriptions, prices, and duration in minutes.
* **Parts Inventory SKU Manager (`/parts`):** Inventory tracking for parts, SKUs, unit pricing, stock quantities, and low stock thresholds (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`).
* **Customer Directory (`/customers`):** View vehicle service history per client.
* **Review Center (`/reviews`):** Monitor customer ratings, read comments, and publish official workshop responses.
* **Profile & Hours (`/profile`, `/settings`):** Update address, contact details, business hours, and operational status.

### 3. 🛡️ Super Admin Command Center
* **Executive Metrics Dashboard (`/admin`):** Platform-wide metrics (Total users, active workshops, platform bookings, overall platform revenue).
* **User Governance (`/admin/users`):** Account directory with moderation controls (`active`, `suspended`, `deleted`).
* **Workshop Partner Approval (`/admin/workshops`):** Approve or reject partner application submissions.
* **Global Booking Supervisor (`/admin/bookings`):** Platform-wide audit of all bookings across all workshops.
* **Central Master Directories (`/admin/services`, `/admin/parts`):** Global taxonomy and parts master list.
* **Broadcasting Engine (`/admin/notifications`):** Send push system-wide announcements to all active app users.
* **Google Places Auto-Sync Engine:** One-click automated synchronization of Google Place IDs, ratings, and reviews across all registered workshops.
* **Audit Logging:** System governance tracking of user status changes and workshop approvals.

---

## 4. Routing, Navigation & Security Architecture

### Single Point of Entry Authentication
Authentication is centralized at `src/app/(auth)/welcome.tsx`. 
The login flow resolves user credentials via Supabase Auth and fetches the assigned role from `public.profiles`.

```
User Input (Email + Password)
          │
          ▼
Supabase Auth (`auth.users`)
          │ (User UUID)
          ▼
Query `public.profiles` Table
          │
          ├──────────────────────────┬──────────────────────────┐
          ▼                          ▼                          ▼
   Role = 'customer'          Role = 'workshop_admin'      Role = 'super_admin'
   Redirect: /(customer)/home Redirect: /(workshop)/dash  Redirect: /(admin)
```

### Route Guard Enforcement (`src/app/_layout.tsx`)
The root layout components inspect `AuthContext` state and current route segments:
1. **Unauthenticated users** navigating to restricted routes are automatically redirected to `/(auth)/welcome`.
2. **Authenticated users** attempting to access routes outside their designated role group are re-routed to their respective home dashboard.

---

## 5. Complete Data Model & Database Schema

The database is built on **PostgreSQL (Supabase)** containing 17 interconnected tables.

```
                           ┌──────────────────┐
                           │  auth.users (id) │
                           └────────┬─────────┘
                                    │ 1:1
                           ┌────────┴─────────┐
                           │     profiles     │
                           └────────┬─────────┘
         ┌──────────────────────────┼──────────────────────────┐
         │ 1:N                      │ 1:N                      │ 1:N
┌────────┴─────────┐      ┌─────────┴────────┐       ┌─────────┴────────┐
│   motorcycles    │      │    workshops     │       │  notifications   │
└────────┬─────────┘      └─────────┬────────┘       └──────────────────┘
         │                          │
         ├──────────────┬───────────┼──────────────────────────┐
         │ 1:N          │ 1:N       │ 1:N                      │ 1:N
┌────────┴─────────┐ ┌──┴───────┐ ┌─┴────────────┐    ┌────────┴─────────┐
│   documents      │ │ expenses │ │  services    │    │      parts       │
└──────────────────┘ └──────────┘ └──────────────┘    └──────────────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │ 1:N
                           ┌────────┴─────────┐
                           │     bookings     │
                           └────────┬─────────┘
                                    │ 1:N
                           ┌────────┴─────────┐
                           │ booking_services │
                           └──────────────────┘
```

### Database Entity Breakdown

#### 1. `profiles`
Stores user profile information and role bindings linked 1-to-1 with Supabase `auth.users`.
* `id` (UUID, PK) -> References `auth.users(id)`
* `full_name` (TEXT)
* `email` (TEXT, Unique)
* `phone` (TEXT)
* `avatar_url` (TEXT)
* `role` (TEXT: `'customer'` | `'workshop_admin'` | `'super_admin'`)
* `status` (TEXT: `'active'` | `'suspended'` | `'pending'` | `'deleted'`)
* `created_at`, `updated_at` (TIMESTAMPTZ)

#### 2. `motorcycles`
Customer motorcycle registry storing specs, mileage, and tire details.
* `id` (UUID, PK)
* `owner_id` (UUID) -> References `profiles(id)`
* `nickname`, `brand`, `model`, `year`, `plate_number`
* `engine_cc`, `fuel_type`, `transmission`, `current_mileage`
* `engine_oil_type`, `front_tyre_size`, `rear_tyre_size`, `photo_url`

#### 3. `motorcycle_photos`
Photo gallery for rider motorcycles.
* `id` (UUID, PK), `motorcycle_id` (UUID), `owner_id` (UUID), `photo_url` (TEXT), `is_main` (BOOLEAN)

#### 4. `workshops`
Partner and public workshop directory including Google Places synchronization fields.
* `id` (UUID, PK)
* `owner_id` (UUID) -> References `profiles(id)`
* `name`, `description`, `phone`, `email`, `address`, `district`, `state`
* `latitude`, `longitude`, `cover_image_url`, `rating`, `review_count`
* `is_open`, `is_partner`, `booking_enabled`
* `verification_status` (TEXT: `'pending'` | `'approved'` | `'rejected'`)
* `google_place_id`, `google_maps_url`, `google_rating`, `google_review_count`, `google_last_synced_at`

#### 5. `services`
Catalog of service offerings per workshop.
* `id` (UUID, PK), `workshop_id` (UUID), `name`, `category`, `price`, `estimated_duration_minutes`, `is_available`

#### 6. `parts`
Inventory catalog for workshop replacement parts and SKUs.
* `id` (UUID, PK), `workshop_id` (UUID), `name`, `brand`, `sku`, `category`, `price`, `stock_quantity`, `minimum_stock`, `unit`, `is_available`

#### 7. `bookings`
Service appointment bookings between riders and workshops.
* `id` (UUID, PK), `customer_id` (UUID), `workshop_id` (UUID), `motorcycle_id` (UUID)
* `booking_date` (DATE), `booking_time` (TIME)
* `status` (TEXT: `'pending'` | `'confirmed'` | `'in_progress'` | `'completed'` | `'cancelled'` | `'rejected'` | `'no_show'`)
* `subtotal`, `discount`, `total_amount` (NUMERIC)
* `notes` (TEXT)

#### 8. `booking_services`
Junction table storing historical price and service snapshots at time of booking creation.
* `id` (UUID, PK), `booking_id` (UUID), `service_id` (UUID)
* `service_name_snapshot` (TEXT), `price_snapshot` (NUMERIC), `quantity` (INTEGER), `duration_snapshot` (INTEGER)

#### 9. `maintenance_records` & `maintenance_items`
Completed service history logs and itemized task/cost breakdowns.

#### 10. `maintenance_reminders`
Mileage or date-driven maintenance reminders (Oil Change, Brake Inspection, Tyre Replacement, Chain Lube).

#### 11. `mileage_logs`
Audit history of mileage updates for motorcycles.

#### 12. `expenses`
Rider financial tracking records grouped by category (`Fuel`, `Parts`, `Maintenance`, `Insurance`, `Road Tax`).

#### 13. `documents`
Rider document metadata storing file references in Supabase Storage (`file_path`, `file_url`, `expiry_date`).

#### 14. `reviews` & `review_photos`
Ratings (1–5 stars), customer feedback, optional service proof photos, and workshop reply comments.

#### 15. `notifications`
In-app notifications for booking status changes, reminders, and super admin broadcasts.

#### 16. `audit_logs`
Administrative audit trial storing actions, entity IDs, actor IDs, and IP metadata.

---

## 6. Services & Business Logic Layer

The business logic is modularized into 15 specialized TypeScript services located under `src/services/`.

```
src/services/
├── authService.ts           # Authentication, profile fetching & user registration
├── adminService.ts          # Super admin metrics, user moderation & broadcast system
├── workshopService.ts       # Workshop dashboard metrics, profile & operating hours
├── bookingService.ts        # Booking creation, queue state transitions & pricing
├── motorcycleService.ts     # Bike CRUD, mileage updates & reminder recalculations
├── maintenanceService.ts    # Maintenance logging & automatic reminder creation
├── customerService.ts       # Rider dashboard stats & active motorcycle queries
├── partsService.ts          # Inventory SKU stock level & stock status computations
├── reviewService.ts         # Ratings creation, average calculations & responses
├── documentService.ts       # Vehicle document uploads & expiration management
├── expenseService.ts        # Expenditure logging & category summation analytics
├── photoService.ts          # Image uploads to Supabase Storage (Bikes & Reviews)
├── notificationService.ts   # In-app notifications & Realtime subscription channels
├── reportService.ts         # Revenue analytics & monthly breakdown reports
└── googlePlacesService.ts   # Google Places API (New) integration & metadata caching
```

---

## 7. External Integrations & Realtime Subscriptions

### 1. Google Places API (New v1) Integration
RiderHood connects directly to the Google Places API (New) and optional Supabase Edge Function (`supabase/functions/google-place-details`).
* **Feature:** Automatic discovery of Google Place IDs via address matching.
* **Metadata Sync:** Fetches authentic ratings, review counts, opening hours, Google Maps URLs, and user review excerpts.
* **Caching:** Implements a 24-hour database caching strategy to stay within API rate limits.

### 2. Realtime WebSocket Subscriptions
* **Workshop Bookings:** Workshops subscribe to `postgres_changes` on `public.bookings` for instant notifications when new bookings are submitted.
* **Super Admin Partner Application Listener:** System admins receive live updates when a new workshop applies for partner verification.

---

## 8. Design System & UI Aesthetics

RiderHood features a custom high-contrast cyber-garage design system defined in `src/constants/theme.ts`.

### Theme Palette Tokens
* **Background Primary:** `#0a0c10` (Ultra Dark Titanium)
* **Surface Containers:** `#12161f` & `#1a202c` (Deep Metallic Card Surfaces)
* **Primary Accent:** `#ff6b00` (Electric Amber Orange)
* **Workshop Accent:** `#f59e0b` (Industrial Amber Yellow)
* **Success Indicator:** `#10b981` (Emerald Telemetry Green)
* **Danger Alert:** `#ef4444` (Crimson Warning Red)

---

## 9. Project Directory & File Structure

```text
riderhood-mobile/
├── assets/                          # Static branding assets and icons
├── scripts/                         # Build & cleanup helper scripts
├── src/                             # Main application source code
│   ├── app/                         # Expo Router routes
│   │   ├── _layout.tsx              # Root Layout & Auth RouteGuard
│   │   ├── index.tsx                # Application Entry Point
│   │   │
│   │   ├── (auth)/                  # 🔐 Authentication Flow Group
│   │   │   ├── welcome.tsx          # Unified Single Login Page
│   │   │   ├── register.tsx         # Customer Registration
│   │   │   ├── workshop-registration.tsx # Workshop Partner Application
│   │   │   └── forgot-password.tsx   # Password Reset
│   │   │
│   │   ├── (customer)/              # 🏍️ Customer (Rider) Portal
│   │   │   ├── home.tsx             # Telemetry & Garage Dashboard
│   │   │   ├── workshops.tsx        # Workshop Search & Discovery
│   │   │   ├── booking.tsx          # Service Scheduling Flow
│   │   │   ├── garage.tsx           # Bike Management
│   │   │   ├── history.tsx          # Past Service Receipts
│   │   │   ├── documents.tsx        # Document Vault
│   │   │   └── expenses.tsx         # Expense Tracking
│   │   │
│   │   ├── (workshop)/              # 🛠️ Workshop Partner Portal
│   │   │   ├── dashboard.tsx        # Operational KPIs & Queue
│   │   │   ├── bookings.tsx         # Booking Status Workflow Board
│   │   │   ├── services.tsx         # Service Package Rates
│   │   │   ├── parts.tsx            # Inventory SKUs & Stock
│   │   │   ├── customers.tsx        # Client Directory
│   │   │   └── reviews.tsx          # Customer Ratings & Replies
│   │   │
│   │   └── (admin)/                 # 🛡️ Super Admin Command Center
│   │       ├── index.tsx            # Executive Dashboard & System KPIs
│   │       ├── users.tsx            # User Account Moderation
│   │       ├── workshops/           # Partner Verification
│   │       ├── bookings.tsx         # Platform Booking Supervisor
│   │       ├── notifications.tsx    # Announcement Broadcasts
│   │       └── reports.tsx          # Financial Analytics
│   │
│   ├── components/                  # Custom UI Components
│   │   ├── HealthGauge.tsx          # Circular Telemetry Gauge
│   │   ├── WorkshopCard.tsx         # Workshop List Item Card
│   │   ├── ReminderItem.tsx         # Maintenance Alert Card
│   │   ├── CustomButton.tsx         # Styled Action Button
│   │   └── Header.tsx               # Standard Screen Header
│   │
│   ├── constants/                   # Theme Tokens & Constants
│   ├── context/                     # Global React Auth Context
│   ├── lib/                         # Supabase Client Initialization
│   ├── services/                    # 15 Modular Service Modules
│   └── types/                       # Database & API TypeScript Interfaces
│
├── supabase/                        # Database Migrations & Edge Functions
│   ├── schema.sql                   # Complete PostgreSQL Schema & Triggers
│   └── functions/                   # Supabase Edge Functions
├── .env                             # Environment Variables Configuration
├── app.json                         # Expo Project Manifest
└── package.json                     # Node Dependencies & Scripts
```

---

## 10. Environment Configuration & Deployment Guide

### Prerequisites
* Node.js v18+
* npm or yarn
* Expo CLI (`npx expo`)
* Supabase Account & Project

### 1. Environment Setup (`.env`)
Create a `.env` file in the project root containing your API credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-places-api-key
```

### 2. Database Schema Provisioning
1. Log into your Supabase Dashboard.
2. Open the **SQL Editor**.
3. Copy the contents of `supabase/schema.sql` and run the script.
4. Verify that all 17 tables and automatic profile creation triggers (`handle_new_user`) are initialized.

### 3. Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Expo Development Server
npm start

# 3. Launch Web Application
npm run web

# 4. Run TypeScript Type Check
npx tsc --noEmit
```

---

*Documentation maintained by the RiderHood Core Engineering Team.*
