import type {
  ExtractedMenuPayload,
  MenuEngineeringAnalysisResponse,
  MenuEngineeringRegionTier,
} from '@moonshot/types';
import { useRef, useState } from 'react';
import {
  fetchSampleMenuExtraction,
  runMenuEngineeringAnalysis,
  uploadMenuImagesForExtraction,
} from './api.js';
import { MenuConfirmTable } from './MenuConfirmTable.js';
import './MenuEngineeringSection.css';
import { MenuReportView } from './MenuReportView.js';
import {
  type PreparedMenuPageImage,
  prepareSelectedMenuFiles,
} from './prepare-menu-files.js';
import { TurnstileWidget } from './TurnstileWidget.js';

type Step = 'upload' | 'confirm' | 'report';

export function MenuEngineeringSection() {
  const [step, setStep] = useState<Step>('upload');
  const [regionTier, setRegionTier] = useState<MenuEngineeringRegionTier>('city');
  const [cafeName, setCafeName] = useState<string>('');
  const [preparedPages, setPreparedPages] = useState<PreparedMenuPageImage[]>([]);
  const [extractedMenu, setExtractedMenu] = useState<ExtractedMenuPayload | null>(null);
  const [analysis, setAnalysis] = useState<MenuEngineeringAnalysisResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileEpoch, setTurnstileEpoch] = useState(0);
  const [pendingReportRegion, setPendingReportRegion] =
    useState<MenuEngineeringRegionTier | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const analysisRequestSeq = useRef(0);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '';

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    setIsBusy(true);
    setStatusMessage('Rendering PDF pages & normalising images in browser canvas…');

    try {
      const pages = await prepareSelectedMenuFiles(fileList);
      setPreparedPages(pages);
      setStatusMessage(
        `Prepared ${pages.length} page${pages.length === 1 ? '' : 's'} locally. Ready to extract.`,
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not process the selected files.',
      );
      setStatusMessage(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExtractUploadedPages = async () => {
    if (preparedPages.length === 0) return;
    if (turnstileSiteKey && !turnstileToken) {
      setErrorMessage('Complete the bot check before uploading your menu.');
      return;
    }
    setErrorMessage(null);
    setIsBusy(true);
    setStatusMessage('Extracting items, prices & modifiers via vision adapter…');

    try {
      const result = await uploadMenuImagesForExtraction(
        preparedPages.map((p) => p.file),
        turnstileToken ? { turnstileToken } : undefined,
      );
      const menuWithCafe = cafeName.trim()
        ? { ...result.menu, cafeNameGuess: cafeName.trim() }
        : result.menu;
      setExtractedMenu(menuWithCafe);
      setStatusMessage(null);
      setStep('confirm');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Menu extraction failed. Try the sample menu.',
      );
      setStatusMessage(null);
    } finally {
      setIsBusy(false);
      // Turnstile tokens are single-use; force a fresh widget for the next upload.
      if (turnstileSiteKey) {
        setTurnstileToken(null);
        setTurnstileEpoch((n) => n + 1);
      }
    }
  };

  const handleLoadSampleMenu = async () => {
    setErrorMessage(null);
    setIsBusy(true);
    setStatusMessage('Loading seeded UK specialty café menu…');

    try {
      const sample = await fetchSampleMenuExtraction();
      setCafeName(sample.menu.cafeNameGuess ?? 'North St. Espresso & Kitchen');
      setExtractedMenu(sample.menu);
      setStatusMessage(null);
      setStep('confirm');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not load sample menu from API.',
      );
      setStatusMessage(null);
    } finally {
      setIsBusy(false);
    }
  };

  const runAnalysisForMenu = async (
    menuToAnalyse: ExtractedMenuPayload,
    tierToUse: MenuEngineeringRegionTier,
  ) => {
    const requestId = ++analysisRequestSeq.current;
    setErrorMessage(null);
    setIsBusy(true);
    setStatusMessage('Running deterministic UK benchmark rules & generating report…');

    try {
      const result = await runMenuEngineeringAnalysis({
        regionTier: tierToUse,
        menu: menuToAnalyse,
      });
      if (requestId !== analysisRequestSeq.current) return;
      // Apply the region and its findings together so labels never lead the numbers.
      setRegionTier(tierToUse);
      setPendingReportRegion(null);
      setAnalysis(result);
      setStatusMessage(null);
      setStep('report');
    } catch (err) {
      if (requestId !== analysisRequestSeq.current) return;
      setPendingReportRegion(null);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to run menu benchmark analysis.',
      );
      setStatusMessage(null);
    } finally {
      if (requestId === analysisRequestSeq.current) {
        setIsBusy(false);
      }
    }
  };

  const handleRegionChangeInReport = (nextTier: MenuEngineeringRegionTier) => {
    if (!extractedMenu) return;
    const committedRegion = analysis?.findings.regionTier ?? regionTier;
    // Switching back to the region already on screen drops the in-flight request.
    if (nextTier === committedRegion) {
      analysisRequestSeq.current += 1;
      setPendingReportRegion(null);
      setRegionTier(committedRegion);
      setIsBusy(false);
      setStatusMessage(null);
      setErrorMessage(null);
      return;
    }
    if (nextTier === pendingReportRegion) return;
    setPendingReportRegion(nextTier);
    void runAnalysisForMenu(extractedMenu, nextTier);
  };

  const handleBackToConfirm = () => {
    analysisRequestSeq.current += 1;
    setPendingReportRegion(null);
    setIsBusy(false);
    setStatusMessage(null);
    setStep('confirm');
  };

  const handleReset = () => {
    analysisRequestSeq.current += 1;
    setPendingReportRegion(null);
    setPreparedPages((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl);
      return [];
    });
    setExtractedMenu(null);
    setAnalysis(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setIsBusy(false);
    setStep('upload');
  };

  return (
    <section id="menu-audit" className="me-section" aria-labelledby="me-heading">
      <div className="container">
        <div className="me-section__intro">
          <span className="me-eyebrow">Free UK Specialty Café Tool</span>
          <h2 id="me-heading" className="me-section__title">
            Menu Engineering &amp; Price Benchmark Audit
          </h2>
          <p className="me-section__lead">
            Upload a photo or PDF of your menu—or load our seeded UK specialty café
            sample—to benchmark every coffee, pastry, brunch dish, and add-on against
            Greater London, UK City, and UK Market Town ranges.
          </p>
        </div>

        <div className="me-stepper" role="navigation" aria-label="Audit progress">
          <div className={`me-stepper__item ${step === 'upload' ? 'is-active' : 'is-done'}`}>
            <span className="me-stepper__num">1</span>
            <span>Upload or load sample</span>
          </div>
          <div
            className={`me-stepper__item ${
              step === 'confirm' ? 'is-active' : step === 'report' ? 'is-done' : ''
            }`}
          >
            <span className="me-stepper__num">2</span>
            <span>Confirm items &amp; prices</span>
          </div>
          <div className={`me-stepper__item ${step === 'report' ? 'is-active' : ''}`}>
            <span className="me-stepper__num">3</span>
            <span>Benchmark report &amp; 4 charts</span>
          </div>
        </div>

        {errorMessage ? (
          <div className="me-alert me-alert--error" role="alert">
            <strong>Heads up:</strong> {errorMessage}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="me-alert me-alert--status" role="status">
            {statusMessage}
          </div>
        ) : null}

        {step === 'upload' ? (
          <div className="me-upload-card">
            <div className="me-upload-card__controls">
              <div className="me-form-group">
                <label className="me-field-label" htmlFor="me-cafe-name">
                  Café name (optional)
                </label>
                <input
                  id="me-cafe-name"
                  type="text"
                  className="me-input"
                  placeholder="e.g. North St. Espresso"
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                />
              </div>

              <div className="me-form-group">
                <label className="me-field-label" htmlFor="me-upload-region">
                  UK Benchmark Region Tier
                </label>
                <select
                  id="me-upload-region"
                  className="me-select"
                  value={regionTier}
                  onChange={(e) =>
                    setRegionTier(e.target.value as MenuEngineeringRegionTier)
                  }
                >
                  <option value="london">Greater London</option>
                  <option value="city">
                    UK Regional City (Brighton, Bristol, Manchester, Edinburgh)
                  </option>
                  <option value="town">UK Market Town / Suburb</option>
                </select>
              </div>
            </div>

            <div
              className="me-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleFilesSelected(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/*,application/pdf"
                multiple
                className="me-dropzone__input"
                aria-label="Upload menu photos or PDF"
                onChange={(e) => void handleFilesSelected(e.target.files)}
              />
              <p className="me-dropzone__title">
                Drop menu photos (<code>.jpg</code>, <code>.png</code>, <code>.heic</code>) or
                a multi-page <code>.pdf</code>
              </p>
              <p className="me-dropzone__sub">
                PDFs are rendered to high-contrast JPEG pages locally in your browser using{' '}
                <code>&lt;canvas&gt;</code> before upload.
              </p>
              <div className="me-dropzone__buttons">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose menu files…
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isBusy}
                  onClick={() => void handleLoadSampleMenu()}
                >
                  Load real UK sample menu (instant test) →
                </button>
              </div>
            </div>

            {preparedPages.length > 0 ? (
              <div className="me-previews">
                {turnstileSiteKey ? (
                  <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    resetKey={turnstileEpoch}
                    onToken={setTurnstileToken}
                  />
                ) : null}
                <div className="me-previews__head">
                  <strong>
                    Prepared {preparedPages.length} menu page
                    {preparedPages.length === 1 ? '' : 's'} (rendered to JPEG)
                  </strong>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isBusy || (turnstileSiteKey.length > 0 && !turnstileToken)}
                    onClick={() => void handleExtractUploadedPages()}
                  >
                    {isBusy ? 'Extracting…' : 'Extract items & continue to Step 2 →'}
                  </button>
                </div>
                <div className="me-previews__grid">
                  {preparedPages.map((p) => (
                    <figure key={p.label} className="me-preview-item">
                      <img src={p.previewUrl} alt={p.label} />
                      <figcaption>{p.label}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="me-privacy-note">
              <strong>Stateless privacy promise:</strong> Your uploaded menu photos and PDF
              pages are processed strictly in memory and discarded immediately after
              extraction—never saved to disk or database on the free tier.
            </p>
          </div>
        ) : null}

        {step === 'confirm' && extractedMenu ? (
          <MenuConfirmTable
            menu={extractedMenu}
            regionTier={regionTier}
            onRegionTierChange={setRegionTier}
            onMenuChange={setExtractedMenu}
            onRunAudit={() => void runAnalysisForMenu(extractedMenu, regionTier)}
            onReset={handleReset}
            isAnalysing={isBusy}
          />
        ) : null}

        {step === 'report' && analysis ? (
          <MenuReportView
            analysis={analysis}
            cafeName={extractedMenu?.cafeNameGuess ?? (cafeName.trim() || null)}
            regionTier={analysis.findings.regionTier}
            pendingRegionTier={pendingReportRegion}
            onRegionTierChange={handleRegionChangeInReport}
            onBackToConfirm={handleBackToConfirm}
            onStartOver={handleReset}
          />
        ) : null}
      </div>
    </section>
  );
}
