import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fullscreen for one element. Put `ref` on it; `toggle` enters or leaves
 * fullscreen. Esc (handled by the browser) also leaves. `supported` is false
 * where the Fullscreen API is missing or blocked, so callers can hide the button.
 */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supported = typeof document !== "undefined" && document.fullscreenEnabled === true;

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null && document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    const element = ref.current;
    if (!element || !supported) return;
    const action = document.fullscreenElement === element ? document.exitFullscreen() : element.requestFullscreen();
    // Rejected e.g. without a user gesture; nothing to undo.
    action.catch(() => undefined);
  }, [supported]);

  return { ref, isFullscreen, toggle, supported };
}
