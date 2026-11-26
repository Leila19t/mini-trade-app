import type { Direction } from "../../helpers/types";

const WIDTH = 100;
const HEIGHT = 32;
const PAD = 2; // keeps the 1.5px stroke inside the box

const strokes: Record<Direction, string> = {
  up: "stroke-price-up",
  down: "stroke-price-down",
  flat: "stroke-text-muted",
};

interface SparklineProps {
  values: readonly number[];
  direction: Direction;
  className?: string;
}

/** 24h trend line for a list row (100×32). Decorative: the change is shown as text next to it. */
export function Sparkline({ values, direction, className = "" }: SparklineProps) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const last = Math.max(1, values.length - 1);

  const points = values
    .map((value, i) => {
      const x = PAD + (i / last) * (WIDTH - PAD * 2);
      const y = PAD + (1 - (value - min) / span) * (HEIGHT - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={`shrink-0 ${className}`}
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={strokes[direction]}
      />
    </svg>
  );
}
