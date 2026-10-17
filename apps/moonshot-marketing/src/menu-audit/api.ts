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

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  // Dev-only. A production bundle must not call the visitor's own machine.
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return '';
}

async function readEnvelope<T>(response: Response): Promise<T> {
  let body: { ok?: boolean; data?: T; error?: string; code?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new Error(`Menu API returned a non-JSON response (HTTP ${response.status}).`);
  }
  if (!response.ok || body.ok === false) {
    const detail = body.error?.trim() || 'Request failed';
    const code = body.code ? ` [${body.code}]` : '';
    throw new Error(`${detail}${code} (HTTP ${response.status})`);
  }
  if (body.data === undefined) {
    throw new Error(`Menu API response was missing data (HTTP ${response.status}).`);
  }
  return body.data;
}

function requireBaseUrl(): string {
  const base = apiBaseUrl();
  if (!base) {
    throw new Error('VITE_API_URL is not set. Point it at the API origin, with no /api/v1 suffix.');
  }
  return base;
}

export async function loadSampleMenu(): Promise<MenuAuditMenu> {
  const response = await fetch(`${requireBaseUrl()}/api/v1/menu-engineering/sample`);
  const data = await readEnvelope<{ menu: MenuAuditMenu }>(response);
  return data.menu;
}

export async function extractMenu(file: File): Promise<MenuAuditMenu> {
  const form = new FormData();
  form.append('images', file);
  const response = await fetch(`${requireBaseUrl()}/api/v1/menu-engineering/extract`, {
    method: 'POST',
    body: form,
  });
  const data = await readEnvelope<{ menu: MenuAuditMenu }>(response);
  return data.menu;
}

export async function analyseMenu(
  menu: MenuAuditMenu,
  regionTier: string,
): Promise<MenuAuditReport> {
  const response = await fetch(`${requireBaseUrl()}/api/v1/menu-engineering/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ menu, regionTier, tier: 'free' }),
  });
  const data = await readEnvelope<{
    findings: { suggestions: MenuAuditReport['suggestions'] };
    narrative: MenuAuditReport['narrative'];
  }>(response);
  return { narrative: data.narrative, suggestions: data.findings.suggestions };
}
