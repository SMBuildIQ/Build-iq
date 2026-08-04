import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  getWorkflow,
  getAgent,
  type WorkflowDefinition,
} from "@/lib/ai/orchestration/registry";
import type { BotEvent } from "@/lib/ai/bots-client";

export type OrchestrationOptions = {
  companyId: string;
  projectId: string;
  startedById?: string | null;
  workflowId?: string;
  fillCart?: boolean;
  syncSpruce?: boolean;
  emit?: (event: BotEvent) => void;
};

export type OrchestrationResult = {
  runId: string;
  status: string;
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
};

/**
 * Start and execute an agent workflow with persisted run/step state.
 * Estimating pipeline delegates work to the existing bot crew while recording orchestration.
 */
export async function runOrchestration(
  options: OrchestrationOptions
): Promise<OrchestrationResult> {
  const workflowId = options.workflowId || "estimating-pipeline";
  const workflow = getWorkflow(workflowId);
  if (!workflow) {
    throw new Error(`Unknown workflow: ${workflowId}`);
  }

  // Only run active agents in the workflow
  const agentIds = workflow.agentIds.filter((id) => {
    const a = getAgent(id);
    return a && a.status === "active";
  });

  if (!agentIds.length) {
    throw new Error(
      `Workflow ${workflowId} has no active agents yet. Cabinetry orchestration is planned.`
    );
  }

  const run = await prisma.agentRun.create({
    data: {
      workflowId: workflow.id,
      companyId: options.companyId,
      projectId: options.projectId,
      startedById: options.startedById || null,
      status: "RUNNING",
      progress: 0,
      inputJson: JSON.stringify({
        fillCart: options.fillCart !== false,
        syncSpruce: options.syncSpruce !== false,
        workflowName: workflow.name,
      }),
      steps: {
        create: agentIds.map((agentId, index) => {
          const agent = getAgent(agentId)!;
          return {
            agentId: agent.id,
            agentName: agent.name,
            status: "PENDING",
            sortOrder: index,
            progress: 0,
          };
        }),
      },
    },
    include: { steps: true },
  });

  await writeAuditLog({
    companyId: options.companyId,
    actorUserId: options.startedById,
    action: "orchestration.started",
    entityType: "AgentRun",
    entityId: run.id,
    detail: `Workflow ${workflow.id} on project ${options.projectId}`,
  });

  const emit = options.emit || (() => undefined);
  emit({
    type: "pipeline_start",
    message: `Orchestrator starting “${workflow.name}” (${run.id.slice(0, 8)}…)`,
    progress: 0,
    data: { runId: run.id, workflowId: workflow.id },
  });

  try {
    if (workflow.id === "estimating-pipeline") {
      const { runBotPipeline } = await import("@/lib/ai/bots");
      const pending: Promise<void>[] = [];
      await runBotPipeline(
        options.projectId,
        options.companyId,
        (event) => {
          pending.push(syncStepFromBotEvent(run.id, event));
          emit({
            ...event,
            data: { ...(event.data || {}), runId: run.id, workflowId: workflow.id },
          });
        },
        {
          fillCart: options.fillCart !== false,
          syncSpruce: options.syncSpruce !== false,
        }
      );
      await Promise.all(pending);
    } else {
      throw new Error(`Workflow ${workflow.id} is not executable yet.`);
    }

    // If pipeline ended with error event handling inside bots, check project — bots emit error without throw
    const steps = await prisma.agentStep.findMany({ where: { runId: run.id } });
    const failed = steps.find((s) => s.status === "FAILED");
    const anyRunning = steps.some((s) => s.status === "RUNNING" || s.status === "PENDING");

    // Mark remaining pending as skipped if pipeline finished early on error
    if (failed || anyRunning) {
      const unfinished = steps.filter((s) => s.status === "PENDING" || s.status === "RUNNING");
      for (const s of unfinished) {
        if (failed) {
          await prisma.agentStep.update({
            where: { id: s.id },
            data: {
              status: s.status === "RUNNING" ? "FAILED" : "SKIPPED",
              finishedAt: new Date(),
              message: s.message || (failed ? "Stopped after upstream failure" : s.message),
            },
          });
        }
      }
    }

    const refreshed = await prisma.agentStep.findMany({ where: { runId: run.id } });
    const hasFail = refreshed.some((s) => s.status === "FAILED");
    const allDone = refreshed.every(
      (s) => s.status === "COMPLETED" || s.status === "SKIPPED" || s.status === "FAILED"
    );

    // Prefer COMPLETED when briefing finished (bots may not always mark every optional step)
    const briefing = refreshed.find((s) => s.agentId === "briefing");
    const success = briefing?.status === "COMPLETED" || (!hasFail && allDone);

    const finalStatus = success ? "COMPLETED" : hasFail ? "FAILED" : "COMPLETED";
    const resultPayload = {
      workflowId: workflow.id,
      steps: refreshed.map((s) => ({
        agentId: s.agentId,
        status: s.status,
        message: s.message,
      })),
    };

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        progress: 100,
        finishedAt: new Date(),
        resultJson: JSON.stringify(resultPayload),
        error: hasFail && !success ? failed?.error || failed?.message || "Pipeline failed" : null,
      },
    });

    await writeAuditLog({
      companyId: options.companyId,
      actorUserId: options.startedById,
      action: finalStatus === "COMPLETED" ? "orchestration.completed" : "orchestration.failed",
      entityType: "AgentRun",
      entityId: run.id,
      detail: `Workflow ${workflow.id} → ${finalStatus}`,
    });

    return {
      runId: run.id,
      status: finalStatus,
      progress: 100,
      result: resultPayload,
      error: hasFail && !success ? failed?.message || undefined : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Orchestration failed";
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: message.slice(0, 1000),
        finishedAt: new Date(),
      },
    });
    await prisma.agentStep.updateMany({
      where: { runId: run.id, status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "SKIPPED", finishedAt: new Date(), message: "Aborted" },
    });
    await writeAuditLog({
      companyId: options.companyId,
      actorUserId: options.startedById,
      action: "orchestration.failed",
      entityType: "AgentRun",
      entityId: run.id,
      detail: message.slice(0, 500),
    });
    emit({ type: "error", message, data: { runId: run.id } });
    return { runId: run.id, status: "FAILED", progress: 0, error: message };
  }
}

