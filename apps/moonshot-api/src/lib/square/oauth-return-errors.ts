import { SquareError } from 'square';

/** Unique (provider, merchant_id) — one Square seller cannot attach to two cafés. */
export const POS_CONNECTIONS_PROVIDER_MERCHANT_UNIQUE =
  'pos_connections_provider_merchant_unique';

export type SquareConnectReturnFailureReason = 'merchant_in_use' | 'exchange_failed';

/**
 * Map a caught `/connect/square/return` exception to a seller-safe query `reason`.
 * Unique-merchant collisions are the only DB failure we surface distinctly.
 */
export function squareConnectReturnFailureReason(
  err: unknown,
): SquareConnectReturnFailureReason {
  const pg = err as { code?: string; constraint?: string };
  if (pg.code === '23505') {
    const constraint = pg.constraint ?? '';
    const message = err instanceof Error ? err.message : String(err);
    if (
      constraint === POS_CONNECTIONS_PROVIDER_MERCHANT_UNIQUE ||
      message.includes(POS_CONNECTIONS_PROVIDER_MERCHANT_UNIQUE)
    ) {
      return 'merchant_in_use';
    }
  }
  return 'exchange_failed';
}

/** Seller-visible café label on `merchant_in_use` redirects (name, then slug). */
export function merchantInUseRedirectExtras(
  other: { name: string; slug: string } | null,
): Record<string, string> {
  const extra: Record<string, string> = { reason: 'merchant_in_use' };
  const label = ((other?.name ?? '').trim() || (other?.slug ?? '').trim())
    .replace(/\s+/g, ' ')
    .slice(0, 80);
  if (label) extra.otherCafe = label;
  return extra;
}

/** Log-safe fields only — never tokens, codes, or secrets. */
export function squareConnectReturnLogFields(err: unknown): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (err instanceof Error) {
    fields.name = err.name;
    fields.message = err.message;
  } else {
    fields.message = String(err);
  }

  const pg = err as { code?: string; constraint?: string };
  if (pg.code) fields.pgCode = pg.code;
  if (pg.constraint) fields.constraint = pg.constraint;

  if (err instanceof SquareError) {
    fields.statusCode = err.statusCode;
    if (err.errors.length > 0) {
      fields.squareErrors = err.errors.map((e) => ({
        category: e.category,
        code: e.code,
        detail: 'detail' in e ? e.detail : undefined,
      }));
    }
  }

  return fields;
}
