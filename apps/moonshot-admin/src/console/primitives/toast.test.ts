import { describe, expect, it, vi } from 'vitest';
import {
  appendToast,
  dismissToast,
  scheduleToastDismiss,
  TOAST_HIDE_MS,
  TOAST_STACK_MAX,
  type ToastItem,
  type ToastSeverity,
} from './toast.js';

function item(id: string, severity: ToastItem['severity'] = 'success'): ToastItem {
  return { id, severity, message: id };
}

describe('toast stack', () => {
  it('appends and drops the oldest past the cap', () => {
    let stack: ToastItem[] = [];
    for (let i = 0; i < TOAST_STACK_MAX + 1; i++) {
      stack = appendToast(stack, item(String(i)));
    }
    expect(stack.map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('dismisses by id', () => {
    const stack = dismissToast([item('a'), item('b')], 'a');
    expect(stack.map((t) => t.id)).toEqual(['b']);
  });
});

describe('toast hide duration', () => {
  it('keeps errors longer than success', () => {
    expect(TOAST_HIDE_MS.success).toBe(4000);
    expect(TOAST_HIDE_MS.info).toBe(4000);
    expect(TOAST_HIDE_MS.warning).toBe(5000);
    expect(TOAST_HIDE_MS.error).toBe(6000);
  });

  it('auto-dismisses after the severity duration', () => {
    vi.useFakeTimers();
    const hidden: ToastSeverity[] = [];
    scheduleToastDismiss('success', () => hidden.push('success'));
    scheduleToastDismiss('error', () => hidden.push('error'));
    vi.advanceTimersByTime(3999);
    expect(hidden).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(hidden).toEqual(['success']);
    vi.advanceTimersByTime(2000);
    expect(hidden).toEqual(['success', 'error']);
    vi.useRealTimers();
  });
});
