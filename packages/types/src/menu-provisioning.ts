import type { AdminSaveMenuTemplateRequest, AdminSaveMenuTemplateResponse } from './menu-template.js';
import type { PosProvider } from './pos.js';

/** How a café's initial menu is created during onboarding. */
export const MENU_PROVISION_SOURCES = {
  /** Owner picks from the starter drink/milk/syrup template. */
  template: 'template',
  /** Catalogue imported from a connected POS (Square, SumUp, …). */
  pos: 'pos',
} as const;

export type MenuProvisionSource =
  (typeof MENU_PROVISION_SOURCES)[keyof typeof MENU_PROVISION_SOURCES];

export type MenuProvisionResult = AdminSaveMenuTemplateResponse;

/** Template onboarding — checkbox selections + editable fields. */
export type TemplateMenuProvisionPayload = AdminSaveMenuTemplateRequest;

/** Reserved for POS catalogue import (Square OAuth, location id, etc.). */
export interface PosMenuProvisionPayload {
  provider: PosProvider;
}

export type MenuProvisionPayloadBySource = {
  template: TemplateMenuProvisionPayload;
  pos: PosMenuProvisionPayload;
};
