import Stripe from "stripe";

export function paymentConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function publishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
}

export type WalletType = "apple_pay" | "google_pay" | "card" | "mock_apple_pay" | "mock_google_pay" | "mock_card";

export type PaymentResult = {
  mode: "live" | "mock";
  paymentIntentId: string;
  clientSecret?: string | null;
  status: "succeeded" | "requires_payment_method" | "processing" | "requires_action";
  walletType?: string | null;
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Mock wallets only when explicitly allowed (never silent in production). */
export function mockPaymentsAllowed() {
  if (process.env.ALLOW_MOCK_PAYMENTS === "true") return true;
  if (process.env.NODE_ENV === "production") return false;
  return !paymentConfigured();
}

function rejectMockInProduction(): never {
  throw new Error(
    "Payments are not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, or ALLOW_MOCK_PAYMENTS=true for non-live testing."
  );
}

/** Create a PaymentIntent for Apple Pay / Google Pay / card confirmation on the client */
export async function createWalletPaymentIntent(input: {
  amountCents: number;
  currency?: string;
  orderNumber: string;
  customerEmail?: string;
}): Promise<PaymentResult> {
  const stripe = getStripe();
  if (!stripe) {
    if (!mockPaymentsAllowed()) rejectMockInProduction();
    return {
      mode: "mock",
      paymentIntentId: `pi_mock_${input.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}`,
      clientSecret: `mock_secret_${input.orderNumber}`,
      status: "requires_payment_method",
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: input.currency || "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderNumber: input.orderNumber,
      app: "buildiq",
    },
    receipt_email: input.customerEmail,
  });

  return {
    mode: "live",
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    status: "requires_payment_method",
  };
}

/** Confirm / finalize payment after wallet authorization */
export async function processPayment(input: {
  amountCents: number;
  currency?: string;
  orderNumber: string;
  customerEmail?: string;
  paymentMethodId?: string;
  paymentIntentId?: string;
  walletType?: WalletType;
}): Promise<PaymentResult> {
  const stripe = getStripe();
  const walletType = input.walletType || "card";

  if (!stripe || walletType.startsWith("mock_")) {
    if (!mockPaymentsAllowed()) rejectMockInProduction();
    if (process.env.NODE_ENV === "production" && walletType.startsWith("mock_") && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
      rejectMockInProduction();
    }
    return {
      mode: "mock",
      paymentIntentId:
        input.paymentIntentId ||
        `pi_mock_${walletType}_${input.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}`,
      status: "succeeded",
      walletType,
    };
  }

  if (input.paymentIntentId) {
    let intent = await stripe.paymentIntents.retrieve(input.paymentIntentId);

    if (intent.status === "requires_payment_method" && input.paymentMethodId) {
      intent = await stripe.paymentIntents.confirm(input.paymentIntentId, {
        payment_method: input.paymentMethodId,
        return_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/cart",
      });
    }

    if (intent.status === "succeeded") {
      return {
        mode: "live",
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        status: "succeeded",
        walletType,
      };
    }

    return {
      mode: "live",
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status === "requires_action" ? "requires_action" : "requires_payment_method",
      walletType,
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: input.currency || "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { orderNumber: input.orderNumber, walletType },
    receipt_email: input.customerEmail,
    ...(input.paymentMethodId
      ? {
          payment_method: input.paymentMethodId,
          confirm: true,
          return_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/cart",
        }
      : {}),
  });

  return {
    mode: "live",
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    status: intent.status === "succeeded" ? "succeeded" : "requires_payment_method",
    walletType,
  };
}
