import { test, expect, type Page } from "@playwright/test";

// brief §36: the tail end of the purchase lifecycle — advancing a PO through
// its shipping/delivery status, recording what actually arrived, and
// recording a supplier invoice against it — had only unit-level coverage of
// the three-way matching logic (tests/invoice-matching.test.ts). This drives
// the actual UI: status buttons, the receiving form, and the invoice form,
// through a real browser.

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signUp(page: Page, label: string) {
  const email = uniqueEmail(label);
  await page.goto("/signup");
  await page.getByPlaceholder("Company name").fill(`${label} Co`);
  await page.getByPlaceholder("Your name").fill(label);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (10+ characters)").fill("supersecret123");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// Issues a real PO through the same path as rfq-to-po-flow.spec.ts, but
// without re-asserting every intermediate step — this test's focus is what
// happens after issuance, not the RFQ path itself (already covered there).
async function issuePurchaseOrder(page: Page, context: import("@playwright/test").BrowserContext): Promise<string> {
  await page.goto("/suppliers");
  await page.getByRole("button", { name: "Add supplier" }).click();
  await page.getByLabel("Name").fill("Acme Supply Co");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Acme Supply Co")).toBeVisible();

  await page.goto("/purchases/new");
  await page.getByPlaceholder(/Lenovo ThinkPads/).fill("We need 10 office chairs delivered to Chicago before October 1.");
  await page.getByRole("button", { name: "Structure this request" }).click();
  await expect(page.getByText(/AI confidence:/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm and create purchase request" }).click();
  await expect(page).toHaveURL(/\/purchases\/[a-f0-9-]+$/);
  const purchaseRequestUrl = page.url();

  await page.getByLabel("Acme Supply Co").check();
  await page.getByRole("button", { name: "Create RFQ" }).click();
  await expect(page).toHaveURL(/\/rfqs\/[a-f0-9-]+$/);
  await page.getByRole("button", { name: "Send RFQ to suppliers" }).click();
  await expect(page.getByText(/Portal link:/)).toBeVisible();

  const portalUrl = (await page.getByText(/Portal link:/).innerText()).replace("Portal link: ", "").trim();
  const supplierPage = await context.newPage();
  await supplierPage.goto(portalUrl);
  await supplierPage.locator('input[type="number"]').first().fill("40");
  await supplierPage.getByRole("button", { name: "Submit quote" }).click();
  await expect(supplierPage.getByText("Thank you")).toBeVisible();
  await supplierPage.close();

  await page.goto(`${purchaseRequestUrl}/compare`);
  await page.getByRole("button", { name: "Select this quote" }).click();
  await expect(page).toHaveURL(purchaseRequestUrl);

  await page.goto("/approvals");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("No approvals are pending right now.")).toBeVisible();

  await page.goto(purchaseRequestUrl);
  await page.getByRole("button", { name: "Issue purchase order" }).click();
  await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+$/);
  return page.url();
}

test("a purchase order can be advanced to shipped, received, and invoiced with a clean match", async ({ page, context }) => {
  // More steps than the default 30s budget comfortably covers under `next dev`
  // (full RFQ->PO issuance, four sequential status transitions each waited on
  // individually, then receiving and invoice recording) — not a hang, just a
  // long real flow.
  test.setTimeout(60_000);
  await signUp(page, "e2e-receiving");
  await issuePurchaseOrder(page, context);

  // issued -> supplier_confirmed -> processing -> ready_to_ship -> shipped.
  // The status button's onClick awaits a fetch + router.refresh() internally —
  // .click() only waits for the DOM event to dispatch, not for that async work
  // to finish — so each step must wait for its resulting badge text before the
  // next click fires, or a later transition can race the server into rejecting
  // it (still-"processing" when the "shipped" request lands, since the prior
  // "ready_to_ship" write hadn't been persisted yet).
  for (const [label, resultingStatus] of [
    ["Mark supplier confirmed", "supplier_confirmed"],
    ["Mark processing", "processing"],
    ["Mark ready to ship", "ready_to_ship"],
    ["Mark shipped", "shipped"],
  ]) {
    await page.getByRole("button", { name: label }).click();
    await expect(page.getByText(resultingStatus, { exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Record receiving" }).click();
  // Default-filled quantities already match what was ordered — a clean receipt.
  await page.getByRole("button", { name: "Save receiving record" }).click();
  await expect(page.getByText(/0 missing/)).toBeVisible();

  await page.getByRole("button", { name: "Record invoice" }).click();
  await page.getByPlaceholder("Supplier invoice #").fill("INV-5001");
  await page.getByPlaceholder("Invoice total $").fill("400");
  await page.getByRole("button", { name: "Record invoice" }).click();

  // Quantities/prices default-match the PO exactly and a real receipt now
  // exists — the three-way match should come back clean.
  await expect(page.getByText("Matched")).toBeVisible();
  await expect(page.getByText("INV-5001")).toBeVisible();
});

test("an invoice priced above the purchase order surfaces a real match exception in the UI", async ({ page, context }) => {
  await signUp(page, "e2e-discrepancy");
  await issuePurchaseOrder(page, context);

  for (const [label, resultingStatus] of [
    ["Mark supplier confirmed", "supplier_confirmed"],
    ["Mark processing", "processing"],
    ["Mark ready to ship", "ready_to_ship"],
    ["Mark shipped", "shipped"],
  ]) {
    await page.getByRole("button", { name: label }).click();
    await expect(page.getByText(resultingStatus, { exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Record receiving" }).click();
  await page.getByRole("button", { name: "Save receiving record" }).click();
  await expect(page.getByText(/0 missing/)).toBeVisible();

  await page.getByRole("button", { name: "Record invoice" }).click();
  // Bill $10/unit above the PO's $40 unit price on all 10 units — a real,
  // detectable price_difference exception, not a fabricated one.
  await page.locator('input[type="number"][placeholder="Unit price"]').fill("50");
  await page.getByPlaceholder("Invoice total $").fill("500");
  await page.getByRole("button", { name: "Record invoice" }).click();

  await expect(page.getByText(/1 discrepancy\(s\)/)).toBeVisible();
  await expect(page.getByText(/invoiced at \$50\/unit vs\. \$40\/unit on the PO/)).toBeVisible();
});
