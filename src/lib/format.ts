export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyExact(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    ANALYZING: "Analyzing",
    ESTIMATED: "Estimated",
    BIDDING: "Bidding",
    SYNCED: "Synced to Spruce",
    ARCHIVED: "Archived",
    SENT: "Sent",
    AWARDED: "Awarded",
    DECLINED: "Declined",
  };
  return map[status] || status;
}
