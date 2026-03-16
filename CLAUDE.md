# CLAUDE.md — otef-parents

## Project Overview
Family scheduling platform for Israeli parents and teachers. Hebrew RTL app. Manages children's lessons, playdates, events, schools, and classes with Google Calendar sync.

## Tech Stack
- **Framework**: Next.js 16 (App Router, React 19, TypeScript 5)
- **Styling**: Tailwind CSS 4, shadcn/ui, Lucide icons
- **Auth**: NextAuth.js 4 (Google OAuth, database sessions)
- **Database**: PostgreSQL (Neon) via Prisma 7
- **Email**: Resend
- **Calendar**: Google Calendar API v3
- **Testing**: Playwright E2E
- **Deployment**: Vercel (auto-deploy from main)

## Key Commands
```bash
npm run dev          # Start dev server
npx tsc --noEmit     # Type check (run before committing)
npx playwright test  # Run E2E tests (45 specs)
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema to database
```

## Architecture

### Roles
- `PARENT` — default, can manage own children
- `TEACHER` — can create groups, lessons, manage school classes
- `ADMIN` — school-level admin
- `SUPERADMIN` — full access, admin panel at `/dashboard/admin`

### Auth Patterns (in `src/lib/auth.ts`)
- `requireRole(...roles)` — check user's global role (SUPERADMIN bypasses)
- `requireSchoolRole(schoolId, ...roles)` — check school-level membership (SUPERADMIN bypasses)
- `requireAdmin()` — centralized SUPERADMIN check for admin endpoints
- `teacherFilter(session)` — returns `{}` for SUPERADMIN, `{ teacherId: userId }` otherwise

### Security (in `src/lib/`)
- **`validation.ts`** — `sanitizeString(input, maxLen)`, `isValidId()`, `isValidEmail()`, `isValidUrl()`
- **`rate-limit.ts`** — in-memory rate limiter: `rateLimit(key, limit, windowMs)`
- All API mutations wrapped in try/catch — never leak Prisma errors
- CSP + HSTS + X-Frame-Options in `next.config.ts`

### Input Length Limits (enforced everywhere)
| Field | Max Length |
|-------|-----------|
| name, title, subject | 200 |
| notes, description | 2,000 |
| address | 500 |
| zoomUrl, zoomLink | 500 |
| emoji | 10 |
| startTime, endTime | 20 |
| grade, className | 50 |
| IDs (groupId, childId, etc.) | 30 |
| subGroups array | 20 items |

### Database Models (Prisma schema)
- `User` → `Child` (parentId), `ChildParent` (co-parenting many-to-many)
- `School` → `SchoolMember` (user ↔ school, roles: OWNER/ADMIN/TEACHER)
- `School` → `Group` → `GroupMember` (children in classes)
- `Lesson` → `LessonGroup` → `LessonGroupMember` (sub-groups with timeslots)
- `Playdate` → `PlaydateParticipant`
- `ScheduleItem` — per-child lesson instances
- `PersonalEvent` — user-created events
- `GroupInvite`, `ChildInvite` — 6-char codes, crypto.randomBytes

### Multi-School Membership
Users can belong to multiple schools simultaneously. A user's `schoolMemberships` is an array. Children are linked to groups (classes) which belong to schools. The admin panel shows a school-centric hierarchy.

## Code Conventions
- All API routes at `src/app/api/`
- Components at `src/components/` (client components use `"use client"`)
- Hebrew RTL — use `me-*`/`ms-*` (logical margins), not `ml-*`/`mr-*`
- All user-facing text in Hebrew
- Date/time always in `Asia/Jerusalem` timezone
- Use `sanitizeString()` for all text inputs from `req.json()`
- Use `isValidUrl()` for any URL field before storage
- Wrap all Prisma create/update/delete in try/catch
- Admin endpoints use `requireAdmin()` from `@/lib/auth`
- Search endpoints should use `rateLimit()` from `@/lib/rate-limit`

## File Patterns
- `src/app/api/[resource]/route.ts` — GET (list) + POST (create)
- `src/app/api/[resource]/[id]/route.ts` — GET (detail) + PUT (update) + DELETE
- `src/app/api/admin/*` — SUPERADMIN-only endpoints
- `src/app/api/schools/[schoolId]/*` — school-scoped with `requireSchoolRole()`

## Testing
- E2E tests in `e2e/` directory (8 spec files, 45 tests)
- Config: Chromium, `he-IL` locale, `Asia/Jerusalem` timezone, port 3002
- Always run `npx tsc --noEmit` and `npx playwright test` before pushing
