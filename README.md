# StudyVault

A personal, distraction-free learning library built with React, Vite, TypeScript, Tailwind CSS, Supabase, and IndexedDB. Organize subjects → topics → YouTube lessons, take notes, and track completion without recommendation feeds.

## Run

Requires Node **22.12+** (Node 22 LTS recommended).

**On Windows, double-click [`Start-StudyVault.bat`](Start-StudyVault.bat).** It checks Node.js, installs dependencies if missing, starts the frontend at `http://localhost:5173`, and opens your browser. Keep the launcher window open while using StudyVault; press Ctrl+C to stop it. Supabase is the hosted backend and connects automatically when configured below. It does not need a separate local server. Without Supabase settings, the launcher starts the local offline workspace.

To start manually:

```sh
npm install
npm run dev
```

Without Supabase configuration, StudyVault runs in **local mode**. This is a real, empty library stored in the browser’s IndexedDB, not sample data. Subjects, topics, lesson ordering, completion, and notes persist across reloads. Each browser/profile has its own local workspace. Back it up before clearing browser data.

## Connect Supabase

This checkout is linked to the existing cloud project from `.env`. Both migrations have been applied. You do not need to paste SQL into the dashboard. The official Supabase CLI is installed as a development dependency.

For administrator setup from a new checkout:

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` only if `.env` does not already exist. Fill in the existing project URL and **publishable** key:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   ```

   The legacy public anon key is also supported through `VITE_SUPABASE_ANON_KEY`. Never use a secret or `service_role` key in a `VITE_` variable. Frontend environment variables are public.

   Vite reads `.env` through `import.meta.env`; `.env.local` can override it on an individual device. Environment files are ignored by Git. The shared client is exported as `supabase` from `src/lib/supabase.ts`. Vite rejects privileged keys in either public key variable before starting or building.

   Run `npm run check:supabase` to verify that the actual configured client and its session handling initialize. This command does not print credentials, send email, or write database records; it does not verify live service access.

3. Run `npm run supabase:login` and complete Supabase's official browser authorization. This login is only for administering the cloud project; ordinary app users do not need the CLI. Tokens remain in Supabase's credential storage and are never copied into frontend code.
4. Run `npm run supabase:plan` to inspect the pending migration list, then `npm run supabase:setup`. The setup derives the existing project from `.env`, links it, checks existing objects/history, applies only the reviewed migrations, configures email sign-in callbacks, generates TypeScript database types, and runs live checks. It refuses untracked existing StudyVault objects or unreviewed migrations instead of resetting or repairing history. No seed, custom role, or vault changes are applied.
5. Run `npm run supabase:verify` whenever you need to recheck the live schema, security, and CRUD contract. Its synthetic fixture users and learning records exist only inside a transaction that is rolled back, including on failure. Existing data is not overwritten.
6. Start StudyVault and open Settings. Choose **Sign up**, enter an email and password, and open the one-time verification link from your inbox. After verification, use **Log in** with the same email and password on every device. Regular login sends no email. If you already have a signed-in account from the old Magic Link flow, choose **Set or change password** first; if signed out, use **Forgot password?** to receive a recovery link and set one.
7. If you already created data locally, choose **Copy local library to account** in Settings and confirm the preview. Account data and local data remain separate; signing in does not silently upload or replace the local workspace. Copying twice creates two copies.

The setup preserves existing callback URLs and unrelated cloud settings. It adds the `/settings` verification callback and `/reset-password` recovery callback for both localhost and 127.0.0.1 on port 5173. An existing production Site URL is retained. Before deploying to another origin, set the server-only `STUDYVAULT_APP_URL=https://YOUR_APP.vercel.app` in `.env.local` and rerun `npm run supabase:setup`; this adds the exact production verification/recovery callbacks and updates the Site URL. This variable contains no secret and is not embedded in the frontend.

`npm run supabase:types` refreshes `src/lib/database.types.ts` directly from the public cloud schema. The app client uses these generated types. `npm run check:supabase` remains the lightweight initialization check; it does not replace the live verification command.

The CLI setup does not reset, drop, truncate, or seed the remote database. If the project has unrelated migration history or existing incompatible objects, inspect those first; do not use reset or history repair to bypass a setup refusal. New-account verification, verification resends, and password recovery still send emails. Supabase's built-in sender is for testing, allows only project-team recipients, and has a low shared quota. Configure custom SMTP for friends or other public users. Email confirmation remains enabled; switching to passwords does not bypass signup email restrictions.

