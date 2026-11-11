# StudyVault verification — updated November 11, 2026

## CUET PG and bank-exam starter options — November 11, 2026

- Added CUET PG General Paper (COQP11): 6 subjects and 59 ordered topics based on NTA’s currently published common-paper syllabus. The preview includes its paper code, scope, source links, and English/Hindi topic groups.
- Added General Bank Exams: 7 subjects and 66 topics covering quantitative aptitude, reasoning, English, data interpretation, banking awareness, computing, and exam-dependent PO descriptive writing. This is a curated foundation across bank recruitment, with individual notification requirements stated in the preview.
- Preserved GATE 2027 CS with its original 11 subjects and 77 topics. All three are independent selectable cards under Settings → Starter packs, with expandable topic previews and explicit import buttons. The empty-library shortcut scrolls to this catalog; existing #gate-starter links remain supported.
- Generalized the existing atomic import helper to require a selected pack ID. CUET and bank subject names include exam prefixes to keep their progress separate. Existing descriptions, ordering, notes, lessons, and completion are preserved; repeat imports in the same loaded library add only missing names. No fabricated lessons or progress are included.
- All 75 tests across 8 files passed. TypeScript, lint, and the production/PWA build passed. Ten starter-library tests cover all three hierarchies, repeat imports, importing packs together, personal-data preservation, selected account sync queues, and invalid selections.
- Playwright passed all three previews, expandable topics/source links, cancel without writes, selected-only imports, no duplicates, reload persistence, combined 24-subject/202-topic hierarchy, CUET topic navigation, no fabricated lessons, 390px and 320px page/dialog layouts, and zero uncaught application errors. Screenshots: artifacts/starter-packs-desktop.png and artifacts/starter-packs-mobile.png.
- Browser imports used a fresh isolated guest context. No real account was populated, no email was sent, and no remote database migration or configuration change was necessary. Account imports continue through the existing owner-scoped save/sync path; the optional administrator CLI remains GATE-only.
- Changes and the production build are ready locally. Publish these frontend changes through the connected Git/Vercel deployment before expecting the new choices on the public site.
## Signup verification and password login — November 9, 2026

- Added separate Log in and Sign up forms. Signup collects a password and sends the Supabase confirmation link to /settings; future logins use signInWithPassword and send no login email.
- Added confirmation resend, explicit email cooldown, useful rate-limit/verification/credential errors, password visibility controls, and password validation. Email sending limits do not disable the password login form.
- Added Set or change password for existing signed-in Magic Link accounts and a dedicated /reset-password page for forgotten passwords. Password updates preserve the account ID and existing learning library. Expired callback errors cannot display the update form even if a previous session is cached.
- Applied and verified /reset-password callbacks for https://studyvalut-kappa.vercel.app, http://localhost:5173, and http://127.0.0.1:5173. Existing redirects and email confirmation were preserved. No database migrations, user password changes, or learning-record changes were needed.
- TypeScript, lint, all 68 tests across 8 files, real client initialization, and the production/PWA build passed. Nine new tests exercise the actual Supabase SDK with mocked HTTP, including password-only login, password whitespace, signup verification, recovery, resend, authenticated password updates, rate limits, and callback validation.
- Playwright passed signup verification callbacks, mismatch/credential handling, password-only login, existing account password setup, preserved library/reload behavior, sign-out, recovery callbacks, expired links, mobile layout, and no uncaught errors. No password appeared in learning records or local storage. Supabase HTTP was mocked; no real email or real account mutation was performed by the browser test. Screenshot: artifacts/password-signup-mobile.png.
- A live password-endpoint probe correctly rejected a randomly generated nonexistent test account with invalid_credentials. No email was sent and no account was created. A successful real password login remains a user acceptance step after setting a private password.
- The source and production build are ready locally. The existing Vercel site must receive this updated frontend before these controls appear there. Signup verification and password recovery still require email delivery; custom SMTP remains necessary for friends' addresses with the current built-in sender restrictions.

