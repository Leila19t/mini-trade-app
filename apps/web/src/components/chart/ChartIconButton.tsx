import type { ButtonHTMLAttributes } from "react";

interface ChartIconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  icon: string;

  label: string;
}

export function ChartIconButton({
  icon,
  label,
  className = "",
  ...props
}: ChartIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-120 hover:bg-bg-subtle disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
      {...props}
    >
      <img src={icon} alt="" width={16} height={16} />
    </button>
  );
}
