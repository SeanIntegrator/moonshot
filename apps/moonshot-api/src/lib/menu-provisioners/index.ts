import {
  MENU_PROVISION_SOURCES,
  type MenuProvisionSource,
} from '@moonshot/types';
import { posImportMenuProvisioner } from './pos-import.js';
import { templateMenuProvisioner } from './template.js';
import type { MenuProvisioner } from './types.js';

const PROVISIONERS: Record<MenuProvisionSource, MenuProvisioner> = {
  [MENU_PROVISION_SOURCES.template]: templateMenuProvisioner,
  [MENU_PROVISION_SOURCES.pos]: posImportMenuProvisioner,
};

export function getMenuProvisioner(source: MenuProvisionSource): MenuProvisioner {
  const provisioner = PROVISIONERS[source];
  if (!provisioner) {
    throw new Error(`Unknown menu provision source: ${source}`);
  }
  return provisioner;
}

export { MenuProvisionError } from './errors.js';
export type { MenuProvisioner } from './types.js';
