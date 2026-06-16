import { motion } from 'framer-motion';
import './HowItWorks.css';

const ITEMS = [
  {
    pain: 'Orders from five places',
    answer: 'One order-ahead link. Customers order on their phone; tickets land on your KDS.',
  },
  {
    pain: 'The board never matches reality',
    answer: "Real-time sync. Complete on the KDS → customer's phone updates. No refresh ritual.",
  },
  {
    pain: 'Loyalty on a stamp card',
    answer: "Digital punch card built in. Turn on when you're ready — not day one.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section how-it-works">
      <div className="container">
        <motion.h2
          className="section__title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Stop duct-taping your stack
        </motion.h2>
        <div className="how-it-works__grid">
          {ITEMS.map((item, i) => (
            <motion.article
              key={item.pain}
              className="how-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <h3>{item.pain}</h3>
              <p>{item.answer}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
