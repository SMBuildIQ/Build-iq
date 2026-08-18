import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { parseCsvInvoice, parseXlsxInvoice, extractInvoiceFromDocument } from "../src/lib/ai/invoiceDocumentExtraction";
import { __setAIProviderForTests } from "../src/lib/ai/provider";
import type { AIProvider, AICompletionResult } from "../src/lib/ai/types";

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `invoice-extract-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Invoice Extract Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Invoice Extract Org ${suffix}`, slug: `invoice-extract-org-${suffix}`, ownerUserId: user.id });
  return organization.id;
}

async function buildXlsxInvoice(rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Invoice");
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("parseCsvInvoice extracts line items and invoice-level fields deterministically", () => {
  const csv =
    "sku,description,quantity,unit_price,invoice_number,freight,tax,amount\n" +
    "WID-1,Widget,10,9.5,INV-2001,25,5,120\n" +
    "GAD-2,Gadget,4,20,,,,\n";
  const fields = parseCsvInvoice(csv);
  assert.equal(fields.lineItems.length, 2);
  assert.equal(fields.lineItems[0].sku, "WID-1");
  assert.equal(fields.lineItems[0].unitPrice, 9.5);
  assert.equal(fields.lineItems[0].confidence, 1);
  assert.equal(fields.invoiceNumber, "INV-2001");
  assert.equal(fields.freight, 25);
  assert.equal(fields.tax, 5);
  assert.equal(fields.amount, 120);
});

test("parseCsvInvoice returns empty (not fabricated) fields for malformed input", () => {
  assert.deepEqual(parseCsvInvoice("").lineItems, []);
  assert.deepEqual(parseCsvInvoice("just,a,header\n").lineItems, []);
  assert.deepEqual(parseCsvInvoice("wrong,columns,here\n1,2,3\n").lineItems, []);
});

test("parseXlsxInvoice extracts line items deterministically from a real workbook", async () => {
  const bytes = await buildXlsxInvoice([
    ["sku", "description", "quantity", "unit_price", "invoice_number", "freight", "tax", "amount"],
    ["WID-1", "Widget", 10, 9.5, "INV-2001", 25, 5, 120],
  ]);
  const fields = await parseXlsxInvoice(bytes);
  assert.equal(fields.lineItems.length, 1);
  assert.equal(fields.invoiceNumber, "INV-2001");
  assert.equal(fields.amount, 120);
});

test("extractInvoiceFromDocument parses CSV without needing an AI provider at all", async () => {
  const orgId = await makeOrgId();
  const csv = "description,quantity,unit_price\nWidget,10,9.5\n";
  const result = await extractInvoiceFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "text/csv",
    base64: Buffer.from(csv, "utf-8").toString("base64"),
  });
  assert.equal(result.available, true);
  assert.equal(result.aiActivityLogId, null);
  assert.equal(result.fields!.lineItems.length, 1);
});

test("extractInvoiceFromDocument parses .xlsx without needing an AI provider at all", async () => {
  const orgId = await makeOrgId();
  const bytes = await buildXlsxInvoice([
    ["description", "quantity", "unit_price"],
    ["Widget", 10, 9.5],
  ]);
  const result = await extractInvoiceFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64: bytes.toString("base64"),
  });
  assert.equal(result.available, true);
  assert.equal(result.aiActivityLogId, null);
  assert.equal(result.fields!.lineItems.length, 1);
});

test("extractInvoiceFromDocument honestly reports legacy .xls as unsupported", async () => {
  const orgId = await makeOrgId();
  const result = await extractInvoiceFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/vnd.ms-excel",
    base64: Buffer.from("not a real xls").toString("base64"),
  });
  assert.equal(result.available, false);
  assert.match(result.reason ?? "", /\.xls/);
  assert.equal(result.fields, null);
  assert.equal(result.aiActivityLogId, null);
});

test("extractInvoiceFromDocument honestly reports PDF extraction unavailable under the mock provider", async () => {
  const orgId = await makeOrgId();
  const result = await extractInvoiceFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/pdf",
    base64: Buffer.from("not a real pdf").toString("base64"),
  });
  assert.equal(result.available, false);
  assert.match(result.reason ?? "", /vision support|AI_PROVIDER/);
  assert.equal(result.fields, null);
});

test("extractInvoiceFromDocument parses a vision-capable provider's JSON response and logs the AI call", async (t) => {
  const fakeProvider: AIProvider = {
    name: "fake-vision",
    model: "fake-vision-1",
    supportsDocuments: true,
    async complete(): Promise<AICompletionResult> {
      return {
        text: JSON.stringify({
          invoiceNumber: "INV-9001",
          lineItems: [{ sku: "X-1", description: "Extracted Widget", quantity: 5, unitPrice: 12.5, confidence: 0.4 }],
          freight: 30,
          tax: 10,
          amount: 95,
        }),
        tokensIn: 100,
        tokensOut: 50,
        costUsd: 0.001,
      };
    },
  };
  __setAIProviderForTests(fakeProvider);
  t.after(() => __setAIProviderForTests(null));

  const orgId = await makeOrgId();
  const result = await extractInvoiceFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/pdf",
    base64: Buffer.from("fake pdf bytes").toString("base64"),
  });

  assert.equal(result.available, true);
  assert.equal(result.fields!.invoiceNumber, "INV-9001");
  assert.equal(result.fields!.lineItems[0].description, "Extracted Widget");
  assert.equal(result.fields!.confidence, 0.4);
  assert.ok(result.aiActivityLogId);

  const log = await prisma.aIActivityLog.findUnique({ where: { id: result.aiActivityLogId! } });
  assert.equal(log!.feature, "invoice_document_extraction");
  assert.equal(log!.confidence, 0.4);
});

after(() => __setAIProviderForTests(null));