## Production sign-in redirect fix — November 9, 2026

- Verified that https://studyvalut-kappa.vercel.app and its /settings route return HTTP 200, use this checkout's Supabase project, and request Magic Link redirects to the browser's current origin.
- Confirmed the cloud Site URL was still http://localhost:5173 and the deployed /settings callback was absent from the allowlist.
- Set the cloud Site URL to https://studyvalut-kappa.vercel.app and added the exact https://studyvalut-kappa.vercel.app/settings callback. Preserved existing redirects, local development callbacks, and unrelated project settings.
- Verified the saved remote configuration has zero differences from the declared auth settings. Saved the public production origin as STUDYVAULT_APP_URL in Git-ignored .env.local for future administration runs. No frontend change or redeployment was required, no learning records were changed, and no test email was sent.
- Request a new sign-in email from the deployed site to exercise the corrected callback. Earlier emails can retain the old redirect URL; a fresh email sign-in has not been completed as part of this fix.

## Completed checks

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 75 tests passed across 8 files |
| `npm run check:supabase` | Real configured client initialized successfully |
| `npm run supabase:setup` | Completed against the existing cloud project; rerun verified idempotent setup |
| `npm run supabase:verify` | Live schema/security and rollback-only CRUD workflow passed |
| `npm run build` | Passed; static production output and PWA service worker generated |
| `npm audit --omit=dev --json` | 0 reported production dependency vulnerabilities |
| Full dependency audit after tooling updates | 4 low-severity findings remain in development/build dependencies; no critical/high/moderate findings |
| Production HTTP check at `http://127.0.0.1:4173/` | 200 |

The 75 tests include actual PostgreSQL migration execution in PGlite, Row Level Security, revision conflicts, idempotent retries, parent ownership, tombstones, blocked writes under deleted parents, concurrent IndexedDB transactions, account/cache isolation, edits during in-flight synchronization, backup validation, accepted/rejected YouTube URL formats, progress, lesson resume behavior, public-key validation, and malformed cloud-response rejection. SQL unit tests now reproduce Supabase's direct default function grants and verify that the follow-up migration removes anonymous execution privileges.

## Applied cloud setup

- Installed official Supabase CLI 3.0.0 as a project development dependency and used the existing Supabase JavaScript SDK 2.119.0.
- Authenticated through Supabase's official browser/verification-code flow. No management token or database password was hardcoded or printed.
- Linked the existing project detected from `.env`. Before migration, live inspection found no StudyVault tables, sync RPC, or migration history. The initial dry run listed only the expected migration and no seeds or custom role files.
- Applied `202611070001_studyvault.sql`, creating subjects, topics, lessons, private mutation receipts, owner foreign keys, ordering/notes/completion fields, RLS policies, and the revision-checked sync RPC.
- Applied `20261107120000_restrict_sync_rpc.sql` to revoke Supabase's direct default anonymous function grant. This is permission-only and does not change learning records.
- Verified that both migration versions are recorded remotely and match local history. Repeated setup reported the database already up to date.
- Configured the email provider and exact localhost callback URLs using a partial configuration. Existing callback URLs and unrelated cloud settings were preserved. Email confirmation remains required.
- Generated `src/lib/database.types.ts` from the live public schema and connected those types to the shared frontend client. The sync response validator keeps local changes queued if an invalid server response is received.
- Ran live SQL tests as two synthetic authenticated users: subject/topic/lesson create and edit, ordering, notes, completion, topic/subject progress, idempotent retry, stale-device conflicts, soft deletion, parent protection, private receipts, and cross-user isolation. The entire transaction was rolled back; no test fixtures remained and existing records were not reset, dropped, or overwritten.
- Verified that unauthenticated API requests are denied and that all four tables have RLS enabled. The three learning tables allow authenticated owner reads and deny direct client writes; the RPC permits authenticated execution only.
- Sent one real Magic Link to the user-authorized test address. Supabase subsequently confirmed email verification and a successful sign-in. No account address, access token, refresh token, or private learning content is included in this report.

