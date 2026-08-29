# 🏍️ RiderHood Premium Moto Care - Project Structure & Architecture Guide

## 📋 Overview
**RiderHood** is an enterprise-grade, multi-tenant motorcycle telemetry and workshop management mobile application built with **Expo (v57+)**, **React Native**, **TypeScript**, and **Expo Router**. 

The platform supports **three distinct user personas**:
1. 🏍️ **Customer (Rider)**: Manages motorcycle garages, monitors live engine/brake health telemetry, schedules service appointments, and tracks invoices.
2. 🛠️ **Workshop Lab Admin**: Manages incoming booking queues, configures service labor packages, tracks part inventory SKUs, views customer history, and responds to reviews.
3. 🛡️ **Super Admin (Command Center)**: Monitors system-wide metrics, governs users, oversees partner workshops, configures global platform features, and controls security settings.

---

## 🗂️ Complete Directory Map

```text
riderhood-mobile/
├── assets/                       # Static branding, images, and fonts
├── scripts/                      # Build & setup automation scripts
├── src/                          # Application source code
│   ├── app/                      # Expo Router file-based route definitions
│   │   ├── _layout.tsx           # Global Root Layout & Auth RouteGuard
│   │   ├── index.tsx             # Entry point (auto-redirects to /(auth)/welcome)
│   │   ├── login.tsx             # Legacy single-view login fallback
│   │   ├── explore.tsx           # Experimental feature playground
│   │   │
│   │   ├── (auth)/               # 🔐 Authentication Portal Group
│   │   │   ├── _layout.tsx       # Auth stack layout configuration
│   │   │   ├── welcome.tsx       # Unified RiderHood Login Page (Single Entry Point)
│   │   │   ├── register.tsx      # Customer account registration
│   │   │   ├── workshop-registration.tsx # Workshop partner application flow
│   │   │   └── forgot-password.tsx# Password reset flow
│   │   │
│   │   ├── (customer)/           # 🏍️ Rider Customer Portal Group
│   │   │   ├── _layout.tsx       # Customer tab navigation layout
│   │   │   ├── home.tsx          # Rider telemetry dashboard & vehicle status
│   │   │   ├── workshops.tsx     # Certified workshop discovery & search
│   │   │   ├── booking.tsx       # Service scheduling & package selection
│   │   │   ├── history.tsx       # Service history logs & invoice details
│   │   │   ├── profile.tsx       # Motorcycle garage & document management
│   │   │   └── settings.tsx      # Rider app preferences & security
│   │   │
│   │   ├── (workshop)/           # 🛠️ Workshop Partner Portal Group
│   │   │   ├── _layout.tsx       # Workshop drawer navigation layout
│   │   │   ├── dashboard.tsx     # Lab KPIs, bay status & urgent actions
│   │   │   ├── bookings.tsx      # Appointment management queue & status workflow
│   │   │   ├── services.tsx      # Service catalog CRUD (rates & duration)
│   │   │   ├── parts.tsx         # Inventory stock level & SKU management
│   │   │   ├── customers.tsx     # Customer directory & vehicle records
│   │   │   ├── reviews.tsx       # Customer ratings & interactive replies
│   │   │   ├── profile.tsx       # Workshop lab profile & operating hours
│   │   │   ├── reports.tsx       # Revenue analytics & monthly service reports
│   │   │   └── settings.tsx      # Lab automation & notification settings
│   │   │
│   │   ├── (admin)/              # 🛡️ Super Admin Command Center Group
│   │   │   ├── _layout.tsx       # Admin drawer navigation layout
│   │   │   ├── index.tsx         # System Command Center (Metrics & Alerts)
│   │   │   ├── users.tsx         # Global user account directory & moderation
│   │   │   ├── workshops/        # Workshop partner approval & oversight
│   │   │   ├── bookings.tsx      # Platform-wide booking supervisor view
│   │   │   ├── services.tsx      # Platform service taxonomy management
│   │   │   ├── parts.tsx         # Central parts master directory
│   │   │   ├── reviews.tsx       # Moderation queue for reviews
│   │   │   ├── notifications.tsx # Broadcast system announcements
│   │   │   ├── reports.tsx       # Macro platform financial analytics
│   │   │   └── settings.tsx      # System core maintenance & API keys
│   │   │
│   │   └── (tabs)/               # Legacy tab fallback routes
│   │
│   ├── components/               # Reusable UI Component Library
│   │   ├── CustomButton.tsx      # Standardized themed action button
│   │   ├── Header.tsx            # Uniform screen header with badges
│   │   ├── HealthGauge.tsx       # Telemetry circular gauge indicator
│   │   ├── ReminderItem.tsx      # Maintenance reminder card
│   │   ├── WorkshopCard.tsx      # Workshop preview card component
│   │   ├── animated-icon.tsx     # Dynamic animated icons
│   │   ├── app-tabs.tsx          # Custom tab bar navigation component
│   │   └── ui/                   # Shared UI primitives (Collapsible, IconSymbol)
│   │
│   ├── constants/                # Platform Theme Tokens & Mock Data
│   │   ├── theme.ts              # High-contrast dark color palette & styling tokens
│   │   └── mockData.ts           # Centralized mock dataset (Bikes, Workshops, Bookings)
│   │
│   ├── context/                  # Global React Contexts
│   │   └── AuthContext.tsx       # Central auth state, roles, mock users & logout
│   │
│   ├── hooks/                    # Custom React Hooks
│   │   ├── use-theme.ts          # Theme color mode resolution hook
│   │   └── use-color-scheme.ts   # Device color scheme hook
│   │
│   └── global.css                # Global CSS utilities
│
├── AGENTS.md                     # Agent developer rules & Expo docs references
├── app.json                      # Expo project configuration
├── package.json                  # Dependencies & npm scripts
├── tsconfig.json                 # TypeScript compiler configuration
└── PROJECT_STRUCTURE.md          # Project architecture documentation (This File)
```

