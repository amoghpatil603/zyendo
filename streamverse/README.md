# StreamVerse

**AI-powered entertainment discovery & decision assistant.** StreamVerse helps you answer "what should I watch right now?" faster and more personally than a plain catalog — with a universal, normalized interface across content verticals.

> **Legal:** StreamVerse never hosts, proxies, embeds, or streams copyrighted movies, TV episodes, or music. Every "watch" action links out to an official third-party provider. Only official trailers (YouTube) are embedded.

This repository is ready for **v1.0 Production Release**.

---

## Project Overview

StreamVerse is a comprehensive media tracking and discovery application. It allows users to browse movies and TV shows, track what they want to watch, create custom collections, and use AI to receive highly personalized recommendations based on their unique "Entertainment DNA" and user memory.

## Architecture

External providers are hidden behind **adapters** that normalize everything into a single `MediaItem` / `MediaDetail` shape. This is what makes discovery "universal" and lets future verticals (anime, music, …) slot in without touching the UI.

The application is built using the Next.js App Router (Server Components + Server Actions) to ensure minimal client-side JavaScript, optimal SEO, and secure access to backend services like TMDB and Supabase.

Key rules enforced by the codebase:
- TMDB and all secrets are **server-only** (`import "server-only"`).
- User-owned data is protected by Supabase **Row Level Security**.
- External responses are **cached** via the Next.js data cache.
- Pages degrade gracefully when TMDB/Supabase aren't configured.

## Features

- **Home** — trending, new releases, trending TV, top-rated, popular series, and upcoming.
- **Movies & TV Shows** — browse by category and genre; rich detail pages with cast & crew, official trailer, "Where to Watch", and similar titles.
- **Unified Search** — one search across movies and TV.
- **Auth** — email/password and Google OAuth via Supabase.
- **Watchlist ("My World")** — save/remove titles, persisted per user with RLS.
- **Entertainment DNA** — a computed taste profile derived from a user's watchlist.
- **Collections** — create and curate personal or public title collections.
- **User Memory** — save, edit, pause, and delete preferences, exclusions, constraints, and situational context.
- **AI Assistant** — personalized recommendations using Groq.

## Screenshots

<!-- placeholders for screenshots -->
![Home Page Placeholder](https://placehold.co/800x450/111111/FFFFFF/png?text=Home+Page)
![Movie Detail Placeholder](https://placehold.co/800x450/111111/FFFFFF/png?text=Movie+Detail)
![Collections Placeholder](https://placehold.co/800x450/111111/FFFFFF/png?text=Collections)

## Folder Structure

```
src/
  app/                 App Router routes (pages, route handlers, server actions)
  components/
    layout/            App shell: header, nav, footer, search
    media/             MediaCard/Row/Grid, detail view, trailer, where-to-watch
    common/            Reusable page primitives (containers, empty/loading states)
    ui/                shadcn/ui primitives
  lib/
    adapters/          Provider adapters (TMDB) + registry keyed by media type
    supabase/          Browser/server clients + auth cookie refresh
    ai/                Groq AI integration
    env.ts             Centralized, validated env access
    watchlist.ts       Server-only watchlist data access
    dna/               Entertainment DNA computation
    user-memory/       User Memory formatting helpers
  types/               Global TypeScript definitions
supabase/migrations/   SQL schema + RLS policies
proxy.ts               Next.js 16 proxy (Supabase session refresh)
```

## Installation

Requires **Node.js 22.13+** and npm.

```bash
npm install
cp .env.example .env.local
```

Fill in the values in `.env.local`, then start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Environment Variables

See `docs/ENVIRONMENT.md` for the full guide. Minimum required variables in `.env.local`:

| Variable | Description |
| --- | --- |
| `TMDB_API_KEY` | TMDB v3 key for catalog data |
| `GROQ_API_KEY` | Groq API Key for AI features |
| `GROQ_MODEL` | Groq model name (default: `openai/gpt-oss-20b`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for public auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for server tasks |
| `NEXT_PUBLIC_SITE_URL` | OAuth redirects (e.g. `http://localhost:3000`) |

## Supabase Setup

1. Create a new Supabase project at https://supabase.com/dashboard.
2. Obtain your Project URL, Anon Key, and Service Role Key.
3. Add these to your `.env.local` file.
4. Enable Email and Google OAuth providers in Authentication -> Providers.

## Migrations

Apply the database migrations to your Supabase project (via the Supabase SQL editor or Supabase CLI):

1. **`0001_initial_schema.sql`**: Creates the base tables (profiles, watchlist, history) and triggers.
2. **`0002_user_memory.sql`**: Adds the user_memory table for AI context.
3. **`0003_collections_extra_cols.sql`**: Sets up collections and collection items.
4. **`0004_recommendation_feedback.sql`**: Adds AI recommendation feedback logging.

*(Apply all sql files in the `supabase/migrations/` directory in order)*

## Groq AI Setup

To enable AI Picks and Assistant features:
1. Create a Groq API key in the Groq Console.
2. Add it to `.env.local` as `GROQ_API_KEY=your_key_here`.
3. Optionally set `GROQ_MODEL=openai/gpt-oss-20b`.


## Testing

The project uses `vitest` for unit testing.

```bash
npm test
```

For full verification, run:
```bash
npm run type-check
npm run lint
npm test
npm run build
```

## Deployment

StreamVerse is optimized for Vercel.

1. Push your code to GitHub.
2. Import the project in Vercel.
3. Add all your environment variables in the Vercel project settings.
4. Deploy!

*(See `docs/DEPLOYMENT.md` for additional details.)*
