import './ProofStrip.css';

const PROOF = ['No setup fee', 'Feature two', 'Feature three', 'Feature four'];

export function ProofStrip() {
  return (
    <section className="section proof">
      <ul className="container proof__list">
        {PROOF.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
