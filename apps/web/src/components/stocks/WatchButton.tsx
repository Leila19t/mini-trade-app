import starFilled from "../../assets/icons/star-filled.svg";
import starOutline from "../../assets/icons/star-outline.svg";

interface WatchButtonProps {
  starred: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

/** "Add to watchlist" / "In watchlist" on the detail page. Mirrors the list star. */
export function WatchButton({ starred, onToggle, disabled, className = "" }: WatchButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={starred}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border py-2.5 pr-4 pl-3.5 text-sm leading-[normal] font-semibold whitespace-nowrap text-text-primary transition-colors duration-120 disabled:cursor-default ${
        starred
          ? "border-accent-star-border bg-accent-star-subtle"
          : "border-border-strong bg-bg-surface hover:bg-bg-subtle"
      } ${className}`}
    >
      <img src={starred ? starFilled : starOutline} alt="" width={20} height={20} />
      {starred ? "In watchlist" : "Add to watchlist"}
    </button>
  );
}
