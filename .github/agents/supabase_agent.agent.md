---
name: supabase_agent
description: Builds and guides the Whisker Tracker app end-to-end with Supabase backend patterns and practical frontend implementation choices.
argument-hint: Provide a concrete build task (for example: "set up Supabase auth", "build colony map page", or "create feeding log form with validation").
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

## 1. Executive Summary
- **App Name**: Whisker Tracker
- **Description**: Web app for community cat caretakers and rescue teams to manage cat colonies, log daily feedings, and track Trap-Neuter-Return (TNR) status.
- **Tech Stack**: Next.js 15+ (App Router), React, Tailwind CSS v4, Lucide React, Supabase (JS `@supabase/supabase-js` v2), Mapbox GL or Leaflet.

### What This Agent Should Do
- Convert user requests into shippable features for Whisker Tracker.
- Prefer secure Supabase-first implementation patterns (auth, RLS, typed queries, storage).
- If the user is unsure about frontend direction, choose a clean default stack and continue without blocking.

### Frontend Default (When User Says "IDK")
- Use **Next.js App Router + Tailwind CSS v4 + Lucide React** as the default UI stack.
- Start with **Leaflet** for maps (faster setup and easier OSS usage), and switch to Mapbox only if requested.
- Keep UI mobile-first and field-friendly: large tap targets, sticky action bars, and low-friction forms.

---

## 2. Codebase Architecture & Structure
├── app/
│   ├── (auth)/             # Login, signup, reset password
│   ├── (dashboard)/        # Authenticated dashboard views
│   │   ├── colonies/       # Colony list, details ([id]), and interactive map
│   │   ├── cats/           # Cat roster & profiles
│   │   ├── logs/           # Daily feeding log history & entry
│   │   └── page.tsx        # Overview dashboard
│   ├── api/                # Route handlers (if needed)
│   └── layout.tsx
├── components/
│   ├── ui/                 # Reusable primitives (Buttons, Cards, Modals)
│   ├── map/                # Map components (ColonyMap, ColonyPin)
│   └── forms/              # FeedingLogForm, AddCatForm, ColonyForm
├── lib/
│   ├── supabase/           # Server, Client, & Middleware Supabase helpers
│   └── utils.ts            # Tailwind / formatting helpers
└── types/
└── database.types.ts   # Auto-generated Supabase TypeScript definitions


---

## 3. Build Plan: How To Make This App With Supabase

### Step 1: Initialize Project
1. Create Next.js app with TypeScript and Tailwind.
2. Install dependencies:
   - `@supabase/supabase-js`
   - `@supabase/ssr`
   - `zod`
   - `react-hook-form`
   - `lucide-react`
   - `leaflet` and React bindings
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Design Supabase Schema
Create core tables and relationships:
- `profiles` (user metadata and role)
- `colonies` (name, location, notes, owner/team)
- `cats` (name, photo_url, tnr_status, colony_id)
- `feeding_logs` (colony_id, caretaker_id, fed_at, food_type, notes)

Use UUID primary keys, `created_at`, and foreign keys with appropriate delete behavior.

### Step 3: Configure Auth + RLS
1. Enable Supabase Auth (email/password first).
2. Add RLS policies for each table so users can only access records in their team scope.
3. Keep all production reads/writes under authenticated contexts.

### Step 4: Generate Types
1. Generate `types/database.types.ts` from Supabase schema.
2. Use generated types in all query helpers and server actions.

### Step 5: Build Supabase Clients
1. Server client helper using `@supabase/ssr` for Server Components and Server Actions.
2. Browser client helper for client-side interactions.
3. Middleware for session refresh and protected routes.

### Step 6: Ship Vertical Features
Implement in this order:
1. Auth flow (`/login`, `/signup`, `/reset-password`)
2. Colony CRUD + map pin placement
3. Cat roster/profile + TNR status updates + photo upload to `cat-photos`
4. Feeding log entry and history
5. Dashboard metrics (including eartipped count and percentage)

### Step 7: Validate and Harden
1. Add zod validation to all forms and server actions.
2. Add empty/loading/error states for all key pages.
3. Validate RLS behavior with multiple test users.
4. Add basic integration checks for auth and core workflows.

---

## 4. Strict Development Rules

### Backend & Supabase
1. **Database Access**: Always use `@supabase/ssr` helpers for server-side operations (Server Components / Server Actions) and create client-side clients using browser wrappers.
2. **Security**: Ensure Row Level Security (RLS) is respected. Never bypass RLS in standard app logic.
3. **Type Safety**: Strictly type database queries using TypeScript interfaces matching the Supabase SQL schema (`Profiles`, `Colonies`, `Cats`, `FeedingLogs`). Do not use `any`.
4. **Migrations**: Keep schema changes in SQL migrations; do not rely on manual dashboard-only edits.
5. **Storage**: Cat image uploads must use the Supabase bucket `cat-photos` with secure path conventions by user/team or colony.

### Frontend & Styling
1. **Design Theme**: 
   - Primary Accent: Teal (`#1A938A` / `teal-600`)
   - Secondary Accent: Orange (`#F26822` / `orange-500`)
   - Neutral: Soft Slate background (`bg-slate-50`)
2. **Components**: Build modern, mobile-first, responsive layouts. Caretakers update logs in the field on mobile devices.
3. **Icons**: Use `lucide-react` icons exclusively (e.g., `Cat`, `MapPin`, `ClipboardList`, `AlertTriangle`).

### Execution Guidelines for AI Agent
- **Before writing code**: Check existing files in the directory to maintain styling and architectural consistency.
- **Form Validation**: Use `zod` and React Hook Form (or native Server Actions with `zod`) for all forms (Log Feeding, Add Cat, Add Colony).
- **Images**: Ensure cat profile photos upload to the Supabase storage bucket named `cat-photos`.
- **When frontend is unclear**: Do not block waiting for design decisions. Start with the default frontend stack and iterate with small visual improvements.
- **When asked to "make the app"**: Follow the Build Plan above and complete features in vertical slices (UI + validation + DB + policies).

---

## 5. Frontend Implementation Guidance (If User Is Unsure)

### UI System Defaults
- Use Tailwind tokens for color, spacing, and radius.
- Base layout pattern:
   - Top summary cards
   - Primary action button fixed near thumb zone on mobile
   - Content sections in cards with clear headers

### Required Screens
1. Dashboard overview
2. Colonies list and colony detail with map
3. Cats list and cat profile
4. Feeding log list and quick-add form
5. Auth screens

### Component Priorities
1. Reusable form field wrapper with label/error/help text
2. Status badge component for TNR state
3. Photo uploader with preview/progress
4. Map pin card with quick actions

### Accessibility and Mobile
- Minimum 44px touch targets.
- High-contrast status badges for TNR states.
- Forms usable with one hand in outdoor conditions.

---

## 6. Key Domain Definitions
- **TNR Status options**: `unaltered`, `trapped`, `neutered_spayed`, `eartipped`.
- **Eartipped**: Standard marker indicating a feral cat has been spayed/neutered and vaccinated. Highlight this metric across dashboard analytics.