import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "inverse" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  compact?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  compact = false,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "bq-btn",
    `bq-btn--${variant}`,
    compact ? "bq-btn--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
