import { useState } from "react";
import type { Direction } from "../helpers/types";

export interface PriceFlash {
  direction: Exclude<Direction, "flat">;
  /** Changes on every tick, so a `key` on the flash element restarts its animation. */
  key: number;
}

/**
 * Which way the price last moved, for the row tint. Null until the first change,
 * so rows don't flash on mount. The fade itself is CSS (`animate-flash`), which
 * `prefers-reduced-motion` turns off.
 */
export function usePriceFlash(price: number | undefined): PriceFlash | null {
  const [previous, setPrevious] = useState(price);
  const [flash, setFlash] = useState<PriceFlash | null>(null);

  // Adjusting state while rendering (React's recommended pattern for "previous value").
  if (price !== previous) {
    setPrevious(price);
    if (price !== undefined && previous !== undefined && price !== previous) {
      setFlash({ direction: price > previous ? "up" : "down", key: (flash?.key ?? 0) + 1 });
    }
  }

  return flash;
}
