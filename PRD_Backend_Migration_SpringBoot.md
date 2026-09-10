# Backend Migration Guide
## Daily Learning Journal — Next.js API Routes → Spring Boot

**Version:** 1.0
**Date:** August 2, 2026
**Status:** Proposal — companion to PRD v1/v2 and Design Document v1.0
**Purpose:** This document specifies exactly what changes in the existing PRD and Design Document if the backend is rebuilt in Spring Boot instead of Next.js API routes. It is meant to be read alongside those files, not as a replacement for them — the frontend (React/Next.js), the visual design system, and the core product features are unchanged.

---

## 1. What Changes vs. What Doesn't

| Layer | Stays the Same | Changes |
|---|---|---|
| Frontend | Next.js, React 19, all components (TopBar, EntryForm, StatsView, etc.), globals.css | `fetch()` calls now point to an external base URL instead of relative `/api/*` paths |
| Data model | `entries` and `targets` table shapes | Represented as JPA `@Entity` classes instead of Supabase rows |
| Database | Postgres | Access method: JPA/Hibernate or JDBC instead of `supabase-js` |
| Business rules | Future-lock, midnight-lock, quote caching, missed-days logic | Re-implemented in Java in the service layer instead of TypeScript route handlers |
| Hosting | Frontend can still deploy to Vercel | Backend can **no longer** deploy to Vercel — needs a separate Java-capable host |
| Quote proxy | Same ZenQuotes.io caching behavior | Implemented via a scheduled job / cached entity instead of a Next.js route |

---

## 2. Updated Technology Stack

Replaces Section 2 of `DESIGN_DOCUMENT.md`.

| Layer | Technology | Version (suggested) | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js | 16.2.10 | Client UI only — no more API routes |
| **Frontend Language** | TypeScript | ^5 | Type safety on the client |
| **UI Library** | React | 19.2.4 | Component rendering |
| **Styling** | Vanilla CSS (globals.css) | — | Unchanged |
| **Charting** | Recharts | ^3.9.2 | Unchanged |
| **Backend Framework** | Spring Boot | 3.3.x | REST API, business logic, validation |
| **Backend Language** | Java | 21 (LTS) | — |
| **Persistence** | Spring Data JPA + Hibernate | Spring Boot–managed | ORM over Postgres |
| **DB Driver** | PostgreSQL JDBC Driver | latest | Connects Spring to Postgres |
| **Database** | PostgreSQL | 15+ | Same schema as before — can stay on Supabase's Postgres, or move to a plain managed Postgres (Neon, Railway, RDS) |
| **Build Tool** | Maven or Gradle | — | Backend build/dependency management |
| **Validation** | Jakarta Bean Validation (`spring-boot-starter-validation`) | — | Request payload validation |
| **Scheduling** | Spring `@Scheduled` | — | Daily quote cache refresh |
| **API Docs** | springdoc-openapi | ^2.x | Auto-generated OpenAPI/Swagger UI |
| **Backend Deployment** | Render / Railway / Fly.io / AWS Elastic Beanstalk / Docker container | — | Vercel does not run Java; pick one Java-capable host |
| **Frontend Deployment** | Vercel | — | Unchanged |

---

## 3. Updated Architecture Diagram

Replaces Section 3 of `DESIGN_DOCUMENT.md`.

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│   React (Next.js client components — 'use client')           │
│                                                                │
│   page.tsx (root orchestrator)                                │
│     ├── TopBar / QuoteDisplay / EntryForm / ReadOnlyEntry      │
│     ├── BrowseView / StatsView / CommandmentsView / TargetsView│
└─────────────────────────┬──────────────────────────────────────┘
                          │ fetch() calls to https://api.<yourdomain>/*
                          │ (CORS-enabled cross-origin requests)
