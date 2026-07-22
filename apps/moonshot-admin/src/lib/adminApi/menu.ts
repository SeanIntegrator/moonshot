import type {
  CafeMenuSection,
  CafeModifierGroup,
  NormalisedMenu,
  NormalisedMenuItem,
} from '@moonshot/types';
import { apiUrl, parseEnvelope } from './http.js';

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
  const res = await fetch(apiUrl('/menu/manage'), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
  });
  const envelope = await parseEnvelope<NormalisedMenu>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Failed to load menu (${res.status})`);
  }
  return envelope.data;
}

export async function patchMenuItem(
  token: string,
  cafeSlug: string,
  itemId: string,
  body: Record<string, unknown>,
): Promise<NormalisedMenuItem> {
  const res = await fetch(apiUrl(`/menu/${encodeURIComponent(itemId)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<NormalisedMenuItem>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Update failed (${res.status})`);
  }
  return envelope.data;
}

export async function uploadMenuItemImage(
  token: string,
  cafeSlug: string,
  itemId: string,
  file: File,
): Promise<NormalisedMenuItem> {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch(apiUrl(`/menu/${encodeURIComponent(itemId)}/image`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: form,
  });
  const envelope = await parseEnvelope<NormalisedMenuItem>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Image upload failed (${res.status})`);
  }
  return envelope.data;
}

export async function createMenuItem(
  token: string,
  cafeSlug: string,
  body: Record<string, unknown>,
): Promise<NormalisedMenuItem> {
  const res = await fetch(apiUrl('/menu'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<NormalisedMenuItem>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Create menu item failed (${res.status})`);
  }
  return envelope.data;
}

export async function deleteMenuItem(
  token: string,
  cafeSlug: string,
  itemId: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/menu/${encodeURIComponent(itemId)}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
  });
  const envelope = await parseEnvelope<{ removed: boolean }>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Delete failed (${res.status})`);
  }
}

export async function fetchModifierGroups(
  token: string,
  cafeSlug: string,
): Promise<CafeModifierGroup[]> {
  const res = await fetch(apiUrl('/menu/modifier-groups'), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
  });
  const envelope = await parseEnvelope<CafeModifierGroup[]>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Failed to load sections (${res.status})`);
  }
  return envelope.data;
}

export async function createModifierGroup(
  token: string,
  cafeSlug: string,
  body: Record<string, unknown>,
): Promise<CafeModifierGroup> {
  const res = await fetch(apiUrl('/menu/modifier-groups'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<CafeModifierGroup>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Create section failed (${res.status})`);
  }
  return envelope.data;
}

export async function updateModifierGroup(
  token: string,
  cafeSlug: string,
  groupId: string,
  body: Record<string, unknown>,
): Promise<CafeModifierGroup> {
  const res = await fetch(apiUrl(`/menu/modifier-groups/${encodeURIComponent(groupId)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<CafeModifierGroup>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Update section failed (${res.status})`);
  }
  return envelope.data;
}

export async function deleteModifierGroup(
  token: string,
  cafeSlug: string,
  groupId: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/menu/modifier-groups/${encodeURIComponent(groupId)}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
  });
  const envelope = await parseEnvelope<{ removed: boolean }>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Delete section failed (${res.status})`);
  }
}

export async function fetchMenuSections(
  token: string,
  cafeSlug: string,
): Promise<CafeMenuSection[]> {
  const res = await fetch(apiUrl('/menu/sections'), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
  });
  const envelope = await parseEnvelope<CafeMenuSection[]>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Failed to load menu sections (${res.status})`);
  }
  return envelope.data;
}

export async function createMenuSection(
  token: string,
  cafeSlug: string,
  body: { label: string },
): Promise<CafeMenuSection> {
  const res = await fetch(apiUrl('/menu/sections'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<CafeMenuSection>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Create menu section failed (${res.status})`);
  }
  return envelope.data;
}

export async function patchMenuSection(
  token: string,
  cafeSlug: string,
  sectionId: string,
  body: Record<string, unknown>,
): Promise<CafeMenuSection> {
  const res = await fetch(apiUrl(`/menu/sections/${encodeURIComponent(sectionId)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<CafeMenuSection>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Update menu section failed (${res.status})`);
  }
  return envelope.data;
}

export async function deleteMenuSection(
  token: string,
  cafeSlug: string,
  sectionId: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/menu/sections/${encodeURIComponent(sectionId)}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
  });
  const envelope = await parseEnvelope<{ removed: boolean }>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Delete menu section failed (${res.status})`);
  }
}
