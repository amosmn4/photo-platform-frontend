import { useEffect, useRef } from 'react';

/**
 * Fires `onIntersect` when the returned ref's element scrolls into view.
 * Used as the "load next page" trigger for the gallery grid: a sentinel div
 * sits after the last row of photos, and crossing into the viewport
 * triggers the next cursor-paginated fetch — the standard, cheap way to do
 * infinite scroll without a scroll-position listener.
 */
export function useInfiniteScrollTrigger(onIntersect: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { rootMargin: '800px 0px' }, // start loading well before the user hits bottom
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIntersect, enabled]);

  return sentinelRef;
}
