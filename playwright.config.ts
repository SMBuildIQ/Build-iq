import { defineConfig, devices } from "@playwright/test";

// brief §39: "End-to-end tests for critical workflows." These drive a real
// Chromium browser against a real running server (next dev, not a mock) —
// they catch UI-layer bugs (a form that never wires up, a broken redirect)
// that the API-level tests under tests/*.test.ts cannot see.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // each test creates its own org via the UI; keep it simple and serial
  // fullyParallel only serializes tests *within* a file — without capping workers,
  // Playwright still runs separate spec files concurrently by default, and two
  // workers writing to the same SQLite e2e.db at once causes real, intermittent
  // write contention (a PO issuance request can silently fail). One worker across
  // the whole suite avoids it; e2e suites are small enough that this costs little.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "dot" : "list",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3211",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3211",
    url: "http://localhost:3211/login",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL: "file:./e2e.db",
      AUTH_SECRET: "e2e-test-secret-at-least-32-characters-long",
      AI_PROVIDER: "mock",
      NEXT_PUBLIC_APP_URL: "http://localhost:3211",
    },
  },
});
