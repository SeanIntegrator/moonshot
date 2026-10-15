import type { ExtractResponse, ExtractErrorResponse } from './types.js';

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  // Dev default lines up with apps/moonshot-api dev PORT.
  return configured ? configured.replace(/\/$/, '') : 'http://localhost:3000';
}

export class ExtractApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ExtractApiError';
  }
}

export async function extractMenuFromFiles(
  files: File[],
  signal?: AbortSignal,
): Promise<ExtractResponse['data']> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/v1/menu-engineering/extract`, {
      method: 'POST',
      body: form,
      signal,
    });
  } catch (e) {
    // fetch rejects only on network failure / abort.
    if (signal?.aborted) throw e;
    throw new ExtractApiError('Could not reach the Moonshot API — check your connection.', 0);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ExtractApiError(
      `Unexpected response (${response.status}) from the API.`,
      response.status,
    );
  }

  if (response.ok && isSuccess(body)) {
    return body.data;
  }
  if (isFailure(body)) {
    throw new ExtractApiError(body.error, response.status, body.code);
  }
  throw new ExtractApiError(
    `Unexpected response (${response.status}) from the API.`,
    response.status,
  );
}

function isSuccess(body: unknown): body is ExtractResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { ok?: unknown }).ok === true &&
    typeof (body as { data?: unknown }).data === 'object'
  );
}

function isFailure(body: unknown): body is ExtractErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { ok?: unknown }).ok === false &&
    typeof (body as { error?: unknown }).error === 'string'
  );
}
