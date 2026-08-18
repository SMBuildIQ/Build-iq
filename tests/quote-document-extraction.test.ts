import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { parseCsvQuote, extractQuoteFromDocument } from "../src/lib/ai/quoteDocumentExtraction";
import { __setAIProviderForTests } from "../src/lib/ai/provider";
import type { AIProvider, AICompletionResult } from "../src/lib/ai/types";

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
