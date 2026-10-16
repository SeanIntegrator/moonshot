import { getAdminSignupUrl } from '../lib/adminUrls.js';
import { FrameSequence } from './FrameSequence.js';
import { RiseHeading } from './RiseHeading.js';
import './Hero.css';

const beanFrames = Object.entries(
  import.meta.glob<string>('../assets/parallax/01-bg/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

export function Hero() {
  return (
    <section className="section hero">
      <FrameSequence frames={beanFrames} />
      <div className="hero__grid">
        <div className="hero__copy">
          <RiseHeading text="Tickets that read the way baristas *think*." />
          <p className="lead">Lorem ipsum dolor sit amet consectetur adipiscing.</p>
          <div className="hero__actions">
            <a href={getAdminSignupUrl()} className="btn btn--primary">
              Start your café – free
            </a>
            <a href="#how" className="btn">
              See how it works
            </a>
          </div>
        </div>
        <div className="hero__device">
          <div className="hero__screen">KDS display demonstration</div>
        </div>
      </div>
    </section>
  );
}
