/**
 * A successful narration of the sample menu on Gemini is about 30s.
 * The provider SDKs otherwise retry 429/5xx with a delay that grows to 60s,
 * which is what pushed Analyse past the browser's 60s cutoff.
 */
export const MENU_MODEL_HTTP_TIMEOUT_MS = 45_000;

/** One original call plus one retry. Further retries belong to the next model. */
export const MENU_MODEL_MAX_ATTEMPTS = 2;

/**
 * Stop the narration cascade here and return the deterministic report.
 * Kept under the browser analyse timeout so the page receives JSON instead of
 * aborting the request.
 */
export const NARRATION_BUDGET_MS = 50_000;
