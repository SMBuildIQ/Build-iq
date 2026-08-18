import { prisma } from "@/lib/db";

// Background job system (brief §34): long-running operations (RFQ distribution,
// document extraction, negotiation agents, ERP sync) must not run inline inside a
// web request. Jobs are persisted rows with status/attempts/retry/dead-letter —
// see prisma/schema.prisma Job model.
//
// Two execution paths read this table:
//  1. scripts/worker.ts — a polling loop, the real production execution path.
//  2. processJobInline() below, called right after enqueue in dev/test so a demo
//     or test run sees the result without needing a second process running.
// Both call the exact same processor registry, so there is no behavioral
// difference between "background" and "inline" execution — only timing.

export type JobType = "rfq.send";

const registry = new Map<JobType, (payload: unknown) => Promise<void>>();

export function registerJobProcessor(type: JobType, fn: (payload: unknown) => Promise<void>) {
  registry.set(type, fn);
}

export async function enqueueJob(type: JobType, payload: unknown, organizationId?: string): Promise<string> {
  const job = await prisma.job.create({
    data: { type, payload: JSON.stringify(payload), organizationId },
  });
  return job.id;
}

export async function processJobById(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "queued") return;
  await runJob(job.id);
}

/** Picks up to `limit` queued jobs whose runAt has passed and processes them. */
export async function processQueuedJobs(limit = 10): Promise<number> {
  const jobs = await prisma.job.findMany({
    where: { status: "queued", runAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const job of jobs) {
    await runJob(job.id);
  }
  return jobs.length;
}

async function runJob(jobId: string): Promise<void> {
  const job = await prisma.job.update({ where: { id: jobId }, data: { status: "running" } });
  const processor = registry.get(job.type as JobType);

  try {
    if (!processor) throw new Error(`No processor registered for job type "${job.type}"`);
    await processor(JSON.parse(job.payload));
    await prisma.job.update({ where: { id: job.id }, data: { status: "succeeded" } });
  } catch (err) {
    const attempts = job.attempts + 1;
    const failed = attempts >= job.maxAttempts;
    await prisma.job.update({
      where: { id: job.id },
      data: {
        attempts,
        status: failed ? "dead_letter" : "queued",
        lastError: err instanceof Error ? err.message : String(err),
        // simple exponential backoff before retry
        runAt: failed ? undefined : new Date(Date.now() + 2 ** attempts * 1000),
      },
    });
  }
}
