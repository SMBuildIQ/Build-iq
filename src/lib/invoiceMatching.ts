import { prisma } from "@/lib/db";
import { notifyRole, notifyUser } from "@/lib/notifications";

// Three-way match: PO vs Receipt vs Invoice (brief §23). Pure, deterministic —
// no AI involved in deciding whether a discrepancy exists, only in eventually
// summarizing one for a human (not built yet). Returns the exception rows it
// wrote so the caller (the record-invoice route) can render them immediately.

const CENTS_TOLERANCE = 0.01;

export async function runThreeWayMatch(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      lineItems: true,
      purchaseOrder: {
        include: {
          lineItems: { include: { receiptLineItems: true } },
          purchaseRequest: true,
        },
      },
    },
  });
  const po = invoice.purchaseOrder;
  if (!po) return;

  const exceptions: {
    type: string;
    expected: number | null;
    actual: number | null;
    difference: number | null;
    detail: string;
  }[] = [];

  // Unauthorized freight: the quote/PO carried no freight charge (freight
  // included in unit pricing), but the invoice bills freight anyway.
  if ((invoice.freight ?? 0) > 0 && !(po.freight && po.freight > 0)) {
    exceptions.push({
      type: "unauthorized_freight",
      expected: 0,
      actual: invoice.freight,
      difference: invoice.freight,
      detail: "Supplier added freight even though the negotiated quote specified freight included.",
    });
  }

  // Unexpected tax: PO carried no tax line but the invoice does.
  if ((invoice.tax ?? 0) > 0 && !(po.tax && po.tax > 0)) {
    exceptions.push({
      type: "unexpected_tax",
      expected: 0,
      actual: invoice.tax,
      difference: invoice.tax,
      detail: "Tax was billed on this invoice but was not expected on the purchase order.",
    });
  }

  for (const line of invoice.lineItems) {
    const poLine = po.lineItems.find((l) => l.id === line.purchaseOrderLineItemId);
    if (!poLine) {
      exceptions.push({
        type: "price_difference",
        expected: null,
        actual: line.total,
        difference: line.total,
        detail: `Invoice line "${line.description}" does not match any purchase order line item.`,
      });
      continue;
    }

    if (Math.abs(line.unitPrice - poLine.unitPrice) > CENTS_TOLERANCE) {
      const expected = poLine.unitPrice * line.quantity;
      exceptions.push({
        type: "price_difference",
        expected,
        actual: line.total,
        difference: line.total - expected,
        detail: `"${poLine.description}" invoiced at $${line.unitPrice.toLocaleString()}/unit vs. $${poLine.unitPrice.toLocaleString()}/unit on the PO.`,
      });
    }

    if (line.quantity > poLine.quantity + CENTS_TOLERANCE) {
      exceptions.push({
        type: "quantity_difference",
        expected: poLine.quantity,
        actual: line.quantity,
        difference: line.quantity - poLine.quantity,
        detail: `"${poLine.description}" invoiced for ${line.quantity} but only ${poLine.quantity} were ordered.`,
      });
    }

    const receivedQty = poLine.receiptLineItems.reduce((sum, r) => sum + r.quantityReceived, 0);
    if (line.quantity > receivedQty + CENTS_TOLERANCE) {
      exceptions.push({
        type: "item_not_received",
        expected: receivedQty,
        actual: line.quantity,
        difference: line.quantity - receivedQty,
        detail: `"${poLine.description}" invoiced for ${line.quantity} but only ${receivedQty} have been received.`,
      });
    }
  }

  // Duplicate invoice: same PO + same supplier invoice number already recorded.
  if (invoice.supplierInvoiceNumber) {
    const duplicate = await prisma.invoice.findFirst({
      where: {
        id: { not: invoice.id },
        purchaseOrderId: po.id,
        supplierInvoiceNumber: invoice.supplierInvoiceNumber,
      },
    });
    if (duplicate) {
      exceptions.push({
        type: "duplicate_invoice",
        expected: null,
        actual: invoice.amount,
        difference: invoice.amount,
        detail: `Invoice number ${invoice.supplierInvoiceNumber} was already recorded against this purchase order.`,
      });
    }
  }

  // Unexplained residual: total billed exceeds line items + freight + tax.
  const explainedTotal =
    invoice.lineItems.reduce((sum, l) => sum + l.total, 0) + (invoice.freight ?? 0) + (invoice.tax ?? 0);
  if (invoice.amount - explainedTotal > CENTS_TOLERANCE) {
    exceptions.push({
      type: "additional_fee",
      expected: explainedTotal,
      actual: invoice.amount,
      difference: invoice.amount - explainedTotal,
      detail: "Invoice total exceeds line items plus freight and tax — an unexplained fee was added.",
    });
  }

  await prisma.$transaction([
    prisma.invoiceMatchException.deleteMany({ where: { invoiceId: invoice.id } }),
    ...exceptions.map((e) => prisma.invoiceMatchException.create({ data: { invoiceId: invoice.id, ...e } })),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: exceptions.length > 0 ? "discrepancy" : "matched" },
    }),
  ]);

  if (exceptions.length > 0 && po.purchaseRequest) {
    const difference = invoice.amount - (po.total ?? invoice.amount);
    const body =
      `PO: $${(po.total ?? 0).toLocaleString()} — Invoice: $${invoice.amount.toLocaleString()} — ` +
      `Difference: ${difference >= 0 ? "+" : ""}$${difference.toLocaleString()}. ${exceptions[0].detail}`;
    await Promise.all([
      notifyUser(po.organizationId, po.purchaseRequest.requesterId, {
        type: "invoice_discrepancy",
        title: `Invoice discrepancy on ${po.poNumber}`,
        body,
        entityType: "PurchaseOrder",
        entityId: po.id,
      }),
      notifyRole(po.organizationId, "accounting", {
        type: "invoice_discrepancy",
        title: `Invoice discrepancy on ${po.poNumber}`,
        body,
        entityType: "PurchaseOrder",
        entityId: po.id,
      }),
    ]);
  }
}
