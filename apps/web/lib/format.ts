import type { ProjectStatus, ProposalStatus } from "@buildiq/types";

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSf(value: number | null | undefined): string {
  if (value == null) return "— sf";
  return `${value.toLocaleString("en-US")} sf`;
}

export function formatAddress(
  address?: string | null,
  city?: string | null,
  state?: string | null,
): string {
  const parts = [address, [city, state].filter(Boolean).join(", ")].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Address TBD";
}

export type BadgeTone = "draft" | "progress" | "success" | "danger";

export function projectStatusTone(status: ProjectStatus): BadgeTone {
  switch (status) {
    case "DRAFT":
    case "ARCHIVED":
      return "draft";
    case "ANALYZING":
    case "BIDDING":
    case "SYNCED":
      return "progress";
    case "ESTIMATED":
      return "success";
    default:
      return "draft";
  }
}

export function proposalStatusTone(status: ProposalStatus): BadgeTone {
  switch (status) {
    case "DRAFT":
    case "SUPERSEDED":
    case "EXPIRED":
      return "draft";
    case "SENT":
    case "VIEWED":
      return "progress";
    case "ACCEPTED":
      return "success";
    case "DECLINED":
      return "danger";
    default:
      return "draft";
  }
}

export function labelStatus(status: string): string {
  return status.replace(/_/g, " ");
}
