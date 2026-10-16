import { getAdminLoginUrl } from '../lib/adminUrls.js';
import './SiteFooter.css';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <nav className="site-footer__links">
          <a href={getAdminLoginUrl()}>Sign in</a>
          <span aria-hidden>·</span>
          <a href="mailto:hello@moonshot.app">Contact</a>
        </nav>
        <p className="site-footer__copy">© Moonshot · Built for independent coffee</p>
        <p className="site-footer__copy">PR deploy check</p>
      </div>
    </footer>
  );
}
