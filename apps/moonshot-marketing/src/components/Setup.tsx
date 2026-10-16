import { chainOrder, useChain } from '../hooks/useChain.js';
import './Setup.css';

const STEPS = [
  { title: 'Create your café', copy: 'Menu and pickup settings in the admin.' },
  { title: 'Connect Square', copy: 'Optional — till orders land on the board too.' },
  { title: 'Add the board to your iPad', copy: 'Share → Add to Home Screen. Guided Access locks it for the shift.' },
];

export function Setup() {
  const chain = useChain<HTMLOListElement>();

  return (
    <section id="how" className="section setup">
      <div className="container">
        <p className="eyebrow">Setup</p>
        <h2>Ship today, grow tomorrow.</h2>
        <ol ref={chain.ref} className={`setup__steps ${chain.className}`}>
          {STEPS.map((s, i) => (
            <li key={s.title} className="setup__card" style={chainOrder(i)}>
              <p className="desc">{i + 1}.</p>
              <h3>{s.title}</h3>
              <p className="desc">{s.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
