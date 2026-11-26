import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs` while `enabled`. For countdowns
 * and "updated 12 seconds ago": only the component that calls it re-renders.
 */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    // Refresh right away (the stored time may be old if this was disabled), then on the interval.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [intervalMs, enabled]);

  return now;
}
