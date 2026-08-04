import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasPermission, normalizeRole, permissionsFor } from "../src/lib/permissions";

describe("RBAC", () => {
  it("VIEWER cannot mutate projects or place orders", () => {
    assert.equal(hasPermission("VIEWER", "project:write"), false);
    assert.equal(hasPermission("VIEWER", "order:place"), false);
    assert.equal(hasPermission("VIEWER", "project:read"), true);
  });

  it("OWNER has account delete", () => {
    assert.equal(hasPermission("OWNER", "account:delete"), true);
    assert.equal(hasPermission("ADMIN", "account:delete"), false);
  });

  it("PURCHASING can advance orders but not configure Spruce", () => {
    assert.equal(hasPermission("PURCHASING", "order:advance"), true);
    assert.equal(hasPermission("PURCHASING", "spruce:configure"), false);
  });

  it("normalizes unknown roles to VIEWER", () => {
    assert.equal(normalizeRole("not-a-role"), "VIEWER");
    assert.ok(permissionsFor("ESTIMATOR").includes("estimate:run"));
  });
});
