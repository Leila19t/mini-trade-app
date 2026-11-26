/** Chart area height (plot + date labels): 300px, 200px on phones. States without a chart use it so the card keeps its height. */
export const CHART_HEIGHT = "h-75 max-sm:h-50";

/** Grid lines behind the chart's loading and error states, so the card keeps its shape. */
export function EmptyGrid() {
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 flex h-69 flex-col justify-between max-sm:h-44">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="h-px bg-border-default" />
      ))}
    </div>
  );
}
