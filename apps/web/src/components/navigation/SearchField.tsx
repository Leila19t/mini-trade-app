import { useRef } from "react";
import searchIcon from "../../assets/icons/search.svg";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { useSearchQuery } from "../../hooks/useSearchQuery";

const variants = {
  /** In the app header (desktop): outlined, with the "/" hint. */
  header:
    "h-10 flex-[0_1_380px] border border-border-strong bg-bg-canvas pr-2 pl-3 focus-within:border-brand-primary",
  /** On the markets screen (phones): filled, full width. */
  inline: "h-9.5 w-full bg-bg-subtle px-3 focus-within:outline-2 focus-within:outline-brand-primary",
};

interface SearchFieldProps {
  variant?: keyof typeof variants;
}

/**
 * Stock search by name or symbol. The query lives in the URL (?q=), so the
 * header field and the phone field stay in sync. Press "/" anywhere to focus it.
 */
export function SearchField({ variant = "header" }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery } = useSearchQuery();
  // Only the header field owns the shortcut; on phones there's no keyboard to press it.
  useKeyboardShortcut("/", () => {
    if (variant === "header") inputRef.current?.focus();
  });

  return (
    <label className={`group flex min-w-0 cursor-text items-center gap-2 rounded-lg ${variants[variant]}`}>
      <img src={searchIcon} alt="" width={16} height={16} />
      <span className="sr-only">Search stocks</span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={variant === "header" ? "Search by name or symbol" : "Search stocks"}
        autoComplete="off"
        aria-keyshortcuts={variant === "header" ? "/" : undefined}
        // The whole field shows focus (focus-within above), so the input itself doesn't.
        className={`min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-muted ${
          variant === "header" ? "text-sm" : "text-[15px]"
        }`}
      />
      {/* The hint is useless once you're typing, and on touch screens. */}
      {variant === "header" && (
        <kbd
          aria-hidden="true"
          className="shrink-0 rounded-sm border border-border-strong bg-bg-surface px-1.5 py-px font-sans text-xs leading-[normal] font-medium text-text-muted group-focus-within:invisible pointer-coarse:hidden"
        >
          /
        </kbd>
      )}
    </label>
  );
}
