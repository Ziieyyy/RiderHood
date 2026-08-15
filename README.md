# 🏍️ RiderHood Premium Moto Care

[![Expo](https://img.shields.io/badge/Expo-SDK%2057%2B-blue)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20Auth%20%7C%20Storage-emerald)](https://supabase.com)

**RiderHood** is an enterprise-grade, multi-tenant motorcycle telemetry, digital garage, and workshop management platform built with **Expo Router**, **React Native**, **TypeScript**, and **Supabase**.

---

## 📚 Complete System Documentation

For full technical specifications, database schema, persona workflows, service architecture, and deployment guides, please see:

* 📖 **[Master System Documentation](file:///c:/Users/khair/.gemini/antigravity/scratch/riderhood-mobile/DOCUMENTATION.md)** — Complete deep dive into every subsystem, 17 database tables, business logic services, and external integrations.
* 🗂️ **[Project Directory Structure](file:///c:/Users/khair/.gemini/antigravity/scratch/riderhood-mobile/PROJECT_STRUCTURE.md)** — Comprehensive directory map and routing guide.

---

## 🌟 Key Features & User Personas

1. 🏍️ **Customer (Rider) Portal:** Motorcycle garage, telemetry health gauges (engine oil, brakes, tyres, chain), appointment scheduling, digital document wallet, maintenance reminders, and expense logging.
2. 🛠️ **Workshop Partner Portal:** Workshop dashboard (KPIs, active service bays), booking queue workflow, service package rates, inventory SKU management, customer directory, and verified review responses.
3. 🛡️ **Super Admin Command Center:** System-wide metrics, account moderation, workshop partner onboarding, platform booking supervisor, announcement broadcasts, and Google Places auto-sync engine.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Ensure a `.env` file exists in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-places-api-key
```

### 3. Start Development Server
```bash
# Start Expo development server
npm start

# Run on Web
npm run web

# Typecheck TypeScript
npx tsc --noEmit
```

---

## 🛠️ Tech Stack Overview

* **Frontend:** Expo SDK 54/57+, React Native 0.81, React 19, TypeScript 5.7, Expo Router v6
* **Styling & UI:** High-contrast dark cyber-garage aesthetic (`src/constants/theme.ts`), Custom telemetry gauges, Lucide icons
* **Backend:** Supabase PostgreSQL, Supabase Auth, Supabase Storage, Supabase Realtime, Supabase Edge Functions
* **APIs:** Google Places API (New) with 24-hour caching layer

---

*For detailed technical information, refer to [DOCUMENTATION.md](file:///c:/Users/khair/.gemini/antigravity/scratch/riderhood-mobile/DOCUMENTATION.md).*
