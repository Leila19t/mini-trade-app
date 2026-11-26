import type { ReactNode } from "react";

const iconBackgrounds = {
  star: "bg-accent-star-subtle",
  neutral: "bg-bg-subtle",
};

interface EmptyStateProps {
  /** Icon image (decorative), shown in a 56px circle. */
  icon: string;
  iconTone?: keyof typeof iconBackgrounds;
  title: string;
  children: ReactNode;
  /** Usually one Button. */
  action?: ReactNode;
}

/** Centered message card for empty and error states (Figma "Empty state"). */
export function EmptyState({ icon, iconTone = "neutral", title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border-default bg-bg-surface px-6 py-18 text-center max-sm:py-12">
      <div className={`flex size-14 items-center justify-center rounded-full ${iconBackgrounds[iconTone]}`}>
        <img src={icon} alt="" width={28} height={28} />
      </div>
      <h2 className="text-lg leading-[normal] font-semibold text-text-primary">{title}</h2>
      <p className="max-w-95 text-sm leading-[normal] text-text-muted">{children}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
