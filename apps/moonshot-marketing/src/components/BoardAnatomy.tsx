import './BoardAnatomy.css';

// `x` / `y` place each numbered pin on the board screenshot, as a percentage.
const CALLOUTS = [
  { label: 'Shot column', copy: 'Shots and quantity first — the thing you start on.', x: 12, y: 30 },
  { label: 'Milk colours', copy: 'Oat or whole? Colour tells you before you read.', x: 38, y: 42 },
  { label: 'Allergen stripes', copy: 'Hazards stand out, even mid-rush.', x: 62, y: 28 },
  { label: 'Timers', copy: 'See which order has waited longest.', x: 86, y: 14 },
  { label: 'Food strip', copy: 'Food sits apart from drinks and turns green when done.', x: 50, y: 78 },
];

export function BoardAnatomy() {
  return (
    <section id="board" className="section board">
      <div className="container">
        <p className="eyebrow">Board anatomy</p>
        <h2>Everything a barista needs, at a glance</h2>
        <div className="board__layout">
          <div className="board__shot">
            {/* Stands in for the real board screenshot. */}
            <div className="board__placeholder">Real board screenshot</div>
            {CALLOUTS.map((c, i) => (
              <span key={c.label} className="board__pin" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                {i + 1}
              </span>
            ))}
          </div>
          <ol className="board__list">
            {CALLOUTS.map((c) => (
              <li key={c.label}>
                <h3>{c.label}</h3>
                <p className="desc">{c.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
