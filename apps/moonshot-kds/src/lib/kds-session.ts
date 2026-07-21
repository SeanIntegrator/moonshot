const SESSION_KEY = 'moonshot_kds_session';

export type KdsSession = {
  token: string;
  cafeName: string;
  cafeSlug: string;
  username: string;
};

export function loadKdsSession(): KdsSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as KdsSession;
    if (
      typeof p.token !== 'string' ||
      typeof p.cafeName !== 'string' ||
      typeof p.cafeSlug !== 'string' ||
      typeof p.username !== 'string'
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function saveKdsSession(s: KdsSession | null): void {
  try {
    if (!s) sessionStorage.removeItem(SESSION_KEY);
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
