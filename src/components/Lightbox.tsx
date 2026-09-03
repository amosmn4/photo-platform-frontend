import React, { useEffect, useState, useCallback } from 'react';
import { GalleryPhoto } from '../types';
import { frameNumber, formatDateTime } from '../utils/format';
import { DownloadIcon } from './DownloadIcon';

interface Props {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onDownload?: (photo: GalleryPhoto) => void;
}

// Progressively loads thumbnail, then medium, then large — never the original just to view a photo.
export function Lightbox({ photos, index, onClose, onIndexChange, onDownload }: Props) {
  const photo = photos[index];
  const [largeLoaded, setLargeLoaded] = useState(false);

  useEffect(() => setLargeLoaded(false), [photo?.id]);

  const goNext = useCallback(() => {
    if (index < photos.length - 1) onIndexChange(index + 1);
  }, [index, photos.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${frameNumber(index)}`}
      className="fixed inset-0 z-50 flex flex-col bg-ink/95"
    >
      <header className="flex items-center justify-between px-4 py-3 text-white/90">
        <div className="flex items-center gap-3">
          <span className="frame-tag text-white/80">{frameNumber(index)}</span>
          <span className="text-xs text-white/50">{formatDateTime(photo.takenAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(photo)}
              aria-label="Download original"
              title="Download original"
              className="rounded-card border border-white/20 p-2 text-white hover:bg-white/10"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-card px-3 py-1.5 text-xl leading-none text-white/80 hover:bg-white/10"
          >
            &times;
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2">
        {index > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous photo"
            className="absolute left-2 z-10 rounded-full bg-black/40 p-3 text-white hover:bg-black/60"
          >
            ‹
          </button>
        )}

        <div className="relative max-h-full max-w-full">
          {photo.mediumUrl && (
            <img
              src={photo.mediumUrl}
              alt=""
              className="max-h-[85vh] max-w-[92vw] rounded-sm object-contain"
            />
          )}
          {photo.largeUrl && (
            <img
              src={photo.largeUrl}
              alt=""
              onLoad={() => setLargeLoaded(true)}
              className={`absolute inset-0 h-full w-full rounded-sm object-contain transition-opacity duration-300 ${
                largeLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>

        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Next photo"
            className="absolute right-2 z-10 rounded-full bg-black/40 p-3 text-white hover:bg-black/60"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
