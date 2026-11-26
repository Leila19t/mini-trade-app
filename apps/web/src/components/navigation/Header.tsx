import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import { useTheme } from "../../hooks/useTheme";
import { ConnectionBadge } from "../ConnectionBadge";
import { Brand } from "../navigation/Brand";
import { SearchField } from "../navigation/SearchField";
import { Pill } from "../Pill";
import { ThemeToggle } from "../ThemeToggle";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { status } = useConnectionStatus();

  return (
    <header className="h-16 border-b border-border-default bg-bg-surface">
      <div className="mx-auto flex h-full max-w-page items-center gap-4 px-6 max-sm:gap-3 max-sm:px-4">
        <Brand />
        {/* Two flexible spacers keep the search centred between the brand and the actions. */}
        <div className="min-w-0 flex-1" />
        <div className="contents max-sm:hidden">
          <SearchField />
        </div>
        <div className="min-w-0 flex-1" />
        <div className="flex shrink-0 max-lg:hidden">
          <Pill>Simulated data</Pill>
        </div>
        <ConnectionBadge status={status} />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
    </header>
  );
}
