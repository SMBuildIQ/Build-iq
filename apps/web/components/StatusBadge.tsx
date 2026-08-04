import type { BadgeTone } from "@/lib/format";

export interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function StatusBadge({ label, tone = "draft" }: StatusBadgeProps) {
  return <span className={`bq-badge bq-badge--${tone}`}>{label}</span>;
}
