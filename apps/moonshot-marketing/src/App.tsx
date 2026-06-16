import { Hero } from './components/Hero.js';
import { HowItWorks } from './components/HowItWorks.js';
import { MarketingNav } from './components/MarketingNav.js';
import { ProductShowcase } from './components/ProductShowcase.js';
import { FeatureGrid } from './components/FeatureGrid.js';
import { PricingCta } from './components/PricingCta.js';
import { SiteFooter } from './components/SiteFooter.js';
import './components/SocialProof.css';

export function App() {
  return (
    <>
      <div className="grain" aria-hidden />
      <MarketingNav />
      <main>
        <Hero />
        <div className="social-proof">
          <div className="container">
            <p>Built for baristas who&apos;d rather pull shots than fight software.</p>
            <div className="social-proof__logos" aria-hidden>
              <span>Coming soon</span>
            </div>
          </div>
        </div>
        <HowItWorks />
        <ProductShowcase />
        <FeatureGrid />
        <PricingCta />
      </main>
      <SiteFooter />
    </>
  );
}
