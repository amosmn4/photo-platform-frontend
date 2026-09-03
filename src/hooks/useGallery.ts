import { useCallback, useEffect, useRef, useState } from 'react';
import { GalleryPhoto } from '../types';

interface UseGalleryOptions {
  fetchPage: (cursor?: string) => Promise<{ items: GalleryPhoto[]; nextCursor: string | null }>;
  resetKey?: string;
}

// Owns paginated photo list and cursor state, kept separate from rendering for a pure PhotoGrid.
export function useGallery({ fetchPage, resetKey }: UseGalleryOptions) {
  const [items, setItems] = useState<GalleryPhoto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage(undefined);
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || inFlight.current) return;
    inFlight.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more photos');
    } finally {
      setLoadingMore(false);
      inFlight.current = false;
    }
  }, [fetchPage, nextCursor]);

  return { items, loading, loadingMore, error, hasMore: nextCursor !== null, loadMore, reload: loadFirstPage };
}
