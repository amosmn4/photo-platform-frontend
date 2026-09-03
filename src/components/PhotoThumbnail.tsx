import React, { useState } from 'react';
import { GalleryPhoto } from '../types';
import { frameNumber } from '../utils/format';
import { DownloadIcon } from './DownloadIcon';

interface Props {
  photo: GalleryPhoto;
  index: number;
  onOpen: (photo: GalleryPhoto, index: number) => void;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (photo: GalleryPhoto) => void;
  onDownload?: (photo: GalleryPhoto) => void;
}

// Grid cell: loads only thumbnailUrl, never larger sizes, to keep the grid lightweight.
export function PhotoThumbnail({ photo, index, onOpen, selecting, selected, onToggleSelect, onDownload }: Props) {
  const [loaded, setLoaded] = useState(false);
  const aspect = photo.width && photo.height ? photo.width / photo.height : 1;
  const activate = () => (selecting ? onToggleSelect?.(photo) : onOpen(photo, index));

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
      className={`group relative block w-full cursor-pointer overflow-hidden rounded-card bg-hairline/40 focus-visible:outline-mark ${
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
      {!selecting && onDownload && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(photo);
          }}
          aria-label={`Download photo ${frameNumber(index)}`}
          title="Download"
          className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/75 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <DownloadIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
