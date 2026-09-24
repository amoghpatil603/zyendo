/**
 * Centralized, type-safe access to environment variables.
 *
 * Server-only secrets (TMDB, Supabase service role) are read lazily so that
 * importing this module in a client bundle never leaks them. Public values are
 * prefixed with NEXT_PUBLIC_ and are safe to expose.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function clean(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

/**
 * Public values must be read with static `process.env.NEXT_PUBLIC_*` keys so the
 * Next.js compiler can inline them into the client bundle. Dynamic access (e.g.
 * `process.env[name]`) is only replaced on the server and resolves to undefined
 * in the browser.
 */
export const publicEnv = {
  siteUrl: clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000",
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};

export const serverEnv = {
  get tmdbReadToken() {
    return optional("TMDB_API_READ_ACCESS_TOKEN");
  },
  get tmdbApiKey() {
    return optional("TMDB_API_KEY");
  },
  get supabaseServiceRoleKey() {
    return optional("SUPABASE_SERVICE_ROLE_KEY");
  },
  get geminiApiKey() {
    return optional("GEMINI_API_KEY");
  },
};

/** True when Supabase is configured well enough to attempt auth / DB calls. */
export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

/** True when TMDB credentials are available for server-side calls. */
export function isTmdbConfigured(): boolean {
  return Boolean(serverEnv.tmdbReadToken || serverEnv.tmdbApiKey);
}

/** True when a Gemini API key is present for AI features. */
export function isGeminiConfigured(): boolean {
  return Boolean(serverEnv.geminiApiKey);
}
