import { useEffect, useRef, useState, type AnimationEvent, type ReactNode } from 'react';
import { useLocation, type Location } from 'react-router-dom';
import { ACTIVE_PAGE_TRANSITION, PAGE_TRANSITION_PRESETS } from './presets.js';
import './page-transition.css';

type Phase = 'idle' | 'exit' | 'enter';

type Props = {
  children: (location: Location) => ReactNode;
  /** Override the global preset for a one-off surface (tests / experiments). */
  kind?: keyof typeof PAGE_TRANSITION_PRESETS;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Cross-fades (or otherwise animates) route content without touching chrome like the tab bar.
 * Children receive the location that should currently be rendered so exit can finish before swap.
 */
export function PageTransition({ children, kind = ACTIVE_PAGE_TRANSITION }: Props) {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const preset = PAGE_TRANSITION_PRESETS[kind];
  const [renderedLocation, setRenderedLocation] = useState(location);
  const [phase, setPhase] = useState<Phase>('idle');
  const pendingLocation = useRef(location);

  function finishExit() {
    setRenderedLocation(pendingLocation.current);
    setPhase('enter');
    // New page should start at the top; old scroll offset looks wrong mid-fade.
    window.scrollTo(0, 0);
  }

  function finishEnter() {
    setPhase('idle');
  }

  useEffect(() => {
    pendingLocation.current = location;
    if (location.key === renderedLocation.key) return;

    // Same path, new key (e.g. replace to clear location.state) — sync without animating.
    if (
      location.pathname === renderedLocation.pathname &&
      location.search === renderedLocation.search
    ) {
      setRenderedLocation(location);
      return;
    }

    if (reducedMotion) {
      setRenderedLocation(location);
      setPhase('idle');
      return;
    }

    // Already exiting toward a newer target — keep exiting; pendingLocation has the latest.
    if (phase === 'exit') return;
    setPhase('exit');
  }, [location, renderedLocation.key, renderedLocation.pathname, renderedLocation.search, reducedMotion, phase]);

  // Fallback if animationend is swallowed (nested UI) or disabled by CSS.
  useEffect(() => {
    if (phase !== 'exit' && phase !== 'enter') return;
    const timer = window.setTimeout(() => {
      if (phase === 'exit') finishExit();
      else finishEnter();
    }, preset.durationMs + 50);
    return () => window.clearTimeout(timer);
  }, [phase, preset.durationMs]);

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    // Ignore bubbled animations from nested UI (chips, steppers, etc.).
    if (event.target !== event.currentTarget) return;

    if (phase === 'exit') finishExit();
    else if (phase === 'enter') finishEnter();
  }

  const className = [
    'page-transition',
    phase === 'exit' ? preset.exitClass : '',
    phase === 'enter' ? preset.enterClass : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} onAnimationEnd={handleAnimationEnd}>
      {children(renderedLocation)}
    </div>
  );
}
