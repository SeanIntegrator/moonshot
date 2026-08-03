import type { PosProvider } from '@moonshot/types';
import type { AdminSaveMenuTemplateRequest } from './menu-template.js';

/** How a café's initial menu is created during onboarding. */
export const MENU_PROVISION_SOURCES = {
  /** Owner picks from the starter drink/milk/syrup template. */
  template: 'template',
  /** Catalogue imported from a connected POS (Square, SumUp, …). */
  pos: 'pos',
} as const;

export type MenuProvisionSource =
  (typeof MENU_PROVISION_SOURCES)[keyof typeof MENU_PROVISION_SOURCES];

/** Shared result shape for template and POS onboarding provisioners. */
export interface MenuProvisionResult {
  itemCount: number;
  groupCount?: number;
  milksGroupId?: string | null;
  syrupsGroupId?: string | null;
}

/** Template onboarding — checkbox selections + editable fields. */
export type TemplateMenuProvisionPayload = AdminSaveMenuTemplateRequest;

/** POS catalogue import (Square OAuth, optional location id). */
export interface PosMenuProvisionPayload {
  provider: PosProvider;
  locationId?: string | null;
}

export type MenuProvisionPayloadBySource = {
  template: TemplateMenuProvisionPayload;
  pos: PosMenuProvisionPayload;
};
