/**
 * Building material takeoff package fulfillment sequence.
 * Orders advance through these steps after payment.
 */
export const TRACKING_SEQUENCE = [
  {
    step: "ORDER_RECEIVED",
    label: "Order received",
    detail: "Takeoff package order is in the system.",
  },
  {
    step: "PAYMENT_CONFIRMED",
    label: "Payment confirmed",
    detail: "Payment cleared — packages released to procurement.",
  },
  {
    step: "TAKEOFF_REVIEW",
    label: "Takeoff review",
    detail: "Quantities checked against plan takeoff / package scope.",
  },
  {
    step: "PROCUREMENT",
    label: "Procurement",
    detail: "Materials sourced from mill, manufacturer, or Spruce inventory.",
  },
  {
    step: "FABRICATION",
    label: "Fabrication / staging",
    detail: "Custom units fabricated; stock packages staged for ship.",
  },
  {
    step: "SHIPPED",
    label: "Shipped",
    detail: "Packages left the yard / plant for the job site.",
  },
  {
    step: "DELIVERED",
    label: "Delivered",
    detail: "Materials received on site — ready for install.",
  },
] as const;

export type TrackingStep = (typeof TRACKING_SEQUENCE)[number]["step"];

export function stepIndex(step: string) {
  const idx = TRACKING_SEQUENCE.findIndex((s) => s.step === step);
  return idx === -1 ? 0 : idx;
}

export function nextStep(step: string): TrackingStep | null {
  const idx = stepIndex(step);
  if (idx < 0 || idx >= TRACKING_SEQUENCE.length - 1) return null;
  return TRACKING_SEQUENCE[idx + 1].step;
}

export function stepMeta(step: string) {
  return TRACKING_SEQUENCE.find((s) => s.step === step) || TRACKING_SEQUENCE[0];
}

export function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 900 + 100);
  return `BQ-${stamp}-${rand}`;
}
