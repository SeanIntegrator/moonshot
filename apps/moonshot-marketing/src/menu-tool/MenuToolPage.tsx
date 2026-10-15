import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadStep } from './UploadStep.js';
import { ConfirmTable } from './ConfirmTable.js';
import type { ExtractedMenu } from './types.js';
import './MenuTool.css';

/**
 * Free-tier menu-engineering tool. Step 2 of 4 (upload + confirm done).
 *
 * The design is explicitly:
 *   upload -> extract (server) -> owner confirms misreads -> price audit
 *
 * The brief forbids skipping the confirm step. The audit UI arrives in Step 3
 * and will take the confirmed menu as its one input.
 */
export function MenuToolPage() {
  const [stage, setStage] = useState<'upload' | 'confirm' | 'done'>('upload');
  const [menu, setMenu] = useState<ExtractedMenu | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [confirmed, setConfirmed] = useState<ExtractedMenu | null>(null);

  return (
    <main className="menu-tool">
      <div className="menu-tool__inner">
        <Link to="/" className="menu-tool__back">
          ← Back to Moonshot
        </Link>
        <p className="menu-tool__eyebrow">Free · For UK indie cafés</p>
        <h1 className="menu-tool__title">Scan your menu, see your pricing audit.</h1>
        <p className="menu-tool__intro">
          Snap a photo of your menu or chalkboard. We&apos;ll read every item, let you fix any
          misreads, and show how your prices and structure compare to typical specialty cafés in
          the UK. Nothing stored, no account needed.
        </p>

        {stage === 'upload' && (
          <UploadStep
            onExtracted={(extracted, meta) => {
              setMenu(extracted);
              setPageCount(meta.pageCount);
              setStage('confirm');
            }}
          />
        )}

        {stage === 'confirm' && menu && (
          <ConfirmTable
            initialMenu={menu}
            pageCount={pageCount}
            onBack={() => {
              setStage('upload');
              setMenu(null);
            }}
            onConfirm={(edited) => {
              setConfirmed(edited);
              setStage('done');
            }}
          />
        )}

        {stage === 'done' && confirmed && (
          <div className="confirm__banner">
            <strong>Thanks — your menu is confirmed.</strong>
            <br />
            The price audit lands in the next build. For now, nothing has been saved.
            <br />
            <br />
            <button type="button" className="mt-btn" onClick={() => setStage('upload')}>
              Scan another menu
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
