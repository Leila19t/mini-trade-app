import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "../helpers/constants";
import type { Theme, ThemePreference } from "../helpers/types";

/*
 * Theme store: one module-level source of truth, so every component calling
 * useTheme() stays in sync without a provider. The applied theme is written to
 * <html data-theme>, which switches the tokens in tokens.css.
 * index.html runs the same logic inline before first paint, so there's no flash.
 */

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function isPreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : "system";
  } catch {
    return "system"; // storage blocked (private mode, sandboxed iframe)
  }
}

function resolve(preference: ThemePreference): Theme {
  if (preference !== "system") return preference;
  return darkQuery.matches ? "dark" : "light";
}

interface ThemeState {
  preference: ThemePreference;
  theme: Theme;
}

let state: ThemeState = { preference: readPreference(), theme: "light" };
state.theme = resolve(state.preference);
const listeners = new Set<() => void>();

function update(preference: ThemePreference) {
  const theme = resolve(preference);
  if (preference === state.preference && theme === state.theme) return;
  state = { preference, theme };
  document.documentElement.dataset.theme = theme;
  listeners.forEach((listener) => listener());
}

// OS theme changes matter while following the system.
darkQuery.addEventListener("change", () => update(state.preference));
// Another tab changed the theme.
window.addEventListener("storage", (event) => {
  if (event.key === THEME_STORAGE_KEY) update(readPreference());
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function setPreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not persisted, but still applied for this visit.
  }

  // Cross-fade the whole page with a View Transition; switch instantly when
  // the browser lacks support or the user prefers reduced motion.
  if (!document.startViewTransition || reducedMotionQuery.matches) {
    update(preference);
    return;
  }
  document.startViewTransition(() => update(preference));
}

/**
 * Current theme and how to change it.
 * - `theme`: what's on screen ("light" | "dark").
 * - `preference`: what the user chose; "system" follows the OS setting.
 * - `toggleTheme()`: switches to the opposite of what's on screen and remembers it.
 */
export function useTheme() {
  const { preference, theme } = useSyncExternalStore(subscribe, getSnapshot);

  return {
    theme,
    preference,
    setPreference,
    toggleTheme: () => setPreference(theme === "dark" ? "light" : "dark"),
  };
}
