/**
 * jsdom has no `matchMedia`. This fake answers min-width / max-width queries
 * from a viewport width that tests can change, and notifies listeners when
 * it does, so hooks like useMediaQuery re-render as they would in a browser.
 */

const DEFAULT_WIDTH = 1280;
let width = DEFAULT_WIDTH;
const listeners = new Set<() => void>();

function matches(query: string): boolean {
  const min = /\(min-width:\s*(\d+)px\)/.exec(query);
  if (min) return width >= Number(min[1]);
  const max = /\(max-width:\s*(\d+)px\)/.exec(query);
  if (max) return width <= Number(max[1]);
  return false; // prefers-color-scheme, prefers-reduced-motion...: off
}

function fakeMatchMedia(query: string): MediaQueryList {
  const list = {
    media: query,
    get matches() {
      return matches(query);
    },
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  };
  return list as unknown as MediaQueryList;
}

export function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: fakeMatchMedia });
}

/** Resizes the fake viewport and tells every media query listener. Wrap in `act`. */
export function setViewportWidth(next: number) {
  width = next;
  listeners.forEach((listener) => listener());
}

export function resetViewport() {
  width = DEFAULT_WIDTH;
}
