import { ApiClientError, putFileToPresignedUrl } from '../api/client';
import { ConfirmUploadItem, ConfirmUploadResult, PresignedUpload, UploadFileMeta } from '../types';
import { sha256Hex } from './checksum';
import { mimeTypeFor } from './media';

export interface UploadProgress {
  total: number;
  done: number;
  failed: number;
  bytesTotal: number;
  bytesSent: number;
}

export interface UploadOutcome extends UploadProgress {
  cancelled: boolean;
  fatalError: string | null;
}

interface Options {
  files: File[];
  concurrency: number;
  chunkSize: number;
  presign: (files: UploadFileMeta[]) => Promise<PresignedUpload[]>;
  confirm: (items: ConfirmUploadItem[]) => Promise<ConfirmUploadResult[]>;
  onProgress: (progress: UploadProgress) => void;
}

// WebCrypto can only hash a whole ArrayBuffer; past this size (long videos) skip dedupe rather than
// risk running a phone out of memory.
const MAX_HASH_BYTES = 64 * 1024 * 1024;
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// An API 4xx other than 408/429 means the server said no (uploads closed, allowance used up, bad
// type) — retrying won't help. Storage PUT failures are plain Errors and always retried.
function isFatal(err: unknown) {
  return err instanceof ApiClientError && err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429;
}

async function withRetry<T>(fn: () => Promise<T>, signal: AbortSignal, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (signal.aborted || isFatal(err) || attempt >= attempts) throw err;
      await sleep(Math.min(8000, 400 * 2 ** attempt));
    }
  }
}

// Uploads straight to storage with bounded parallelism. URLs are presigned a small chunk at a time
// right before use (so none expire during a long upload) and confirms are batched, so 1,000 files
// cost ~40 API calls instead of 2,000. Failed files are retried with a fresh URL.
export function startUploadQueue(opts: Options): { done: Promise<UploadOutcome>; cancel: () => void } {
  const controller = new AbortController();
  const { signal } = controller;
  const files = opts.files;
  const sent = new Array<number>(files.length).fill(0);
  const progress: UploadProgress = {
    total: files.length,
    done: 0,
    failed: 0,
    bytesTotal: files.reduce((sum, f) => sum + f.size, 0),
    bytesSent: 0,
  };
  let fatalError: string | null = null;

  let reportScheduled = false;
  const report = () => {
    if (reportScheduled) return;
    reportScheduled = true;
    setTimeout(() => {
      reportScheduled = false;
      progress.bytesSent = sent.reduce((a, b) => a + b, 0);
      opts.onProgress({ ...progress });
    }, 200);
  };

  const pending = files.map((_, i) => i);
  const ready: { index: number; target: PresignedUpload }[] = [];
  const attempts = new Array<number>(files.length).fill(0);
  let presigning: Promise<void> | null = null;

  const markFailed = (indexes: number[], err: unknown) => {
    progress.failed += indexes.length;
    if (isFatal(err) && !fatalError) {
      fatalError = err instanceof Error ? err.message : 'Upload stopped';
      pending.length = 0;
    }
    report();
  };

  async function nextTarget() {
    for (;;) {
      if (signal.aborted) return null;
      const next = ready.shift();
      if (next) return next;
      if (pending.length === 0 && !presigning) return null;
      if (!presigning) {
        const chunk = pending.splice(0, opts.chunkSize);
        presigning = withRetry(
          () => opts.presign(chunk.map((i) => ({ filename: files[i].name, mimeType: mimeTypeFor(files[i])!, sizeBytes: files[i].size }))),
          signal,
        )
          .then((targets) => targets.forEach((target, k) => ready.push({ index: chunk[k], target })))
          .catch((err) => markFailed(chunk, err))
          .finally(() => {
            presigning = null;
          });
      }
      await presigning;
    }
  }

  const toConfirm: { index: number; item: ConfirmUploadItem }[] = [];
  let confirmChain: Promise<void> = Promise.resolve();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    const batch = toConfirm.splice(0, opts.chunkSize);
    if (batch.length === 0) return;
    confirmChain = confirmChain.then(async () => {
      try {
        const results = await withRetry(() => opts.confirm(batch.map((b) => b.item)), signal);
        const rejected = results.filter((r) => r.status === 'rejected').length;
        progress.done += results.length - rejected;
        progress.failed += rejected;
      } catch (err) {
        markFailed(batch.map((b) => b.index), err);
      }
      report();
    });
    if (toConfirm.length >= opts.chunkSize) flush();
  }

  async function worker() {
    for (;;) {
      const next = await nextTarget();
      if (!next) return;
      const file = files[next.index];
      try {
        await putFileToPresignedUrl(
          next.target.uploadUrl,
          file,
          next.target.mimeType,
          (loaded) => {
            sent[next.index] = loaded;
            report();
          },
          signal,
        );
        const checksumSha256 = file.size <= MAX_HASH_BYTES ? await sha256Hex(file) : null;
        toConfirm.push({
          index: next.index,
          item: {
            storageKey: next.target.storageKey,
            originalFilename: file.name,
            mimeType: next.target.mimeType,
            sizeBytes: file.size,
            checksumSha256,
          },
        });
        if (toConfirm.length >= opts.chunkSize) flush();
        else if (!flushTimer) flushTimer = setTimeout(flush, 1000);
      } catch (err) {
        if (signal.aborted) return;
        sent[next.index] = 0;
        attempts[next.index] += 1;
        if (attempts[next.index] < MAX_ATTEMPTS) {
          await sleep(1000 * attempts[next.index]);
          pending.push(next.index);
        } else {
          markFailed([next.index], err);
        }
      }
    }
  }

  const done = (async (): Promise<UploadOutcome> => {
    await Promise.all(Array.from({ length: Math.min(opts.concurrency, files.length) }, worker));
    while (toConfirm.length) flush();
    await confirmChain;
    progress.bytesSent = sent.reduce((a, b) => a + b, 0);
    opts.onProgress({ ...progress });
    return { ...progress, cancelled: signal.aborted, fatalError };
  })();

  return { done, cancel: () => controller.abort() };
}
