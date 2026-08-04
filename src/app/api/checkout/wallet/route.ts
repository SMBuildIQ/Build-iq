import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { cartTotals, getOrCreateCart } from "@/lib/commerce/cart";
import {
  createWalletPaymentIntent,
  paymentConfigured,
  publishableKey,
} from "@/lib/commerce/payments";
import { generateOrderNumber } from "@/lib/commerce/tracking";

/** Prepare a PaymentIntent for Apple Pay / Google Pay on the client */
export async function POST(_req: NextRequest) {
  try {
    const user = await requireUser();
    const cart = await getOrCreateCart(user.companyId);
    if (!cart.items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const totals = cartTotals(cart.items);
    const orderNumber = generateOrderNumber();
    const amountCents = Math.round(totals.total * 100);

    const intent = await createWalletPaymentIntent({
      amountCents,
      orderNumber,
      customerEmail: user.email,
    });

    return NextResponse.json({
      orderNumber,
      amountCents,
      currency: "usd",
      totals,
      paymentIntentId: intent.paymentIntentId,
      clientSecret: intent.clientSecret,
      mode: intent.mode,
      stripeConfigured: paymentConfigured(),
      publishableKey: publishableKey(),
      country: "US",
      label: "BuildIQ material packages",
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({
      stripeConfigured: paymentConfigured(),
      publishableKey: publishableKey(),
      wallets: ["apple_pay", "google_pay"],
    });
  } catch (error) {
    return jsonError(error);
  }
}
