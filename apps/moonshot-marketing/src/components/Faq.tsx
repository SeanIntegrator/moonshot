import './Faq.css';

const QUESTIONS = [
  { q: 'What hardware do I need?', a: 'Any iPad with a browser. No printers or special screens.' },
  { q: 'Does it work with my till?', a: '[Confirm] Square today. Other tills — tell us what you use.' },
  { q: 'What happens if the Wi-Fi drops?', a: '[Confirm] The board catches up automatically when it reconnects.' },
  { q: 'What does it cost?', a: '[Pricing]' },
  { q: 'What if I don't have a tablet?', a: 'It's on the house!' },
];

export function Faq() {
  return (
    <section id="faq" className="section faq">
      <div className="container">
        <p className="eyebrow">FAQ</p>
        <h2>Questions</h2>
        {QUESTIONS.map((item) => (
          <details key={item.q} className="faq__item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
