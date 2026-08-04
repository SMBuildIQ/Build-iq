import Stripe from "stripe";

export type PaymentResult = {
  mode: "live" | "mock";
  paymentIntentId: string;
  clientSecret?: string | null;
  status: "succeeded" | "requires_payment_method" | "processing";
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Charge an order — uses Stripe when STRIPE_SECRET_KEY is set, otherwise mock success */
export async function processPayment(input: {
  amountCents: number;
  currency?: string;
  orderNumber: string;
  customerEmail?: string;
  paymentMethodId?: string;
}): Promise<PaymentResult> {
  const stripe = getStripe();

  if (!stripe) {
    return {
      mode: "mock",
      paymentIntentId: `pi_mock_${input.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}`,
      status: "succeeded",
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: input.currency || "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { orderNumber: input.orderNumber },
    receipt_email: input.customerEmail,
    ...(input.paymentMethodId
      ? { payment_method: input.paymentMethodId, confirm: true, return_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" }
      : {}),
  });

  return {
    mode: "live",
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    status: intent.status === "succeeded" ? "succeeded" : "requires_payment_method",
  };
}

export function paymentConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
