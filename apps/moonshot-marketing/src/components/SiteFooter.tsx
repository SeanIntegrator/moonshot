import { getAdminLoginUrl } from '../hooks/useReducedMotion.js';
import './SiteFooter.css';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <nav className="site-footer__links">
          <a href={getAdminLoginUrl()}>Sign in</a>
          <span aria-hidden>·</span>
          <a href="mailto:hello@moonshot.app">Contact</a>
        </nav>
        <p className="site-footer__copy">© Moonshot · Built for independent coffee</p>
      </div>
    </footer>
  );
}
