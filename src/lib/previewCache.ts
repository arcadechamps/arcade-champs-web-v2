/**
 * previewCache.ts
 *
 * A single, shared module-level cache for preview clip blob URLs.
 * Because ES modules are singletons, this Map is shared across every
 * component that imports it — GameCard, ContestCardComponent, etc.
 *
 * Persistence strategy
 * ─────────────────────
 * Blob URLs are stored in sessionStorage so the cache survives:
 *   • React re-renders / component unmounts
 *   • Vite HMR module hot-swaps (module re-executes, page stays alive)
 *   • SPA client-side navigation back to the same route
 *
 * On a hard page refresh (F5 / Ctrl+R / browser reload button) the
 * document is destroyed and all previous blob: URLs become invalid.
 * We detect the reload via PerformanceNavigationTiming and clear the
 * sessionStorage entry before hydrating, so users always start fresh.
 *
 * Flow:
 *  1. Module initialises → detects reload or hydrates from sessionStorage.
 *  2. Component calls fetchAndCachePreview(remoteUrl) on first hover.
 *  3. The fetch runs once; subsequent calls receive the cached blob: URL.
 *  4. In-flight dedup ensures multiple cards for the same game share one request.
 */

const SESSION_KEY = "arcadechamps_preview_blob_cache";

// ─── Reload detection ────────────────────────────────────────────────────────
/**
 * Returns true when the current page load is a hard reload (F5 / Ctrl+R).
 * Uses the PerformanceNavigationTiming API (widely supported, synchronous).
 */
function isHardReload(): boolean {
  try {
    const [nav] = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    return nav?.type === "reload";
  } catch {
    return false;
  }
}

// ─── sessionStorage helpers ──────────────────────────────────────────────────
function readSession(): Map<string, string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const entries = JSON.parse(raw) as [string, string][];
      if (Array.isArray(entries)) return new Map(entries);
    }
  } catch {
    // Corrupted data — wipe and start fresh.
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }
  return new Map();
}

function writeSession(cache: Map<string, string>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...cache.entries()]));
  } catch {
    // sessionStorage quota exceeded — silently ignore; in-memory cache still works.
  }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

// ─── Cache initialisation ────────────────────────────────────────────────────
/**
 * On a hard reload, blob URLs from the previous document are invalid — clear them.
 * Otherwise, restore the in-memory map from whatever sessionStorage holds.
 */
function hydrateCache(): Map<string, string> {
  if (isHardReload()) {
    clearSession();
    return new Map();
  }
  return readSession();
}

// remote URL → local blob: URL  (persisted to sessionStorage)
const blobCache = hydrateCache();

// remote URL → in-flight Promise<string>  (prevents duplicate fetches)
const inflight = new Map<string, Promise<string>>();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a remote preview URL and return a local blob: URL.
 *
 * • Instant on cache hit (in-memory or sessionStorage restore).
 * • Deduped on in-flight: multiple callers share a single fetch.
 * • Falls back to the remote URL if the fetch fails.
 */
export async function fetchAndCachePreview(remoteUrl: string): Promise<string> {
  // 1. Already cached — instant return
  if (blobCache.has(remoteUrl)) return blobCache.get(remoteUrl)!;

  // 2. In-flight — piggyback on the existing request
  if (inflight.has(remoteUrl)) return inflight.get(remoteUrl)!;

  // 3. Start a new fetch
  const promise = fetch(remoteUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(remoteUrl, blobUrl);
      inflight.delete(remoteUrl);
      writeSession(blobCache); // persist after every successful fetch
      return blobUrl;
    })
    .catch((err) => {
      inflight.delete(remoteUrl);
      // Fall back to the original remote URL so the browser can try natively.
      console.warn("[previewCache] fetch failed, falling back to remote URL:", err);
      return remoteUrl;
    });

  inflight.set(remoteUrl, promise);
  return promise;
}

/** Check if a URL is already in cache without triggering a fetch. */
export function getCachedPreview(remoteUrl: string): string | undefined {
  return blobCache.get(remoteUrl);
}

/** Returns true if a fetch is currently in progress for this URL. */
export function isPreviewLoading(remoteUrl: string): boolean {
  return inflight.has(remoteUrl) && !blobCache.has(remoteUrl);
}

/**
 * Manually evict all cached previews and clear sessionStorage.
 * Useful if you need to force a re-fetch (e.g. after a game asset update).
 */
export function clearPreviewCache(): void {
  blobCache.forEach((blobUrl) => {
    try { URL.revokeObjectURL(blobUrl); } catch { /* ignore */ }
  });
  blobCache.clear();
  clearSession();
}
