// Production background-job worker (brief §34). Run as a separate process
// (`npm run worker`) alongside the web server. Polls the Job table and runs
// whatever is due; retries with backoff and dead-letters after maxAttempts —
// see src/lib/jobs/queue.ts for the shared processing logic also used inline
// by API routes in dev.
import "dotenv/config";
import "../src/lib/jobs/processors/rfqSend";
import { processQueuedJobs } from "../src/lib/jobs/queue";

const POLL_INTERVAL_MS = 5000;

async function loop() {
  for (;;) {
    try {
      const processed = await processQueuedJobs(10);
      if (processed > 0) console.log(`[worker] processed ${processed} job(s)`);
    } catch (err) {
      console.error("[worker] poll error", err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

loop();
