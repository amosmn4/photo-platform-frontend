import React, { useState } from 'react';
import { GalleryPhoto } from '../types';
import { formatDuration, frameNumber } from '../utils/format';
import { DownloadIcon } from './DownloadIcon';
import { PlayIcon, TrashIcon } from './MediaIcons';

interface Props {
  photo: GalleryPhoto;
  index: number;
  onOpen: (photo: GalleryPhoto, index: number) => void;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (photo: GalleryPhoto) => void;
  onDownload?: (photo: GalleryPhoto) => void;
  onDelete?: (photo: GalleryPhoto) => void;
}

// Corner buttons are always visible on touch screens (no hover there) and fade in on hover elsewhere.
const cornerButton =
  'absolute flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition-opacity hover:bg-black/75 focus-visible:opacity-100 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100';

// Grid cell: loads only thumbnailUrl, never larger sizes, to keep the grid lightweight.
export function PhotoThumbnail({ photo, index, onOpen, selecting, selected, onToggleSelect, onDownload, onDelete }: Props) {
  const [loaded, setLoaded] = useState(false);
  const isReady = photo.status === 'ready';
  const activate = () => {
    if (selecting) onToggleSelect?.(photo);
    else if (isReady) onOpen(photo, index);
  };
  const label = photo.mediaType === 'video' ? 'video' : 'photo';

  // Every cell is the same square, whatever shape the photo is: the grid stays even and nothing shifts
  // as images load. The picture is cropped to fill it, and opens uncropped in the viewer.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
      className={`group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-card bg-hairline/40 focus-visible:outline-mark ${
        selected ? 'ring-2 ring-mark ring-offset-2 ring-offset-paper' : ''
      }`}
      aria-label={selecting ? `Select ${label} ${frameNumber(index)}` : `Open ${label} ${frameNumber(index)}`}
    >
      {!loaded && isReady && <div className="absolute inset-0 animate-pulse bg-hairline/60" />}
      {photo.thumbnailUrl && (
        <img
          src={photo.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
          {photo.status === 'failed' ? (
            <>
              <span className="text-xs font-medium text-mark">Couldn't process</span>
              <span className="text-[11px] text-ink-faint">Remove it and try another file</span>
            </>
          ) : (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-hairline border-t-ink-soft" />
              <span className="text-[11px] text-ink-faint">Processing…</span>
            </>
          )}
        </div>
      )}

      {photo.mediaType === 'video' && isReady && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
          <PlayIcon className="h-3 w-3" />
          {formatDuration(photo.durationMs)}
        </span>
      )}

      {selecting && (
        <span
          className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
            selected ? 'border-mark bg-mark text-white' : 'border-white/80 bg-black/30 text-transparent'
          }`}
        >
          ✓
        </span>
      )}
      {isReady && (
        <span className="frame-tag pointer-events-none absolute bottom-1.5 left-1.5 hidden rounded bg-black/55 px-1.5 py-0.5 text-white/90 opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
          {frameNumber(index)}
        </span>
      )}
      {!selecting && onDelete && photo.isMine && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(photo);
          }}
          aria-label={`Delete your ${label}`}
          title="Delete"
          className={`${cornerButton} right-1.5 top-1.5`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
      {!selecting && onDownload && isReady && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(photo);
          }}
          aria-label={`Download ${label} ${frameNumber(index)}`}
          title="Download"
          className={`${cornerButton} bottom-1.5 right-1.5`}
        >
          <DownloadIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
