# Ahmed OS

Personal training / sleep / focus / learning tracker. One responsive PWA for phone and laptop, built from a private build spec (kept locally in `docs/SPEC.md`, not committed).

**Stack:** Vite + React 18 + TypeScript · Supabase (auth + Postgres + RLS + realtime) · Zustand · hand-written SVG charts · GitHub Pages.

## Setup

### 1. Supabase (the new `ahmed-os` project)

1. In the Supabase dashboard of the **ahmed-os** project, open **SQL editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   It creates every table, the indexes, RLS (`user_id = auth.uid()` on all tables), and adds the tables to the realtime publication.
2. **Project Settings → API**: copy the **Project URL** and the **anon public key**. Never use the `service_role` key here.
3. **Authentication → URL configuration**: set Site URL and add a redirect URL for
   `https://<github-username>.github.io/ahmed-os/` (and `http://localhost:5173/ahmed-os/` for local dev).
4. Create your account: either open the app and tap **First time? Create account**, or use **Authentication → Users → Add user**.
5. Then **turn off new sign-ups** (Authentication → Providers/Settings → disable "Allow new users to sign up").

The app seeds itself on first login (`app_state`, all exercise targets with `calibrated = false`, and 30 `quran_juz` rows).

The repo also has a project-scoped Supabase MCP server in [`.mcp.json`](.mcp.json). Authenticate it once from a regular terminal (`claude /mcp` → supabase → Authenticate) and Claude Code can apply the schema and query the tables directly.

### 2. Local dev

```bash
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173/ahmed-os/
```

**Demo mode (no Supabase):** open `http://localhost:5173/ahmed-os/?demo` while `npm run dev` is running. The app loads sample data locally and writes go nowhere. Demo mode is dev-only; it's compiled out of production builds.

```bash
npm test          # progression, week boundaries, streak and muscle-credit logic
npm run build     # typecheck + production build
npm run icons     # regenerate the PWA icons (white glowing "A" on black)
```

### 3. Deploy (GitHub Pages)

1. Create the public repo `ahmed-os` on GitHub and push `main`.
2. **Settings → Secrets and variables → Actions**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Settings → Pages → Source: GitHub Actions.**
4. Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (tests → build → deploy).
5. On the iPhone: Safari → Share → **Add to Home Screen**.

## How it works

| Area | Where |
|---|---|
| Program (Days A/B/C/D, exercises, targets, swaps, muscle credit, goals) | [`src/data/program.ts`](src/data/program.ts) |
| Progression rules (Easy/Good/Hard → next weight/reps) | [`src/lib/progression.ts`](src/lib/progression.ts) |
| Every action + Undo (logs, sleep, focus, Quran, French, streak, session runner) | [`src/lib/actions.ts`](src/lib/actions.ts) |
| Week stats, insights, reminders, sleep/focus/streak math | [`src/lib/stats.ts`](src/lib/stats.ts) |
| Copy-for-Claude text + JSON export | [`src/lib/export.ts`](src/lib/export.ts) |
| Offline write queue (IndexedDB, retried on `online`/focus) | [`src/lib/queue.ts`](src/lib/queue.ts) |
| Store, loading, first-run seed | [`src/lib/store.ts`](src/lib/store.ts) |
| Toronto dates, Mon→Sun weeks | [`src/lib/time.ts`](src/lib/time.ts) |
| Screens | [`src/screens/`](src/screens) |
| Design tokens + glow recipes | [`src/styles/`](src/styles) |

- **Optimistic writes:** local state updates first; the write goes to Supabase, and on a network error it's queued in IndexedDB and replayed in order. A pulsing dot in the Home header shows while anything is unsynced.
- **Cross-device:** realtime subscription + refetch on focus/visibility + 60 s poll. The focus timer and in-progress workout live in `app_state`, so they survive reloads and device switches.
- **Dates:** every row stores a Toronto `local_date`; weeks are Monday → Sunday (plans made before 26 Oct 2026 were Saturday → Friday).
- **Laptop shortcuts:** `B` going to bed, `W` woke up, `F` focus start/break/resume.

### Interpretation notes

Places where the spec left room and the build picked one reading:

- **Muscle credit:** the credit numbers in table 7.3 are the sets credited per completed exercise (curl → arms 3), scaled by sets done / planned. Skill sessions add their listed numbers. Weekly bars and the body map compare against the **upper** end of each range (Arms 18/20).
- **Hard + "keep":** the next target repeats the current target (missed reps don't lower it).
- **Revising a juz** also marks it memorized. **Lost focus** ends the focus block and starts a break.
- **Session finish** needs one last **Finish** tap after the final step, so the last feel can still be undone.
- **Streak with no positive days yet** counts from the first entry.
- The Home **Streak** tile opens a quick sheet (today, count 1, Save) that skips the PIN, since it shows no history. The Streak tab itself is PIN-locked when the PIN is on.
- Muscle-up / Planche "Leveled up" sets the level name to `Lvl N` until you rename it in Settings.

### Phase 2 (not built)

Monthly side posture photo (private `posture` storage bucket).
