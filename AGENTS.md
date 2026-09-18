# EqualAccess Portal

React + Vite + Tailwind CSS project running inside Figma Make.

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
- `.mise.toml` - Toolchain versions (Node.js, pnpm)

## Styling

This project uses **Tailwind CSS v4** for styling. Use Tailwind utility classes directly in JSX. Tailwind is loaded via the Vite plugin — no PostCSS config needed.

## Database (Supabase)

Data is stored in Supabase and accessed through `@supabase/supabase-js` (no backend server).

- `src/lib/supabase.ts` — client (reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, works in Vite + Node)
- `src/lib/db.ts` — snake_case ↔ camelCase mapping, load/sync helpers
- `src/store.tsx` — loads all tables on startup and syncs every change back (falls back to localStorage if offline)
- `supabase/migrations/` — schema (push with `supabase db push`)
- `supabase/functions/` — Edge Functions: `send-reset-code` (Gmail SMTP OTP) at `reset-password`
- `scripts/seed.ts` — writes all demo data from `src/data.ts` into the database

Commands (requires `.env`, see `.env.example`):

- `npm run seed` — wipe and re-seed all demo data
- `supabase db push` — apply migrations
- `supabase functions deploy send-reset-code` / `supabase functions deploy reset-password`
- `supabase secrets set SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=...`

Demo logins: PWD users use their PWD ID No. (e.g. `LB-VIS-2023-00421`) with password `pwd123`; admin staff use their username (e.g. `pdao.admin`) with password `admin123`.

Password reset sends a 6-digit code by email (valid 15 minutes) via the Edge Functions above.
