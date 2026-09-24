# Environment Variables

Copy `.env.example` to `.env.local` for local development and fill in the values
below. In production (Vercel), set the same variables in the project settings.

The app is designed to **degrade gracefully**: with no keys set, pages render a
clear "not configured" notice instead of crashing, so you can review the UI
before wiring up services.

## Variables

### Site

| Variable | Public | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Absolute base URL of the app. Used for OAuth/email redirect URLs and metadata. Local: `http://localhost:3000`. Production: your deployed URL. |

### TMDB (catalog data)

Provide **one** of the following. The v4 read token is preferred.

| Variable | Public | Description |
| --- | --- | --- |
| `TMDB_API_READ_ACCESS_TOKEN` | ❌ | TMDB **v4** API Read Access Token (sent as a Bearer token). |
| `TMDB_API_KEY` | ❌ | TMDB **v3** API key (fallback, sent as `api_key` query param). |

Get credentials: create a free account at https://www.themoviedb.org/, then
**Settings → API**. Copy either the "API Read Access Token" (v4) or the "API
Key" (v3).

### Supabase (auth & watchlist)

| Variable | Public | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon/public key (safe for the browser; RLS enforces access). |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Service role key. **Server-only** — never expose to the browser. |

Get credentials: create a project at https://supabase.com/, then
**Project Settings → API** for the URL and keys.

## Security notes

- Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Every
  other variable is read exclusively in server code (`src/lib/env.ts` splits
  `publicEnv` from `serverEnv`).
- Never commit `.env.local` or any real key. `.env.example` contains only names.
- The Supabase **anon** key is intended to be public; access is controlled by
  Row Level Security (see `supabase/migrations/0002_rls.sql`). The **service
  role** key bypasses RLS and must stay secret.
