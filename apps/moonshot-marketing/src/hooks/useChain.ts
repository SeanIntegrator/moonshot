import { useRef, type CSSProperties } from 'react';
import { useInView } from 'framer-motion';

// For a `chain` list (see theme.css): adds `is-shown` once a third of it is on
// screen, which brings its items in one after another. Put `ref` and
// `className` on the list, and `chainOrder(i)` on each item.
export function useChain<T extends Element>() {
  const ref = useRef<T>(null);
  const shown = useInView(ref, { once: true, amount: 0.3 });
  return { ref, className: shown ? 'chain is-shown' : 'chain' };
}

// An item's place in its chain, which sets how long it waits to come in.
export const chainOrder = (i: number) => ({ '--i': i }) as CSSProperties;
