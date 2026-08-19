import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import ExcelJS from "exceljs";
import * as XLSX from "@e965/xlsx";
import { parseCsvQuote, parseXlsxQuote, parseXlsQuote, extractQuoteFromDocument } from "../src/lib/ai/quoteDocumentExtraction";
import { __setAIProviderForTests } from "../src/lib/ai/provider";
import type { AIProvider, AICompletionResult } from "../src/lib/ai/types";

async function buildXlsxQuote(rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Quote");
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// A real legacy binary .xls (BIFF8, pre-2007 format) built with a different
// library than the one under test — parseXlsQuote uses @e965/xlsx to read,
// this uses the same package's writer only because no other BIFF8 writer is
// in this repo; the format itself (OLE2 compound file) is what's actually
// being exercised, not a round-trip through identical code.
function buildXlsQuote(rows: (string | number)[][]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Quote");
  return XLSX.write(workbook, { type: "buffer", bookType: "biff8" }) as Buffer;
}

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `extract-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Extract Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Extract Org ${suffix}`, slug: `extract-org-${suffix}`, ownerUserId: user.id });
  return organization.id;
}

test("parseCsvQuote extracts line items deterministically with full confidence", () => {
  const csv = "sku,description,quantity,unit_price,freight,lead_time_days,payment_terms\n" +
    "WID-1,Widget,10,9.5,25,5,Net 30\n" +
    "GAD-2,Gadget,4,20,,,\n";
  const fields = parseCsvQuote(csv);
  assert.equal(fields.lineItems.length, 2);
  assert.equal(fields.lineItems[0].sku, "WID-1");
  assert.equal(fields.lineItems[0].unitPrice, 9.5);
  assert.equal(fields.lineItems[0].confidence, 1);
  assert.equal(fields.freight, 25);
  assert.equal(fields.leadTimeDays, 5);
  assert.equal(fields.paymentTerms, "Net 30");
});

test("parseCsvQuote returns empty (not fabricated) fields for malformed input", () => {
  assert.deepEqual(parseCsvQuote("").lineItems, []);
  assert.deepEqual(parseCsvQuote("just,a,header\n").lineItems, []);
  assert.deepEqual(parseCsvQuote("wrong,columns,here\n1,2,3\n").lineItems, []);
});

test("parseXlsxQuote extracts line items deterministically from a real workbook", async () => {
  const bytes = await buildXlsxQuote([
    ["sku", "description", "quantity", "unit_price", "freight", "lead_time_days", "payment_terms"],
    ["WID-1", "Widget", 10, 9.5, 25, 5, "Net 30"],
    ["GAD-2", "Gadget", 4, 20, "", "", ""],
  ]);
  const fields = await parseXlsxQuote(bytes);
  assert.equal(fields.lineItems.length, 2);
  assert.equal(fields.lineItems[0].sku, "WID-1");
  assert.equal(fields.lineItems[0].unitPrice, 9.5);
  assert.equal(fields.lineItems[0].confidence, 1);
  assert.equal(fields.freight, 25);
  assert.equal(fields.leadTimeDays, 5);
  assert.equal(fields.paymentTerms, "Net 30");
});

test("parseXlsxQuote returns empty (not fabricated) fields for malformed or non-workbook input", async () => {
  assert.deepEqual((await parseXlsxQuote(Buffer.from("not a real xlsx"))).lineItems, []);
  assert.deepEqual((await parseXlsxQuote(await buildXlsxQuote([["just", "a", "header"]]))).lineItems, []);
  assert.deepEqual((await parseXlsxQuote(await buildXlsxQuote([["wrong", "columns", "here"], [1, 2, 3]]))).lineItems, []);
});

test("extractQuoteFromDocument parses .xlsx without needing an AI provider at all", async () => {
  const orgId = await makeOrgId();
  const bytes = await buildXlsxQuote([
    ["description", "quantity", "unit_price"],
    ["Widget", 10, 9.5],
  ]);
  const result = await extractQuoteFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64: bytes.toString("base64"),
  });
  assert.equal(result.available, true);
  assert.equal(result.aiActivityLogId, null); // no AI call was made
  assert.equal(result.fields!.lineItems.length, 1);
});

