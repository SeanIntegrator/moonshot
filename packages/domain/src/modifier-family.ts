import type { KdsModifierClassification, ModifierFamily, ModifierSlot } from '@moonshot/types';
import { DRINK_ARCHETYPE_SLOT_GROUP_NAMES, type DrinkArchetypeSlot } from './drink-archetypes.js';

/** Map a stored slot to the Menu / Stock family tab. */
export function familyForSlot(slot: ModifierSlot): ModifierFamily {
  switch (slot) {
    case 'milk':
    case 'milk_temperature':
    case 'milk_texture':
      return 'milk';
    case 'shots':
    case 'beans':
      return 'coffee';
    case 'syrup':
    case 'toppings':
      return 'flavours';
    case 'ice_level':
      return 'preparation';
    default:
      return 'other';
  }
}

/** Exact Moonshot seed library name → slot (migration / provisioning only). */
export function slotForSeedGroupName(name: string): DrinkArchetypeSlot | null {
  for (const [slot, label] of Object.entries(DRINK_ARCHETYPE_SLOT_GROUP_NAMES) as Array<
    [DrinkArchetypeSlot, string]
  >) {
    if (label === name) return slot;
  }
  return null;
}

/** KDS `modifierClassification` field for a slot (null when unclassified). */
export function kdsClassificationFieldForSlot(
  slot: ModifierSlot,
): keyof KdsModifierClassification | null {
  switch (slot) {
    case 'milk':
      return 'coffeeModifiers';
    case 'syrup':
    case 'toppings':
      return 'additions';
    case 'shots':
      return 'shots';
    case 'beans':
      return 'beans';
    case 'milk_temperature':
      return 'milkTemperature';
    case 'milk_texture':
      return 'milkTexture';
    case 'ice_level':
      return 'iceLevel';
    default:
      return null;
  }
}
