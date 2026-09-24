# Deployment Guide

StreamVerse deploys to **Vercel** with **Supabase** as the database/auth
backend and **TMDB** for catalog data.

## 1. Supabase

1. Create a project at https://supabase.com/.
2. Apply the migrations in `supabase/migrations/` in order:
   - `0001_init.sql` — schema + profile-on-signup trigger.
   - `0002_rls.sql` — Row Level Security policies.
   You can paste them into the **SQL Editor**, or use the Supabase CLI:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
3. **Auth → Providers → Google:** enable it and add your Google OAuth client ID
   and secret (create these in the Google Cloud console).
4. **Auth → URL Configuration:**
   - Site URL: your production URL (e.g. `https://streamverse.vercel.app`).
   - Redirect URLs: add `<site-url>/auth/callback` for every environment you use
     (production, previews, and `http://localhost:3000/auth/callback` for local).
5. From **Project Settings → API**, copy the project URL, anon key, and service
   role key.

## 2. TMDB

Create an account at https://www.themoviedb.org/ and copy an API credential from
**Settings → API** (v4 read token preferred).

## 3. Vercel

1. Import the GitHub repository into Vercel.
2. Framework preset: **Next.js** (auto-detected). No build overrides needed.
3. Add the environment variables from [ENVIRONMENT.md](ENVIRONMENT.md) to the
   project (Production + Preview). Set `NEXT_PUBLIC_SITE_URL` to the deployment's
   URL.
4. Deploy.

After the first deploy, confirm the Supabase **Redirect URLs** include the exact
Vercel domain(s), otherwise Google OAuth / email confirmation will fail.

## 4. Verify

Run the full check locally before shipping:

```bash
npm install
npm run type-check
npm run lint
npm test
npm run build
```

Then smoke-test the deployment: browse Home/Movies/TV, open a detail page, run a
search, sign in (email + Google), and add/remove a watchlist item.
