import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_REGISTRY,
  WORKFLOWS,
  getAgent,
  getWorkflow,
  activeAgents,
  isBotId,
} from "../src/lib/ai/orchestration/registry";

describe("AI agent orchestration registry", () => {
  it("registers active estimating agents", () => {
    const active = activeAgents();
    assert.ok(active.length >= 7);
    assert.ok(getAgent("plan-reader"));
    assert.ok(getAgent("takeoff")?.dependsOn?.includes("plan-reader"));
  });

  it("defines estimating-pipeline workflow with bot-compatible agents", () => {
    const wf = getWorkflow("estimating-pipeline");
    assert.ok(wf);
    assert.equal(wf!.id, WORKFLOWS[0].id);
    for (const id of wf!.agentIds) {
      assert.ok(isBotId(id), `${id} should be a BotId`);
      assert.equal(getAgent(id)?.status, "active");
    }
  });

  it("keeps cabinetry agents planned (not auto-run)", () => {
    assert.equal(getAgent("cabinetry-extractor")?.status, "planned");
    const cabinetry = getWorkflow("cabinetry-proposal-pipeline");
    assert.ok(cabinetry);
    for (const id of cabinetry!.agentIds) {
      assert.equal(getAgent(id)?.status, "planned");
    }
  });

  it("lists unique agent ids", () => {
    const ids = AGENT_REGISTRY.map((a) => a.id);
    assert.equal(ids.length, new Set(ids).size);
  });
});
