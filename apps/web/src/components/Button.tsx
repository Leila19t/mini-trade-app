import type { ButtonHTMLAttributes } from "react";

const variants = {
  /** Brand-green call to action, e.g. "Browse all stocks". */
  primary: "bg-brand-primary px-4 py-2.5 text-brand-on-primary hover:opacity-90",
  /** Outlined, e.g. "Try again". */
  secondary: "border border-border-strong bg-bg-surface px-3.5 py-2 text-text-primary hover:bg-bg-subtle",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

/** Text button. Icon buttons (star, theme) have their own components. */
export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-sm leading-[normal] font-semibold whitespace-nowrap transition-[background-color,opacity] duration-120 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
