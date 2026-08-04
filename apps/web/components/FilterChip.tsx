import type { ButtonHTMLAttributes } from "react";

export interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export function FilterChip({ label, active = false, className = "", ...rest }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`bq-chip ${className}`.trim()}
      data-active={active ? "true" : "false"}
      aria-pressed={active}
      {...rest}
    >
      {label}
    </button>
  );
}
