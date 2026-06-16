import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import './AnimatedMockup.css';

export function AnimatedMockup() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="mockup-wrap"
      animate={reduced ? undefined : { y: [0, -8, 0] }}
      transition={reduced ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="mockup-phone">
        <div className="mockup-phone__bar" />
        <div className="mockup-phone__content">
          <p className="mockup-label">Order-ahead</p>
          <div className="mockup-item">
            <span>Flat White</span>
            <span className="mockup-price">£3.50</span>
          </div>
          <div className="mockup-item mockup-item--dim">
            <span>Cortado</span>
            <span className="mockup-price">£3.20</span>
          </div>
          <div className="mockup-checkout">Checkout →</div>
        </div>
      </div>
      <motion.div
        className="mockup-kds"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <span className="mockup-kds__live">● LIVE</span>
        <p className="mockup-kds__name">Sam · Takeaway</p>
        <p className="mockup-kds__items">1× Flat White · Oat</p>
        <span className="mockup-kds__timer">2:14</span>
      </motion.div>
    </motion.div>
  );
}
