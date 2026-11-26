import type { ConnectionStatus } from "../../data/PriceSocket";
import { formatTimeAgo } from "../../helpers/utils";

const variants: Record<ConnectionStatus, { label: string; dot: string }> = {
  live: { label: "Live", dot: "bg-price-up" },
  connecting: { label: "Connecting…", dot: "bg-text-muted" },
  reconnecting: { label: "Reconnecting", dot: "bg-warning-dot" },
  offline: { label: "Offline", dot: "bg-price-down" },
};

interface LiveStatusProps {
  status: ConnectionStatus;
  /** When this price last changed (epoch ms). */
  updatedAt: number;
  now: number;
}

/** "● Live · updated just now" next to the big price. Phones show only the state. */
export function LiveStatus({ status, updatedAt, now }: LiveStatusProps) {
  const { label, dot } = variants[status];

  return (
    <span className="flex items-center gap-1.5 text-[13px] leading-[normal] whitespace-nowrap text-text-muted">
      <span aria-hidden className={`size-2 shrink-0 rounded-full max-sm:size-1.5 ${dot}`} />
      <span>
        {label}
        {status !== "connecting" && (
          <span className="max-sm:hidden"> · updated {formatTimeAgo(updatedAt, now)}</span>
        )}
      </span>
    </span>
  );
}
