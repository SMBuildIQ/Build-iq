import { test, expect, type Page } from "@playwright/test";

// brief §36 Flow 2: the core money-committing path — Purchase Request → RFQ →
// supplier portal quote submission (public, token-authenticated, no account) →
// compare → select quote → approval → Purchase Order. This is the one path
// that has to work end to end through a real browser: it spans two entirely
// different auth models (session-gated app vs. bare-token supplier portal)
// and is the only place in the app where money actually commits.

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

test("a purchase request flows through RFQ, supplier portal quoting, approval, and PO issuance", async ({ page, context }) => {
  await signUp(page, "e2e-flow2");

  // Every purchase, at any amount, requires at least one approval step by
  // default (org bootstrap's approval_threshold policy rules start at $0) —
  // the signup user (company_owner) can decide any step via the standing
  // override, so this single session can drive the whole flow.

  await page.goto("/suppliers");
  await page.getByRole("button", { name: "Add supplier" }).click();
  await page.getByLabel("Name").fill("Acme Supply Co");
  await page.getByLabel("City").fill("Chicago");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Acme Supply Co")).toBeVisible();

  await page.goto("/purchases/new");
  await page
    .getByPlaceholder(/Lenovo ThinkPads/)
    .fill("We need 20 office chairs delivered to Chicago before October 1. Budget is $4,000.");
  await page.getByRole("button", { name: "Structure this request" }).click();
  await expect(page.getByText(/AI confidence:/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm and create purchase request" }).click();
  await expect(page).toHaveURL(/\/purchases\/[a-f0-9-]+$/);
  const purchaseRequestUrl = page.url();

  // Select the supplier and create the RFQ.
  await page.getByLabel("Acme Supply Co").check();
  await page.getByRole("button", { name: "Create RFQ" }).click();
  await expect(page).toHaveURL(/\/rfqs\/[a-f0-9-]+$/);

  await page.getByRole("button", { name: "Send RFQ to suppliers" }).click();
  await expect(page.getByText(/Portal link:/)).toBeVisible();

  const portalLinkText = await page.getByText(/Portal link:/).innerText();
  const portalUrl = portalLinkText.replace("Portal link: ", "").trim();

  // The supplier has no account — a fresh, unauthenticated browser context
  // hits the bare-token portal link directly.
  const supplierPage = await context.newPage();
  await supplierPage.goto(portalUrl);
  await expect(supplierPage.getByText("Request for Quote from")).toBeVisible();

  const priceInputs = supplierPage.locator('input[type="number"]').first();
  await priceInputs.fill("50");
  await supplierPage.getByLabel(/Lead time \(days\)/).fill("7");
  await supplierPage.getByRole("button", { name: "Submit quote" }).click();
  await expect(supplierPage.getByText("Thank you")).toBeVisible();
  await supplierPage.close();

  // Back in the buyer session: compare, select the quote.
  await page.goto(`${purchaseRequestUrl}/compare`);
  await expect(page.getByText("Acme Supply Co")).toBeVisible();
  await page.getByRole("button", { name: "Select this quote" }).click();
  await expect(page).toHaveURL(purchaseRequestUrl);

  // A required approval step now blocks PO issuance — this is the policy
  // engine, not the AI recommendation, deciding that (brief §18). Exact text
  // match on the status badge — the History log below it also contains
  // "awaiting_approval"/"approved" as a substring of a longer transition line,
  // which would otherwise make these locators ambiguous.
  await expect(page.getByText("awaiting_approval", { exact: true })).toBeVisible();
  await page.goto("/approvals");
  await page.getByRole("button", { name: "Approve" }).click();
  // The decide button's fetch completes asynchronously (router.refresh(), no
  // navigation) — wait for the now-empty approvals queue before moving on,
  // rather than racing the click against the purchase request page reload.
  await expect(page.getByText("No approvals are pending right now.")).toBeVisible();

  await page.goto(purchaseRequestUrl);
  await expect(page.getByText("approved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Issue purchase order" }).click();

  await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+$/);
  await expect(page.getByText(/^PO-\d+$/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Purchase order — Acme Supply Co/ })).toBeVisible();
});
