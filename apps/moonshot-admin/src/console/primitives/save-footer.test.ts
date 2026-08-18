import { describe, expect, it } from 'vitest';
import { canSubmitSaveFooter, canUndoSaveFooter } from './save-footer.js';

describe('canSubmitSaveFooter', () => {
  it('is disabled until the card is dirty', () => {
    expect(canSubmitSaveFooter({ dirty: false, valid: true, saving: false })).toBe(false);
  });

  it('is disabled while invalid even if dirty', () => {
    expect(canSubmitSaveFooter({ dirty: true, valid: false, saving: false })).toBe(false);
  });

  it('is disabled while saving', () => {
    expect(canSubmitSaveFooter({ dirty: true, valid: true, saving: true })).toBe(false);
  });

  it('is enabled when dirty, valid, and idle', () => {
    expect(canSubmitSaveFooter({ dirty: true, valid: true, saving: false })).toBe(true);
  });
});

describe('canUndoSaveFooter', () => {
  it('is disabled until dirty', () => {
    expect(canUndoSaveFooter({ dirty: false, saving: false })).toBe(false);
  });

  it('is disabled while saving', () => {
    expect(canUndoSaveFooter({ dirty: true, saving: true })).toBe(false);
  });

  it('is enabled when dirty and idle', () => {
    expect(canUndoSaveFooter({ dirty: true, saving: false })).toBe(true);
  });
});
