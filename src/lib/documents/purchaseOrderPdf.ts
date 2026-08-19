import PDFDocument from "pdfkit";

// KNOWN_LIMITATIONS.md said the PO document was "a print-friendly HTML page
// (window.print() -> 'Save as PDF' in any browser)... no pdfkit/binary
// generation pipeline is wired up yet." This is that pipeline — a real PDF
// binary a caller (buyer, supplier, an accounting system) can fetch and
// store, not just a page a human happens to print. Takes a narrow input
// shape rather than the full Prisma PurchaseOrder so this is testable
// without a database.

export interface PurchaseOrderPdfInput {
  poNumber: string;
  status: string;
  organizationName: string;
  supplierName: string;
  supplierAddress: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  paymentTerms: string | null;
  requestedDeliveryDate: Date | null;
  createdAt: Date;
  lineItems: { description: string; sku: string | null; quantity: number; unitPrice: number; total: number }[];
  freight: number | null;
  tax: number | null;
  total: number | null;
}

function money(n: number | null): string {
  return n === null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generatePurchaseOrderPdf(po: PurchaseOrderPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "letter" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Purchase Order", { continued: true }).fontSize(20).text(`  ${po.poNumber}`, { align: "left" });
    doc.fontSize(10).fillColor("#555").text(`Status: ${po.status}`).fillColor("#000");
    doc.moveDown(1);

    const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2;
    const topY = doc.y;
    doc.fontSize(11).font("Helvetica-Bold").text("From", doc.page.margins.left, topY);
    doc.font("Helvetica").fontSize(10).text(po.organizationName, doc.page.margins.left, doc.y);
    if (po.billingAddress) doc.text(po.billingAddress, doc.page.margins.left);

    doc.fontSize(11).font("Helvetica-Bold").text("To", doc.page.margins.left + colWidth, topY);
    doc.font("Helvetica").fontSize(10).text(po.supplierName, doc.page.margins.left + colWidth, topY + 16);
    if (po.supplierAddress) doc.text(po.supplierAddress, doc.page.margins.left + colWidth);

    doc.moveDown(1.5);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Issued: ${po.createdAt.toLocaleDateString()}`);
    doc.text(`Requested delivery: ${po.requestedDeliveryDate ? po.requestedDeliveryDate.toLocaleDateString() : "—"}`);
    doc.text(`Payment terms: ${po.paymentTerms ?? "—"}`);
    if (po.shippingAddress) doc.text(`Ship to: ${po.shippingAddress}`);
    doc.moveDown(1);

    const tableTop = doc.y;
    const cols = { description: 0, sku: 260, qty: 340, unitPrice: 400, total: 470 };
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Description", doc.page.margins.left + cols.description, tableTop, { width: 250 });
    doc.text("SKU", doc.page.margins.left + cols.sku, tableTop, { width: 70 });
    doc.text("Qty", doc.page.margins.left + cols.qty, tableTop, { width: 50 });
    doc.text("Unit price", doc.page.margins.left + cols.unitPrice, tableTop, { width: 60 });
    doc.text("Total", doc.page.margins.left + cols.total, tableTop, { width: 60 });
    doc.moveTo(doc.page.margins.left, doc.y + 3).lineTo(doc.page.width - doc.page.margins.right, doc.y + 3).stroke();
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(9);
    for (const li of po.lineItems) {
      const rowY = doc.y;
      doc.text(li.description, doc.page.margins.left + cols.description, rowY, { width: 250 });
      doc.text(li.sku ?? "—", doc.page.margins.left + cols.sku, rowY, { width: 70 });
      doc.text(String(li.quantity), doc.page.margins.left + cols.qty, rowY, { width: 50 });
      doc.text(money(li.unitPrice), doc.page.margins.left + cols.unitPrice, rowY, { width: 60 });
      doc.text(money(li.total), doc.page.margins.left + cols.total, rowY, { width: 60 });
      doc.moveDown(0.75);
    }

    doc.moveTo(doc.page.margins.left, doc.y + 3).lineTo(doc.page.width - doc.page.margins.right, doc.y + 3).stroke();
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(`Freight: ${money(po.freight)}    Tax: ${money(po.tax)}    Total: ${money(po.total)}`, {
      align: "right",
    });

    doc.end();
  });
}
