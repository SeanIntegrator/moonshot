import { getAdminLoginUrl, getAdminSignupUrl } from '../lib/adminUrls.js';
import './MarketingNav.css';

export function MarketingNav() {
  return (
    <header className="marketing-nav">
      <div className="marketing-nav__inner">
        <a href="#" className="marketing-nav__logo">
          Moonshot
        </a>
        <nav className="marketing-nav__links">
          <a href="#how">How it works</a>
          <a href={getAdminLoginUrl()}>Sign in</a>
          <a href={getAdminSignupUrl()} className="btn btn--primary">
            Start free
          </a>
        </nav>
      </div>
    </header>
  );
}