The production build passed with a non-blocking warning that its main minified JavaScript chunk exceeds 500 kB (about 175 kB gzip).

## Browser checks

Playwright ran against the production build in an isolated Chromium browser context. Test libraries were created by the tests and did not populate the user's browser profile or application source. Temporary browser scripts were executed through the Playwright skill.

- Created, edited, reordered, and deleted subjects, topics, and lessons. Cancelled destructive actions and verified the records remained.
- Opened the official YouTube iframe. Actual video/audio playback was not asserted.
- Explicitly simulated YouTube API error 101 and verified the creator-blocked explanation and external playback link. This was an error-path test, not a live test of a blocked video.
- Navigated Previous/Next, entered and exited Focus mode, marked lessons complete and incomplete, and checked Continue Studying skips completed lessons.
- Verified notes and completion persist after reload. Verified notes also save when navigating away immediately after typing.
- Waited for the production service worker, went offline, edited notes, reloaded offline, and verified both the application shell and notes remained available.
- Exported a JSON backup, imported it additively with a confirmation preview, and verified original data stayed intact.
- Rejected malformed backups and non-YouTube video URLs without adding records.
- Verified edits and deletions propagate between two tabs in the same browser context.
- Verified parent deletion excludes descendant lessons from the visible library and progress.
- Checked 320px, 390px, 768px, and 1440px layouts with no horizontal page overflow. Tested mobile library navigation and study mode.
- Tested the mobile navigation focus trap, Escape dismissal, background inertness, and focus restoration.
- Verified dark-theme persistence after reload. The main workflow produced no uncaught application errors.

Screenshots from the browser checks are available in the local, git-ignored `artifacts/` directory.

After cloud setup, an additional browser smoke check verified the real configured client, enabled email sign-in controls, overview/settings navigation, a 390px mobile layout, and zero uncaught application errors. It used an isolated browser context and sent no additional email.

## GATE 2027 CS starter library

- Checked the official IIT Madras 2027 CS and General Aptitude syllabus PDFs on 7 November 2026 and organized their topics into 11 subjects and 77 ordered topics.
- Previewed the account additions inside a rolled-back transaction, then saved 11 subjects and 77 topics to the existing project's single confirmed, signed-in account through the authenticated revision-checked RPC. Existing records were preserved. No lessons, video URLs, completion values, or notes were fabricated.
- Repeated the cloud preview after saving: 0 subjects and 0 topics would be added. This verified persistence and duplicate prevention without additional changes.
- Added Settings preview/import for either the current account or local workspace. Existing matching subjects/topics, custom descriptions, ordering, lessons, notes, and progress are preserved.
- Added three meaningful tests for valid hierarchy and ordering, preserving existing learning data and repeat imports, and account sync queue isolation. All 59 tests passed; TypeScript, lint, and production build passed.
- Playwright verified preview cancellation, adding all 11 subjects/77 topics, reload persistence, repeated import without duplicates, Algorithms navigation, mobile layout, and no uncaught application errors. It used a fresh isolated guest browser context and sent no email.
- Re-saving the unchanged Vite configuration resolved a stale dependency cache in the already-running development server. Browser checks then passed at localhost:5173. The server was left running.
## Remaining deployment and physical-device checks

The Supabase cloud setup, real email sign-in, and live database/security checks are complete. Physical-device PWA installation, actual YouTube media playback, and the Laptop A → Phone → Laptop B acceptance test have not been exercised on the user's physical devices. The database conflict/retry contract was verified against the live project, and the client offline queue is covered by automated tests.

See [README.md](README.md) for the reusable CLI setup/verification commands, production callback configuration, Vercel deployment, and physical-device acceptance steps. Frontend deployment to Vercel was not part of this Supabase setup run.

An already running StudyVault server at `http://localhost:5173` was reused for the email callback and latest browser smoke check. It was left running. The original production-preview QA server on port 4173 was stopped after its tests. The Windows launcher remains available to start the app in future sessions.

