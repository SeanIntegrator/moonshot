/**
 * In-memory menu image prefetch so catalogue cards don't flash empty then pop in.
 * Browser HTTP cache (immutable media URLs) does the heavy lifting; this warms it
 * as soon as `/menu` returns and lets components know when a URL is ready.
 */

type CacheEntry = {
  status: 'loading' | 'loaded' | 'error';
  promise: Promise<void>;
};

const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

function notify(url: string): void {
  const set = listeners.get(url);
  if (!set) return;
  for (const cb of set) cb();
}

function loadUrl(url: string): Promise<void> {
  const existing = cache.get(url);
  if (existing) return existing.promise;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const entry = cache.get(url);
      if (entry) entry.status = 'loaded';
      notify(url);
      resolve();
    };
    img.onerror = () => {
      const entry = cache.get(url);
      if (entry) entry.status = 'error';
      notify(url);
      resolve();
    };
    img.src = url;
  });

  cache.set(url, { status: 'loading', promise });
  return promise;
}

/** Warm the browser cache for every menu thumbnail URL (deduped). */
export function prefetchMenuImages(urls: Array<string | null | undefined>): void {
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url) continue;
    void loadUrl(url);
  }
}

export function getMenuImageStatus(url: string | null | undefined): 'idle' | 'loading' | 'loaded' | 'error' {
  if (!url?.trim()) return 'idle';
  return cache.get(url)?.status ?? 'idle';
}

/** True when the URL is already decoded/warmed, or there is no URL to wait on. */
export function isMenuImageReady(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  const status = cache.get(url)?.status;
  return status === 'loaded' || status === 'error';
}

/**
 * Ensure a single URL is loading and subscribe to status changes.
 * Returns an unsubscribe function.
 */
export function watchMenuImage(url: string, onChange: () => void): () => void {
  let set = listeners.get(url);
  if (!set) {
    set = new Set();
    listeners.set(url, set);
  }
  set.add(onChange);

  // Prefetch may finish between MenuItemImage's status check and this subscribe.
  const prior = cache.get(url);
  if (prior?.status === 'error') {
    cache.delete(url);
  }
  void loadUrl(url);

  const status = cache.get(url)?.status;
  if (status === 'loaded' || status === 'error') {
    onChange();
  }

  return () => {
    set!.delete(onChange);
    if (set!.size === 0) listeners.delete(url);
  };
}

/** @internal Vitest-only — module cache is otherwise session-lifetime. */
export function __resetMenuImageCacheForTests(): void {
  cache.clear();
  listeners.clear();
}