┌─────────────────────────▼──────────────────────────────────────┐
│                   SPRING BOOT APPLICATION                        │
│   (Deployed separately — Render / Railway / Fly.io / Docker)    │
│                                                                    │
│   Controllers (@RestController)                                   │
│     ├── EntryController      /api/entries, /api/entries/{date}    │
│     ├── QuoteController      /api/quote                           │
│     └── TargetController     /api/targets                         │
│                                                                    │
│   Services (@Service) — business rules                             │
│     ├── EntryService   (future-lock, midnight-lock)                │
│     ├── QuoteService   (ZenQuotes proxy + daily cache)              │
│     └── TargetService                                                │
│                                                                    │
│   Repositories (Spring Data JPA)                                    │
│     ├── EntryRepository   extends JpaRepository<Entry, UUID>         │
│     └── TargetRepository  extends JpaRepository<Target, UUID>        │
└─────────────────────────┬──────────────────────────────────────┘
                          │ JDBC (Spring Data JPA / Hibernate)
┌─────────────────────────▼──────────────────────────────────────┐
│                       POSTGRESQL                                  │
│   Table: entries   (unchanged schema)                              │
│   Table: targets   (unchanged schema)                               │
│   Table: quote_cache (new — replaces in-memory Next.js cache)        │
└──────────────────────────────────────────────────────────────────┘
```

**Key shift:** the app is no longer a single deployable unit. It becomes two independently deployed services — a static/SSR frontend on Vercel and a stateful API on a Java host — talking over HTTPS with CORS instead of same-origin relative paths.

---

## 4. Updated File Structure

Replaces the `daily-journal/` portion of Section 4 in `DESIGN_DOCUMENT.md`. The `app/api/` folder is removed entirely from the frontend project; a new sibling Spring Boot project is added.

```
daily-journal/                          # Next.js project (frontend only now)
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── (no more app/api/ directory)
├── components/                         # Unchanged
├── lib/
│   ├── apiClient.ts                    # NEW — wraps fetch() with the backend base URL
│   └── dateUtils.ts                    # Client-side date display helpers only
│                                        #   (server-side enforcement now lives in Java)
├── .env.local                          # NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
└── ...

daily-journal-api/                      # NEW — Spring Boot project root
├── pom.xml                             # (or build.gradle)
├── src/
│   ├── main/
│   │   ├── java/com/yourname/journal/
│   │   │   ├── JournalApplication.java         # @SpringBootApplication entry point
│   │   │   ├── config/
│   │   │   │   ├── CorsConfig.java              # Allows the Vercel frontend origin
│   │   │   │   └── SchedulingConfig.java        # @EnableScheduling
│   │   │   ├── controller/
│   │   │   │   ├── EntryController.java
│   │   │   │   ├── QuoteController.java
│   │   │   │   └── TargetController.java
│   │   │   ├── service/
│   │   │   │   ├── EntryService.java
│   │   │   │   ├── QuoteService.java
│   │   │   │   └── TargetService.java
│   │   │   ├── repository/
│   │   │   │   ├── EntryRepository.java
│   │   │   │   └── TargetRepository.java
│   │   │   ├── entity/
│   │   │   │   ├── Entry.java
│   │   │   │   ├── Target.java
│   │   │   │   └── QuoteCache.java
│   │   │   ├── dto/
│   │   │   │   ├── EntryRequest.java
│   │   │   │   ├── EntryResponse.java
│   │   │   │   └── QuoteResponse.java
│   │   │   └── exception/
│   │   │       ├── FutureDateException.java
│   │   │       ├── EntryLockedException.java
│   │   │       └── GlobalExceptionHandler.java  # @ControllerAdvice
│   │   └── resources/
│   │       ├── application.yml                 # DB URL, ZenQuotes URL, CORS origins
│   │       └── application-prod.yml
│   └── test/
│       └── java/com/yourname/journal/           # Unit + integration tests
└── Dockerfile                                    # For container-based deployment
```

---

## 5. Updated Routing / API Table

Replaces Section 6 of `DESIGN_DOCUMENT.md`. Endpoint paths and methods are unchanged so the frontend contract barely moves — only the host and implementation language differ.

| Endpoint | Method(s) | Spring Handler | Description |
|---|---|---|---|
| `https://api.yourdomain.com/api/entries` | GET | `EntryController#getAllEntryMetas` | All entry metadata (date + hours) |
| `https://api.yourdomain.com/api/entries/{date}` | GET, POST, PATCH | `EntryController#getByDate / create / update` | Read or write one entry |
| `https://api.yourdomain.com/api/quote` | GET | `QuoteController#getDailyQuote` | Today's cached quote |
| `https://api.yourdomain.com/api/targets` | GET, POST, PATCH | `TargetController#getAll / create / update` | Read or write targets |

