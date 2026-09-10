/* Cache for data that stays put while a user works — themes, translations, schema
   metadata. It lives in `sessionStorage` so it also survives a reload, which is where
   these requests hurt most: a cold load re-fetches close to half a megabyte of theme
   rows before it can paint, and does it again on the next F5.

   Entries carry a timestamp and expire, so a stale value heals itself without anyone
   having to think about invalidation. Anything that must be fresh right now is behind
   the global `reload` action, which clears the cache outright. */

const keyPrefix = 'ozma-session-cache:'

export const defaultSessionCacheTtl = 15 * 60 * 1000

interface ICacheEntry<T> {
  at: number
  value: T
}

const read = <T>(key: string, ttlMs: number): T | undefined => {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) {
      return undefined
    }
    const entry = JSON.parse(raw) as ICacheEntry<T>
    if (typeof entry?.at !== 'number' || Date.now() - entry.at >= ttlMs) {
      return undefined
    }
    return entry.value
  } catch {
    // Unavailable (private mode), corrupted, or from an older format: just refetch.
    return undefined
  }
}

const write = <T>(key: string, value: T): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value }))
  } catch {
    // Over quota or storage disabled — caching is best-effort by design.
  }
}

// Concurrent callers within one page share the request instead of racing.
const pending = new Map<string, Promise<unknown>>()

export const cachedInSession = <T>(
  key: string,
  load: () => Promise<T>,
  ttlMs: number = defaultSessionCacheTtl,
): Promise<T> => {
  const fullKey = keyPrefix + key

  const hit = read<T>(fullKey, ttlMs)
  if (hit !== undefined) {
    return Promise.resolve(hit)
  }

  const inFlight = pending.get(fullKey) as Promise<T> | undefined
  if (inFlight !== undefined) {
    return inFlight
  }

  const request = load()
    .then((value) => {
      write(fullKey, value)
      return value
    })
    .finally(() => {
      pending.delete(fullKey)
    })

  pending.set(fullKey, request)
  return request
}

/* Row data keyed by the exact query and arguments. Ten reference selects on one form
   ask for the same option variants with the same ids, so without this they each fire
   their own request. Held in memory only — unlike the entries above this is real data,
   and it must not outlive the page. */
const memo = new Map<string, Promise<unknown>>()

export const dedupedInPage = <T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> => {
  const hit = memo.get(key) as Promise<T> | undefined
  if (hit !== undefined) {
    return hit
  }
  const request = load().catch((e) => {
    // Don't memoize a failure: the next render should be free to retry.
    memo.delete(key)
    throw e
  })
  memo.set(key, request)
  return request
}

export const clearSessionCache = (): void => {
  pending.clear()
  memo.clear()
  try {
    const stale = Object.keys(sessionStorage).filter((key) =>
      key.startsWith(keyPrefix),
    )
    stale.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    // Nothing to clear if storage isn't available.
  }
}
