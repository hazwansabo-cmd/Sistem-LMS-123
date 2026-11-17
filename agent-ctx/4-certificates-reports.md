# Task 4 - Certificates & Reports Views

**Task ID:** 4
**Agent:** certificates-reports-views
**Date:** 2025-11-17
**Status:** COMPLETED

## Scope

Created the **Certificates & Reports** view layer for the "Al Amin Edu Oasis" LMS. Three client-side React components wired into the existing Zustand view router (`useUI`), TanStack Query for data, shadcn/ui + glassmorphism design system, and the established i18n dictionary.

## Files Created

### 1. `src/components/lms/views/certificates.tsx` (CERT — My Certificates)
- `CertificatesView` — fetched via `useQuery(["certificates"])` → `GET /api/certificates`.
- `PageHeader` with Award icon, subtitle showing count of certificates earned.
- Stat row: total certs, currently valid, newly issued this year.
- Empty state with "Lihat Kursus Saya" CTA → `setView("my-courses")`.
- Grid of certificate cards (`sm:grid-cols-2 lg:grid-cols-3`) — each card features:
  - Gradient header strip (teal → emerald) with Award icon in glass circle and brand label.
  - Course code badge + course title.
  - Cert number in a glass sub-panel (mono, bold).
  - Verify code in mono font with a copy-to-clipboard button (toast feedback, 1.5s "copied" state).
  - Issued / Expires dates (`formatDateMY`) with CalendarCheck/CalendarClock icons; expired certs rendered in rose.
  - "Muat Turun PDF" button → `window.open("/api/certificates/{id}/pdf", "_blank")`.
  - "Sahkan" button → `setView("verify-cert", { code: verifyCode })`.
- Loading skeleton states.

### 2. `src/components/lms/views/verify-cert.tsx` (CERT-02 — Public Verification)
- `VerifyCertView` — public verification portal, accessible to all roles.
- `PageHeader` with ShieldCheck icon.
- Portal banner card (Lock icon, "Official Certificate Verification Portal").
- Search GlassCard with Input (mono, uppercase, search icon prefix) + "Sahkan" button.
  - On submit → `GET /api/certificates/verify?code=...` (relative path).
  - Pre-fills from `viewParams.code` and auto-verifies on mount (guarded by `autoRanRef` to prevent re-running).
- Result states:
  - Loading: spinner with localized "Memuatkan..." text.
  - **Valid**: emerald-bordered GlassCard with CheckCircle2 icon, "SAH" badge. Displays recipient block (name + staffNo), course block (code + title + duration), grid of verify code / issued / expires, footer authenticity note, and a "Lihat Sijil Saya" button.
  - **Invalid**: rose-bordered GlassCard with XCircle icon, "TIDAK SAH" badge, displays server message and a hint to contact admin.
  - Expired-but-valid certs show an additional amber "TELAH TAMAT / EXPIRED" badge.
- All API errors surfaced via `toast.error`.

### 3. `src/components/lms/views/reports.tsx` (RPT-01 / RPT-02 / RPT-03)
- `ReportsView` — analytics & reports.
- `PageHeader` with FileBarChart icon; department filter `<Select>` populated from `GET /api/departments` (`"all"` = no filter).
- Tabs: "Laporan Penyiapan" (completion) | "Laporan Kehadiran" (attendance).
- **Completion tab**:
  - Stat row: total enrollments, completed count, completion rate %.
  - Table inside `ScrollArea` (`max-h-96`) with sticky header: staffNo, name, department, courseCode, courseTitle, level (levelStyles badge), status (statusStyles badge), progressPct (Progress bar + %), completedAt (`formatDateMY`).
  - "Eksport CSV" button → `window.open("/api/reports/completion?format=csv&departmentId=...", "_blank")`.
