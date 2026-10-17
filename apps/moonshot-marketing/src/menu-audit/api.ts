/**
 * Thin client for the menu-engineering API. The skeleton only needs the fields
 * it renders. A rebuilt page should import the shared contracts from `@moonshot/types`.
 */

export interface MenuAuditItem {
  name: string;
  section: string;
  pricePounds: number;
}

export interface MenuAuditMenu {
  cafeNameGuess: string | null;
  sourceMode: string;
  items: MenuAuditItem[];
  extractionNotes: string[];
}

export interface MenuAuditReport {
  narrative: {
    headline: string;
    executiveSummary: string;
    generatedBy: string;
    modelName: string | null;
  };
  suggestions: Array<{
    title: string;
    summary: string;
    estimatedMonthlyUpliftPoundsAtBaseline: number;
  }>;
}

/** Sample is a small JSON GET. Vision and narration can sit on the model for longer. */
const SAMPLE_TIMEOUT_MS = 20_000;
const EXTRACT_TIMEOUT_MS = 90_000;
const ANALYSE_TIMEOUT_MS = 60_000;
const MAX_ERROR_BODY_CHARS = 1_500;

type MenuApiResult = { response: Response; url: string; method: string };

export function menuAuditApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  // Dev-only. A production bundle must not call the visitor's own machine.
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return '';
}

export function menuAuditPageOrigin(): string {
  if (typeof window === 'undefined') return 'unknown';
  return window.location.origin;
}

function requireBaseUrl(): string {
  const base = menuAuditApiBaseUrl();
  if (!base) {
    throw new Error(
      `VITE_API_URL is not set on this build. Page origin: ${menuAuditPageOrigin()}. Point VITE_API_URL at the API origin, with no /api/v1 suffix.`,
    );
  }
  return base;
}

function formatTransportError(method: string, url: string, err: unknown): string {
  const pageOrigin = menuAuditPageOrigin();
  if (err instanceof DOMException && err.name === 'AbortError') {
    return [
      `${method} ${url} timed out before the API finished.`,
      `Page origin: ${pageOrigin}`,
      'The buttons unlock after this timeout. A vision call that is still running on the API is not cancelled server-side.',
    ].join('\n');
  }
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return [
    `${method} ${url} failed before a response could be read.`,
    message,
    `Page origin: ${pageOrigin}`,
    'Failed to fetch means the browser never received a readable response. That happens when this page origin is missing from CORS_ORIGINS on the API in the URL above, when that host is unreachable, or when an https page calls an http API.',
    'A missing route still returns an HTTP status once CORS allows this origin. The sample menu route is already on the production API; a preview hostname is not in that allowlist unless you add it.',
  ].join('\n');
}

async function readEnvelope<T>(response: Response, method: string, url: string): Promise<T> {
  const raw = await response.text();
  const excerpt = raw.length > MAX_ERROR_BODY_CHARS ? `${raw.slice(0, MAX_ERROR_BODY_CHARS)}…` : raw;
  let body: { ok?: boolean; data?: T; error?: string; code?: string };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    throw new Error(
      `${method} ${url} returned non-JSON (HTTP ${response.status} ${response.statusText}).\nPage origin: ${menuAuditPageOrigin()}\n${excerpt}`,
    );
  }
  if (!response.ok || body.ok === false) {
    const detail = body.error?.trim() || 'Request failed';
    const code = body.code ? ` [${body.code}]` : '';
    throw new Error(
      `${method} ${url}\n${detail}${code} (HTTP ${response.status} ${response.statusText})\nPage origin: ${menuAuditPageOrigin()}\n${excerpt}`,
    );
  }
  if (body.data === undefined) {
    throw new Error(
      `${method} ${url} response was missing data (HTTP ${response.status}).\n${excerpt}`,
    );
  }
  return body.data;
}

async function requestMenuApi(
  method: string,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<MenuApiResult> {
  const url = `${requireBaseUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { response, url, method };
  } catch (err) {
    throw new Error(formatTransportError(method, url, err));
  } finally {
    clearTimeout(timer);
  }
}

export async function loadSampleMenu(): Promise<MenuAuditMenu> {
  const { response, url, method } = await requestMenuApi(
    'GET',
    '/api/v1/menu-engineering/sample',
    {},
    SAMPLE_TIMEOUT_MS,
  );
  const data = await readEnvelope<{ menu: MenuAuditMenu }>(response, method, url);
  return data.menu;
}

export async function extractMenu(file: File): Promise<MenuAuditMenu> {
  const form = new FormData();
  form.append('images', file);
  const { response, url, method } = await requestMenuApi(
    'POST',
    '/api/v1/menu-engineering/extract',
    { method: 'POST', body: form },
    EXTRACT_TIMEOUT_MS,
  );
  const data = await readEnvelope<{ menu: MenuAuditMenu }>(response, method, url);
  return data.menu;
}

export async function analyseMenu(
  menu: MenuAuditMenu,
  regionTier: string,
): Promise<MenuAuditReport> {
  const { response, url, method } = await requestMenuApi(
    'POST',
    '/api/v1/menu-engineering/analyse',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu, regionTier, tier: 'free' }),
    },
    ANALYSE_TIMEOUT_MS,
  );
  const data = await readEnvelope<{
    findings: { suggestions: MenuAuditReport['suggestions'] };
    narrative: MenuAuditReport['narrative'];
  }>(response, method, url);
  return { narrative: data.narrative, suggestions: data.findings.suggestions };
}