References: [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [custom email delivery](https://supabase.com/docs/guides/auth/auth-smtp), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Use

### Exam starter packs

Open **Settings → Starter packs** to preview and add one of these outlines:

| Pack | Subjects | Topics | Coverage |
| --- | --- | --- | --- |
| GATE 2027 CS | 11 | 77 | General Aptitude and all ten CS sections |
| CUET PG General Paper (COQP11) | 6 | 59 | English/Hindi comprehension, general awareness, computing, aptitude, reasoning |
| General Bank Exams | 7 | 66 | Quantitative aptitude, reasoning, English, data interpretation, banking awareness, computers, exam-dependent PO descriptive writing |

Expand subjects in the preview to inspect their topics and source links. Only the selected pack is added, after pressing its Add button. Existing subjects, descriptions, notes, lessons, ordering, and completion are preserved. Repeating a pack in the same loaded library adds only missing names; renamed or deleted topics can be added again. CUET and bank subjects have exam prefixes to keep progress separate when several packs are imported.

The packs contain no video links, completed lessons, or sample notes. Add your own YouTube lessons to start tracking progress. Imports use the existing atomic local save and account sync queue. Sign in first for cross-device access, or copy a local library into your account later. The empty-library screen also links to the pack catalog.

The GATE outline uses IIT Madras’s [CS](https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/CS_GATE2027_Syllabus.pdf) and [General Aptitude](https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/GA_GATE2027_Syllabus.pdf) syllabi, checked on 7 November 2026. CUET uses NTA’s currently published [COQP11 syllabus](https://cdnbbsr.s3waas.gov.in/s388a839f2f6f1427879fc33ee4acf4f66/uploads/2025/12/202512131769837174.pdf), checked on 11 November 2026; confirm your chosen course’s paper/language requirements and the syllabus for your exam cycle.

The bank pack is a curated foundation across IBPS/SBI-style recruitment, not a single official combined syllabus or a claim that every exam uses every section. Its sources include the official [SBI PO scheme](https://sbi.bank.in/documents/77530/57941/18062026_1_Detailed_Adv.2026.pdf/1f1a9532-8a2f-6e59-08a0-616d62a497b1?t=1781759726353) and [Junior Associates prelims booklet](https://sbi.bank.in/webfiles/uploads/files_2627/09/SBI_JA-Customer_Support_Sales-IH_Pre-2026-27_Eng.pdf), checked on 11 November 2026. Match optional computer/descriptive topics to the target notification. Current affairs are study headings, with no stale facts prefilled.

Packs are maintained in `src/data/gate-2027-cs.json`, `src/data/cuet-pg-coqp11.json`, and `src/data/bank-exams-general.json`. The optional administrator commands `npm run starter:cloud` / `npm run starter:cloud:apply` remain **GATE-only**, require exactly one confirmed account that has signed in, and preview/save through the authenticated RPC. The new options use the current user’s Settings import. Adding options does not seed remote accounts or run database migrations.

- Add a subject, then a topic, then a YouTube lesson with your own title.
- Standard watch, `youtu.be`, Shorts, live, and embed video links are supported, including watch links with playlist parameters. Playlist-only URLs cannot identify a specific video and are rejected. Bulk playlist importing is outside this version’s scope.
- Use arrow controls to reorder topics and lessons. Edit/delete controls are available beside each item. Deleting a subject or topic removes its descendants from the visible library; a confirmation explains this first.
- Study mode offers the official YouTube player, Previous/Next navigation across the subject, a lesson outline, completion controls, and Focus mode. Creator-blocked, missing, and player connection errors offer a direct YouTube link. Playback availability remains controlled by YouTube. Its native controls and recommendations remain inside the official player.
- Notes save locally after 800 ms of inactivity, on blur, on lesson navigation, or with **Save notes**. Failed saves are reported. A reload/close with unsaved notes triggers the browser’s unsaved-changes warning when supported.
- Continue Studying resumes the most recently opened unfinished lesson, or the first unfinished lesson when none has been opened.
- Theme choice persists on this browser. On the first visit it follows the system preference.
- Export a versioned JSON backup in Settings. Imports are validated, previewed, and added atomically under new IDs, preserving existing data. Files are limited to 10 MB. Treat backups as private documents.

## Sync and offline behavior

- Every edit commits to IndexedDB before the UI reports success. Signed-in edits also create a durable, coalescing outbox entry in the same transaction. Anonymous/local edits never call the cloud API.
- Sync runs after edits, on reconnect, on returning to the app, and every 20 seconds while open. It does not run in the background after closing the app. Cloud reads are paginated.
- PostgreSQL is authoritative for revision numbers. The `apply_study_change` RPC validates the authenticated owner, whitelists editable columns, checks the expected revision, increments revisions, and returns the saved row in one transaction. Per-owner transaction locks prevent races between parent deletion and child writes.
- Mutation receipts make network retries idempotent. Edits made while a request is in flight remain queued against the newly acknowledged revision. IndexedDB transactions and Web Locks coordinate tabs; revision checks remain the safety net on browsers without Web Locks.
- A stale revision never overwrites a newer row. Both versions are presented in **Settings → conflicts**. Choose your changes or the other device’s version. Choosing your changes performs another revision check. If the parent was deleted, discard the blocked child change; its content is visible in the conflict review for copying elsewhere.
- Deletions use tombstones so another device cannot accidentally resurrect deleted records. Deleted records and mutation receipts remain in PostgreSQL; automated pruning is intentionally omitted for this small personal library.
- Each account has a separate cache and outbox. Signing out returns to this browser’s local library. Cached account data remains on this browser for the next sign-in; use only trusted personal devices. Auth sessions use Supabase’s standard browser session persistence.
- The PWA service worker precaches the application shell and icons. Your cached library and offline edits work after the first successful online visit. YouTube videos are **not** cached or downloaded and require an internet connection. Auth sign-in and first-time account loading also require connectivity.
- Service-worker updates prompt before refreshing. Save notes before accepting an update. Browser storage can still be evicted by the operating system; use JSON backups.

## Database security

The normalized `subjects`, `topics`, and `lessons` tables have owner-scoped Row Level Security for reads, authenticated-owner composite foreign keys, and no direct client write grants. All writes go through the authenticated, revision-checked RPC. Its `SECURITY DEFINER` function uses an empty search path, a fixed table allowlist, fixed column allowlists, and server-controlled ownership/revision fields. Anonymous users cannot read or mutate cloud learning data. No privileged database key is required in the app.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run check:supabase
npm run supabase:verify
npm run build
npm run preview
```

The tests cover accepted/rejected URLs, progress/resume behavior, backup validation, durable concurrent local edits, account isolation, in-flight changes, tombstones, SQL migrations, RLS, authenticated writes, revision conflicts, idempotent retries, public-key validation, and malformed sync responses. SQL unit tests execute all migrations in PGlite with a test `auth.uid()` and Supabase-style default function grants. The separate cloud verification command exercises the actual deployed schema and RPC inside a rollback-only transaction. Completing the real email link remains necessary to verify browser sign-in.

### Live acceptance checks after configuration

1. **Laptop A:** sign in, create a subject/topic/lesson, play the lesson, add notes, and mark it complete. Wait until the header reports synced.
2. **Phone:** sign in with the same email, open the app, verify the lesson, notes, and completion status. Use Safari’s Share → Add to Home Screen on iPhone, or the browser install control on Android/desktop.
3. **Laptop B:** sign in with the same email and verify the same progress.
4. **Offline:** first load the production build online; go offline; edit notes/completion; reload; verify the changes persist. Reconnect and wait for synced status; verify the changes on another device.
5. **Conflict:** take Laptop A offline and edit a lesson. Edit the same lesson on Laptop B online and sync. Reconnect A. Confirm that Settings shows both versions and that choosing one syncs correctly.
6. Export JSON, import it, check the confirmation counts, and verify that imported lessons preserve notes and completion without replacing the original subjects.

Real email delivery, actual YouTube playback, live Supabase policies, PWA installation on your physical devices, and the three-device acceptance test require your configured accounts/devices and must be checked there.

## Deploy to Vercel

1. Push this project to a Git repository and import it into your Vercel account, or deploy this directory using the Vercel CLI.
2. Use the Vite preset with `npm run build` and output directory `dist`. These settings and SPA rewrites are included in `vercel.json`. Select Node 22.x or later compatible with the dependencies.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel’s project environment variables **before building**. Redeploy after changing them. Vite embeds these public settings at build time.
4. Set `STUDYVAULT_APP_URL` to the deployed HTTPS origin in the administrator checkout and run `npm run supabase:setup` to configure the Site URL and callback allowlist. Add any preview domains explicitly if you use them for auth testing.
5. Open `/subjects` directly to verify SPA routing, then complete the live acceptance checklist. HTTPS is required for installation/service workers outside localhost.

The existing Supabase cloud project is configured by the setup script. Creating a new cloud project and deploying the frontend to Vercel remain separate account actions.

## Source map

```text
src/components/   dialogs, YouTube player, PWA update prompt
src/pages/        overview, library, study mode, settings
src/lib/          domain model, IndexedDB, backups, auth client, sync provider, tests
supabase/         SQL migration
public/           application icons
scripts/          reproducible Windows icon generation
```

No quizzes, AI features, streaks, gamification, social features, payments, or admin dashboards are included.

