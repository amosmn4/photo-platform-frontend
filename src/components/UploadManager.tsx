import React, { useRef, useState } from 'react';
import { uploadApi } from '../api/events';
import { startUploadQueue, UploadProgress } from '../utils/uploadQueue';
import { mimeTypeFor, OWNER_ACCEPT } from '../utils/media';
import { formatBytes } from '../utils/format';

interface Props {
  eventId: string;
  onBatchStarted?: (batchId: string) => void;
  onAllUploaded?: () => void;
}

const CONCURRENCY = 6;
const CHUNK_SIZE = 50;

// Uploads files directly to storage in parallel with bounded concurrency. Keep this tab open until
// it finishes; processing then continues on the server even if the tab is closed.
export function UploadManager({ eventId, onBatchStarted, onAllUploaded }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allDone = progress !== null && !isUploading && progress.done + progress.failed === progress.total;

  function handleFilesSelected(selected: FileList | null) {
    if (!selected) return;
    const all = Array.from(selected);
    const supported = all.filter((f) => mimeTypeFor(f) !== null);
    setFiles(supported);
    setSkipped(all.length - supported.length);
    setProgress(null);
    setMessage(null);
  }

  async function startUpload() {
    if (files.length === 0) return;
    setIsUploading(true);
    setMessage(null);
    try {
      const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
      const { batchId } = await uploadApi.start(eventId, files.length, totalBytes);
      onBatchStarted?.(batchId);

      const queue = startUploadQueue({
        files,
        concurrency: CONCURRENCY,
        chunkSize: CHUNK_SIZE,
        presign: (metas) => uploadApi.presign(eventId, batchId, metas).then((r) => r.uploads),
        confirm: (items) => uploadApi.confirm(eventId, batchId, items).then((r) => r.results),
        onProgress: setProgress,
      });
      cancelRef.current = queue.cancel;
      const outcome = await queue.done;
      if (outcome.fatalError) setMessage(outcome.fatalError);
      else if (outcome.cancelled) setMessage('Upload cancelled. Files already uploaded are kept.');
      onAllUploaded?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      cancelRef.current = null;
      setIsUploading(false);
    }
  }

  const fraction = progress && progress.bytesTotal > 0 ? progress.bytesSent / progress.bytesTotal : 0;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">Upload photos & videos</h3>
          <p className="text-sm text-ink-faint">Select every file from this shoot. Batches of thousands are fine.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={OWNER_ACCEPT}
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            Choose files
          </button>
          {isUploading ? (
            <button type="button" className="btn-secondary" onClick={() => cancelRef.current?.()}>
              Cancel
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={startUpload} disabled={files.length === 0 || allDone}>
              {allDone ? 'All uploaded' : `Upload ${files.length || ''}`.trim()}
            </button>
          )}
        </div>
      </div>

      {files.length > 0 && !progress && (
        <p className="mt-3 text-sm text-ink-soft">
          {files.length} files · {formatBytes(files.reduce((s, f) => s + f.size, 0))}
          {skipped > 0 && <span className="text-ink-faint"> · {skipped} unsupported files skipped</span>}
        </p>
      )}

      {progress && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="frame-tag text-ink-soft">
              {progress.done} / {progress.total} uploaded{progress.failed > 0 ? ` · ${progress.failed} failed` : ''}
            </span>
            <span className="frame-tag text-ink-faint">{Math.round(fraction * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
            <div className="h-full bg-mark transition-all duration-300" style={{ width: `${fraction * 100}%` }} />
          </div>
        </div>
      )}
      {message && <p className="mt-3 text-sm text-mark">{message}</p>}
    </div>
  );
}
