import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  action: z.enum(["submit", "decline"]),
  lineItems: z.array(z.object({ rfqLineItemId: z.string(), unitPrice: z.number().min(0) })).optional(),
  freight: z.number().min(0).optional().nullable(),
  freightIncluded: z.boolean().default(false),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
});

// Public, token-authenticated endpoint (brief §12) — deliberately outside withAuth
// since suppliers have no platform account. The token itself (24 random bytes,
// looked up by unique index) is the only credential; there is no tenant session.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const rfqSupplier = await prisma.rFQSupplier.findUnique({
    where: { secureToken: token },
    include: { rfq: { include: { lineItems: true } } },
  });
  if (!rfqSupplier) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.data.action === "decline") {
    await prisma.rFQSupplier.update({
      where: { id: rfqSupplier.id },
      data: { status: "declined", declinedAt: new Date() },
    });
    await prisma.rFQMessage.create({
      data: { rfqSupplierId: rfqSupplier.id, direction: "inbound", authorType: "supplier", body: "Declined to quote." },
    });
    return NextResponse.json({ ok: true });
  }

  const submitted = body.data.lineItems ?? [];
  const validIds = new Set(rfqSupplier.rfq.lineItems.map((li) => li.id));
  if (submitted.length === 0 || submitted.some((li) => !validIds.has(li.rfqLineItemId))) {
    return NextResponse.json({ error: "Line item prices are required and must match this RFQ" }, { status: 400 });
  }

  const freight = body.data.freightIncluded ? 0 : (body.data.freight ?? 0);
  let productTotal = 0;

  const quote = await prisma.quote.create({
    data: {
      rfqSupplierId: rfqSupplier.id,
      supplierId: rfqSupplier.supplierId,
      status: "received",
      freight: body.data.freight ?? null,
      freightIncluded: body.data.freightIncluded,
      leadTimeDays: body.data.leadTimeDays ?? null,
      paymentTerms: body.data.paymentTerms ?? null,
      warranty: body.data.warranty ?? null,
      sourceType: "portal",
      lineItems: {
        create: submitted.map((li) => {
          const rfqLineItem = rfqSupplier.rfq.lineItems.find((r) => r.id === li.rfqLineItemId)!;
          const extendedPrice = rfqLineItem.quantity * li.unitPrice;
          productTotal += extendedPrice;
          return {
            rfqLineItemId: li.rfqLineItemId,
            description: rfqLineItem.description,
            quantity: rfqLineItem.quantity,
            unitPrice: li.unitPrice,
            extendedPrice,
          };
        }),
      },
    },
    include: { lineItems: true },
  });

  const totalLandedCost = productTotal + freight;
  await prisma.quote.update({
    where: { id: quote.id },
    data: { productTotal, totalLandedCost },
  });

  await prisma.rFQSupplier.update({
    where: { id: rfqSupplier.id },
    data: { status: "responded", respondedAt: new Date() },
  });
  await prisma.rFQMessage.create({
    data: { rfqSupplierId: rfqSupplier.id, direction: "inbound", authorType: "supplier", body: "Quote submitted via supplier portal." },
  });
  await prisma.purchaseRequest.updateMany({
    where: { id: rfqSupplier.rfq.purchaseRequestId, status: { in: ["rfq_active"] } },
    data: { status: "quotes_received" },
  });

  return NextResponse.json({ ok: true, quoteId: quote.id });
}
