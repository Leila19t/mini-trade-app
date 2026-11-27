import type { ReactNode, Ref } from "react";

interface ChartCardProps {
  loading: boolean;

  fullscreen?: boolean;
  ref?: Ref<HTMLElement>;
  children: ReactNode;
}

export function ChartCard({
  loading,
  fullscreen = false,
  ref,
  children,
}: ChartCardProps) {
  return (
    <section
      ref={ref}
      aria-label="Price chart"
      className={`relative flex flex-col gap-4 overflow-hidden bg-bg-surface ${
        fullscreen
          ? "h-full p-6"
          : "rounded-xl border border-border-default p-5 max-sm:gap-3.5 max-sm:overflow-visible max-sm:rounded-none max-sm:border-0 max-sm:p-0"
      }`}
    >
      {loading && (
        <div
          role="progressbar"
          aria-label="Loading chart"
          className="absolute inset-x-0 top-0 h-0.5 overflow-hidden max-sm:-top-2"
        >
          <span className="block h-full w-2/5 animate-progress bg-brand-primary motion-reduce:animate-none" />
        </div>
      )}
      {children}
    </section>
  );
}
