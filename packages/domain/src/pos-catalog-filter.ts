/**
 * Square-connected cafés only surface POS-owned modifier lists.
 * Signup seed rows stay in the DB (posGroupId null) if the café later disconnects.
 */

export function isPosOwnedGroup(group: { posGroupId?: string | null }): boolean {
  return group.posGroupId != null && group.posGroupId !== '';
}

export function catalogGroupsForPos<T extends { posGroupId?: string | null }>(
  groups: readonly T[],
  posOnly: boolean,
): T[] {
  if (!posOnly) return [...groups];
  return groups.filter(isPosOwnedGroup);
}

/** Active Square *or* needs_reauth — templates must not reappear during reauth. */
export function isPosCatalogCafe(
  status: { connected?: boolean; status?: string | null } | null | undefined,
): boolean {
  if (!status) return false;
  if (status.connected === true) return true;
  return status.status === 'active' || status.status === 'needs_reauth';
}
