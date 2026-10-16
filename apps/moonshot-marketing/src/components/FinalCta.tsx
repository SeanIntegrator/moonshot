import { getAdminSignupUrl } from '../lib/adminUrls.js';
import './FinalCta.css';

export function FinalCta() {
  return (
    <section id="start" className="section final-cta">
      <div className="container">
        <h2>Give your café a board that keeps up.</h2>
        <p className="lead">No setup fee. No hardware. Live in minutes.</p>
        <a href={getAdminSignupUrl()} className="btn btn--primary">
          Start your café — free
        </a>
      </div>
    </section>
  );
}