> **Note:** Next.js `page.tsx` remains at `/` on Vercel and does not change routes. Only the API's *origin* changes, from same-origin relative paths to a separate `NEXT_PUBLIC_API_BASE_URL`.

---

## 6. Updated Data Model (JPA Entities)

Replaces Section 7 of `DESIGN_DOCUMENT.md`. Column names/types are preserved so the existing Postgres tables can be reused as-is — only the access layer changes.

```java
@Entity
@Table(name = "entries")
public class Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "entry_date", unique = true, nullable = false)
    private LocalDate entryDate;

    @Column(name = "academics_notes", columnDefinition = "TEXT")
    private String academicsNotes;

    @Column(name = "life_notes", columnDefinition = "TEXT")
    private String lifeNotes;

    @Column(name = "hours_studied", precision = 4, scale = 1)
    private BigDecimal hoursStudied;

    @Column(name = "diary_notes", columnDefinition = "TEXT")
    private String diaryNotes;

    @Type(JsonType.class) // via hypersistence-utils, or a custom AttributeConverter
    @Column(name = "todos", columnDefinition = "jsonb")
    private List<Todo> todos;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // getters, setters, @PrePersist/@PreUpdate timestamp hooks
}
```

```java
@Entity
@Table(name = "quote_cache")
public class QuoteCache {
    @Id
    private LocalDate cacheDate;   // one row per day
    private String quoteText;
    private String author;
    private Instant fetchedAt;
}
```

`Target` mirrors whatever fields `TargetsView.tsx` currently sends — carry the existing shape over unchanged.

---

## 7. Business Rules → Java Service Layer

Replaces Section 8 (*Key Design Decisions*) implementation notes in `DESIGN_DOCUMENT.md`. The rules themselves are unchanged from the PRD — only where they're enforced.

### 7.1 Future-Lock Enforcement (still dual-layer)
- **UI layer:** unchanged — calendar cells for future dates stay disabled client-side.
- **Server layer:** now enforced in `EntryService.createOrUpdate()`:
  ```java
  if (request.getEntryDate().isAfter(LocalDate.now(ZoneId.of("Asia/Kolkata")))) {
      throw new FutureDateException("Cannot create an entry for a future date.");
  }
  ```
  Caught by a `@ControllerAdvice` and returned as `400 Bad Request`.

### 7.2 Midnight Lock
- `EntryService` compares `entry.getEntryDate()` to the current local date before allowing a PATCH; if the date has passed, throws `EntryLockedException` → `403 Forbidden`.

### 7.3 Late-Night Grace Period
- The `LATE_NIGHT_CUTOFF_HOUR = 2` concept moves to a small `ClockService` (or stays as a pure client-side display concern in `dateUtils.ts`, since it only affects which date the UI treats as "today" — the server only ever validates the `entry_date` it's given).

### 7.4 Quote Caching
- Replaces the Next.js `/api/quote` in-memory/edge cache with a `QuoteCache` table row per day.
- `QuoteService.getTodayQuote()`:
  1. Look up `quote_cache` for today's date.
  2. If present, return it.
  3. If absent, call ZenQuotes.io, persist the result, return it.
- Optionally, a `@Scheduled(cron = "0 5 0 * * *")` job pre-fetches the quote just after midnight so the first user request of the day never blocks on the external API.

### 7.5 Missed-Days Badge
- `EntryService.getMissedDaysThisWeek()` — a small query comparing the set of dates in the last 7 days against `SELECT entry_date FROM entries WHERE entry_date >= :weekStart`.

---

## 8. CORS Configuration (New Concern)

Because frontend and backend are no longer same-origin, this is a genuinely new piece of infrastructure that didn't exist in the Next.js-only design:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://your-journal.vercel.app", "http://localhost:3000")
            .allowedMethods("GET", "POST", "PATCH", "OPTIONS")
            .allowCredentials(false);
    }
}
```

---

## 9. Updated Environment Variables

Replaces Section 11 of `DESIGN_DOCUMENT.md`.

**Frontend (`.env.local` / Vercel):**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the deployed Spring Boot API, e.g. `https://daily-journal-api.onrender.com` |

