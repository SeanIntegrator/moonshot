export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  severity: ToastSeverity;
  message: string;
};

export const TOAST_STACK_MAX = 3;

export const TOAST_HIDE_MS: Record<ToastSeverity, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

export function appendToast(stack: ToastItem[], next: ToastItem): ToastItem[] {
  const merged = [...stack, next];
  return merged.length > TOAST_STACK_MAX ? merged.slice(-TOAST_STACK_MAX) : merged;
}

export function dismissToast(stack: ToastItem[], id: string): ToastItem[] {
  return stack.filter((t) => t.id !== id);
}

export function scheduleToastDismiss(severity: ToastSeverity, onDismiss: () => void): ReturnType<typeof setTimeout> {
  return setTimeout(onDismiss, TOAST_HIDE_MS[severity]);
}
