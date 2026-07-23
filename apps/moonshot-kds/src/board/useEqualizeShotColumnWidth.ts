import { useLayoutEffect, type RefObject } from 'react';

/**
 * Per-order: measure drink-row shot columns at natural width, then lock every
 * row to the max so milk chips share a vertical edge for quick scanning.
 */
export function useEqualizeShotColumnWidth(
  bodyRef: RefObject<HTMLElement | null>,
  /** Remeasure when drink line content changes (names, shot labels, qty). */
  contentKey: string,
): void {
  useLayoutEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    let frame = 0;

    function measure(): void {
      const body = bodyRef.current;
      if (!body) return;

      const cols = body.querySelectorAll<HTMLElement>(
        '[data-flow-row="drink"] [data-flow-col="shot"]',
      );
      if (cols.length === 0) {
        body.style.removeProperty('--flow-shot-col-width');
        return;
      }

      const previous = body.style.getPropertyValue('--flow-shot-col-width');
      body.style.removeProperty('--flow-shot-col-width');

      // Natural content width (ignore the locked grid track from the previous pass).
      for (const col of cols) {
        col.style.width = 'max-content';
      }

      let max = 0;
      for (const col of cols) {
        max = Math.max(max, col.getBoundingClientRect().width);
      }

      for (const col of cols) {
        col.style.width = '';
      }

      const next = max > 0 ? `${Math.ceil(max)}px` : '';
      if (next === previous) {
        if (next) body.style.setProperty('--flow-shot-col-width', next);
        return;
      }
      if (next) body.style.setProperty('--flow-shot-col-width', next);
      else body.style.removeProperty('--flow-shot-col-width');
    }

    function scheduleMeasure(): void {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    measure();

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      root.style.removeProperty('--flow-shot-col-width');
    };
  }, [bodyRef, contentKey]);
}
