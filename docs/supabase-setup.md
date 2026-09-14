# Supabase account setup

The repository contains a real Supabase Auth, Postgres RLS and Edge Function integration. Until the steps below are completed, the deployed app deliberately remains in guest-only mode and shows no fake users or statistics.

## One-time project setup

1. Create a Supabase project in the region you choose and note its project ref. Do not paste its database password, secret key or service-role key into this repository.
2. Install the Supabase CLI, run `supabase login`, then from this repository run `supabase link --project-ref YOUR_PROJECT_REF`. Authentication happens in the CLI/browser; do not save its token in this repository.
3. In Authentication → URL Configuration, set Site URL to `https://nachen1126.github.io/Explore_English/` and add `https://nachen1126.github.io/Explore_English/**` as a redirect URL. Add the exact localhost URL printed by Vite while developing.
4. Enable email/password authentication. Keep email confirmation enabled for production. Configure the sender/template in Authentication → Email before inviting real learners.
5. Apply `supabase/migrations/202609140001_accounts.sql` with `supabase db push`, or paste that complete migration into the SQL Editor once.
6. Deploy the protected function with `supabase functions deploy admin-users`. JWT verification must stay enabled. Supabase supplies `SUPABASE_URL` and the legacy server-only service role environment variable to its hosted function; if your project uses the newer secret-key system, add it with `supabase secrets set SUPABASE_SECRET_KEY=...`. Never prefix that secret with `VITE_`, commit it, or put it in GitHub Pages variables.
7. Register your own account through the website and confirm its email. Copy that user's UUID from Authentication → Users, then run this once in SQL Editor:

   ```sql
   insert into public.admin_users (user_id) values ('YOUR-USER-UUID');
   ```

   Administrator status is checked against this server-side allow-list. Editing browser storage cannot add a row.
8. In Project Settings → API Keys, copy the Project URL and the **publishable** key (safe for a browser). Do not use a secret/service-role key.
9. In GitHub → Explore_English → Settings → Secrets and variables → Actions → Variables, create `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. They are intentionally Actions variables because both values are public browser configuration.
10. Re-run the Pages workflow or push a commit. Test registration, confirmation, password recovery, two-device progress, ordinary-user `/admin` denial, and the administrator dashboard against the deployed project.

## Security model

- Supabase Auth owns passwords, confirmation email, recovery tokens, refresh tokens and sessions.
- `profiles` and `learning_records` have RLS plus least-privilege grants. Authenticated users can select/insert/update only the row whose UUID equals `auth.uid()`. The server-owned `scene_requirements` table supplies the exact target count for each published scene and grants browser roles no access.
- `admin_users` grants no browser role any table access. `is_admin()` performs a server-side database check for UI discovery only.
- `admin-users` verifies the caller's JWT and re-checks the administrator allow-list with a server-only key before reading Auth users or cross-user metrics.
- The browser never receives password hashes, refresh-token lists, secret keys or the contents of `admin_users`.
- “Active” means a login or recorded learning event in the trailing 30 days. A scene is complete only when its discovery count reaches that scene's server-owned target count; challenge count is the number of saved attempts. These metrics and the latest real learning-event timestamp are derived from the saved state by a database trigger rather than accepted as separate client fields.

## Validation queries

Use two confirmed test users. With user A's access token, the Data API request for user B's `learning_records` row must return no rows, and an insert/update using user B's UUID must fail the RLS policy. Repeat in the opposite direction. Do not paste access tokens into issue comments, logs or this repository.
