const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = path.join("/agent/public/screenshots/mobile");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:8081";

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", file, fs.statSync(file).size);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  // Clear storage so we see splash briefly then login
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await shot(page, "00-splash");
  await page.waitForTimeout(1500);
  await shot(page, "01-login");

  // Continue demo
  const demo = page.getByText("Continue demo");
  await demo.waitFor({ state: "visible", timeout: 30000 });
  await demo.click();
  await page.waitForTimeout(2000);
  await shot(page, "02-jobs");

  for (const [route, name] of [
    ["/proposals", "03-proposals"],
    ["/shop", "04-shop"],
    ["/cart", "05-cart"],
    ["/more", "06-more"],
    ["/track", "07-track"],
  ]) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    await shot(page, name);
  }

  // Job detail
  await page.goto(BASE + "/jobs", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const job = page.getByText("Oak Ridge Residence").first();
  if (await job.isVisible().catch(() => false)) {
    await job.click();
    await page.waitForTimeout(1800);
    await shot(page, "08-job-detail");
  } else {
    await page.goto(BASE + "/jobs/job_oak_ridge", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    await shot(page, "08-job-detail");
  }

  // Add to cart then cart with items
  await page.goto(BASE + "/shop", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const add = page.getByText("ADD TO CART").first();
  if (await add.isVisible().catch(() => false)) {
    await add.click();
    await page.waitForTimeout(800);
    await page.goto(BASE + "/cart", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await shot(page, "05-cart");
  }

  // Tablet jobs
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(BASE + "/jobs", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await shot(page, "09-jobs-tablet");

  await browser.close();
  console.log("files:", fs.readdirSync(OUT).join(", "));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
