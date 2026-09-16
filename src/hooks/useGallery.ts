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
  // Each first-page load gets a new generation; a response from an older one (e.g. the tab the user just
  // left) is dropped, so a slow request can never overwrite the list the user switched to.
  const generation = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage(undefined);
      if (current !== generation.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : 'Failed to load photos');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || inFlight.current) return;
    const current = generation.current;
    inFlight.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      if (current !== generation.current) return;
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : 'Failed to load more photos');
    } finally {
      setLoadingMore(false);
      inFlight.current = false;
    }
  }, [fetchPage, nextCursor]);

  // Drops one item in place (e.g. after a delete) without refetching and losing the scroll position.
  const removeItem = useCallback((id: string) => setItems((prev) => prev.filter((p) => p.id !== id)), []);

  return { items, loading, loadingMore, error, hasMore: nextCursor !== null, loadMore, reload: loadFirstPage, removeItem };
}
