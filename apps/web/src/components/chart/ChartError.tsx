import alertCircle from "../../assets/icons/alert-circle.svg";
import { Button } from "../Button";
import { CHART_HEIGHT, EmptyGrid } from "./EmptyGrid";

interface ChartErrorProps {
  /** e.g. "Couldn't load the 1M chart". */
  title: string;
  onRetry: () => void;
}

/** A chart that failed to load. The error stays inside the card; the rest of the page keeps working. */
export function ChartError({ title, onRetry }: ChartErrorProps) {
  return (
    <div className={`relative ${CHART_HEIGHT}`}>
      <EmptyGrid />
      <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-6 text-center">
        <img src={alertCircle} alt="" width={32} height={32} />
        <p className="text-base leading-[normal] font-semibold text-text-primary">{title}</p>
        <p className="text-sm leading-[normal] text-text-muted">The live price above is still updating.</p>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
