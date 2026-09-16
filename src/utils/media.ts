import { formatClipLimit } from './format';

// What the backend accepts. HEIC is intentionally missing: leaving it out of <input accept> makes
// iPhones hand the page a JPEG instead, which the server can actually process.
const TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

const ACCEPTED = new Set(Object.values(TYPES_BY_EXTENSION));

export const GUEST_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm';
export const OWNER_ACCEPT = 'image/jpeg,image/png,image/webp,image/tiff,video/mp4,video/quicktime,video/webm';

// Some browsers leave File.type empty (notably for .mov on Windows), so fall back to the extension.
export function mimeTypeFor(file: File): string | null {
  if (ACCEPTED.has(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return TYPES_BY_EXTENSION[ext] ?? null;
}

export function isVideoFile(file: File) {
  return mimeTypeFor(file)?.startsWith('video/') ?? false;
}

// Reads a clip's duration locally so an over-long video is refused before uploading hundreds of MB.
export function videoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null); // unknown codec in this browser — let the server decide
    setTimeout(() => finish(null), 5000);
    video.src = url;
  });
}

export interface MediaLimits {
  maxPhotoBytes: number;
  maxVideoBytes: number;
  maxVideoSeconds: number;
}

// Splits a selection into uploadable files and a short, human reason for anything skipped.
export async function screenFiles(selected: File[], limits: MediaLimits) {
  const accepted: File[] = [];
  const skipped = { unsupported: 0, tooLarge: 0, tooLong: 0 };

  for (const file of selected) {
    const mime = mimeTypeFor(file);
    if (!mime) {
      skipped.unsupported++;
      continue;
    }
    const video = mime.startsWith('video/');
    if (file.size > (video ? limits.maxVideoBytes : limits.maxPhotoBytes)) {
      skipped.tooLarge++;
      continue;
    }
    if (video) {
      const seconds = await videoDurationSeconds(file);
      if (seconds !== null && seconds > limits.maxVideoSeconds + 0.5) {
        skipped.tooLong++;
        continue;
      }
    }
    accepted.push(file);
  }

  const reasons: string[] = [];
  if (skipped.unsupported) reasons.push(`${skipped.unsupported} not a supported photo or video`);
  if (skipped.tooLarge) reasons.push(`${skipped.tooLarge} too large`);
  if (skipped.tooLong) reasons.push(`${skipped.tooLong} longer than ${formatClipLimit(limits.maxVideoSeconds)}`);
  return { accepted, skippedMessage: reasons.length ? `Skipped ${reasons.join(', ')}.` : null };
}
