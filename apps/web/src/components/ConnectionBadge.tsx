import dot from "../assets/icons/dot.svg";
import { Pill } from "./Pill";

/** Only "live" is designed so far; reconnecting / offline states come with the socket client. */
export type ConnectionStatus = "live";

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

/** Shows whether live prices are flowing. Announced politely when it changes. */
export function ConnectionBadge({ status }: ConnectionBadgeProps) {
  return (
    <span role="status" className="inline-flex shrink-0">
      <Pill tone="up">
        <img src={dot} alt="" width={8} height={8} />
        {status === "live" && "Live"}
      </Pill>
    </span>
  );
}
