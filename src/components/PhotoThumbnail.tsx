import React, { useState } from 'react';
import { GalleryPhoto } from '../types';
import { frameNumber } from '../utils/format';

interface Props {
  photo: GalleryPhoto;
  index: number;
  onOpen: (photo: GalleryPhoto, index: number) => void;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (photo: GalleryPhoto) => void;
}

// Grid cell: loads only thumbnailUrl, never larger sizes, to keep the grid lightweight.
export function PhotoThumbnail({ photo, index, onOpen, selecting, selected, onToggleSelect }: Props) {
  const [loaded, setLoaded] = useState(false);
  const aspect = photo.width && photo.height ? photo.width / photo.height : 1;

  return (
    <button
      type="button"
      onClick={() => (selecting ? onToggleSelect?.(photo) : onOpen(photo, index))}
      className={`group relative block w-full overflow-hidden rounded-card bg-hairline/40 focus-visible:outline-mark ${
        selected ? 'ring-2 ring-mark ring-offset-2 ring-offset-paper' : ''
      }`}
      style={{ aspectRatio: aspect }}
      aria-label={selecting ? `Select photo ${frameNumber(index)}` : `Open photo ${frameNumber(index)}`}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-hairline/60" />}
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
      {selecting && (
        <span
          className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
            selected ? 'border-mark bg-mark text-white' : 'border-white/80 bg-black/30 text-transparent'
          }`}
        >
          ✓
        </span>
      )}
      <span className="frame-tag pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
        {frameNumber(index)}
      </span>
    </button>
  );
}
