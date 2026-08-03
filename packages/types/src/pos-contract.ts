/**
 * POS provider id contract used by `Cafe.posProvider`.
 * Adapter interfaces + `POS_PROVIDERS` const live in `@moonshot/domain`.
 */

export type PosProvider =
  | 'square'
  | 'epos_now'
  | 'sumup'
  | 'lightspeed'
  | 'manual'
  | 'whatsapp_n8n';
