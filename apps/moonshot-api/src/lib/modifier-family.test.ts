import { describe, expect, it } from 'vitest';
import { familyForSlot } from '@moonshot/domain';

describe('familyForSlot', () => {
  it('maps slots to menu/stock families', () => {
    expect(familyForSlot('milk')).toBe('milk');
    expect(familyForSlot('milk_temperature')).toBe('milk');
    expect(familyForSlot('shots')).toBe('coffee');
    expect(familyForSlot('beans')).toBe('coffee');
    expect(familyForSlot('syrup')).toBe('flavours');
    expect(familyForSlot('toppings')).toBe('flavours');
    expect(familyForSlot('ice_level')).toBe('preparation');
    expect(familyForSlot('other')).toBe('other');
  });
});
