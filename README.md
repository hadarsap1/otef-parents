# לו״ז הארי — Family Schedule (perents-helper)

A family scheduling platform for Israeli parents and teachers. Manage children's lessons, playdates, and personal events in one place — with Google Calendar sync and daily email digests.

## Features

### For Parents
- **Daily Feed** — View today's lessons, playdates, and personal events at a glance
- **Children Management** — Add children, share with co-parents via invite codes
- **Google Calendar Sync** — One-click sync of lessons, playdates, and events to Google Calendar
- **Playdates** — Discover, join, and host playdates within your child's group
- **Personal Events** — Create events with emoji, time, and notes
- **Daily Digest Email** — Morning summary of the day's schedule, sent at your preferred time

### For Teachers
- **Groups & Classes** — Create groups and invite parents with 6-character codes
- **Recurring Lessons** — Schedule weekly lessons with Zoom links
- **Multi-School Support** — Manage groups across multiple schools

### For Admins
- **School Management** — Create schools, import groups from CSV/XLSX
- **User Management** — Assign roles (Parent, Teacher, Admin, Superadmin)
- **Staff Management** — Add staff to schools by email with role picker (Teacher/Admin)
- **Class Management** — Add children to classes via search, assign unaffiliated groups to schools
- **User-to-School Assignment** — Assign users to schools and their children to classes from the Users tab
- **Analytics Dashboard** — View user, children, group, and lesson statistics

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui, Lucide icons |
| Auth | NextAuth.js 4 (Google OAuth) |
| Database | PostgreSQL (Neon serverless) via Prisma 7 |
| Email | Resend |
| Calendar | Google Calendar API v3 |
| Testing | Playwright (E2E) |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (e.g., [Neon](https://neon.tech))
- Google Cloud project with OAuth credentials and Calendar API enabled
- [Resend](https://resend.com) account for email

### 1. Clone & Install

```bash
git clone <repo-url>
cd otef-parents
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST].neon.tech/[DBNAME]?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Resend (email)
RESEND_API_KEY=""

# Cron job authentication
CRON_SECRET=""
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma db push
```

Optional — seed sample data:

```bash
npx tsx scripts/seed-groups.ts
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes (52 endpoints)
│   │   ├── auth/             # NextAuth handler
│   │   ├── children/         # Child CRUD + invite codes
│   │   ├── groups/           # Group management
│   │   ├── schools/          # School management + import
│   │   ├── playdates/        # Playdate CRUD + join
│   │   ├── schedule/         # Schedule items
│   │   ├── lessons/          # Recurring lessons
│   │   ├── events/           # Personal events
│   │   ├── calendar/         # Google Calendar sync
│   │   ├── dashboard/        # Daily feed data
│   │   ├── admin/            # Admin endpoints
│   │   ├── cron/             # Daily digest cron job
│   │   └── account/          # User account + Google disconnect
│   ├── dashboard/            # Authenticated app pages
│   │   ├── children/         # Manage children
│   │   ├── playdates/        # Browse playdates
│   │   ├── lessons/          # View lessons
│   │   ├── teacher/          # Teacher dashboard
│   │   ├── admin/            # Admin panel
│   │   ├── settings/         # User preferences
│   │   └── help/             # Help & FAQ
│   ├── login/                # Sign-in page
│   ├── privacy/              # Privacy policy
│   ├── terms/                # Terms of service
│   └── walkthrough/          # Onboarding flow
├── components/               # React components
│   ├── ui/                   # shadcn/ui base components
│   ├── daily-feed.tsx        # Main schedule view
│   ├── add-lesson-dialog.tsx
│   ├── add-to-calendar-button.tsx
│   ├── teacher-dashboard-tabs.tsx
│   ├── admin-panel.tsx
│   └── ...
├── lib/
│   ├── auth.ts               # NextAuth config + role helpers + requireAdmin()
│   ├── google-calendar.ts    # Calendar API client
│   ├── email.ts              # Resend email + digest formatting
│   ├── prisma.ts             # Prisma client
│   ├── import-parsers.ts     # CSV/XLSX import parsing
│   ├── rate-limit.ts         # In-memory rate limiter
│   ├── validation.ts         # Input sanitization + validation helpers
│   └── format.ts             # Date/time utilities
└── types/                    # TypeScript definitions

prisma/
├── schema.prisma             # Database schema (14 models)
└── migrations/               # Migration history

scripts/
├── seed-groups.ts            # Seed sample groups
├── seed-mock-playdate.ts     # Seed test playdates
└── migrate-default-school.ts # Default school migration

e2e/                          # Playwright tests (8 specs)
```

## Database Schema

Key models:

- **User** — Roles: `PARENT`, `TEACHER`, `ADMIN`, `SUPERADMIN`
- **Child** — Linked to parents via `ChildParent` (supports co-parenting)
- **School** → **Group** → **GroupMember** (children in classes)
- **Lesson** — Recurring weekly lessons per group
- **ScheduleItem** — Individual lesson instances per child
- **Playdate** — Group playdates with capacity and RSVP
- **PersonalEvent** — User-created calendar events

Invite codes (`ChildInvite`, `GroupInvite`) are 6-character, single-use, 24-hour expiry.

## Google OAuth & Calendar

The app uses Google OAuth for authentication and Calendar API for event sync.

**Scopes requested:**
| Scope | Purpose |
|-------|---------|
| `openid` | Google Sign-In |
| `email` | User identification + digest emails |
| `profile` | Display name and avatar |
| `calendar.events` | Sync lessons, playdates, and events to Google Calendar |

The app **only creates and deletes** events it owns — it never reads or modifies existing calendar data. Users can disconnect Google Calendar from Settings at any time.

Offline access is enabled so the daily digest cron can manage calendar events without the user being logged in.

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Digest | `0 6 * * *` (6 AM UTC) | Sends personalized email summaries to users with digest enabled, respecting their preferred time in Israel timezone |

Configured in `vercel.json` and secured with `CRON_SECRET`.

## Testing

```bash
# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui
```

Tests cover: login page, auth redirects, API protection, PWA manifest, RTL layout, input validation, static assets, and accessibility.

**Config:** Chromium, `he-IL` locale, `Asia/Jerusalem` timezone, port 3002.

## Security

Hardened per [Web Application Security for AI Agents](https://getcandlekeep.com/marketplace/web-application-security-for-ai-agents-53yps5) (CandleKeep).

### Authentication & Authorization
- **Google OAuth** via NextAuth.js with database-backed sessions (not JWT)
- **Centralized middleware** (`src/middleware.ts`) protects all `/dashboard/*` and `/api/*` routes — defense-in-depth on top of per-route auth checks
- **Role-based access control** — four roles (`PARENT`, `TEACHER`, `ADMIN`, `SUPERADMIN`) enforced via `requireRole()` and `requireSchoolRole()` helpers
- **Centralized `requireAdmin()`** in `lib/auth.ts` — single source of truth for SUPERADMIN checks
- School creation restricted to `TEACHER` and above — parents cannot self-elevate

### Input Validation (`lib/validation.ts`)
- **`sanitizeString(input, maxLength)`** — trims and enforces length limits on every text input across all 30+ API routes
- **Length limits**: names 200, notes 2000, addresses 500, URLs 500, emoji 10, IDs 30
- **`isValidEmail()`** — format validation on email inputs
- **`isValidUrl()`** — protocol validation (http/https only) on all Zoom/URL fields
- **Array caps** — subGroups limited to 20 items per lesson

### Rate Limiting (`lib/rate-limit.ts`)
In-memory per-process rate limiter on critical endpoints:
| Endpoint | Limit | Window |
|----------|-------|--------|
| Invite code redemption | 10 requests | 60s per user |
| Admin child search | 30 requests | 60s per admin |
| Bulk import | 5 requests | 60s per user |

### Error Handling
- **try/catch** around every Prisma mutation across all API routes
- Generic error messages returned to client — no Prisma schema details leaked
- Internal errors return structured `{ error: string }` JSON with appropriate HTTP status codes

### Data Protection
- **HTML escaping** on all user-controlled content in email templates (prevents XSS/phishing injection)
- **URL validation** — Zoom links and other URLs are validated as `http(s)://` before storage and rendering
- **User-scoped queries** — all database queries filter by the authenticated user's ID
- **No raw SQL** — all data access via Prisma's typed query builder

### Invite Codes
- **Cryptographically secure** — generated with `crypto.randomBytes()`, not `Math.random()`
- 6-character codes with 24-hour expiry, single-use for child invites

### HTTP Security Headers
Configured in `next.config.ts`:
- `Content-Security-Policy` — restricts script, style, img, connect, and frame sources
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Strict-Transport-Security` (HSTS with preload, 2-year max-age)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera, microphone, geolocation disabled)

### Cron Job Protection
- `/api/cron/daily-digest` requires a `Bearer` token matching `CRON_SECRET`
- Fails with 500 if `CRON_SECRET` is not configured (prevents `Bearer undefined` bypass)

### Secrets Management
- All secrets via environment variables — never hardcoded
- `.env*` files excluded in `.gitignore`
- Generate secrets with: `openssl rand -base64 32`
- No `NEXT_PUBLIC_` prefix on any secret

## Deployment

Deployed on **Vercel**. The build command runs Prisma generate before Next.js build:

```bash
prisma generate && next build
```

## Localization

- Full **RTL** (Right-to-Left) support
- **Hebrew** (`he-IL`) as primary language
- **Rubik** font from Google Fonts
- All dates and times in **Israel timezone** (`Asia/Jerusalem`)

## License

Private project.
