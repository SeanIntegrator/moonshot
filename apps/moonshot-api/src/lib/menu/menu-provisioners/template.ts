import {
  MENU_PROVISION_SOURCES,
  type MenuProvisionResult,
  type TemplateMenuProvisionPayload,
} from '@moonshot/types';
import type { PoolClient } from 'pg';
import { applyMenuTemplate } from '../menu-template-onboarding.js';
import type { MenuProvisioner } from './types.js';

export const templateMenuProvisioner: MenuProvisioner<TemplateMenuProvisionPayload> = {
  source: MENU_PROVISION_SOURCES.template,
  apply(
    client: PoolClient,
    cafeId: string,
    payload: TemplateMenuProvisionPayload,
  ): Promise<MenuProvisionResult> {
    return applyMenuTemplate(client, cafeId, payload);
  },
};
