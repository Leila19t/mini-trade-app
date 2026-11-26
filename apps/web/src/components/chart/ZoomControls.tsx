import minus from "../../assets/icons/minus.svg";
import plus from "../../assets/icons/plus.svg";
import reset from "../../assets/icons/reset.svg";
import { ChartIconButton } from "./ChartIconButton";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

/** Zoom out / in / back to the latest candles, floating over the Pro chart's top-left corner. */
export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div
      role="group"
      aria-label="Zoom"
      className="absolute top-1 left-1 z-10 flex gap-0.5 rounded-lg border border-border-default bg-bg-surface p-0.5"
    >
      <ChartIconButton icon={minus} label="Zoom out (−)" aria-keyshortcuts="-" onClick={onZoomOut} />
      <ChartIconButton icon={plus} label="Zoom in (+)" aria-keyshortcuts="+" onClick={onZoomIn} />
      <ChartIconButton icon={reset} label="Reset view (0)" aria-keyshortcuts="0" onClick={onReset} />
    </div>
  );
}
