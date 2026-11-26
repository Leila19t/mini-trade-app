import { CHART_HEIGHT, EmptyGrid } from "./EmptyGrid";

/** First load of a chart: grid lines and a pulsing block, in the chart's own size. */
export function ChartLoading() {
  return (
    <div aria-busy className={`relative ${CHART_HEIGHT}`}>
      <EmptyGrid />
      <span className="sr-only">Loading chart</span>
      <div className="absolute inset-x-0 bottom-6 h-1/2 animate-pulse rounded-lg bg-bg-subtle motion-reduce:animate-none" />
    </div>
  );
}
