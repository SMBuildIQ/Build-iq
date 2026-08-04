import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loginSchema, createProjectSchema, createProposalSchema } from "./index";

describe("validation", () => {
  it("accepts demo login credentials", () => {
    const parsed = loginSchema.safeParse({
      email: "demo@buildiq.app",
      password: "demo1234",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects short passwords", () => {
    const parsed = loginSchema.safeParse({ email: "a@b.co", password: "short" });
    assert.equal(parsed.success, false);
  });

  it("requires project name", () => {
    assert.equal(createProjectSchema.safeParse({ name: "A" }).success, false);
    assert.equal(createProjectSchema.safeParse({ name: "Oak Ridge" }).success, true);
  });

  it("requires proposal projectId", () => {
    assert.equal(createProposalSchema.safeParse({}).success, false);
    assert.equal(createProposalSchema.safeParse({ projectId: "proj_1" }).success, true);
  });
});
