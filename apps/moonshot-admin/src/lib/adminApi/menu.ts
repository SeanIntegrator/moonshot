import type {
  CafeMenuSection,
  CafeModifierGroup,
  MenuItemCreateBody,
  MenuItemPatchBody,
  MenuSectionCreateBody,
  MenuSectionPatchBody,
  ModifierGroupCreateBody,
  ModifierGroupWriteBody,
  NormalisedMenu,
  NormalisedMenuItem,
} from '@moonshot/types';
import type { CafeDrinkArchetypeConfig, DrinkArchetypeDef } from '@moonshot/domain';
import { adminFetch, apiUrl, parseEnvelope } from './http.js';

export async function fetchMenuForCafe(slug: string): Promise<NormalisedMenu> {
  const res = await fetch(apiUrl('/menu'), { headers: { 'X-Cafe-Slug': slug } });
  const envelope = await parseEnvelope<NormalisedMenu>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Failed to load menu (${res.status})`);
  }
  return envelope.data;
}

/** Admin menu — includes hidden/unavailable items */
export async function fetchMenuForAdmin(token: string, cafeSlug: string): Promise<NormalisedMenu> {
  return adminFetch<NormalisedMenu>('/menu/manage', {
    token,
    cafeSlug,
    errorMessage: 'Failed to load menu',
  });
}

export async function patchMenuItem(
  token: string,
  cafeSlug: string,
  itemId: string,
  body: MenuItemPatchBody,
): Promise<NormalisedMenuItem> {
  return adminFetch<NormalisedMenuItem>(`/menu/${encodeURIComponent(itemId)}`, {
    token,
    cafeSlug,
    method: 'PATCH',
    json: body,
    errorMessage: 'Update failed',
  });
}

export async function uploadMenuItemImage(
  token: string,
  cafeSlug: string,
  itemId: string,
  file: File,
): Promise<NormalisedMenuItem> {
  const form = new FormData();
  form.append('image', file);
  return adminFetch<NormalisedMenuItem>(`/menu/${encodeURIComponent(itemId)}/image`, {
    token,
    cafeSlug,
    method: 'POST',
    formData: form,
    errorMessage: 'Image upload failed',
  });
}

export async function setMenuItemUseDefaultImage(
  token: string,
  cafeSlug: string,
  itemId: string,
  useDefaultImage: boolean,
): Promise<NormalisedMenuItem> {
  return adminFetch<NormalisedMenuItem>(`/menu/${encodeURIComponent(itemId)}/default-image`, {
    token,
    cafeSlug,
    method: 'POST',
    json: { useDefaultImage },
    errorMessage: 'Default image update failed',
  });
}

export async function createMenuItem(
  token: string,
  cafeSlug: string,
  body: MenuItemCreateBody,
): Promise<NormalisedMenuItem> {
  return adminFetch<NormalisedMenuItem>('/menu', {
    token,
    cafeSlug,
    method: 'POST',
    json: body,
    errorMessage: 'Create menu item failed',
  });
}

export async function deleteMenuItem(
  token: string,
  cafeSlug: string,
  itemId: string,
): Promise<void> {
  await adminFetch<{ removed: boolean }>(`/menu/${encodeURIComponent(itemId)}`, {
    token,
    cafeSlug,
    method: 'DELETE',
    errorMessage: 'Delete failed',
  });
}

export async function fetchModifierGroups(
  token: string,
  cafeSlug: string,
): Promise<CafeModifierGroup[]> {
  return adminFetch<CafeModifierGroup[]>('/menu/modifier-groups', {
    token,
    cafeSlug,
    errorMessage: 'Failed to load sections',
  });
}

export async function createModifierGroup(
  token: string,
  cafeSlug: string,
  body: ModifierGroupCreateBody,
): Promise<CafeModifierGroup> {
  return adminFetch<CafeModifierGroup>('/menu/modifier-groups', {
    token,
    cafeSlug,
    method: 'POST',
    json: body,
    errorMessage: 'Create section failed',
  });
}

export async function updateModifierGroup(
  token: string,
  cafeSlug: string,
  groupId: string,
  body: ModifierGroupWriteBody,
): Promise<CafeModifierGroup> {
  return adminFetch<CafeModifierGroup>(`/menu/modifier-groups/${encodeURIComponent(groupId)}`, {
    token,
    cafeSlug,
    method: 'PATCH',
    json: body,
    errorMessage: 'Update section failed',
  });
}

export async function deleteModifierGroup(
  token: string,
  cafeSlug: string,
  groupId: string,
): Promise<void> {
  await adminFetch<{ removed: boolean }>(`/menu/modifier-groups/${encodeURIComponent(groupId)}`, {
    token,
    cafeSlug,
    method: 'DELETE',
    errorMessage: 'Delete section failed',
  });
}

export async function fetchMenuSections(
  token: string,
  cafeSlug: string,
): Promise<CafeMenuSection[]> {
  return adminFetch<CafeMenuSection[]>('/menu/sections', {
    token,
    cafeSlug,
    errorMessage: 'Failed to load menu sections',
  });
}

export async function createMenuSection(
  token: string,
  cafeSlug: string,
  body: MenuSectionCreateBody,
): Promise<CafeMenuSection> {
  return adminFetch<CafeMenuSection>('/menu/sections', {
    token,
    cafeSlug,
    method: 'POST',
    json: body,
    errorMessage: 'Create menu section failed',
  });
}

export async function patchMenuSection(
  token: string,
  cafeSlug: string,
  sectionId: string,
  body: MenuSectionPatchBody,
): Promise<CafeMenuSection> {
  return adminFetch<CafeMenuSection>(`/menu/sections/${encodeURIComponent(sectionId)}`, {
    token,
    cafeSlug,
    method: 'PATCH',
    json: body,
    errorMessage: 'Update menu section failed',
  });
}

export async function deleteMenuSection(
  token: string,
  cafeSlug: string,
  sectionId: string,
): Promise<void> {
  await adminFetch<{ removed: boolean }>(`/menu/sections/${encodeURIComponent(sectionId)}`, {
    token,
    cafeSlug,
    method: 'DELETE',
    errorMessage: 'Delete menu section failed',
  });
}

export type DrinkArchetypeConfigPayload = {
  recipes: Record<string, DrinkArchetypeDef>;
  config: CafeDrinkArchetypeConfig;
  catalogue: readonly DrinkArchetypeDef[];
};

export async function fetchDrinkArchetypes(
  token: string,
  cafeSlug: string,
): Promise<DrinkArchetypeConfigPayload> {
  return adminFetch<DrinkArchetypeConfigPayload>('/menu/drink-archetypes', {
    token,
    cafeSlug,
    errorMessage: 'Failed to load drink types',
  });
}
