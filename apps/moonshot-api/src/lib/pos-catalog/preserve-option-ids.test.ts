import { describe, expect, it } from 'vitest';
import { preserveOptionIds } from '@moonshot/domain';

describe('preserveOptionIds', () => {
  it('reuses the stored UUID when posOptionId matches', () => {
    const existing = [
      { id: 'kept-oat', posOptionId: 'sq-oat', name: 'Oat' },
      { id: 'kept-whole', posOptionId: 'sq-whole', name: 'Whole' },
    ];
    const incoming = [
      { id: 'fresh-whole', posOptionId: 'sq-whole', name: 'Whole milk' },
      { id: 'fresh-oat', posOptionId: 'sq-oat', name: 'Oat milk' },
    ];
    expect(preserveOptionIds(existing, incoming).map((o) => o.id)).toEqual(['kept-whole', 'kept-oat']);
  });

  it('keeps incoming ids when there is no POS match', () => {
    const incoming = [{ id: 'new-almond', posOptionId: 'sq-almond', name: 'Almond' }];
    expect(preserveOptionIds([], incoming)[0]!.id).toBe('new-almond');
  });

  it('leaves Moonshot-owned options (no posOptionId) unchanged', () => {
    const incoming = [{ id: 'shots-double', posOptionId: null, name: 'Double' }];
    expect(preserveOptionIds([{ id: 'old', posOptionId: null }], incoming)[0]!.id).toBe(
      'shots-double',
    );
  });
});
