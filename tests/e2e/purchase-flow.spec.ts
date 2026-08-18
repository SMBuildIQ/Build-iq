import { test, expect } from "@playwright/test";

// brief §36 Flow 1: Dashboard → Describe need → AI structures request → User
// confirms → Purchase Request created. Runs against the mock AI provider
// (AI_PROVIDER=mock in playwright.config.ts), so this exercises the real
// heuristic extraction path end to end through an actual browser — form
// submission, redirect, and rendered content — not just the API contract.

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

test("describing a purchase in plain English creates a real Purchase Request", async ({ page }) => {
  const email = uniqueEmail("e2e-flow1");

  await page.goto("/signup");
  await page.getByPlaceholder("Company name").fill("E2E Flow Co");
  await page.getByPlaceholder("Your name").fill("E2E Owner");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (10+ characters)").fill("supersecret123");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Describe a purchase" }).click();
  await expect(page).toHaveURL(/\/purchases\/new/);

  await page
    .getByPlaceholder(/Lenovo ThinkPads/)
    .fill(
      "We need 75 Lenovo ThinkPads with 32GB RAM delivered to Detroit before September 20. Budget is $95,000. Equivalent Dell models are acceptable."
    );
  await page.getByRole("button", { name: "Structure this request" }).click();

  // AI confidence + extracted fields should render before the user can confirm.
  await expect(page.getByText(/AI confidence:/)).toBeVisible();
  const quantityField = page.locator("input[type=number]").first();
  await expect(quantityField).toHaveValue("75");

  await page.getByRole("button", { name: "Confirm and create purchase request" }).click();

  // Lands on the detail page with a real, persisted request number.
  await expect(page).toHaveURL(/\/purchases\/[a-f0-9-]+$/);
  await expect(page.getByText(/^PR-\d+$/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Lenovo ThinkPads/i })).toBeVisible();

  // The purchase shows up in the list too — not just the direct link.
  await page.goto("/purchases");
  await expect(page.getByText(/Lenovo ThinkPads/i)).toBeVisible();
});

test("a user cannot reach another organization's purchase request by URL", async ({ browser }) => {
  async function createOrgAndPurchase(browserInstance: typeof browser, label: string) {
    const context = await browserInstance.newContext();
    const page = await context.newPage();
    const email = uniqueEmail(label);

    await page.goto("/signup");
    await page.getByPlaceholder("Company name").fill(`${label} Co`);
    await page.getByPlaceholder("Your name").fill(label);
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password (10+ characters)").fill("supersecret123");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/purchases/new");
    await page.getByPlaceholder(/Lenovo ThinkPads/).fill(`${label} confidential purchase for widgets, 10 units, Chicago, by June 1.`);
    await page.getByRole("button", { name: "Structure this request" }).click();
    await expect(page.getByText(/AI confidence:/)).toBeVisible();
    await page.getByRole("button", { name: "Confirm and create purchase request" }).click();
    await expect(page).toHaveURL(/\/purchases\/[a-f0-9-]+$/);

    const purchaseUrl = page.url();
    await context.close();
    return purchaseUrl;
  }

  const orgAPurchaseUrl = await createOrgAndPurchase(browser, "isotenant-a");

  // A fresh browser context (org B, no shared session with org A) tries to
  // load org A's purchase request directly by URL.
  const orgBContext = await browser.newContext();
  const orgBPage = await orgBContext.newPage();
  const email = uniqueEmail("isotenant-b");
  await orgBPage.goto("/signup");
  await orgBPage.getByPlaceholder("Company name").fill("Isolation B Co");
  await orgBPage.getByPlaceholder("Your name").fill("Isolation B");
  await orgBPage.getByPlaceholder("Email").fill(email);
  await orgBPage.getByPlaceholder("Password (10+ characters)").fill("supersecret123");
  await orgBPage.getByRole("button", { name: "Create workspace" }).click();
  await expect(orgBPage).toHaveURL(/\/dashboard/);

  await orgBPage.goto(orgAPurchaseUrl);
  await expect(orgBPage.getByText(/404|not found/i)).toBeVisible();

  await orgBContext.close();
});
