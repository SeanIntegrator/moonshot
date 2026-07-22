import type { CafeFeatures, KdsConfig } from '@moonshot/types';
import { defaultWeekdayCafeHours } from '@moonshot/types';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { hashKdsPassword } from './kds-password.js';
import { validateCafeSlug } from './cafe-slug.js';
import { findCafeBySlug } from './cafes-repository.js';
import { seedDefaultModifierLibrary } from './menu-seed-library.js';
import { ensureSystemMenuSections } from './menu-sections.js';

/** Default `cafes.features` for self-service signups — pay-in-store until Stripe Connect. */
export function defaultNewCafeFeatures(): CafeFeatures {
  return {
    loyalty: {
      enabled: true,
      stampsPerReward: 10,
      rewardDescription: 'Free drink',
      doubleStampDays: [],
    },
    events: null,
    promotions: null,
    order_ahead: {
      enabled: true,
      paymentProvider: 'pay_in_store',
      pickupTimeEnabled: true,
      defaultPickupMinutes: 10,
      maxPickupMinutes: 60,
      notesEnabled: true,
    },
    review_nudge: null,
    saved_orders: null,
    whatsapp_ordering: null,
    onboarding_completed_at: null,
  };
}

/** KDS display defaults — matches seed café template in 001_initial_schema.sql. */
export function defaultNewCafeKdsConfig(): Omit<KdsConfig, 'cafeId'> {
  return {
    milkColors: {},
    beanBadges: {
      house: { label: 'Ho', bg: '#2d2d2d', text: '#f5f5f5', accent: '#e8a33d' },
      decaf: { label: 'Dc', bg: '#6b4f2a', text: '#fff', accent: '#7aa2d6' },
      guest: { label: 'Gu', bg: '#1a4d3a', text: '#fff', accent: '#7fb069' },
      custom: [],
    },
    modifierClassification: {
      coffeeModifiers: ['Milks', 'Milk'],
      additions: ['Syrups', 'Extras'],
      shots: ['Shots'],
      beans: ['Beans'],
      milkTemperature: ['Milk Temperature'],
      milkTexture: ['Milk Texture'],
    },
    timerThresholds: { greenMax: 3, amberMax: 5 },
    layout: { columns: 3, groupBy: 'order_type' },
    audio: { newOrderSound: null, volume: 80 },
    display: {
      showCustomerNameInHeader: true,
      showPickupTime: true,
      showOrderSource: true,
    },
    eta: { basePrepMinutes: 8, perItemMinutes: 2 },
  };
}

export type ProvisionCafeParams = {
  cafeName: string;
  cafeSlug: string;
  email: string;
  password: string;
  timezone?: string;
};

export type ProvisionCafeResult = {
  cafeId: string;
  cafeSlug: string;
  cafeName: string;
  adminUserId: string;
  adminEmail: string;
  displayName: string | null;
};

export class ProvisionCafeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: 'VALIDATION' | 'CONFLICT' | 'INTERNAL',
  ) {
    super(message);
    this.name = 'ProvisionCafeError';
  }
}

async function insertCafeWithAdmin(
  client: PoolClient,
  params: ProvisionCafeParams,
): Promise<ProvisionCafeResult> {
  const name = params.cafeName.trim();
  if (name.length < 2) {
    throw new ProvisionCafeError('Café name must be at least 2 characters', 400, 'VALIDATION');
  }

  const slugResult = validateCafeSlug(params.cafeSlug);
  if (!slugResult.ok) {
    throw new ProvisionCafeError(slugResult.error, 400, 'VALIDATION');
  }
  const slug = slugResult.slug;

  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new ProvisionCafeError('A valid email is required', 400, 'VALIDATION');
  }
  if (!params.password || params.password.length < 8) {
    throw new ProvisionCafeError('Password must be at least 8 characters', 400, 'VALIDATION');
  }

  const timezone = (params.timezone?.trim() || 'Europe/London').slice(0, 64);
  const features = defaultNewCafeFeatures();
  const kdsConfig = defaultNewCafeKdsConfig();

  const cafeInsert = await client.query<{ id: string }>(
    `INSERT INTO cafes (name, slug, pos_provider, features, theme_id, kds_config, timezone, hours)
     VALUES ($1, $2, 'manual', $3::jsonb, 'heritage', $4::jsonb, $5, $6::jsonb)
     RETURNING id`,
    [
      name,
      slug,
      JSON.stringify(features),
      JSON.stringify(kdsConfig),
      timezone,
      JSON.stringify(defaultWeekdayCafeHours()),
    ],
  );
  const cafeId = cafeInsert.rows[0]!.id;

  await seedDefaultModifierLibrary(client, cafeId);
  await ensureSystemMenuSections(client, cafeId);

  await client.query(
    `UPDATE cafes SET kds_config = jsonb_set(kds_config, '{cafeId}', to_jsonb($1::text), TRUE) WHERE id = $2`,
    [cafeId, cafeId],
  );

  const passwordHash = hashKdsPassword(params.password);
  const adminInsert = await client.query<{ id: string; display_name: string | null }>(
    `INSERT INTO admin_users (cafe_id, email, password_hash, display_name, is_active, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     RETURNING id, display_name`,
    [cafeId, email, passwordHash, name],
  );

  return {
    cafeId,
    cafeSlug: slug,
    cafeName: name,
    adminUserId: adminInsert.rows[0]!.id,
    adminEmail: email,
    displayName: adminInsert.rows[0]!.display_name,
  };
}

/** Transactional café + admin user creation for self-service onboarding. */
export async function provisionCafe(params: ProvisionCafeParams): Promise<ProvisionCafeResult> {
  const slugResult = validateCafeSlug(params.cafeSlug);
  if (!slugResult.ok) {
    throw new ProvisionCafeError(slugResult.error, 400, 'VALIDATION');
  }

  const existingSlug = await findCafeBySlug(slugResult.slug);
  if (existingSlug) {
    throw new ProvisionCafeError('This café URL is already taken', 409, 'CONFLICT');
  }

  const email = params.email.trim().toLowerCase();
  const emailCheck = await pool.query<{ id: string }>(
    `SELECT id FROM admin_users WHERE lower(trim(email)) = $1 AND is_active = TRUE LIMIT 1`,
    [email],
  );
  if (emailCheck.rows.length > 0) {
    throw new ProvisionCafeError('An account with this email already exists', 409, 'CONFLICT');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await insertCafeWithAdmin(client, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ProvisionCafeError) throw err;
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      throw new ProvisionCafeError('Café URL or email already taken', 409, 'CONFLICT');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function isCafeSlugAvailable(slug: string): Promise<boolean> {
  const validated = validateCafeSlug(slug);
  if (!validated.ok) return false;
  const existing = await findCafeBySlug(validated.slug);
  return existing === null;
}
