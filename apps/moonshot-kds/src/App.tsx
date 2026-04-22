import './index.css';
import type { WorkspaceKdsEvent } from './socketTypes.js';

export function App() {
  const _socketEventExample: WorkspaceKdsEvent | null = null;
  void _socketEventExample;

  return (
    <div className="kds-shell">
      <header className="kds-title">Moonshot KDS</header>
      <p className="kds-placeholder">
        No component library — CSS + Socket.io will drive the board. Shared types live in{' '}
        <code>@moonshot/types</code>.
      </p>
    </div>
  );
}
