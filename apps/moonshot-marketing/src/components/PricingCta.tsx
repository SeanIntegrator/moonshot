import { motion } from 'framer-motion';
import { getAdminSignupUrl } from '../hooks/useReducedMotion.js';
import './PricingCta.css';

export function PricingCta() {
  return (
    <section className="section pricing-cta">
      <div className="container pricing-cta__inner">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section__title">No setup fee. No enterprise sales call.</h2>
          <p className="pricing-cta__copy">
            Create your café in minutes. Run pay-in-store orders immediately. Connect Stripe when you
            want card payments online. We&apos;re building for owners who measure ROI in flat
            whites, not board decks.
          </p>
          <a href={getAdminSignupUrl()} className="btn btn-primary">
            Create your café
          </a>
        </motion.div>
      </div>
    </section>
  );
}
