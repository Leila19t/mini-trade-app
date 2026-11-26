import { useSyncExternalStore } from "react";
import { TOAST_DURATION_MS } from "../helpers/constants";

/*
 * Toast store: module-level, like useTheme, so anything (including mutation
 * callbacks that outlive the component that started them) can show a toast
 * without a provider. One toast at a time: a new one replaces the old.
 */

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

let current: Toast | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function dismissToast() {
  clearTimeout(timer);
  if (!current) return;
  current = null;
  emit();
}

/** Shows a toast for a few seconds, e.g. `showToast("Removed MSFT", { label: "Undo", onAction })`. */
export function showToast(message: string, action?: ToastAction) {
  clearTimeout(timer);
  current = { id: nextId++, message, action };
  emit();
  timer = setTimeout(dismissToast, TOAST_DURATION_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The toast on screen, or null. */
export function useToast() {
  return useSyncExternalStore(subscribe, () => current);
}
