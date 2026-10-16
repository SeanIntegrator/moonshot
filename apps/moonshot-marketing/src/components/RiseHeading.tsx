import { Fragment, type CSSProperties } from 'react';
import './RiseHeading.css';

// A heading whose words rise in one after another (see RiseHeading.css).
// Words are split on spaces; wrap one in *asterisks* to italicise it. Screen
// readers get the whole heading as one piece.
export function RiseHeading({ text }: { text: string }) {
  return (
    <h1 aria-label={text.replaceAll('*', '')}>
      {text.split(' ').map((word, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span aria-hidden className="rise-word" style={{ '--i': i } as CSSProperties}>
            {word.split('*').map((piece, j) => (j % 2 ? <em key={j}>{piece}</em> : piece))}
          </span>
        </Fragment>
      ))}
    </h1>
  );
}
