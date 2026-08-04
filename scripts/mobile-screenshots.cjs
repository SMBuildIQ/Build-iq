const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = path.join("/agent/public/mobile-shots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://127.0.0.1:8081";

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", name, fs.statSync(file).size);
}

async function goto(page, route) {
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1600);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await phone.newPage();
  page.setDefaultTimeout(90000);

  // Fresh session → splash / login
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await shot(page, "00-splash");
  await page.waitForTimeout(1400);
  await shot(page, "01-login");

  // Signup
  const create = page.getByText(/create account/i).first();
  if (await create.isVisible().catch(() => false)) {
    await create.click();
    await page.waitForTimeout(1500);
    await shot(page, "01b-signup");
    await page.goBack().catch(() => {});
    await page.waitForTimeout(800);
  } else {
    await goto(page, "/signup");
    await shot(page, "01b-signup");
  }

  // Demo → Jobs
  await goto(page, "/");
  const demo = page.getByText(/continue demo/i).first();
  await demo.waitFor({ state: "visible", timeout: 30000 });
  await demo.click();
  await page.waitForTimeout(2200);
  await shot(page, "02-jobs");

  for (const [route, name] of [
    ["/proposals", "03-proposals"],
    ["/shop", "04-shop"],
    ["/cart", "05-cart"],
    ["/more", "06-more"],
    ["/track", "07-track"],
  ]) {
    await goto(page, route);
    await shot(page, name);
  }

  // Job detail
  await goto(page, "/jobs/job_oak_ridge");
  await shot(page, "08-job-detail");

  // Drawings upload
  await goto(page, "/jobs/job_oak_ridge/drawings");
  await shot(page, "08b-drawings");

  // Materials library
  await goto(page, "/jobs/job_oak_ridge/library");
  await page.waitForTimeout(1200);
  await shot(page, "08c-materials-library");

  // Cart with items — stay in SPA so CartContext survives
  await page.getByLabel("Shop").click({ force: true });
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: /add .+ to cart/i }).nth(0).click({ force: true });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /add .+ to cart/i }).nth(1).click({ force: true });
  await page.waitForTimeout(500);
  await page.getByRole("tab", { name: "Cart" }).click({ force: true });
  await page.waitForTimeout(1800);
  await shot(page, "05b-cart-items");

  await phone.close();

  // Tablet jobs
  const tablet = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
  });
  const tpage = await tablet.newPage();
  tpage.setDefaultTimeout(90000);
  await tpage.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await tpage.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await tpage.goto(BASE, { waitUntil: "domcontentloaded" });
  await tpage.waitForTimeout(800);
  const tdemo = tpage.getByText(/continue demo/i).first();
  if (await tdemo.isVisible().catch(() => false)) {
    await tdemo.click();
    await tpage.waitForTimeout(2000);
  } else {
    await tpage.goto(BASE + "/jobs", { waitUntil: "domcontentloaded" });
    await tpage.waitForTimeout(1800);
  }
  await shot(tpage, "09-jobs-tablet");
  await tablet.close();

  await browser.close();
  console.log(
    "gallery:",
    fs
      .readdirSync(OUT)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .join(", ")
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