- **Attendance tab**:
  - Stat row: total records, unique staff count, overall attendance rate (accent color adapts: emerald ≥80, amber 60-79, rose <60).
  - Horizontal `BarChart` (recharts, vertical layout) showing bottom-10 staff by rate — bar colors per band, dark glass tooltip.
  - Summary-by-staff table (rate asc, worst first — as returned by API): staffNo, name, department, total, hadir (emerald), lewat (amber), tidakHadir (rose), cuti (sky), rate (custom color-coded progress bar + %).
  - "Eksport CSV" button → `window.open("/api/reports/attendance?format=csv&departmentId=...", "_blank")`.
  - Color legend at bottom.
- All three queries lazily enabled based on active tab.

## Conventions Followed
- `"use client"` at top of every file.
- TypeScript interfaces for every API response (CertificateItem, VerifyCertificate, CompletionRow, AttendanceSummary, etc.).
- TanStack Query `useQuery` only (no mutations needed; exports + PDFs go through `window.open`).
- `GlassCard`, `PageHeader`, `StatCard`, `EmptyState`, `statusStyles`, `levelStyles` reused from `@/components/lms/ui`.
- shadcn/ui: Button, Badge, Input, Label, Skeleton, Progress, Select, Tabs, Table, ScrollArea.
- `cn` from `@/lib/utils` for conditional class merging.
- `formatDateMY` from `@/lib/lms/audit` for all date rendering.
- `toast` from `sonner` for feedback.
- i18n via `useI18n()` — `t(key)` with proper `DictKey` typing on passed-down `t` callbacks (matches pattern in `my-courses.tsx`).
- recharts `CHART_HEX` constant; tooltip style object for dark glass look.
- All fetches use relative paths only.
- No emojis, no test code, no extra footer (AppShell owns the footer).
- Loading states via Skeleton/pulse; responsive mobile-first (`sm:`/`lg:` breakpoints).
- Mobile-friendly: tables wrapped in `ScrollArea` with sticky headers, touch targets ≥ 36px.

## Quality Gates

### ESLint
`bun run lint` — **0 errors / 0 warnings in the 3 created files**.

Pre-existing errors remain in other agents' files:
- `src/components/lms/app-shell.tsx:49` (setState-in-effect, pre-existing)
- `src/components/lms/views/users.tsx:348` and `attendance-bulk.tsx:98` (other agents' work)

These are unrelated to Task 4 and not touched.

### TypeScript
`bunx tsc --noEmit` — **0 errors in the 3 created files**. Pre-existing jsPDF type error in `api/certificates/[id]/pdf/route.ts` is a backend route, out of scope.

### Dev Server
`dev.log` shows the view-router successfully resolves imports for `certificates`, `verify-cert`, and `reports` (lines 17-19). Remaining "Module not found" errors in the log are for other agents' pending files (`corrections`, etc.).

## API Contracts Verified
Cross-checked the actual route handlers to confirm response shapes:
- `GET /api/certificates` → `{ certificates: [{ id, certNo, verifyCode, issuedAt, expiresAt, course: { id, code, title } }] }`
- `GET /api/certificates/verify?code=` → `{ valid, message?, certificate?: { certNo, verifyCode, issuedAt, expiresAt, recipientName, staffNo, courseCode, courseTitle, courseDurationHours } }` (public, no auth)
- `GET /api/reports/completion` → `{ rows: [...], total, completed }` (+ `?format=csv`)
- `GET /api/reports/attendance` → `{ rows, summary (sorted by rate asc), totalRecords, overallRate }` (+ `?format=csv`)
- `GET /api/departments` → `{ departments: [{ id, name, userCount }], categories }`
- `GET /api/certificates/[id]/pdf` → PDF attachment.

All endpoints used as documented.

## Integration Notes for Downstream Agents
- The view-router (`src/components/lms/view-router.tsx`) already imports these three components on lines 17-19 — no router edits needed.
- Navigation entries already exist in `src/components/lms/nav.ts`:
  - `certificates` → STAFF, TRAINER, ADMIN
  - `verify-cert` → all roles
  - `reports` → ADMIN, HR, TRAINER
- To deep-link into verify-cert from anywhere, call `setView("verify-cert", { code: "<verifyCode>" })` — the view auto-runs verification on mount.
