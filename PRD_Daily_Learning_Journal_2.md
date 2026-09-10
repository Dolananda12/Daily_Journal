# Product Requirements Document (PRD)
## Daily Learning Journal — "Quote-Aesthetic" Study Log

**Version:** 1.0
**Date:** July 11, 2026
**Author:** [Your Name]
**Status:** Draft — Ready for Build

---

## 1. Overview

A minimalist, single-user web app for logging what you learned each day — academically and in life — along with hours studied. The landing page opens with a fresh, thoughtfully-styled quote pulled from a free public API. A calendar in the top bar lets you browse past entries, but **future/unwritten days are locked** to enforce honest, same-day journaling.

## 2. Goals

- Build a daily habit of reflecting on learning (academic + life lessons) and tracking study hours.
- Make opening the app feel calm and intentional (quote-first, distraction-free aesthetic).
- Prevent "backfilling" future entries — you can only ever write about today or the past, once it has occurred.
- Keep data persistent across devices via a backend, without requiring login (single user).

## 3. Non-Goals

- No multi-user support, accounts, or authentication in v1.
- No social/sharing features.
- No native mobile app (web only, but should be responsive/mobile-friendly in-browser).
- No offline mode required for v1.

## 4. User

Single user (the app owner). No sign-up/login flow — the app opens directly to today's entry. Since there's no auth, the backend should treat this as a single fixed "user" record (no multi-tenant logic needed for v1, but data model should not preclude adding auth later).

## 5. Core Features

### 5.1 Landing Page — Daily Quote
- On load, fetch a random quote from a **free, no-auth-key API**: **ZenQuotes.io** (`https://zenquotes.io/api/random`).
  - Response shape: `[{ "q": "quote text", "a": "author", "h": "html blockquote" }]`
  - Fallback: if the API call fails (network/rate limit), show a small curated local list of quotes so the page never looks broken.
  - Optional (nice-to-have): cache the day's quote so it's the *same* quote all day rather than re-randomizing on refresh — reinforces the daily-ritual feel.
- Quote is the visual centerpiece of the landing page — large serif typography, generous whitespace, subtle fade-in animation.

### 5.2 Today's Entry
Displayed below/alongside the quote:
- **Today's date**, prominently displayed (e.g., "Friday, July 11, 2026").
- **Section: What I Learnt — Academics** (free text area).
- **Section: What I Learnt — Life** (free text area).
- **Hours Studied** (numeric input, e.g., stepper or number field, supports decimals like 2.5).
- **Save** persists the entry to the backend, tied to today's date.
- Entry is editable throughout the current day (autosave or explicit save — recommend explicit "Save" button with a saved-confirmation state).

### 5.3 Top Bar Calendar Navigation
- A calendar icon/button in the top bar opens a date-picker/calendar overlay.
- Calendar visually distinguishes:
  - **Past days with an entry** (e.g., filled dot/highlight).
  - **Past days with no entry** (e.g., muted, empty — still viewable, but shows "No entry recorded").
  - **Today** (clearly marked as current).
  - **Future days** — **visually disabled/greyed out and not clickable.**
- **Hard rule:** the user cannot create or edit an entry for any date that has not yet occurred. This should be enforced both in the UI (disabled date cells) and on the backend (reject any write where `entry_date > current_server_date`), since UI-only restrictions can be bypassed.
- Selecting a past date opens that day's entry in **read-only** view. Entries lock permanently at local midnight of the day they were written (see Section 9.1) — before that cutoff, today's entry remains editable.
- Today, when selected, is always editable (until local midnight).
- A subtle "missed days" badge near the calendar icon surfaces days with no entry (see Section 9.2) — informational only, never blocking.

### 5.5 Commandments Page
- A static, personal manifesto page — hardcoded content, not editable via the UI (no database record, no save/edit affordance).
- **Access:** a small icon/link in the top bar (alongside the calendar icon) opens the Commandments view, either as a dedicated route (`/commandments`) or a full-screen overlay — matching whatever top-bar pattern is used elsewhere.
- **Visual style — deliberately breaks from the rest of the app:** strictly **black and white**, no color, no soft/cream palette. Recommend a solid black background with white text (greys permitted only for subtle divider lines, never as a color choice). Bold, high-contrast, serif or condensed sans display typography, larger than the rest of the app. Numbered list (I, II, III... or 1, 2, 3...), generous spacing between each commandment, sharp edges — no icons, no rounded cards, no shadows. This page should feel etched and non-negotiable, in contrast to the warm, reflective tone of the daily journal.
- **Content (hardcoded exactly, do not paraphrase or reorder):**
  1. The universe is transient; the only permanent thing is change — both in the personal and professional spheres.
  2. I am the chosen one. I shall never give up the visions I have received, or continue to receive.
  3. I shall compare myself with myself, and myself only — it does not matter if I am competing with 1, 1,000, or 1 million.
  4. Worrying about the future will not make us feel better, nor will it solve anything.
  5. Be the magnanimous Sun that holds the planets — the people we care about: parents and friends.
  6. We have a lot to improve, both in skills and in body, with only three years of time.
- **Behavior:** reachable from anywhere in the app via the top bar; easily closeable (back button, X, or Escape) to return to the daily journal view. No interaction with the quote API, calendar, or entry data — fully isolated.

