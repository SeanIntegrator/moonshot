import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { resizeIfPossible } from './resize.js';
import { extractMenuFromFiles, ExtractApiError } from './api.js';
import type { ExtractedMenu } from './types.js';

interface Props {
  onExtracted: (menu: ExtractedMenu, meta: { pageCount: number }) => void;
}

interface Preview {
  key: string;
  file: File;
  previewUrl?: string;
  sizeKb: number;
}

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,application/pdf';
const MAX_FILES = 6;

export function UploadStep({ onExtracted }: Props) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    if (list.length === 0) return;
    setError(null);

    // Enforce the server's own cap client-side so the user gets instant feedback.
    const slotsLeft = MAX_FILES - previews.length;
    const accepted = list.slice(0, slotsLeft);
    if (list.length > slotsLeft) {
      setError(`You can upload at most ${MAX_FILES} photos per scan.`);
    }

    const next: Preview[] = [];
    for (const original of accepted) {
      // Resize/convert images that the browser can decode; HEIC/PDF pass through.
      const { file } = await resizeIfPossible(original);
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl,
        sizeKb: Math.round(file.size / 1024),
      });
    }

    setPreviews((prev) => [...prev, ...next]);
  }

  function removePreview(key: string) {
    setPreviews((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void addFiles(e.target.files);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) void addFiles(e.dataTransfer.files);
  }

  async function scanMenu() {
    if (previews.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setStatus('Reading your menu — this can take 20–40 seconds for a chalkboard.');

    try {
      const data = await extractMenuFromFiles(previews.map((p) => p.file));
      onExtracted(data.menu, data.meta);
    } catch (e) {
      if (e instanceof ExtractApiError) {
        setError(e.message);
      } else {
        setError('Something went wrong. Try again in a moment.');
      }
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload">
      <label
        className={`upload__dropzone ${dragging ? 'upload__dropzone--active' : ''}`}
        onDragEnter={() => setDragging(true)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={onInputChange}
          disabled={busy}
        />
        <p className="upload__dropzone-primary">Tap to add menu photos</p>
        <p className="upload__dropzone-hint">
          Up to {MAX_FILES} photos or one PDF. JPEG, PNG, HEIC and PDF all work. Phone photos are fine.
        </p>
      </label>

      {previews.length > 0 && (
        <div className="upload__thumbs">
          {previews.map((p) => (
            <div className="upload__thumb" key={p.key}>
              {p.previewUrl ? (
                <img src={p.previewUrl} alt="" />
              ) : (
                <div className="upload__thumb-fallback">{p.file.name}</div>
              )}
              <div className="upload__thumb-footer">
                <span>{p.sizeKb} KB</span>
                <button
                  type="button"
                  className="upload__thumb-remove"
                  onClick={() => removePreview(p.key)}
                  disabled={busy}
                  aria-label={`Remove ${p.file.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="upload__actions">
        <p className="upload__status">
          {busy ? (
            <>
              <span className="spinner" aria-hidden />
              {status}
            </>
          ) : previews.length === 0 ? (
            'Nothing uploaded yet.'
          ) : (
            `${previews.length} file${previews.length === 1 ? '' : 's'} ready.`
          )}
        </p>
        <button
          type="button"
          className="mt-btn mt-btn--primary"
          onClick={scanMenu}
          disabled={previews.length === 0 || busy}
        >
          {busy ? 'Reading…' : 'Scan menu'}
        </button>
      </div>

      {error && <p className="upload__error">{error}</p>}
    </div>
  );
}
