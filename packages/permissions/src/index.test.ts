import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, permissionsFor, normalizeRole } from "./index";

describe("permissions", () => {
  it("normalizes unknown roles to VIEWER", () => {
    assert.equal(normalizeRole("GUEST"), "VIEWER");
    assert.equal(normalizeRole("not-a-role"), "VIEWER");
  });

  it("OWNER can send proposals", () => {
    assert.equal(hasPermission("OWNER", "proposal:send"), true);
  });

  it("VIEWER cannot write projects", () => {
    assert.equal(hasPermission("VIEWER", "project:write"), false);
    assert.ok(permissionsFor("VIEWER").includes("project:read"));
  });

  it("SALES can send proposals", () => {
    assert.equal(hasPermission("SALES", "proposal:send"), true);
  });
});
