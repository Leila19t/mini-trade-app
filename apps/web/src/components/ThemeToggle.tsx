import moon from "../assets/icons/moon.svg";
import sun from "../assets/icons/sun.svg";
import type { Theme } from "../helpers/types";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/** Light shows a moon (switch to dark); dark shows a sun (switch to light), as in Figma. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${next} theme`}
      className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-bg-surface transition-colors duration-120 hover:bg-bg-subtle"
    >
      <img src={theme === "dark" ? sun : moon} alt="" width={20} height={20} />
    </button>
  );
}
