# Design Document — Daily Learning Journal
**Version:** 1.0  
**Date:** August 2, 2026  
**Status:** Living Document  

---

## 1. Overview

The **Daily Learning Journal** is a minimalist, single-user web app for logging what you learned each day — academically and in life — along with hours studied. It opens with a styled quote as a daily ritual, enforces honest same-day journaling (no future-entry backfilling), and provides analytics and personal commandments as supporting views.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js | 16.2.10 | Full-stack React framework — routing, SSR, and API routes |
| **Language** | TypeScript | ^5 | Type safety across frontend and backend |
| **UI Library** | React | 19.2.4 | Component-based UI rendering |
| **Styling** | Vanilla CSS (globals.css) | — | Global design tokens, animations, layout utilities |
| **Database** | Supabase (PostgreSQL) | — | Managed Postgres + auto-generated REST API |
| **DB Client** | @supabase/supabase-js | ^2.110.2 | Supabase client for server-side API routes |
| **Charting** | Recharts | ^3.9.2 | Bar chart for Study Hours analytics |
| **Quote API** | ZenQuotes.io | — | Free, no-key random quote endpoint |
| **Deployment** | Vercel | — | Hosting for Next.js (frontend + serverless API routes) |
| **Linting** | ESLint + eslint-config-next | ^9 | Code quality |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                             │
│   React (Next.js client components — 'use client')          │
│                                                             │
│   page.tsx (root orchestrator)                              │
│     ├── TopBar (navigation, calendar, view switcher)        │
│     ├── QuoteDisplay (ZenQuotes fetch)                      │
│     ├── EntryForm (today's editable journal)                │
│     ├── ReadOnlyEntry (past day view)                       │
│     ├── BrowseView (paginated past entries)                 │
│     ├── StatsView (Recharts bar chart)                      │
│     ├── CommandmentsView (hardcoded manifesto overlay)      │
│     └── TargetsView (goal-setting UI)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ fetch() calls to /api/*
┌─────────────────────────▼───────────────────────────────────┐
│                    NEXT.JS API ROUTES                        │
│   (Server-side — runs on Vercel serverless functions)       │
│                                                             │
│   /api/entries         → GET all entry metadata             │
│   /api/entries/[date]  → GET/POST/PATCH a specific entry    │
│   /api/quote           → GET daily quote (with caching)     │
│   /api/targets         → GET/POST/PATCH personal targets    │
└─────────────────────────┬───────────────────────────────────┘
                          │ supabase-js SDK
┌─────────────────────────▼───────────────────────────────────┐
│                      SUPABASE                               │
│   Managed PostgreSQL database                               │
│                                                             │
│   Table: entries                                            │
│     id, entry_date (unique), academics_notes,               │
│     life_notes, hours_studied, diary_notes,                 │
│     todos (JSONB), created_at, updated_at                   │
│                                                             │
│   Table: targets (inferred)                                 │
│     Goal/target tracking data                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. File Structure

```
App_Thoughts/
├── PRD_Daily_Learning_Journal.md       # PRD v1 — core features
├── PRD_Daily_Learning_Journal_2.md     # PRD v2 — adds Commandments, Stats, Targets
└── DESIGN_DOCUMENT.md                 # ← This file

daily-journal/                          # Next.js project root
│
├── package.json                        # Dependencies & npm scripts
├── tsconfig.json                       # TypeScript configuration
├── next.config.ts                      # Next.js configuration
├── eslint.config.mjs                   # ESLint rules
├── next-env.d.ts                       # Next.js TypeScript declarations
├── .env.local                          # Local secrets (SUPABASE_URL, SUPABASE_ANON_KEY)
├── .gitignore
├── README.md
├── AGENTS.md                           # Agent/AI coding instructions
├── CLAUDE.md                           # Claude-specific coding instructions
│
├── app/                                # Next.js App Router (source of truth for routes)
│   ├── layout.tsx                      # Root HTML layout (fonts, metadata)
│   ├── page.tsx                        # Root page — main orchestrator component
│   ├── globals.css                     # Global CSS design system & utilities
│   ├── page.module.css                 # Page-scoped CSS module (legacy)
│   ├── favicon.ico
│   └── api/                            # Next.js API routes (serverless functions)
│       ├── entries/
│       │   ├── route.ts                # GET /api/entries — all entry metadata
│       │   └── [date]/
│       │       └── route.ts            # GET/POST/PATCH /api/entries/:date
│       ├── quote/
│       │   └── route.ts                # GET /api/quote — daily quote proxy + cache
│       └── targets/
│           └── route.ts                # GET/POST/PATCH /api/targets
│
├── components/                         # React UI components
│   ├── TopBar.tsx                      # Navigation bar: calendar, view icons, missed badge
│   ├── CalendarModal.tsx               # Calendar overlay / date-picker
│   ├── QuoteDisplay.tsx                # Daily quote (serif, fade-in animation)
│   ├── EntryForm.tsx                   # Today's editable journal entry (academics, life, todos)
│   ├── ReadOnlyEntry.tsx               # Read-only view for past entries
│   ├── BrowseView.tsx                  # Scrollable / paginated past entries list
│   ├── StatsView.tsx                   # Recharts bar chart — study hours analytics
│   ├── CommandmentsView.tsx            # Full-screen B&W personal commandments
│   └── TargetsView.tsx                 # Goal / target tracking UI
│
├── lib/                                # Shared utilities
│   ├── supabase.ts                     # Supabase client singleton (server-side only)
│   └── dateUtils.ts                    # Date helpers (today, future-lock, grace period)
│
└── public/                             # Static assets served at root
```

---

## 5. Component Architecture

### 5.1 State Management

The app uses **React's built-in `useState` and `useCallback`** — no external state library (Redux, Zustand, etc.). All top-level state lives in `page.tsx` and is passed down as props:

| State | Type | Purpose |
|---|---|---|
| `activeView` | `'today' \| 'browse' \| 'stats' \| 'commandments' \| 'targets'` | Controls which view is rendered |
| `selectedDate` | `string` (YYYY-MM-DD) | The date the user has selected via the calendar |
| `entryMetas` | `EntryMeta[]` | Lightweight list of all entry dates + hours (for calendar dots) |
| `currentEntry` | `Entry \| null` | Full data for the selected date's journal entry |
| `loadingEntry` | `boolean` | Loading spinner for async entry fetch |

### 5.2 Entry Type

```typescript
interface Entry {
  entry_date: string
  academics_notes: string
  life_notes: string
  hours_studied: number
  diary_notes: string
  todos: { id: string; text: string; done: boolean }[]
}
```

### 5.3 Data Flow

```
page.tsx
  │
  ├─ On mount:          GET /api/entries          → entryMetas[]
  │                     → TopBar (calendar dots, missed badge)
  │
  ├─ On selectedDate:   GET /api/entries/:date    → currentEntry
  │
  ├─ Today view:        EntryForm  → POST/PATCH /api/entries/:date  → onSaved()
  ├─ Past view:         ReadOnlyEntry  (reads currentEntry prop, no fetch)
  ├─ Browse view:       BrowseView     (internal paginated fetch)
  ├─ Stats view:        StatsView      (internal fetch of all entries)
  ├─ Commandments:      CommandmentsView  (fully static, zero API calls)
  └─ Targets view:      TargetsView    (internal fetch via GET/POST /api/targets)
```

---

## 6. Routing Table

The app presents as a **Single Page Application** — all view switching happens via React state (`activeView`), not URL navigation. Only the API endpoints are real Next.js routes.

| URL | Handler | Method(s) | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | — | Root page — renders all views via state |
| `/api/entries` | `app/api/entries/route.ts` | GET | Return all entry metadata (date + hours) |
| `/api/entries/:date` | `app/api/entries/[date]/route.ts` | GET, POST, PATCH | Read or write one entry |
| `/api/quote` | `app/api/quote/route.ts` | GET | Fetch today's quote (cached daily) |
| `/api/targets` | `app/api/targets/route.ts` | GET, POST, PATCH | Read or write targets |

---

## 7. Data Model

### Table: `entries`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | Unique row identifier |
| `entry_date` | DATE | UNIQUE, NOT NULL | One entry per calendar day |
| `academics_notes` | TEXT | nullable | What was learnt academically |
| `life_notes` | TEXT | nullable | What was learnt in life |
| `hours_studied` | DECIMAL | nullable | Hours studied that day (supports decimals e.g. 2.5) |
| `diary_notes` | TEXT | nullable | Free-form diary / personal notes |
| `todos` | JSONB | nullable | Array of `{ id, text, done }` todo items |
| `created_at` | TIMESTAMP | default now() | Row creation time |
| `updated_at` | TIMESTAMP | default now() | Row update time |

### Table: `targets` (inferred)

Stores personal goal/target tracking data, accessed via `/api/targets`. Exact schema is managed internally by `TargetsView.tsx` and its corresponding API route.

---

## 8. Key Design Decisions

### 8.1 Future-Lock Enforcement (Dual-Layer)
Entries for future dates are blocked at **two independent layers**:
1. **UI layer** — Calendar cells for future dates are visually disabled and non-clickable.
2. **Server layer** — API routes reject any POST/PATCH where `entry_date > current server date`.

This prevents bypassing the UI restriction via direct API calls.

### 8.2 Late-Night Grace Period
`dateUtils.ts` defines `LATE_NIGHT_CUTOFF_HOUR = 2`. Before 2 AM, `getEffectiveTodayString()` returns **yesterday's date** — so a user journaling at 1:30 AM is still writing about the previous day, not starting a new blank entry.

### 8.3 Quote Caching
ZenQuotes.io has a rate limit of ~5 req / 30 sec on the free tier. The `/api/quote` route acts as a **server-side proxy**, caching the day's quote so the same quote is shown all day and page refreshes don't trigger new API hits.

### 8.4 SPA-style Navigation
All view switching (today / browse / stats / commandments / targets) is handled by the React `activeView` state — **no URL changes**. This keeps transitions instant and avoids full-page reloads.

### 8.5 Commandments — Isolated & Visually Inverted
`CommandmentsView.tsx` renders as a **full-screen overlay** on top of the app. It has **zero** interaction with the API, calendar, quote, or entry data. Visually it is the deliberate inverse of the rest of the app: solid black background, white text, no soft colors or rounded cards.

---

## 9. Visual Design System

All styles live in `app/globals.css`. The design follows a **"Quote Aesthetic"** — calm, editorial, journal-like.

| Token | Value | Purpose |
|---|---|---|
| Background | Off-white / cream | Warm, low-contrast base |
| Accent | Single muted color | Used on buttons, chart bars, highlights |
| Typography (display) | Serif font | Quotes, date headings — conveys calm and permanence |
| Typography (body) | Sans-serif | Labels, inputs, body text |
| Spacing | Generous padding | Avoids dashboard density |
| Animations | Fade-in, subtle transitions | Calm, intentional feel |

**Exception:** The Commandments page deliberately breaks this system — it uses a **solid black background, white bold display type**, no accent colors, no rounded corners, no shadows.

---

## 10. External Services

| Service | Purpose | Key Constraint |
|---|---|---|
| **ZenQuotes.io** | Random quote on daily load | Rate limit ~5 req / 30 sec. Mitigated by server-side daily cache via `/api/quote` |
| **Supabase** | Database (PostgreSQL) | No auth in v1. Anon key stored in `.env.local` — never exposed to the browser |
| **Vercel** | Hosting + serverless functions | API routes run as Vercel serverless functions; free tier suitable for single-user |

---

## 11. Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public API key |

Set in `.env.local` for local development. Must be configured as **Vercel Environment Variables** for production deployment.

---

## 12. Success Criteria

- [ ] User can open the app daily, see a thoughtful quote, and log their day in under a minute
- [ ] It is **impossible** (server-enforced, not just UI) to create an entry for a future date
- [ ] Past entries remain viewable and intact via the calendar at any time
- [ ] The app feels calm and journal-like — not like a spreadsheet or form
- [ ] The Commandments page reads as a stark, deliberate departure — black/white, non-negotiable
- [ ] The Study Hours chart makes study consistency immediately visible at a glance
