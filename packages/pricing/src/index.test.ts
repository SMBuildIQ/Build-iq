import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateEstimate,
  depositAmount,
  lineExtendedCost,
  mapMaterialToProposalCategory,
} from "./index";

describe("pricing", () => {
  it("extends line cost with waste", () => {
    assert.equal(lineExtendedCost({ quantity: 10, unitCost: 5, wasteFactor: 0.1 }), 55);
  });

  it("rolls up estimate grand total", () => {
    const est = calculateEstimate([
      { quantity: 100, unitCost: 10, laborHours: 10, laborRate: 50, wasteFactor: 0.1 },
    ]);
    assert.ok(est.grandTotal > est.materialCost);
    assert.equal(est.materialCost, 1000);
    assert.equal(est.laborCost, 500);
  });

  it("computes deposit", () => {
    assert.equal(depositAmount(1000, 0.3), 300);
  });

  it("maps trades to proposal categories", () => {
    assert.equal(mapMaterialToProposalCategory("framing"), "Lumber");
    assert.equal(mapMaterialToProposalCategory("windows"), "Windows");
    assert.equal(mapMaterialToProposalCategory("misc", "roofing"), "Trusses");
  });
});
