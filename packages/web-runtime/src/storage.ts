/** Small typed wrappers around localStorage / sessionStorage with silent failure. */

export function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(storage: Storage, key: string, value: string | null): void {
  try {
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch {
    /* quota / private mode */
  }
}

/**
 * Prefer localStorage; migrate a legacy sessionStorage value if present.
 * Used by customer JWT (must survive Stripe redirects).
 */
export function getPersistentToken(key: string): string | null {
  const persistent = readStorage(localStorage, key);
  if (persistent) return persistent;

  const legacy = readStorage(sessionStorage, key);
  if (legacy) {
    writeStorage(localStorage, key, legacy);
    writeStorage(sessionStorage, key, null);
    return legacy;
  }
  return null;
}

export function setPersistentToken(key: string, token: string | null): void {
  writeStorage(localStorage, key, token);
  writeStorage(sessionStorage, key, null);
}
