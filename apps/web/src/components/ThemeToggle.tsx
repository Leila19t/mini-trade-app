import moon from "../assets/icons/moon.svg";

interface ThemeToggleProps {
  onToggle?: () => void;
}

/** Light theme shows a moon (switch to dark). Wiring and the dark-mode sun icon come later. */
export function ThemeToggle({ onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Switch to dark theme"
      className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-bg-surface transition-colors duration-120 hover:bg-bg-subtle"
    >
      <img src={moon} alt="" width={20} height={20} />
    </button>
  );
}
