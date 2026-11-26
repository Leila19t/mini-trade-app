import type { Ticker } from "@mini-trade/contracts";
import { useState } from "react";
import starFilled from "../../assets/icons/star-filled.svg";
import starOutline from "../../assets/icons/star-outline.svg";

interface StarButtonProps {
  symbol: Ticker;
  starred: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Icon size: 20 in list rows, 24 in the phone nav bar. */
  size?: 20 | 24;
  className?: string;
}

/**
 * Watchlist star. The filled star cross-fades in and pops (spring) when the
 * user toggles it; reduced motion keeps only the cross-fade. The hit area is
 * padded beyond the icon, without changing the layout.
 */
export function StarButton({ symbol, starred, onToggle, disabled, size = 20, className = "" }: StarButtonProps) {
  // Bumped on each click: restarts the pop, and keeps it from playing on mount.
  const [pops, setPops] = useState(0);

  return (
    <button
      type="button"
      onClick={() => {
        setPops((n) => n + 1);
        onToggle();
      }}
      disabled={disabled}
      aria-pressed={starred}
      aria-label={starred ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      className={`-m-2 shrink-0 cursor-pointer rounded-md p-2 disabled:cursor-default ${className}`}
    >
      <span
        key={pops}
        className={`grid ${pops > 0 ? "animate-pop motion-reduce:animate-none" : ""}`}
        style={{ width: size, height: size }}
      >
        <img src={starOutline} alt="" width={size} height={size} className="col-start-1 row-start-1" />
        <img
          src={starFilled}
          alt=""
          width={size}
          height={size}
          className={`col-start-1 row-start-1 transition-opacity duration-150 ${starred ? "opacity-100" : "opacity-0"}`}
        />
      </span>
    </button>
  );
}
