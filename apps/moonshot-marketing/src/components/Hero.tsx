import { motion } from 'framer-motion';
import { AnimatedMockup } from './AnimatedMockup.js';
import { getAdminSignupUrl, useReducedMotion } from '../hooks/useReducedMotion.js';
import './Hero.css';

const headline = ['Your counter.', 'Your customers.', 'One launch.'];

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="hero">
      <div className="mesh">
        <div className="mesh-blob mesh-blob--lime" />
        <div className="mesh-blob mesh-blob--violet" />
      </div>
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="hero__eyebrow">Independent cafés · zero POS lock-in</p>
          <h1 className="hero__title">
            {headline.map((word, i) => (
              <motion.span
                key={word}
                className="hero__title-line"
                initial={reduced ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.p
            className="hero__sub"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Moonshot gives indie coffee shops order-ahead, a kitchen display that actually keeps up,
            and loyalty that doesn&apos;t need a spreadsheet — without selling your soul to a POS
            dinosaur.
          </motion.p>
          <motion.div
            className="hero__actions"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            <a href={getAdminSignupUrl()} className="btn btn-primary">
              Start your café — free
            </a>
            <a href="#how-it-works" className="btn btn-ghost">
              See how it works
            </a>
          </motion.div>
        </div>
        <motion.div
          className="hero__visual"
          initial={reduced ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <AnimatedMockup />
        </motion.div>
      </div>
    </section>
  );
}
