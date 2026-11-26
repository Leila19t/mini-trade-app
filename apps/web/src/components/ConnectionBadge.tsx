import type { ConnectionStatus } from "../data/PriceSocket";
import { Pill } from "./Pill";

const variants = {
  live: { label: "Live", tone: "up", dot: "bg-price-up" },
  connecting: { label: "Connecting…", tone: "neutral", dot: "bg-text-muted" },
  reconnecting: { label: "Reconnecting…", tone: "warning", dot: "bg-warning-dot" },
  offline: { label: "Offline", tone: "down", dot: "bg-price-down" },
} as const;

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

/**
 * Shows whether live prices are flowing. The label always says the state, so it
 * never relies on colour. Announced politely when it changes.
 * (The reconnect countdown belongs to the stale-prices banner, not here.)
 */
export function ConnectionBadge({ status }: ConnectionBadgeProps) {
  const { label, tone, dot } = variants[status];

  return (
    <span role="status" className="inline-flex shrink-0">
      <Pill tone={tone}>
        <span aria-hidden className={`size-2 rounded-full ${dot}`} />
        {label}
      </Pill>
    </span>
  );
}