### 5.6 Study Hours Chart
- A dedicated analytics view visualizing the existing `hours_studied` field across all logged entries.
- **Access:** a small chart icon in the top bar (alongside the calendar and commandments icons) opens the Study Hours view, as a route (`/stats`) or panel, consistent with the app's existing navigation pattern.
- **Chart type:** bar chart — one bar per day, x-axis = date, y-axis = hours studied. Days with 0 hours (or no entry) must still render as an empty/zero bar rather than being skipped, so gaps in study consistency are visible at a glance.
- **Data source:** reads existing `Entry` records (`entry_date`, `hours_studied`) from the backend — purely a read/visualization layer, no new database fields required. Never renders future dates, consistent with the app's future-lock rule.
- **Time range controls:** toggle between **Last 7 days**, **Last 30 days**, and **All time**, defaulting to **Last 7 days** on open.
- **Summary stats row** above/below the chart: total hours studied and average hours/day for the selected range. *(Optional nice-to-have: longest streak of consecutive days with >0 hours studied — skip if it adds too much complexity for v1.)*
- **Visual style:** stays within the app's core quote aesthetic (soft/cream palette, serif headings, generous whitespace) — unlike the Commandments page, this should feel calm and consistent with the daily journal. Use a single muted accent color for the bars, not multiple chart colors.
- **Library:** use a lightweight charting library suited to the frontend stack (e.g., **Recharts** for Next.js/React) rather than custom SVG chart logic, to keep implementation simple and maintainable.
- **Behavior:** chart updates reactively when the time-range toggle changes; hovering/tapping a bar shows a tooltip with the exact date and hours studied. If there are no entries yet, show a friendly empty state (e.g., "Log your first day to see your chart here") instead of a blank chart.

### 5.7 Visual Style — "Quote Aesthetic" (applies to Landing, Today's Entry, Calendar, and Study Hours Chart)
- Calm, editorial, journal-like feel: think a nice quote-of-the-day app or a minimalist Notion page.
- Serif or elegant display font for the quote and date; clean sans-serif for body text/inputs.
- Soft, muted color palette (off-white/cream backgrounds, one accent color) rather than bright/saturated UI colors.
- Generous padding/whitespace; avoid dense dashboard-style layouts.
- Subtle transitions (fade/slide) when navigating between calendar dates.

## 6. User Flow

1. User opens the app → lands on **Today's view**.
2. Sees a quote (fetched fresh or cached for the day) + today's date.
3. Fills in Academics learned, Life learned, and Hours studied.
4. Clicks Save → confirmation shown.
5. At any point, clicks the calendar icon in the top bar → date picker opens.
6. Future dates are disabled/unclickable. Past dates with entries are marked and viewable (read-only). Past dates without entries show "No entry recorded."
7. Clicking Today's date in the calendar always returns to the editable current-day view.

## 7. Data Model (suggested)

```
Entry {
  id: UUID
  entry_date: DATE (unique — one entry per date)
  academics_notes: TEXT
  life_notes: TEXT
  hours_studied: DECIMAL
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

- `entry_date` should be unique — enforce one entry per calendar day.
- Store dates in a single consistent timezone (recommend: store as UTC date, but use the user's local timezone for determining "today" and locking future dates).

## 8. Technical Requirements

- **Frontend:** Next.js web app, responsive (works well on both desktop and mobile browsers), deployed on Vercel.
- **Backend:** Supabase (managed Postgres + auto-generated REST API) to persist entries across devices/sessions. No auth required for v1.
- **Quote API:** ZenQuotes.io (`GET https://zenquotes.io/api/random`) — free, no key. Note: has a light rate limit (~5 requests per 30 seconds per IP) on the free tier; caching one quote per day server-side or client-side avoids hitting this.
- **Date/future-lock validation:** Must be enforced server-side (not just disabling UI elements) — reject writes for `entry_date` greater than the server's current date.

## 9. Decisions (Resolved)

1. **Edit window:** An entry is editable until **local midnight** of that day. Once the date rolls over, the entry is locked (read-only) permanently. This preserves same-day flexibility (fixing typos, adding an afterthought before bed) while keeping the journal append-only and trustworthy after the fact. Enforce this the same way as the future-lock: compare `entry_date` to the current local date server-side, not just in the UI.
2. **Missed days:** Show a small, subtle indicator (e.g., a badge near the calendar icon reading "2 days missed this week") rather than a popup or nag screen. Purpose is gentle awareness, not guilt — no blocking modals, no red alert styling.
3. **Hosting/stack:** **Next.js on Vercel** (frontend + API routes) + **Supabase** (managed Postgres, with its built-in REST layer matching the `Entry` data model in Section 7). This is a well-trodden, thoroughly documented combination, which makes it a safer target for an agentic build tool to implement correctly and deploy end-to-end — both also have free tiers suitable for a single-user app.

## 10. Success Criteria

- User can open the app daily, see a new/thoughtful quote, and log their day in under a minute.
- It is **impossible** (not just discouraged) to create an entry for a future date.
- Past entries remain viewable and intact via the calendar at any time.
- The app feels calm and quote-like, not like a spreadsheet or form.
- The Commandments page reads as a stark, deliberate departure from the rest of the app — black and white, unmissable, non-negotiable.
- The Study Hours chart makes it immediately obvious, at a glance, how consistent (or inconsistent) recent studying has been.
