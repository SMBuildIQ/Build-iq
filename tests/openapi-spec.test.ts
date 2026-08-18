import { test } from "node:test";
import assert from "node:assert/strict";
import { openApiSpec } from "../src/lib/openapi";

// brief §33: a real, public OpenAPI spec — but "real" for a hand-written spec
// means "every $ref actually resolves," which nothing checked. A renamed or
// deleted schema anywhere in components.schemas would leave a dangling $ref
// pointing at nothing, and neither the build nor a manual glance at the
// rendered /api-docs page would necessarily catch it.

function resolveJsonPointer(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith("#/")) return undefined;
  const segments = pointer.slice(2).split("/");
  let node: unknown = root;
  for (const segment of segments) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

function collectRefs(node: unknown, refs: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
    return;
  }
  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") refs.add(value);
      else collectRefs(value, refs);
    }
  }
}

test("the spec is valid, non-circular JSON — round-trips through stringify/parse without throwing", () => {
  const serialized = JSON.stringify(openApiSpec);
  assert.ok(serialized.length > 1000);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.openapi, "3.0.3");
});

test("every $ref in the spec resolves to something that actually exists", () => {
  const refs = new Set<string>();
  collectRefs(openApiSpec, refs);
  assert.ok(refs.size > 10, "expected the spec to actually contain $refs to check");

  const dangling: string[] = [];
  for (const ref of refs) {
    if (resolveJsonPointer(openApiSpec, ref) === undefined) dangling.push(ref);
  }
  assert.deepEqual(dangling, []);
});

test("every path defines at least one HTTP method with a responses object", () => {
  const methods = ["get", "post", "put", "patch", "delete"];
  const badPaths: string[] = [];
  for (const [path, operations] of Object.entries(openApiSpec.paths)) {
    const definedMethods = methods.filter((m) => m in (operations as object));
    if (definedMethods.length === 0) {
      badPaths.push(path);
      continue;
    }
    for (const method of definedMethods) {
      const op = (operations as Record<string, { responses?: unknown }>)[method];
      if (!op.responses || Object.keys(op.responses).length === 0) badPaths.push(`${method.toUpperCase()} ${path}`);
    }
  }
  assert.deepEqual(badPaths, []);
});

test("core route groups from the brief are actually documented, not just a handful of examples", () => {
  const paths = Object.keys(openApiSpec.paths);
  const mustCover = ["/auth/login", "/purchase-requests", "/rfqs", "/suppliers", "/purchase-orders"];
  for (const prefix of mustCover) {
    assert.ok(
      paths.some((p) => p === prefix || p.startsWith(`${prefix}/`)),
      `expected some documented path under ${prefix}`
    );
  }
});

test("every tag referenced by an operation is declared in the top-level tags list", () => {
  const declaredTags = new Set(openApiSpec.tags.map((t) => t.name));
  const undeclaredUsages: string[] = [];
  for (const [path, operations] of Object.entries(openApiSpec.paths)) {
    for (const [method, op] of Object.entries(operations as Record<string, { tags?: string[] }>)) {
      for (const tag of op.tags ?? []) {
        if (!declaredTags.has(tag)) undeclaredUsages.push(`${method.toUpperCase()} ${path} -> "${tag}"`);
      }
    }
  }
  assert.deepEqual(undeclaredUsages, []);
});
