import type { Pool } from 'pg';

export type AdminOnboardingChecklist = {
  hasKdsUser: boolean;
  hasMenuItem: boolean;
  hasCafeSettings: boolean;
};

/** Lightweight checks used by admin onboarding status. */
export async function fetchAdminOnboardingChecklist(
  pool: Pool,
  cafeId: string,
): Promise<AdminOnboardingChecklist> {
  const kdsRes = await pool.query<{ id: string }>(
    `SELECT id FROM kds_users WHERE cafe_id = $1 AND is_active = TRUE LIMIT 1`,
    [cafeId],
  );
  const menuRes = await pool.query<{ id: string }>(
    `SELECT id FROM menu_items WHERE cafe_id = $1 AND is_available = TRUE LIMIT 1`,
    [cafeId],
  );
  const settingsRes = await pool.query<{ confirmed: boolean }>(
    `SELECT (
       features->>'onboarding_cafe_settings_confirmed_at' IS NOT NULL
       AND BTRIM(features->>'onboarding_cafe_settings_confirmed_at') <> ''
     ) AS confirmed
     FROM cafes WHERE id = $1`,
    [cafeId],
  );
  return {
    hasKdsUser: kdsRes.rows.length > 0,
    hasMenuItem: menuRes.rows.length > 0,
    hasCafeSettings: Boolean(settingsRes.rows[0]?.confirmed),
  };
}