async function syncStepFromBotEvent(runId: string, event: BotEvent) {
  try {
    if (event.progress != null) {
      await prisma.agentRun.update({
        where: { id: runId },
        data: { progress: Math.min(100, Math.max(0, event.progress)) },
      });
    }

    if (event.type === "error" && event.bot) {
      await prisma.agentStep.updateMany({
        where: { runId, agentId: event.bot },
        data: {
          status: "FAILED",
          error: event.message.slice(0, 1000),
          message: event.message.slice(0, 500),
          finishedAt: new Date(),
        },
      });
      return;
    }

    if (!event.bot) return;

    if (event.type === "bot_start") {
      await prisma.agentStep.updateMany({
        where: { runId, agentId: event.bot },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          message: event.message.slice(0, 500),
          progress: event.progress ?? 0,
        },
      });
      return;
    }

    if (event.type === "bot_progress") {
      await prisma.agentStep.updateMany({
        where: { runId, agentId: event.bot },
        data: {
          status: "RUNNING",
          message: event.message.slice(0, 500),
          progress: event.progress ?? undefined,
          outputJson: event.data ? JSON.stringify(event.data).slice(0, 8000) : undefined,
        },
      });
      return;
    }

    if (event.type === "bot_done") {
      await prisma.agentStep.updateMany({
        where: { runId, agentId: event.bot },
        data: {
          status: "COMPLETED",
          message: event.message.slice(0, 500),
          progress: event.progress ?? 100,
          finishedAt: new Date(),
          outputJson: event.data ? JSON.stringify(event.data).slice(0, 8000) : undefined,
        },
      });
    }

    if (event.type === "pipeline_done") {
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          progress: 100,
          resultJson: event.data ? JSON.stringify(event.data).slice(0, 12000) : undefined,
        },
      });
    }
  } catch (err) {
    console.error("[orchestration] step sync failed", err);
  }
}

export async function getOrchestrationRun(runId: string, companyId: string) {
  return prisma.agentRun.findFirst({
    where: { id: runId, companyId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function listOrchestrationRuns(
  companyId: string,
  opts: { projectId?: string; limit?: number } = {}
) {
  return prisma.agentRun.findMany({
    where: {
      companyId,
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 20,
    include: {
      steps: { orderBy: { sortOrder: "asc" }, select: { agentId: true, agentName: true, status: true } },
    },
  });
}

export function describeWorkflow(workflow: WorkflowDefinition) {
  return {
    ...workflow,
    agents: workflow.agentIds.map((id) => getAgent(id)).filter(Boolean),
  };
}