test("parseXlsQuote extracts line items deterministically from a real legacy .xls (BIFF8) workbook", () => {
  const bytes = buildXlsQuote([
    ["sku", "description", "quantity", "unit_price", "freight", "lead_time_days", "payment_terms"],
    ["WID-1", "Widget", 10, 9.5, 25, 5, "Net 30"],
    ["GAD-2", "Gadget", 4, 20, "", "", ""],
  ]);
  const fields = parseXlsQuote(bytes);
  assert.equal(fields.lineItems.length, 2);
  assert.equal(fields.lineItems[0].sku, "WID-1");
  assert.equal(fields.lineItems[0].unitPrice, 9.5);
  assert.equal(fields.lineItems[0].confidence, 1);
  assert.equal(fields.freight, 25);
  assert.equal(fields.leadTimeDays, 5);
  assert.equal(fields.paymentTerms, "Net 30");
});

test("parseXlsQuote returns empty (not fabricated) fields for malformed or non-workbook input", () => {
  assert.deepEqual(parseXlsQuote(Buffer.from("not a real xls")).lineItems, []);
  assert.deepEqual(parseXlsQuote(buildXlsQuote([["just", "a", "header"]])).lineItems, []);
  assert.deepEqual(parseXlsQuote(buildXlsQuote([["wrong", "columns", "here"], [1, 2, 3]])).lineItems, []);
});

test("extractQuoteFromDocument now actually parses legacy .xls instead of reporting it unsupported", async () => {
  const orgId = await makeOrgId();
  const bytes = buildXlsQuote([
    ["description", "quantity", "unit_price"],
    ["Widget", 10, 9.5],
  ]);
  const result = await extractQuoteFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/vnd.ms-excel",
    base64: bytes.toString("base64"),
  });
  assert.equal(result.available, true);
  assert.equal(result.aiActivityLogId, null); // deterministic parse, no AI call
  assert.equal(result.fields!.lineItems.length, 1);
  assert.equal(result.fields!.lineItems[0].description, "Widget");
});

test("extractQuoteFromDocument reports a garbage .xls upload as unavailable rather than crashing", async () => {
  const orgId = await makeOrgId();
  const result = await extractQuoteFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/vnd.ms-excel",
    base64: Buffer.from("not a real xls").toString("base64"),
  });
  assert.equal(result.available, false);
  assert.deepEqual(result.fields!.lineItems, []); // parsed, not routed to vision — just found no rows
  assert.equal(result.aiActivityLogId, null); // never routed to vision
});

test("extractQuoteFromDocument parses CSV without needing an AI provider at all", async () => {
  const orgId = await makeOrgId();
  const csv = "description,quantity,unit_price\nWidget,10,9.5\n";
  const result = await extractQuoteFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "text/csv",
    base64: Buffer.from(csv, "utf-8").toString("base64"),
  });
  assert.equal(result.available, true);
  assert.equal(result.aiActivityLogId, null); // no AI call was made
  assert.equal(result.fields!.lineItems.length, 1);
});

test("extractQuoteFromDocument honestly reports PDF extraction unavailable under the mock provider", async () => {
  const orgId = await makeOrgId();
  const result = await extractQuoteFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/pdf",
    base64: Buffer.from("not a real pdf").toString("base64"),
  });
  assert.equal(result.available, false);
  assert.match(result.reason ?? "", /vision support|AI_PROVIDER/);
  assert.equal(result.fields, null);
});

test("extractQuoteFromDocument parses a vision-capable provider's JSON response and logs the AI call", async (t) => {
  const fakeProvider: AIProvider = {
    name: "fake-vision",
    model: "fake-vision-1",
    supportsDocuments: true,
    async complete(): Promise<AICompletionResult> {
      return {
        text: JSON.stringify({
          lineItems: [{ sku: "X-1", description: "Extracted Widget", quantity: 5, unitPrice: 12.5, confidence: 0.4 }],
          freight: 30,
          tax: null,
          leadTimeDays: 7,
          paymentTerms: "Net 45",
          warranty: null,
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
  const result = await extractQuoteFromDocument({
    organizationId: orgId,
    documentId: randomUUID(),
    mimeType: "application/pdf",
    base64: Buffer.from("fake pdf bytes").toString("base64"),
  });

  assert.equal(result.available, true);
  assert.equal(result.fields!.lineItems[0].description, "Extracted Widget");
  assert.equal(result.fields!.confidence, 0.4); // low-confidence line item drags down the overall score
  assert.ok(result.aiActivityLogId);

  const log = await prisma.aIActivityLog.findUnique({ where: { id: result.aiActivityLogId! } });
  assert.equal(log!.feature, "quote_document_extraction");
  assert.equal(log!.confidence, 0.4);
});

after(() => __setAIProviderForTests(null));
