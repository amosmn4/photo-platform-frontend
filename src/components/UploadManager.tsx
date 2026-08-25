import React, { useCallback, useRef, useState } from 'react';
import { uploadApi } from '../api/events';
import { putFileToPresignedUrl } from '../api/client';
import { sha256Hex } from '../utils/checksum';

interface FileState {
  file: File;
  progress: number; // 0-1, upload progress
  status: 'queued' | 'uploading' | 'confirming' | 'done' | 'error';
  error?: string;
}

interface Props {
  eventId: string;
  onBatchStarted?: (batchId: string) => void;
  onAllUploaded?: () => void;
}

/**
 * Implements the async bulk-upload flow from the architecture doc: request
 * presigned URLs for the whole batch up front, PUT files directly to
 * storage in parallel (bounded concurrency), confirm each as it lands, and
 * surface a live "X / N uploaded" progress bar the whole time — the
 * photographer can navigate away and the batch keeps going server-side
 * once files are confirmed (processing continues independent of this tab).
 */
const CONCURRENCY = 4;

export function UploadManager({ eventId, onBatchStarted, onAllUploaded }: Props) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const overallProgress = files.length
    ? files.reduce((sum, f) => sum + (f.status === 'done' ? 1 : f.progress), 0) / files.length
    : 0;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  const handleFilesSelected = useCallback((selected: FileList | null) => {
    if (!selected) return;
    const next: FileState[] = Array.from(selected).map((file) => ({ file, progress: 0, status: 'queued' }));
    setFiles(next);
  }, []);

  async function startUpload() {
    if (files.length === 0) return;
    setIsUploading(true);

    const { batchId, uploads } = await uploadApi.start(
      eventId,
      files.map((f) => ({ filename: f.file.name, mimeType: f.file.type || 'image/jpeg', sizeBytes: f.file.size })),
    );
    onBatchStarted?.(batchId);

    const uploadByFilename = new Map(uploads.map((u) => [u.filename, u]));
    const queue = [...files.keys()];

    async function worker() {
      while (queue.length > 0) {
        const idx = queue.shift();
        if (idx === undefined) return;
        const target = uploadByFilename.get(files[idx].file.name);
        if (!target) {
          setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, status: 'error', error: 'No upload slot' } : f)));
          continue;
        }

        setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, status: 'uploading' } : f)));
        try {
          await putFileToPresignedUrl(target.uploadUrl, files[idx].file, (fraction) => {
            setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, progress: fraction } : f)));
          });

          setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, status: 'confirming' } : f)));
          const checksum = await sha256Hex(files[idx].file);
          await uploadApi.confirm(eventId, {
            batchId,
            storageKey: target.storageKey,
            originalFilename: files[idx].file.name,
            mimeType: target.mimeType,
            sizeBytes: target.sizeBytes,
            checksumSha256: checksum,
          });

          setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, status: 'done', progress: 1 } : f)));
        } catch (e) {
          setFiles((prev) =>
            prev.map((f, i) =>
              i === idx ? { ...f, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' } : f,
            ),
          );
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setIsUploading(false);
    onAllUploaded?.();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">Upload photos</h3>
          <p className="text-sm text-ink-faint">Select every file from this shoot — batches of thousands are fine.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/tiff"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            Choose files
          </button>
          <button type="button" className="btn-primary" onClick={startUpload} disabled={files.length === 0 || isUploading}>
            {isUploading ? 'Uploading…' : `Upload ${files.length || ''}`.trim()}
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="frame-tag text-ink-soft">
              {doneCount} / {files.length} uploaded{errorCount > 0 ? ` · ${errorCount} failed` : ''}
            </span>
            <span className="frame-tag text-ink-faint">{Math.round(overallProgress * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full bg-mark transition-all duration-300"
              style={{ width: `${overallProgress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
