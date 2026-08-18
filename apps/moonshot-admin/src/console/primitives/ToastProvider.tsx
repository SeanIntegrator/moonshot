import { Alert, Box, Slide } from '@mui/material';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  appendToast,
  dismissToast,
  scheduleToastDismiss,
  type ToastItem,
  type ToastSeverity,
} from './toast.js';

type ToastFn = (input: { severity: ToastSeverity; message: string }) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const seq = useRef(0);

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setStack((prev) => dismissToast(prev, id));
  }, []);

  const toast = useCallback<ToastFn>(
    ({ severity, message }) => {
      const id = `toast-${seq.current++}`;
      const item: ToastItem = { id, severity, message };
      setStack((prev) => appendToast(prev, item));
      const handle = scheduleToastDismiss(severity, () => dismiss(id));
      timers.current.set(id, handle);
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.snackbar,
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'center',
          gap: 1,
          pointerEvents: 'none',
          px: 2,
        }}
      >
        {stack.map((item) => (
          <Slide key={item.id} in direction="up" appear>
            <Alert
              severity={item.severity}
              variant="filled"
              onClose={() => dismiss(item.id)}
              sx={{ pointerEvents: 'auto', minWidth: 280, maxWidth: 480, boxShadow: 3 }}
            >
              {item.message}
            </Alert>
          </Slide>
        ))}
      </Box>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/** For shared fields that also render outside the signed-in console. */
export function useOptionalToast(): ToastFn | null {
  return useContext(ToastContext);
}
