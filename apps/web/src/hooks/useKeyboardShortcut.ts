import { useEffect, useEffectEvent } from "react";

/** True when the user is typing somewhere, so single-key shortcuts must not fire. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Runs `onPress` when `key` is pressed without modifiers, unless the user is typing. */
export function useKeyboardShortcut(key: string, onPress: () => void) {
  const handle = useEffectEvent(onPress);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      event.preventDefault(); // don't type the "/" into the field we're about to focus
      handle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key]);
}
