import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { runThreeWayMatch } from "@/lib/invoiceMatching";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  supplierInvoiceNumber: z.string().optional().nullable(),
  amount: z.number().min(0),
  freight: z.number().min(0).optional().nullable(),
  tax: z.number().min(0).optional().nullable(),
  lineItems: z
    .array(z.object({ purchaseOrderLineItemId: z.string(), quantity: z.number().min(0), unitPrice: z.number().min(0) }))
    .min(1),
});

export const GET = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "invoice:manage");
  const po = await prisma.purchaseOrder.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!po) throw new NotFoundError("Purchase order not found");

  const invoices = await prisma.invoice.findMany({
    where: { purchaseOrderId: po.id },
    include: { lineItems: true, matchExceptions: true },
    orderBy: { receivedAt: "desc" },
  });
  return NextResponse.json({ invoices });
});

export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "invoice:manage");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { lineItems: true },
  });
  if (!po) throw new NotFoundError("Purchase order not found");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));
  const input = body.data;

  const validIds = new Set(po.lineItems.map((li) => li.id));
  if (input.lineItems.some((li) => !validIds.has(li.purchaseOrderLineItemId))) {
    throw new ValidationError("Line items must belong to this purchase order");
  }

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: ctx.organizationId,
      purchaseOrderId: po.id,
      supplierInvoiceNumber: input.supplierInvoiceNumber ?? null,
      amount: input.amount,
      freight: input.freight ?? null,
      tax: input.tax ?? null,
      lineItems: {
        create: input.lineItems.map((li) => {
          const poLine = po.lineItems.find((l) => l.id === li.purchaseOrderLineItemId)!;
          return {
            purchaseOrderLineItemId: li.purchaseOrderLineItemId,
            description: poLine.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.quantity * li.unitPrice,
          };
        }),
      },
    },
  });

  await runThreeWayMatch(invoice.id);

  // brief §24: realizedSavings = initial qualified quote minus the final invoice
  // amount — only ever set once an invoice actually exists, never estimated.
  const savings = await prisma.savingsRecord.findUnique({ where: { purchaseRequestId: po.purchaseRequestId } });
  if (savings?.initialQuoteTotal != null) {
    await prisma.savingsRecord.update({
      where: { purchaseRequestId: po.purchaseRequestId },
      data: {
        finalInvoiceAmount: input.amount,
        realizedSavings: savings.initialQuoteTotal - input.amount,
      },
    });
  }

  const result = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoice.id },
    include: { lineItems: true, matchExceptions: true },
  });

  await writeAuditLog(ctx, {
    action: "invoice.record",
    entityType: "Invoice",
    entityId: invoice.id,
    after: { amount: input.amount, status: result.status, exceptionCount: result.matchExceptions.length },
  });

  return NextResponse.json({ invoice: result }, { status: 201 });
});