**Backend (`application.yml` / host's secret manager):**

| Variable | Description |
|---|---|
| `SPRING_DATASOURCE_URL` | JDBC URL for Postgres, e.g. `jdbc:postgresql://<host>:5432/<db>` |
| `SPRING_DATASOURCE_USERNAME` | Postgres username |
| `SPRING_DATASOURCE_PASSWORD` | Postgres password |
| `ZENQUOTES_API_URL` | `https://zenquotes.io/api/random` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list, e.g. the Vercel domain |

> If you keep the database on Supabase, its Postgres connection string (found under Project Settings → Database) works directly as `SPRING_DATASOURCE_URL` — you simply stop using `supabase-js` and the auto-generated REST/anon-key layer, since Spring now owns all data access.

---

## 10. Deployment Changes

Replaces the deployment-relevant parts of Sections 2 and 10 of `DESIGN_DOCUMENT.md`.

| Concern | Before (Next.js only) | After (Next.js + Spring Boot) |
|---|---|---|
| Number of deployed services | 1 (Vercel) | 2 (Vercel + a Java host) |
| Backend hosting | Vercel serverless functions | Render, Railway, Fly.io, or a Docker container on any VPS/AWS/GCP — Vercel does not support long-running JVM processes |
| Cold starts | Minimal (serverless, colocated) | Depends on host; some free tiers spin down and have a cold-start delay on first request |
| CORS | Not needed (same origin) | Required (see Section 8) |
| Build artifact | `.next` build | JAR (`mvn package` / `gradle build`) or Docker image |
| Local dev | `npm run dev` | `npm run dev` (frontend) **+** `mvn spring-boot:run` (backend) — two processes |

---

## 11. Migration Checklist

1. Scaffold `daily-journal-api/` with Spring Initializr (Web, JPA, PostgreSQL Driver, Validation, `springdoc-openapi`).
2. Point Spring's datasource at the existing Postgres instance (Supabase or otherwise) and confirm JPA entities map cleanly to the existing `entries` table — no schema changes needed if column names match.
3. Re-implement each Next.js API route as a Spring controller/service pair, porting over the future-lock and midnight-lock logic.
4. Add the `quote_cache` table (one new migration) and `QuoteService`.
5. Delete `app/api/` from the Next.js project; add `lib/apiClient.ts` and set `NEXT_PUBLIC_API_BASE_URL`.
6. Add CORS config on the Spring side for local dev (`localhost:3000`) and prod (Vercel domain).
7. Deploy the Spring Boot app (Render/Railway/Fly.io — Docker recommended for portability) and note its public URL.
8. Update Vercel environment variables with the new `NEXT_PUBLIC_API_BASE_URL` and redeploy the frontend.
9. Smoke-test all PRD user flows end-to-end: today's entry save, calendar navigation, future-date rejection, stats chart, targets, commandments (unaffected — zero API calls).

---

## 12. Success Criteria (Unchanged)

All success criteria from `PRD_Daily_Learning_Journal_2.md` Section 10 and `DESIGN_DOCUMENT.md` Section 12 still apply unmodified — this migration is an implementation-layer change, not a product change. The one addition:

- [ ] Frontend and backend can be deployed, updated, and rolled back independently without breaking the other.
