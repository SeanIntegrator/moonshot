import { motion } from 'framer-motion';
import './ProductShowcase.css';

const NODES = [
  {
    title: 'Order-ahead',
    desc: 'Branded mobile ordering. Google sign-in for regulars. Pay in store or Stripe when you\'re ready.',
  },
  {
    title: 'API',
    desc: 'Real-time sync between kitchen and customers. Orders, ETAs, loyalty — one source of truth.',
  },
  {
    title: 'KDS',
    desc: 'Kitchen display built for coffee workflow. Milk colours, bean badges, pickup timers.',
  },
];

export function ProductShowcase() {
  return (
    <section className="section product-showcase">
      <div className="container">
        <motion.h2
          className="section__title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Three apps. One orbit.
        </motion.h2>
        <div className="product-diagram">
          {NODES.map((node, i) => (
            <motion.div
              key={node.title}
              className="product-node"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <h3>{node.title}</h3>
              <p>{node.desc}</p>
            </motion.div>
          ))}
        </div>
        <p className="product-showcase__admin">
          <strong>Admin</strong> — Your control room. Menu, pickup settings, payments — no SQL required.
        </p>
      </div>
    </section>
  );
}
