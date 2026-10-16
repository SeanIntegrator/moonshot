import { chainOrder, useChain } from '../hooks/useChain.js';
import { getAdminSignupUrl } from '../lib/adminUrls.js';
import './Pricing.css';

/**
 * Public offer only — the API does not gate features by plan.
 * Choice architecture: Counter is the entry price, House is the intended
 * default (center-stage + “most popular”), Enterprise qualifies groups of 10+.
 */
const COUNTER_PRICE_POUNDS = 25;
const HOUSE_PRICE_POUNDS = 40;
const ENTERPRISE_MIN_CAFES = 10;
const HOUSE_STEP_UP_POUNDS = HOUSE_PRICE_POUNDS - COUNTER_PRICE_POUNDS;

const ENTERPRISE_MAILTO =
  'mailto:hello@moonshot.app?subject=Enterprise%20pricing%20for%20more%20than%20ten%20cafes';

type PricingTier = {
  id: 'counter' | 'house' | 'enterprise';
  name: string;
  audience: string;
  features: readonly string[];
  cta: string;
  featured: boolean;
  pricePounds: number | null;
  priceCaption: string;
  nudge?: string;
};

const TIERS: readonly PricingTier[] = [
  {
    id: 'counter',
    name: 'Counter',
    audience: 'One café, live without a project plan.',
    pricePounds: COUNTER_PRICE_POUNDS,
    priceCaption: 'per café / month',
    features: [
      'Order-ahead on your own link',
      'Kitchen display as orders land',
      'Pay in store from day one',
    ],
    cta: 'Start with Counter',
    featured: false,
  },
  {
    id: 'house',
    name: 'House',
    audience: 'The full counter for a single café.',
    pricePounds: HOUSE_PRICE_POUNDS,
    priceCaption: 'per café / month',
    nudge: `£${HOUSE_STEP_UP_POUNDS} more than Counter. Loyalty and your brand come with it.`,
    features: [
      'Everything in Counter',
      'Loyalty stamps for regulars',
      'Themes that look like your café',
      'Stripe when you want card payments',
    ],
    cta: 'Choose House',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    audience: `If you have more than ${ENTERPRISE_MIN_CAFES} cafés.`,
    pricePounds: null,
    priceCaption: 'Group pricing',
    features: [
      'One conversation for the whole group',
      'Rollout across every site',
      'A person to plan it with',
    ],
    cta: 'Contact us',
    featured: false,
  },
];

export function Pricing() {
  const chain = useChain<HTMLDivElement>();
  const signupUrl = getAdminSignupUrl();

  return (
    <section
      id="pricing"
      className="section pricing"
      aria-labelledby="pricing-title"
    >
      <div className="container">
        <div className="pricing__intro">
          <p className="eyebrow">Pricing and plans</p>
          <h2 id="pricing-title">Priced like a café, not a platform.</h2>
        </div>
        <div ref={chain.ref} className={`pricing__grid ${chain.className}`}>
          {TIERS.map((tier, index) => {
            const href = tier.id === 'enterprise' ? ENTERPRISE_MAILTO : signupUrl;
            return (
              <article
                key={tier.id}
                className={tier.featured ? 'price-card price-card--featured' : 'price-card'}
                style={chainOrder(index)}
              >
                {tier.featured ? <p className="price-card__badge">Most popular</p> : null}
                <h3 className="price-card__name">{tier.name}</h3>
                <p className="price-card__audience">{tier.audience}</p>
                {tier.pricePounds === null ? (
                  <p className="price-card__amount">
                    <span className="price-card__value price-card__value--words">Contact us</span>
                  </p>
                ) : (
                  <p className="price-card__amount">
                    <span className="price-card__currency" aria-hidden>
                      £
                    </span>
                    <span className="price-card__value">{tier.pricePounds}</span>
                    <span className="visually-hidden"> pounds per café per month</span>
                  </p>
                )}
                <p className="price-card__caption">{tier.priceCaption}</p>
                {tier.nudge ? <p className="price-card__nudge">{tier.nudge}</p> : null}
                <ul className="price-card__features">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a href={href} className={tier.featured ? 'btn btn--primary' : 'btn'}>
                  {tier.cta}
                </a>
              </article>
            );
          })}
        </div>
        <p className="pricing__reassure">
          No setup fee. The monthly price is the whole charge.
        </p>
      </div>
    </section>
  );
}
