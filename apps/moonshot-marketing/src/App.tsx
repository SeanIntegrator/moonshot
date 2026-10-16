import { BoardAnatomy } from './components/BoardAnatomy.js';
import { Faq } from './components/Faq.js';
import { FinalCta } from './components/FinalCta.js';
import { Hero } from './components/Hero.js';
import { MarketingNav } from './components/MarketingNav.js';
import { Pricing } from './components/Pricing.js';
import { ProofStrip } from './components/ProofStrip.js';
import { Setup } from './components/Setup.js';
import { SiteFooter } from './components/SiteFooter.js';

export function App() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <ProofStrip />
        <BoardAnatomy />
        <Setup />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
