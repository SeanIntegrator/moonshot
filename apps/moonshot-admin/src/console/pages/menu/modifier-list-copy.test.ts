import { describe, expect, it } from 'vitest';
import {
  choiceMetaLine,
  customersPickLabel,
  defaultCellLabel,
  isPosOwnedGroup,
} from './modifier-list-copy.js';

describe('isPosOwnedGroup', () => {
  it('is true when posGroupId is set', () => {
    expect(isPosOwnedGroup({ posGroupId: 'MODLIST_MILK' })).toBe(true);
  });

  it('is false for Moonshot lists', () => {
    expect(isPosOwnedGroup({ posGroupId: null })).toBe(false);
    expect(isPosOwnedGroup({})).toBe(false);
  });
});

describe('customersPickLabel', () => {
  it('maps Square selection types to the header copy', () => {
    expect(customersPickLabel('single')).toBe('Just one');
    expect(customersPickLabel('multi')).toBe('Any number');
  });
});

describe('choiceMetaLine', () => {
  it('matches the item-editor caption', () => {
    expect(choiceMetaLine({ selectionType: 'single', required: true })).toBe('Pick one · required');
    expect(choiceMetaLine({ selectionType: 'multi', required: false })).toBe('Any number');
  });
});

describe('defaultCellLabel', () => {
  it('is text, not a control', () => {
    expect(defaultCellLabel(true)).toBe('Yes');
    expect(defaultCellLabel(false)).toBe('—');
  });
});
