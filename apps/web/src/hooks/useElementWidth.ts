import { useCallback, useSyncExternalStore, type RefObject } from "react";

/**
 * An element's width in px, kept current with a ResizeObserver. 0 before layout.
 * useSyncExternalStore re-reads the width right after subscribing, so the first
 * real size is there on mount without waiting for the observer's first callback.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const element = ref.current;
      if (!element) return () => {};
      const observer = new ResizeObserver(onChange);
      observer.observe(element);
      return () => observer.disconnect();
    },
    [ref],
  );

  return useSyncExternalStore(
    subscribe,
    () => ref.current?.clientWidth ?? 0,
    () => 0,
  );
}
