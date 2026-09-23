# EqualAccess Portal

React + Vite + Tailwind CSS project running inside Figma Make. Package manager is **npm** (a stale `pnpm-lock.yaml` was removed — do not reintroduce pnpm lockfiles, it breaks Vercel builds).

## Development Server

A Vite development server is **always running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Key Files

- `src/App.tsx` - Main application component
- `src/main.tsx` - React entry point
- `src/index.css` - Global styles and Tailwind CSS import
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration

## Styling

This project uses **Tailwind CSS v4** for styling. Use Tailwind utility classes directly in JSX. Tailwind is loaded via the Vite plugin — no PostCSS config needed.

## Database (Supabase)

Data is stored in Supabase and accessed through `@supabase/supabase-js` (no backend server).

- `src/lib/supabase.ts` — client (reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, works in Vite + Node)
- `src/lib/db.ts` — snake_case ↔ camelCase mapping, load/sync helpers
- `src/store.tsx` — loads all tables on startup and syncs every change back (falls back to localStorage if offline)
- `src/lib/catalog.ts` — **single source of truth** for the 14 official barangays, disability types, assistance types, job vocabulary (employment types, work arrangements, statuses, education levels, accommodations) and the Asia/Manila date helper. Never redefine these lists in a page; import them.
- `src/lib/stats.ts` — every dashboard/report metric (`computeRawStats` in memory, `shapeStats` for display, `statsViolations` for the reconciliation checks). The `dashboard_stats()` Postgres function mirrors it. `src/lib/useDashboardStats.ts` runs that function (on data change, every 30 s, on window focus) and falls back to the in-memory numbers.
- `src/lib/recommend/` — rule-based job recommendation engine (skills 35 · disability suitability & accommodations 25 · education 15 · location 15 · work-type/arrangement preference 10; minimum score 40 and at least 40% skill coverage). **Recommendations stay locked until the PWD enters skills and highest education** (`canRecommend` in `profile.ts`; `getRecommendations` returns `locked: true`). Skills are matched through `taxonomy.json` (`synonyms` = same skill in other wordings incl. Tagalog, `related` = close skills that earn 0.4 credit); add new vocabulary there. Recommendations only — there is no applying, and admins have no job-listing page. Disability type is only a positive signal — a job is hidden only when the employer explicitly restricted it. Used by `src/pages/pwd/Jobs.tsx` (setup form: `RecommendationSetup.tsx` + `components/SkillsPicker.tsx`) and `src/pages/pwd/Dashboard.tsx`. `accuracy.test.ts` scores the engine against hand-labelled applicant/job pairs — extend it when jobs or vocabulary change.
- `src/lib/normalize.ts` — reads older stored job/user shapes into the current model.
- `src/pages/admin/Recapitulation.tsx` + `src/components/recapitulation/` + `src/lib/recapitulation/` — admin-only **PWD Recapitulation**, two tabs on one page over the same dated snapshot (`recapitulation_reports`, one row per as-of date): **By Barangay** (per-barangay counts by age bracket + DOH PRPWD encoding status) and **By Disability Type** ("Disability Data of Los Baños" — the 10 official disability types × 4 age brackets (0-17/18-30/31-59/60+) × sex, with view-only age-group/sex/search filters, summary cards, three charts, its own CSV/Excel/print/PDF export, and an editable grid inside the same "Edit Data" modal). Data lives in `recapitulation_*` tables (migrations `20260922010000_recapitulation.sql` + `20260924000000_recapitulation_disability.sql`). Tables have no write policies: everything goes through `get_recap_reports` / `save_recap_report` / `delete_recap_report`, which re-check the admin's id + password and save in one transaction; totals and percentages are generated columns. Exports are built in the browser (`export.ts`, ExcelJS loaded on demand; "Export PDF" reuses the print dialog's "Save as PDF" rather than a PDF library). Seed the April 30, 2026 snapshot with `npm run seed:recap` (barangay) then `seed_recapitulation_disability_data()` runs automatically with the disability migration.
- `supabase/migrations/` — schema (push with `supabase db push`). Barangay and disability type are plain text columns, so their lists need no migration. Run `npm run seed` after pushing `20260921000000_jobs_and_live_stats.sql` for a clean job-listing demo set. Jobs now come only from `src/data.ts` (seeded); the old `job_applications` table is no longer used by the app.
- `supabase/functions/` — Edge Functions: `send-reset-code` (Gmail SMTP OTP) at `reset-password`
- `scripts/seed.ts` — writes all demo data from `src/data.ts` into the database

Commands (requires `.env`, see `.env.example`):

- `npm run seed` — wipe and re-seed all demo data
- `npm run seed:recap` — insert the April 30, 2026 recapitulation snapshot if missing (idempotent; `npm run seed` does not touch it)
- `npm run test` — run the vitest suite (recommendation engine rules and labelled accuracy set, dashboard statistics and reconciliation invariants)
- `supabase db push` — apply migrations
- `supabase functions deploy send-reset-code` / `supabase functions deploy reset-password`
- `supabase secrets set SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=...`

Demo logins: PWD users use their PWD ID No. (e.g. `LB-VIS-2023-00421`) with password `pwd123`; admin staff use their username (e.g. `pdao.admin`) with password `admin123`.

Password reset sends a 6-digit code by email (valid 15 minutes) via the Edge Functions above.

## Deployment (Vercel)

Production lives at `https://equal-access-portal.vercel.app/`, connected to the GitHub repo (branch `main`) with auto-deploys. Deploys are triggered on push; verify at Vercel → Deployments that `readyState` is `READY` (builds fail if `package-lock.json` is out of sync with `package.json`).

Vercel builds need these env vars set (Vite inlines them at build time): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. They are already configured in Vercel, mirroring `.env`.

To deploy a build manually without relying on the Git webhook, deploy from this directory with the Vercel CLI (`npx vercel --prod`, or via the REST API with a team-scoped token).
