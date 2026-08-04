import { NextRequest, NextResponse } from "next/server";
import { ensureOwnedProject, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { runOrchestration } from "@/lib/ai/orchestration/orchestrator";
import type { BotEvent } from "@/lib/ai/bots-client";
import { AGENT_REGISTRY, WORKFLOWS } from "@/lib/ai/orchestration/registry";

type Ctx = { params: Promise<{ id: string }> };

/** Agent roster + workflows for this project context */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("project:read");
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);
    return NextResponse.json({
      agents: AGENT_REGISTRY,
      workflows: WORKFLOWS,
      defaultWorkflowId: "estimating-pipeline",
    });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * SSE — AI Agent Orchestration run for the project.
 * Persists AgentRun / AgentStep and streams the same BotEvent shape as /bots.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  let user;
  try {
    user = await requirePermission("estimate:run");
  } catch (error) {
    return jsonError(error);
  }

  const { id } = await ctx.params;
  try {
    await ensureOwnedProject(id, user.companyId);
  } catch (error) {
    return jsonError(error);
  }

  const body = await req.json().catch(() => ({}));
  const fillCart = body.fillCart !== false;
  const syncSpruce = body.syncSpruce !== false;
  const workflowId = typeof body.workflowId === "string" ? body.workflowId : "estimating-pipeline";

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: BotEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const result = await runOrchestration({
          companyId: user.companyId,
          projectId: id,
          startedById: user.id,
          workflowId,
          fillCart,
          syncSpruce,
          emit: send,
        });

        if (result.status === "FAILED" && result.error) {
          // Ensure clients that missed step errors still close cleanly
          send({
            type: "error",
            message: result.error,
            data: { runId: result.runId },
          });
        }
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Orchestration failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