---

## 🔒 Route Protection & Authentication Architecture

### 1. `AuthContext.tsx`
Central source of truth storing:
- `user`: Currently authenticated user payload.
- `role`: Active persona (`'customer'` | `'workshop_admin'` | `'super_admin'` | `null`).
- `login(role, email, password)`: Role-aware authentication method.
- `loginAsGuest()`: Initializes unauthenticated guest rider session.
- `logout()`: Clears active session and triggers route guard redirect.

### 2. `RouteGuard` (`src/app/_layout.tsx`)
Listens to `user` state and `segments` from Expo Router:
- **Unauthenticated** $\rightarrow$ Redirects to `/(auth)/welcome`.
- **Customer User** $\rightarrow$ Locked to `/(customer)/*`.
- **Workshop Admin User** $\rightarrow$ Locked to `/(workshop)/*`.
- **Super Admin User** $\rightarrow$ Locked to `/(admin)/*`.

---

## 🎨 System-Wide Dual Theme Architecture (`src/constants/theme.ts`, `src/context/ThemeContext.tsx`)

RiderHood supports **Dark Mode (Default)**, **Light Mode (White)**, and **System / Auto Mode**:
- **Persistence**: Saved to AsyncStorage (`@riderhood_theme_mode`).
- **Dynamic Hook**: `useTheme()` and `useThemedStyles(createStyles)` for zero-hardcoded dynamic reactive switching without screen reloading.
- **Dark Mode Palette**:
  - **Background**: `#0a0c10` (Ultra Dark Titanium)
  - **Surface / Containers**: `#12161f` & `#1a202c`
  - **Text Primary**: `#FFFFFF` / **Muted**: `#718096`
  - **Primary Accent**: `#ff6b00` (Electric Amber Orange)
- **Light Mode Palette**:
  - **Background**: `#F8FAFC` (Clean Slate White)
  - **Surface / Containers**: `#FFFFFF` & `#F1F5F9`
  - **Text Primary**: `#0F172A` / **Muted**: `#64748B`
  - **Primary Accent**: `#ea580c` (Vibrant Dark Amber)
- **Semantic Accents**:
  - **Success / Live**: `#10b981` (Emerald Green)
  - **Danger / Alert**: `#ef4444` (Crimson Red)
  - **Workshop Accent**: `#f59e0b` (Industrial Amber)

---

## 🚀 Development Quick Start

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on Web browser
npm run web

# Type check
npx tsc --noEmit
```
