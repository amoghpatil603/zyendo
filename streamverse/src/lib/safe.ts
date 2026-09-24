/**
 * Run a data-fetching function, returning a fallback (empty list) if it throws.
 * Keeps pages resilient to transient upstream failures or missing config, so a
 * single failed section never takes down the whole page.
 */
export async function safeList<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (error) {
    console.error("[streamverse] data fetch failed:", error);
    return [];
  }
}

export async function safe<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("[streamverse] data fetch failed:", error);
    return fallback;
  }
}
