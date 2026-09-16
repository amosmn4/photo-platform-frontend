import React, { useEffect, useRef, useState } from 'react';
import { galleryApi } from '../api/gallery';
import { ApiClientError } from '../api/client';
import { GuestUploadSettings } from '../types';
import { startUploadQueue, UploadProgress } from '../utils/uploadQueue';
import { GUEST_ACCEPT, screenFiles } from '../utils/media';
import { readGuestKey, saveGuestKey } from '../utils/guestKey';
import { formatClipLimit, formatDate } from '../utils/format';
import { UploadIcon } from './MediaIcons';

interface Props {
  token: string;
  settings: GuestUploadSettings;
  onGuestKey: (key: string) => void;
  onUploaded: () => void;
}

type Phase = 'idle' | 'preparing' | 'uploading' | 'done';

// Phones: fewer parallel uploads and smaller chunks than the photographer's desktop uploader.
const CONCURRENCY = 4;
const CHUNK_SIZE = 12;

// Guest flow is deliberately one tap: pick files → they upload. No names, no accounts, no confirm step.
export function GuestUploader({ token, settings, onGuestKey, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'uploading') return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  // Reuses this browser's key if the server still knows it; otherwise gets a fresh one.
  async function ensureGuestKey(): Promise<string> {
    const existing = readGuestKey(token);
    if (existing) {
      try {
        await galleryApi.myUploads(token, existing, undefined, 1);
        return existing;
      } catch (err) {
        if (!(err instanceof ApiClientError && err.status === 401)) throw err;
        saveGuestKey(token, null);
      }
    }
    const { guestKey } = await galleryApi.issueGuestKey(token);
    saveGuestKey(token, guestKey);
    onGuestKey(guestKey);
    return guestKey;
  }

  async function handleSelected(list: FileList | null) {
    const selected = list ? Array.from(list) : [];
    if (inputRef.current) inputRef.current.value = '';
    if (selected.length === 0) return;

    setPhase('preparing');
    setProgress(null);
    setNote(null);
    try {
      const { accepted, skippedMessage } = await screenFiles(selected, settings);
      if (accepted.length === 0) {
        setNote(skippedMessage ?? 'Nothing to upload.');
        setPhase('done');
        return;
      }
      const guestKey = await ensureGuestKey();
      setPhase('uploading');
      const queue = startUploadQueue({
        files: accepted,
        concurrency: CONCURRENCY,
        chunkSize: CHUNK_SIZE,
        presign: (metas) => galleryApi.presign(token, guestKey, metas).then((r) => r.uploads),
        confirm: (items) => galleryApi.confirm(token, guestKey, items).then((r) => r.results),
        onProgress: setProgress,
      });
      cancelRef.current = queue.cancel;
      const outcome = await queue.done;

      const parts = [
        outcome.done > 0 ? `${outcome.done} uploaded — they'll appear in a moment.` : null,
        outcome.failed > 0 && !outcome.fatalError ? `${outcome.failed} couldn't be uploaded.` : null,
        outcome.cancelled ? 'Stopped.' : null,
        outcome.fatalError,
        skippedMessage,
      ];
      setNote(parts.filter(Boolean).join(' '));
      if (outcome.done > 0) onUploaded();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      cancelRef.current = null;
      setPhase('done');
    }
  }

  const busy = phase === 'preparing' || phase === 'uploading';
  const fraction = progress && progress.bytesTotal > 0 ? progress.bytesSent / progress.bytesTotal : 0;

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={GUEST_ACCEPT}
          className="hidden"
          onChange={(e) => handleSelected(e.target.files)}
        />
        <button
          type="button"
          className="btn-primary px-5 py-3 text-base"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <UploadIcon className="h-5 w-5" />
          Add your photos & videos
        </button>
        <p className="text-xs text-ink-faint">
          {settings.until ? `Open until ${formatDate(settings.until)}` : 'Open now'} · clips up to {formatClipLimit(settings.maxVideoSeconds)}
        </p>
      </div>

      {phase !== 'idle' && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-paper-raised/95 px-4 py-3 shadow-lift backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              {phase === 'preparing' && <p className="text-sm text-ink-soft">Getting your files ready…</p>}
              {phase === 'uploading' && (
                <>
                  <p className="mb-1.5 text-sm text-ink">
                    Uploading {Math.min((progress?.done ?? 0) + 1, progress?.total ?? 1)} of {progress?.total ?? '…'}
                    <span className="text-ink-faint"> · {Math.round(fraction * 100)}%</span>
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
                    <div className="h-full bg-mark transition-all duration-300" style={{ width: `${fraction * 100}%` }} />
                  </div>
                </>
              )}
              {phase === 'done' && <p className="text-sm text-ink">{note}</p>}
            </div>
            {phase === 'uploading' && (
              <button type="button" className="btn-secondary shrink-0 text-sm" onClick={() => cancelRef.current?.()}>
                Cancel
              </button>
            )}
            {phase === 'done' && (
              <button type="button" className="btn-ghost shrink-0 text-sm" onClick={() => setPhase('idle')}>
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
