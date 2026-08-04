import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";
import { cartTotals, getOrCreateCart } from "@/lib/commerce/cart";
import { processPayment, paymentConfigured } from "@/lib/commerce/payments";
import { walletLabel } from "@/lib/commerce/wallet-label";
import { TRACKING_SEQUENCE, generateOrderNumber } from "@/lib/commerce/tracking";
import { z } from "zod";

const schema = z.object({
  shipToName: z.string().min(2),
  shipToAddress: z.string().min(3),
  shipToCity: z.string().min(2),
  shipToState: z.string().min(2),
  shipToZip: z.string().min(3),
  notes: z.string().optional(),
  projectId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  walletType: z
    .enum(["apple_pay", "google_pay", "card", "mock_apple_pay", "mock_google_pay", "mock_card"])
    .default("mock_card"),
  orderNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    const cart = await getOrCreateCart(user.companyId);

    if (!cart.items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const totals = cartTotals(cart.items);
    const orderNumber = body.orderNumber || generateOrderNumber();
    const amountCents = Math.round(totals.total * 100);

    const payment = await processPayment({
      amountCents,
      orderNumber,
      customerEmail: user.email,
      paymentMethodId: body.paymentMethodId,
      paymentIntentId: body.paymentIntentId,
      walletType: body.walletType,
    });

    if (payment.status !== "succeeded" && payment.mode === "live") {
      return NextResponse.json(
        {
          error: "Payment requires confirmation",
          clientSecret: payment.clientSecret,
          paymentIntentId: payment.paymentIntentId,
        },
        { status: 402 }
      );
    }

    const methodLabel = walletLabel(body.walletType);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        companyId: user.companyId,
        placedById: user.id,
        projectId: body.projectId || null,
        status: "IN_FULFILLMENT",
        trackingStep: "PAYMENT_CONFIRMED",
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paymentStatus: "paid",
        paymentMethod: body.walletType,
        paymentIntentId: payment.paymentIntentId,
        paidAt: new Date(),
        shipToName: body.shipToName,
        shipToAddress: body.shipToAddress,
        shipToCity: body.shipToCity,
        shipToState: body.shipToState,
        shipToZip: body.shipToZip,
        notes: body.notes || null,
        items: {
          create: cart.items.map((item) => ({
            packageId: item.packageId,
            name: item.package.name,
            category: item.package.category,
            quantity: item.quantity,
            unitPrice: item.package.unitPrice,
            lineTotal: Math.round(item.quantity * item.package.unitPrice * 100) / 100,
            spruceSku: item.package.spruceSku,
          })),
        },
        tracking: {
          create: [
            {
              step: TRACKING_SEQUENCE[0].step,
              label: TRACKING_SEQUENCE[0].label,
              detail: TRACKING_SEQUENCE[0].detail,
            },
            {
              step: TRACKING_SEQUENCE[1].step,
              label: TRACKING_SEQUENCE[1].label,
              detail:
                payment.mode === "mock"
                  ? `${methodLabel} demo payment succeeded. Add Stripe keys for live Apple Pay / Google Pay.`
                  : `Paid with ${methodLabel}.`,
            },
          ],
        },
      },
      include: {
        items: true,
        tracking: { orderBy: { createdAt: "asc" } },
      },
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return NextResponse.json({
      order,
      paymentMode: payment.mode,
      walletType: body.walletType,
      stripeConfigured: paymentConfigured(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
