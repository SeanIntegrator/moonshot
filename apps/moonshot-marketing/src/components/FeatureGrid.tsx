import { motion } from 'framer-motion';
import './FeatureGrid.css';

const FEATURES = [
  { title: 'Live kitchen board', copy: 'Tickets appear the moment an order is placed. Complete with one tap.' },
  { title: 'Pickup ETA', copy: 'Queue-aware estimates — customers know when to arrive.' },
  { title: 'Pay in store first', copy: 'Go live without Stripe on day one. Add online payments when it makes sense.' },
  { title: 'Loyalty & reviews', copy: 'Stamps and review nudges — opt-in features, not day-one complexity.' },
  { title: 'Your brand', copy: 'Minimal, organic, lively — themes that feel like your café, not ours.' },
];

export function FeatureGrid() {
  return (
    <section className="section feature-grid">
      <div className="container">
        <motion.h2
          className="section__title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Ship today. Grow tomorrow.
        </motion.h2>
        <div className="feature-grid__items">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <h3>{f.title}</h3>
              <p>{f.copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
