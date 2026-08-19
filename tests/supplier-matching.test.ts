import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCategories, matchingCategories, rankSuppliersByCategoryMatch } from "../src/lib/supplierMatching";

test("parseCategories round-trips a stored JSON array", () => {
  assert.deepEqual(parseCategories(JSON.stringify(["Electrical", "Plumbing"])), ["Electrical", "Plumbing"]);
});

test("parseCategories returns empty array for null, empty JSON array, and garbage", () => {
  assert.deepEqual(parseCategories(null), []);
  assert.deepEqual(parseCategories("[]"), []);
  assert.deepEqual(parseCategories("not json"), []);
  assert.deepEqual(parseCategories(JSON.stringify({ not: "an array" })), []);
});

test("parseCategories drops non-string entries rather than crashing on malformed data", () => {
  assert.deepEqual(parseCategories(JSON.stringify(["Electrical", 5, null, "Plumbing"])), ["Electrical", "Plumbing"]);
});

test("matchingCategories is case-insensitive and returns only the overlapping categories", () => {
  assert.deepEqual(matchingCategories(["Electrical", "HVAC"], ["electrical", "Plumbing"]), ["Electrical"]);
  assert.deepEqual(matchingCategories(["Electrical"], ["Plumbing"]), []);
  assert.deepEqual(matchingCategories([], ["Electrical"]), []);
});

test("rankSuppliersByCategoryMatch sorts matched suppliers first, most matches first, preserving stable order among ties", () => {
  const suppliers = [
    { id: "a", categories: ["Plumbing"] },
    { id: "b", categories: ["Electrical", "HVAC"] },
    { id: "c", categories: [] },
    { id: "d", categories: ["Electrical"] },
  ];
  const ranked = rankSuppliersByCategoryMatch(suppliers, ["Electrical", "HVAC"]);
  assert.deepEqual(
    ranked.map((r) => r.supplier.id),
    ["b", "d", "a", "c"]
  );
  assert.deepEqual(ranked[0].matchedCategories, ["Electrical", "HVAC"]);
  assert.deepEqual(ranked[1].matchedCategories, ["Electrical"]);
  assert.deepEqual(ranked[2].matchedCategories, []);
});

test("rankSuppliersByCategoryMatch with no target categories leaves every supplier unmatched, original order preserved", () => {
  const suppliers = [
    { id: "a", categories: ["Plumbing"] },
    { id: "b", categories: [] },
  ];
  const ranked = rankSuppliersByCategoryMatch(suppliers, []);
  assert.deepEqual(
    ranked.map((r) => r.supplier.id),
    ["a", "b"]
  );
  assert.ok(ranked.every((r) => r.matchedCategories.length === 0));
});
