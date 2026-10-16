import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './FrameSequence.css';

const FPS = 24;
const FLOAT_SECONDS = 1.8;
const FLOAT_EASE = [0.22, 1, 0.36, 1] as const;
// After the intro, the last LOOP_FRAMES frames swing back and forth, one full
// there-and-back taking LOOP_SECONDS.
const LOOP_FRAMES = 8;
const LOOP_SECONDS = 5;

const variants = {
  loading: { opacity: 0, y: '-14%' },
  play: { opacity: 1, y: '0%', transition: { duration: FLOAT_SECONDS, ease: FLOAT_EASE } },
  still: { opacity: 1, y: '0%', transition: { duration: 0 } },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

/**
 * Plays an image sequence once on load, floating it into place, then gently loops its last frames.
 * With `playOnView`, it waits until the layer is first scrolled into view instead.
 */
export function FrameSequence({
  frames,
  playOnView = false,
}: {
  frames: string[];
  playOnView?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<keyof typeof variants>('loading');

  useEffect(() => {
    if (frames.length === 0) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let raf = 0;

    // Skip redrawing while the layer is scrolled out of view, and hold back a
    // `playOnView` start until it has been seen.
    let onScreen = true;
    let seen = false;
    let startWhenSeen: (() => void) | null = null;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      if (!onScreen) return;
      seen = true;
      const start = startWhenSeen;
      startWhenSeen = null;
      start?.();
    });
    if (canvasRef.current) observer.observe(canvasRef.current);

    Promise.all((reduced ? frames.slice(-1) : frames).map(loadImage))
      .then((images) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const first = images[0];
        if (cancelled || !canvas || !ctx || !first) return;

        canvas.width = first.naturalWidth;
        canvas.height = first.naturalHeight;
        // A fractional position cross-fades between the two neighbouring frames,
        // which keeps the slow loop smooth instead of stepping.
        const draw = (position: number) => {
          const base = Math.floor(position);
          const mix = position - base;
          const image = images[base];
          const next = images[base + 1];
          if (!image) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (!next || mix < 0.01) {
            ctx.drawImage(image, 0, 0);
            return;
          }
          ctx.globalAlpha = 1 - mix;
          ctx.drawImage(image, 0, 0);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = mix;
          ctx.drawImage(next, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        };

        const last = images.length - 1;
        if (reduced) {
          draw(last);
          setPhase('still');
          return;
        }

        const play = () => {
          if (cancelled) return;
          draw(0);
          setPhase('play');
          const start = performance.now();
          const introMs = (last / FPS) * 1000;
          const loopSpan = Math.min(LOOP_FRAMES, images.length) - 1;
          let shown = 0;
          const tick = (now: number) => {
            const elapsed = now - start;
            let position: number;
            if (elapsed < introMs) {
              position = Math.floor((elapsed / 1000) * FPS);
            } else {
              // 0 → 1 → 0, slowing to a stop at each end so the reversal isn't abrupt.
              const swing =
                (1 - Math.cos((2 * Math.PI * (elapsed - introMs)) / (LOOP_SECONDS * 1000))) / 2;
              position = last - swing * loopSpan;
            }
            if (position !== shown && onScreen) {
              draw(position);
              shown = position;
            }
            if (elapsed < introMs || loopSpan > 0) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        };

        if (playOnView && !seen) startWhenSeen = play;
        else play();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [frames, playOnView]);

  return (
    <motion.div
      className="frame-sequence"
      aria-hidden
      variants={variants}
      initial="loading"
      animate={phase}
    >
      <canvas ref={canvasRef} className="frame-sequence__canvas" />
    </motion.div>
  );
}
