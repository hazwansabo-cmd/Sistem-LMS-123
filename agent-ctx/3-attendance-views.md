# Task 3 — Attendance Module Views

**Agent:** Claude Code (fullstack-dev)
**Task ID:** 3
**Module:** Attendance (Kehadiran) — Al Amin Edu Oasis LMS
**Status:** Completed

## Scope

Created 7 client-side view components for the Attendance module, wired into the existing client-side view router (`src/components/lms/view-router.tsx`). All views use glassmorphism styling (GlassCard, glass, glass-strong, text-gradient), are responsive (mobile-first), and integrate with the existing API contracts via TanStack Query.

## Files Created

| # | File | View Component | Purpose |
|---|------|----------------|---------|
| 1 | `src/components/lms/views/attendance.tsx` | `AttendanceView` | Sessions hub (ATT-01) — filter tabs, New Session dialog, session cards grid |
| 2 | `src/components/lms/views/session-qr.tsx` | `SessionQrView` | Projector-friendly QR display with 6-digit session code, live expiry countdown |
| 3 | `src/components/lms/views/my-attendance.tsx` | `MyAttendanceView` | Staff code-entry check-in (ATT-02/03), upcoming sessions, attendance history |
| 4 | `src/components/lms/views/attendance-list.tsx` | `AttendanceListView` | Session roster (ATT-05) — stat cards, attendance rate, inline status Select |
| 5 | `src/components/lms/views/attendance-bulk.tsx` | `AttendanceBulkView` | Bulk entry (ATT-05) — mark-all-present, per-row status + remarks, summary |
| 6 | `src/components/lms/views/attendance-import.tsx` | `AttendanceImportView` | CSV import (ATT-06) — drag-zone upload, preview table, valid/invalid counts |
| 7 | `src/components/lms/views/corrections.tsx` | `CorrectionsView` | HR/Admin correction approvals (ATT-09) with AlertDialog confirm |

## Design Decisions

- **State management:** TanStack Query for all server state (`useQuery` + `useMutation` with `qc.invalidateQueries`). Local UI state via `useState`.
- **i18n:** `useI18n()` hook with `t()` for all visible strings; `DictKey` typing ensures compile-time safety.
- **Role-based rendering:** `useSession((s) => s.effectiveRole())` controls trainer vs staff actions, list/edit capabilities, and corrections access.
- **Navigation:** `useUI((s) => s.setView)` to switch between attendance sub-views, passing `sessionId` via `viewParams`.
- **Bulk view refactor:** Split into parent `AttendanceBulkView` (data fetch + skeleton/error) and child `BulkEditor` keyed by session id. Child initializes draft state via lazy `useState(() => …)` initializer — avoids the React 19 `react-hooks/set-state-in-effect` lint rule while preserving edit-doesn't-clobber behavior.
- **QR token encoding:** Session QR encodes `qrToken` (not `sessionCode`) per spec; the 6-digit `sessionCode` is shown separately with a copy-to-clipboard button.
- **Code expiry:** Live countdown timer via `useEffect` + `setInterval`, switches to "expired" badge state.
- **CSV import:** Backend applies valid rows immediately on POST; frontend shows preview table with per-row validation flags and a final success summary.

## API Endpoints Used

- `GET /api/sessions?filter=all|upcoming|today|past|mine`
- `POST /api/sessions` (create session)
- `GET /api/sessions/[id]` (session detail + roster)
- `GET /api/qrcode?text=...&size=...`
- `POST /api/attendance/checkin` (code or qrToken)
- `POST /api/attendance/bulk`
- `POST /api/attendance/import?sessionId=...` (FormData)
- `GET /api/attendance/export?sessionId=...&format=csv`
- `GET /api/corrections`
- `POST /api/corrections/[id]` (approve/reject)

## Lint Status

`bun run lint` — my 7 files pass cleanly (0 errors). The single remaining lint error is in pre-existing `src/components/lms/app-shell.tsx:49` (`setMounted` in effect) and is outside this task's scope.

## Dev Server

`bun run dev` confirmed: `/` returns 200, `/api/sessions` and `/api/corrections` return 401 (expected without auth cookie), `/api/qrcode` returns 200.

## Notes for Downstream Agents

- The `statusStyles` map (in `src/components/lms/ui.tsx`) covers all attendance statuses (`hadir`, `lewat`, `tidak_hadir`, `cuti`, `dikecualikan`) and approval states (`PENDING`, `APPROVED`, `REJECTED`). Use it for consistency.
- `formatDateMY` and `formatDateTimeMY` from `@/lib/lms/audit` produce DD/MM/YYYY and DD/MM/YYYY HH:mm respectively (Kuala Lumpur timezone).
- The `BulkEditor` key-based remount pattern is the React-19-idiomatic way to "sync state to query data on load" — reuse it for similar edit-from-server-data flows.
- The `attendance.tsx` SessionsView exposes navigation to `session-qr`, `attendance-list`, `attendance-bulk`, `attendance-import`, and `my-attendance` — keep these view names stable in the `View` union (already declared in `src/store/app.ts`).
