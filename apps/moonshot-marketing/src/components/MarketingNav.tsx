import { motion } from 'framer-motion';
import { getAdminLoginUrl, getAdminSignupUrl } from '../hooks/useReducedMotion.js';
import './MarketingNav.css';

export function MarketingNav() {
  return (
    <motion.header
      className="marketing-nav"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container marketing-nav__inner">
        <a href="#" className="marketing-nav__logo">
          Moonshot
        </a>
        <nav className="marketing-nav__links">
          <a href="#how-it-works">How it works</a>
          <a href={getAdminLoginUrl()}>Sign in</a>
          <a href={getAdminSignupUrl()} className="btn btn-primary marketing-nav__cta">
            Start free
          </a>
        </nav>
      </div>
    </motion.header>
  );
}
