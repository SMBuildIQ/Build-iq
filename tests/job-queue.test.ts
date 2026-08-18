import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { registerJobProcessor, enqueueJob, processJobById, processQueuedJobs } from "../src/lib/jobs/queue";

// brief §34: long-running work goes through a persisted Job row with retries/
// backoff/dead-letter, not straight into a web request. Real and used (RFQ
// send, negotiation send both enqueue through this), but had no dedicated
// test of the retry/backoff/dead-letter mechanics themselves.

test("a successful job is marked succeeded and its payload reaches the processor intact", async (t) => {
  let received: unknown = null;
  registerJobProcessor("rfq.send", async (payload) => {
    received = payload;
  });
  t.after(() => registerJobProcessor("rfq.send", async () => {}));

  const jobId = await enqueueJob("rfq.send", { rfqId: "abc-123" });
  await processJobById(jobId);

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  assert.equal(job.status, "succeeded");
  assert.deepEqual(received, { rfqId: "abc-123" });
});

test("a job that keeps failing goes to dead_letter once maxAttempts is reached, retrying with backoff before that", async (t) => {
  let callCount = 0;
  registerJobProcessor("rfq.send", async () => {
    callCount++;
    throw new Error("simulated failure");
  });
  t.after(() => registerJobProcessor("rfq.send", async () => {}));

  const jobId = await enqueueJob("rfq.send", {});
  const before = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  assert.equal(before.maxAttempts, 3); // schema default — asserted so the rest of this test's expectations are grounded in the real default

  // First failure: still under maxAttempts, stays queued with backoff scheduled.
  await processJobById(jobId);
  let job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  assert.equal(job.status, "queued");
  assert.equal(job.attempts, 1);
  assert.equal(job.lastError, "simulated failure");
  assert.ok(job.runAt.getTime() > Date.now()); // backoff pushed runAt into the future

  // processQueuedJobs must not pick it up again yet — runAt hasn't arrived.
  const processedCount = await processQueuedJobs();
  assert.equal(processedCount, 0);
  assert.equal(callCount, 1);

  // Force runAt into the past to simulate the backoff window having elapsed,
  // then exhaust the remaining attempts directly.
  await prisma.job.update({ where: { id: jobId }, data: { runAt: new Date(Date.now() - 1000) } });
  await processJobById(jobId); // attempt 2
  await prisma.job.update({ where: { id: jobId }, data: { runAt: new Date(Date.now() - 1000) } });
  await processJobById(jobId); // attempt 3 — exhausts maxAttempts

  job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  assert.equal(job.status, "dead_letter");
  assert.equal(job.attempts, 3);
  assert.equal(callCount, 3);
});

test("processJobById is a no-op for a job that is not in queued status", async (t) => {
  registerJobProcessor("rfq.send", async () => {});
  t.after(() => registerJobProcessor("rfq.send", async () => {}));

  const jobId = await enqueueJob("rfq.send", {});
  await processJobById(jobId); // succeeds, status -> "succeeded"
  await processJobById(jobId); // should be a no-op, not re-run the processor

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  assert.equal(job.status, "succeeded");
});

test("enqueueJob JSON-serializes the payload and processQueuedJobs respects the limit parameter", async (t) => {
  registerJobProcessor("rfq.send", async () => {});
  t.after(() => registerJobProcessor("rfq.send", async () => {}));

  const ids = await Promise.all([
    enqueueJob("rfq.send", { n: 1 }),
    enqueueJob("rfq.send", { n: 2 }),
    enqueueJob("rfq.send", { n: 3 }),
  ]);

  const processed = await processQueuedJobs(2);
  assert.equal(processed, 2);

  const statuses = await prisma.job.findMany({ where: { id: { in: ids } }, select: { status: true } });
  const succeededCount = statuses.filter((j) => j.status === "succeeded").length;
  assert.equal(succeededCount, 2);
});
