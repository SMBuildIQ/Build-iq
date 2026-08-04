import { assertProductionSecrets } from "@/lib/security/uploads";

let booted = false;

/** Call once from instrumentation — enforces production secrets at process start. */
export function bootSecurityChecks() {
  if (booted) return;
  booted = true;
  assertProductionSecrets();
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS === "true") {
    console.warn("[boot] ALLOW_MOCK_PAYMENTS=true in production — mock checkout is enabled");
  }
}
