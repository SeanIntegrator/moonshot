import type { Pool, PoolClient } from 'pg';
import { pool as defaultPool } from '../db.js';
import { mapCafeRow } from './cafe/cafe-map.js';
import type { ResolvedCafe } from './resolved-cafe.js';

type Executor = Pool | PoolClient;

/**
 * Canonical column list for `cafes` rows that get mapped into {@link ResolvedCafe}.
 * Keep this in sync with `cafe-map.ts::CafeRow` — adding a column means updating
 * the mapper too. Centralising here prevents drift across routes.
 */
export const CAFE_COLUMNS = `
  id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
  features, theme_id, theme_overrides, kds_config, timezone, hours, owner_feedback_email,
  paused_until, last_order_buffer_minutes,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', to_char(o.override_date, 'YYYY-MM-DD'),
        'label', o.label,
        'closed', o.closed,
        'intervals', o.intervals
      )
      ORDER BY o.override_date
    )
    FROM cafe_hours_overrides o
    WHERE o.cafe_id = cafes.id
  ), '[]'::jsonb) AS hours_overrides
`;

type CafeRowRaw = {
  id: string;
  name: string;
  slug: string;
  pos_provider: string;
  pos_config: unknown;
  payment_provider: string;
  payment_config: unknown;
  features: unknown;
  theme_id: string;
  theme_overrides: unknown;
  kds_config: unknown;
  timezone: string;
  hours: unknown;
  owner_feedback_email: string | null;
  paused_until: Date | string | null;
  last_order_buffer_minutes: number | string | null;
  hours_overrides: unknown;
};

export async function findCafeBySlug(
  slug: string,
  executor: Executor = defaultPool,
): Promise<ResolvedCafe | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const res = await executor.query<CafeRowRaw>(
    `SELECT ${CAFE_COLUMNS} FROM cafes WHERE slug = $1`,
    [trimmed],
  );
  return res.rows[0] ? mapCafeRow(res.rows[0]) : null;
}

export async function findCafeById(
  cafeId: string,
  executor: Executor = defaultPool,
): Promise<ResolvedCafe | null> {
  if (!cafeId) return null;
  const res = await executor.query<CafeRowRaw>(
    `SELECT ${CAFE_COLUMNS} FROM cafes WHERE id = $1`,
    [cafeId],
  );
  return res.rows[0] ? mapCafeRow(res.rows[0]) : null;
}

/**
 * Lookup used by Stripe webhooks (`account.updated`). In practice a Stripe
 * account id is unique per café, but the schema does not currently enforce
 * that — we preserve the original loop semantics by returning all matches.
 */
export async function findCafesByStripeAccountId(
  accountId: string,
  executor: Executor = defaultPool,
): Promise<Array<{ id: string; paymentConfig: Record<string, unknown> }>> {
  if (!accountId) return [];
  const res = await executor.query<{ id: string; payment_config: unknown }>(
    `SELECT id, payment_config FROM cafes WHERE payment_config->'stripe'->>'accountId' = $1`,
    [accountId],
  );
  return res.rows.map((row) => ({
    id: row.id,
    paymentConfig:
      row.payment_config && typeof row.payment_config === 'object' && !Array.isArray(row.payment_config)
        ? (row.payment_config as Record<string, unknown>)
        : {},
  }));
}
