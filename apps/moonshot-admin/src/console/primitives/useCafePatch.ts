import type { AdminSettingsPatchBody } from '@moonshot/types';
import { useState } from 'react';
import { useCafe } from '../CafeProvider.js';
import { useToast } from './ToastProvider.js';

function message(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

function useCafePatch(fallbackError: string) {
  const { patchSettings } = useCafe();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function patch(
    body: AdminSettingsPatchBody,
    errorFallback = fallbackError,
  ): Promise<boolean> {
    setSaving(true);
    try {
      await patchSettings(body);
      return true;
    } catch (e) {
      toast({ severity: 'error', message: message(e, errorFallback) });
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saving, patch };
}

export function useCafeSave(fallbackError = 'Save failed') {
  const { saving, patch } = useCafePatch(fallbackError);
  return { saving, save: patch };
}

export function useImmediatePatch(fallbackError = 'Could not update') {
  const { saving, patch } = useCafePatch(fallbackError);
  return { saving, patch };
}
