import React from 'react';
import { GalleryPhoto } from '../types';
import { PhotoThumbnail } from './PhotoThumbnail';
import { useInfiniteScrollTrigger } from '../hooks/useInfiniteScrollTrigger';

interface Props {
  items: GalleryPhoto[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpen: (photo: GalleryPhoto, index: number) => void;
  emptyLabel?: string;
  selecting?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (photo: GalleryPhoto) => void;
}

export function PhotoGrid({
  items,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onOpen,
  emptyLabel,
  selecting,
  selectedIds,
  onToggleSelect,
}: Props) {
  const sentinelRef = useInfiniteScrollTrigger(onLoadMore, hasMore && !loading);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-card bg-hairline/60" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-hairline py-24 text-center">
        <p className="font-display text-lg text-ink">{emptyLabel ?? 'No photos yet'}</p>
        <p className="text-sm text-ink-faint">Photos will appear here as soon as they're ready.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((photo, i) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            index={i}
            onOpen={onOpen}
            selecting={selecting}
            selected={selectedIds?.has(photo.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>

      {/* Sentinel for infinite scroll — see useInfiniteScrollTrigger */}
      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-card bg-hairline/60" />
          ))}
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="frame-tag mt-6 text-center text-ink-faint">— end of gallery — {items.length} photos —</p>
      )}
    </div>
  );
}
