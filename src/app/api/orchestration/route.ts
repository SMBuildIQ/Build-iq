import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { AGENT_REGISTRY, WORKFLOWS } from "@/lib/ai/orchestration/registry";
import {
  describeWorkflow,
  listOrchestrationRuns,
} from "@/lib/ai/orchestration/orchestrator";

/** List agents, workflows, and recent orchestration runs for the company. */
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("project:read");
    const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
    const runs = await listOrchestrationRuns(user.companyId, { projectId, limit: 25 });

    return NextResponse.json({
      agents: AGENT_REGISTRY,
      workflows: WORKFLOWS.map((w) => describeWorkflow(w)),
      runs,
      orchestration: {
        engine: "buildiq-orchestrator",
        version: 1,
        persistence: "AgentRun + AgentStep",
        defaultWorkflowId: "estimating-pipeline",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
