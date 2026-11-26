import { formatTimeAgo } from "../helpers/utils";
import { useConnectionStatus } from "../hooks/useConnectionStatus";
import { useNow } from "../hooks/useNow";

export function ConnectionBanner() {
  const { status, retryAt, lastTickAt, retryNow } = useConnectionStatus();
  const paused =
    (status === "reconnecting" || status === "offline") && lastTickAt !== null;
  const now = useNow(1000, paused);

  if (!paused) return null;

  const seconds = retryAt === null ? 0 : Math.ceil((retryAt - now) / 1000);
  const countdown = seconds > 0 ? ` in ${seconds}s…` : "…";
  const ago = formatTimeAgo(lastTickAt, now);

  const title =
    status === "offline"
      ? `You're offline. Retrying${countdown}`
      : `Live prices paused. Reconnecting${countdown}`;
  const detail =
    status === "offline"
      ? `Prices below were last updated ${ago}. They'll update as soon as the connection is back.`
      : `Prices below were last updated ${ago} and may be out of date.`;

  return (
    <section
      aria-label="Connection"
      className="flex items-center gap-3 rounded-[10px] border border-warning-border bg-warning-subtle px-4 py-3 text-warning-text max-sm:items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[normal]">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[13px]">{detail}</p>
      </div>
      <button
        type="button"
        onClick={retryNow}
        className="shrink-0 cursor-pointer rounded-lg border border-warning-border bg-bg-surface px-3 py-1.75 text-[13px] leading-[normal] font-semibold transition-colors duration-120 hover:bg-warning-subtle"
      >
        Retry now
      </button>
    </section>
  );
}
