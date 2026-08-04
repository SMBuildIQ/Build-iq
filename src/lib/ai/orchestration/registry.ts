/**
 * AI Agent registry — single source of truth for orchestrated agents and workflows.
 * Client-safe (no Node/Prisma imports).
 */

import type { BotId } from "@/lib/ai/bots-client";

export type AgentStatus = "active" | "planned";

export type AgentDefinition = {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: AgentStatus;
  /** Agents that should complete before this one in a workflow */
  dependsOn?: string[];
  /** If true, workflow continues when this agent fails */
  optional?: boolean;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  description: string;
  /** Ordered agent ids (dependencies enforced by orchestrator) */
  agentIds: string[];
};

/** Registered agents available to the orchestrator */
export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: "plan-reader",
    name: "Plan Reader",
    role: "OCR + drawing vision scan of sheets",
    capabilities: ["ocr", "vision", "document-classify", "rasterize"],
    status: "active",
  },
  {
    id: "takeoff",
    name: "Takeoff Bot",
    role: "Vision-grounded materials & quantities",
    capabilities: ["takeoff", "quantity", "catalog-match"],
    status: "active",
    dependsOn: ["plan-reader"],
  },
  {
    id: "estimate",
    name: "Estimate Bot",
    role: "Builds cost rollup",
    capabilities: ["pricing-rollup", "estimate"],
    status: "active",
    dependsOn: ["takeoff"],
  },
  {
    id: "bids",
    name: "Bid Bot",
    role: "Creates trade bid packages",
    capabilities: ["bid-packages", "trade-split"],
    status: "active",
    dependsOn: ["estimate"],
  },
  {
    id: "packages",
    name: "Package Bot",
    role: "Loads shop cart from takeoff",
    capabilities: ["procurement", "cart"],
    status: "active",
    dependsOn: ["takeoff"],
    optional: true,
  },
  {
    id: "spruce",
    name: "Spruce Bot",
    role: "Syncs pricing & quote prep",
    capabilities: ["spruce-sync", "erp"],
    status: "active",
    dependsOn: ["takeoff"],
    optional: true,
  },
  {
    id: "briefing",
    name: "Briefing Bot",
    role: "Summarizes next steps",
    capabilities: ["summary", "briefing"],
    status: "active",
    dependsOn: ["estimate", "bids"],
  },
  {
    id: "cabinetry-extractor",
    name: "Cabinetry Extractor",
    role: "AI room/cabinet extraction for proposals",
    capabilities: ["cabinetry", "schedule-extract"],
    status: "planned",
  },
  {
    id: "cabinetry-pricer",
    name: "Cabinetry Pricer",
    role: "Applies approved catalog pricing rules",
    capabilities: ["cabinetry", "catalog-pricing"],
    status: "planned",
    dependsOn: ["cabinetry-extractor"],
  },
];

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "estimating-pipeline",
    name: "Residential estimating pipeline",
    description:
      "Orchestrates plan reading, takeoff, estimate, bids, packages, Spruce, and briefing for a project.",
    agentIds: ["plan-reader", "takeoff", "estimate", "bids", "packages", "spruce", "briefing"],
  },
  {
    id: "cabinetry-proposal-pipeline",
    name: "Cabinetry proposal pipeline",
    description: "Planned — extract schedule, review, price from catalog, draft proposal.",
    agentIds: ["cabinetry-extractor", "cabinetry-pricer"],
  },
];

export function getAgent(id: string) {
  return AGENT_REGISTRY.find((a) => a.id === id) || null;
}

export function getWorkflow(id: string) {
  return WORKFLOWS.find((w) => w.id === id) || null;
}

export function activeAgents() {
  return AGENT_REGISTRY.filter((a) => a.status === "active");
}

/** Map orchestrator agent ids that are also estimating BotIds */
export function isBotId(id: string): id is BotId {
  return [
    "plan-reader",
    "takeoff",
    "estimate",
    "bids",
    "packages",
    "spruce",
    "briefing",
  ].includes(id);
}
