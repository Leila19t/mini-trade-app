import type { Ticker } from "@mini-trade/contracts";
import { WatchButton } from "../components/stocks/WatchButton";
import { useWatchToggle } from "../hooks/useWatchToggle";

interface WatchBarProps {
  symbol: Ticker;
}

/** Phones only: full-width watch button stuck to the bottom of the screen, within thumb reach. */
export function WatchBar({ symbol }: WatchBarProps) {
  const { starred, toggle, ready } = useWatchToggle(symbol);

  return (
    <div className="sticky bottom-0 z-20 border-t border-border-default bg-bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
      <WatchButton starred={starred} onToggle={toggle} disabled={!ready} className="w-full" />
    </div>
  );
}
