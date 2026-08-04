import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { getOrchestrationRun, describeWorkflow } from "@/lib/ai/orchestration/orchestrator";
import { getWorkflow } from "@/lib/ai/orchestration/registry";

type Ctx = { params: Promise<{ runId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("project:read");
    const { runId } = await ctx.params;
    const run = await getOrchestrationRun(runId, user.companyId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    const workflow = getWorkflow(run.workflowId);
    return NextResponse.json({
      run,
      workflow: workflow ? describeWorkflow(workflow) : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
