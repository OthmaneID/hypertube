import { useCallback, useEffect, useRef, useState } from "react";

const PRELOAD_MARGIN = 300;
// With strict filters a fetched page can add nothing visible; stop chaining requests after this many
const MAX_LOADS_WITHOUT_NEW_ITEMS = 10;

interface Options {
  loadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  // Number of items actually rendered (after filters)
  itemCount: number;
  // Changing it (new query, filters, mode) restarts the empty-page budget
  resetKey: string;
}

export function useInfiniteScroll({ loadMore, isLoading, hasMore, itemCount, resetKey }: Options) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const lastCountRef = useRef(0);
  const loadsWithoutNewItemsRef = useRef(0);
  const [stalled, setStalled] = useState(false);
  const [resumeTick, setResumeTick] = useState(0);

  useEffect(() => {
    lastCountRef.current = 0;
    loadsWithoutNewItemsRef.current = 0;
    setStalled(false);
  }, [resetKey]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { root: document.getElementById("scrollContainer"), rootMargin: `${PRELOAD_MARGIN}px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // The observer only fires when the sentinel crosses the viewport edge, so if a load leaves it
  // visible (filters hid the new items, or the screen is tall) nothing would request the next page
  useEffect(() => {
    if (isLoading || !hasMore) return;
    if (itemCount > lastCountRef.current) loadsWithoutNewItemsRef.current = 0;
    lastCountRef.current = itemCount;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const container = document.getElementById("scrollContainer");
    const viewportBottom = container ? container.getBoundingClientRect().bottom : window.innerHeight;
    if (sentinel.getBoundingClientRect().top > viewportBottom + PRELOAD_MARGIN) return;

    if (loadsWithoutNewItemsRef.current >= MAX_LOADS_WITHOUT_NEW_ITEMS) {
      setStalled(true);
      return;
    }
    loadsWithoutNewItemsRef.current += 1;
    loadMoreRef.current();
  }, [isLoading, hasMore, itemCount, resetKey, resumeTick]);

  const resume = useCallback(() => {
    loadsWithoutNewItemsRef.current = 0;
    setStalled(false);
    setResumeTick((n) => n + 1);
  }, []);

  return { sentinelRef, stalled: stalled && hasMore, resume };
}
