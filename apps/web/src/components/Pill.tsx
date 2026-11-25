import type { ReactNode } from "react";

const tones = {
  neutral: "bg-bg-subtle text-text-muted",
  /** Good news: same colours as a rising price. */
  up: "bg-price-up-subtle text-price-up",
};

interface PillProps {
  tone?: keyof typeof tones;
  children: ReactNode;
}

/** Small rounded label, e.g. "Simulated data". */
export function Pill({ tone = "neutral", children }: PillProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.25 text-xs leading-[normal] font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
