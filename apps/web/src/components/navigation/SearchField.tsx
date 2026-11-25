import { useRef } from "react";
import searchIcon from "../../assets/icons/search.svg";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";

/** Stock search. Press "/" anywhere to focus it. Searching itself comes with the stock list. */
export function SearchField() {
  const inputRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcut("/", () => inputRef.current?.focus());

  return (
    <label className="group flex h-10 min-w-0 flex-[0_1_380px] cursor-text items-center gap-2 rounded-lg border border-border-strong bg-bg-canvas pr-2 pl-3 focus-within:border-brand-primary">
      <img src={searchIcon} alt="" width={16} height={16} />
      <span className="sr-only">Search stocks</span>
      <input
        ref={inputRef}
        type="search"
        placeholder="Search by name or symbol"
        autoComplete="off"
        aria-keyshortcuts="/"
        // The whole field shows focus (focus-within above), so the input itself doesn't.
        className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
      />
      {/* The hint is useless once you're typing, and on touch screens. */}
      <kbd
        aria-hidden="true"
        className="shrink-0 rounded-sm border border-border-strong bg-bg-surface px-1.5 py-px font-sans text-xs leading-[normal] font-medium text-text-muted group-focus-within:invisible pointer-coarse:hidden"
      >
        /
      </kbd>
    </label>
  );
}
