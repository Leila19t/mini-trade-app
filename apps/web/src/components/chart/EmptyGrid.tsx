export const CHART_HEIGHT = "h-75 max-sm:h-50";

export function EmptyGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 flex h-69 flex-col justify-between max-sm:h-44"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="h-px bg-border-default" />
      ))}
    </div>
  );
}
