import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildEstimatePdf } from "../src/lib/export/pdf";
import type { BidPackage, Estimate, MaterialItem, Project } from "@prisma/client";

function baseProject(overrides: Partial<Project> = {}): Project & { company: { name: string } } {
  const now = new Date();
  return {
    id: "proj_1",
    name: "Oak Street Residence",
    address: "123 Oak St",
    city: "Prescott",
    state: "AZ",
    zip: "86301",
    squareFeet: 2400,
    stories: 2,
    status: "ESTIMATED",
    notes: null,
    createdAt: now,
    updatedAt: now,
    companyId: "co_1",
    createdById: null,
    company: { name: "Demo Builders LLC" },
    ...overrides,
  };
}

function material(overrides: Partial<MaterialItem> = {}): MaterialItem {
  return {
    id: "mat_1",
    projectId: "proj_1",
    trade: "Framing",
    category: "Lumber",
    name: "2x6 Stud",
    description: "SPF #2",
    quantity: 120,
    unit: "ea",
    unitCost: 8.5,
    wasteFactor: 0.1,
    laborHours: 4,
    laborRate: 65,
    spruceSku: "SKU-001",
    source: "ai",
    confidence: 0.8,
    bidPackageId: null,
    ...overrides,
  };
}

function estimate(overrides: Partial<Estimate> = {}): Estimate {
  const now = new Date();
  return {
    id: "est_1",
    projectId: "proj_1",
    materialCost: 10000,
    laborCost: 5000,
    wasteCost: 1000,
    contingencyPct: 0.1,
    contingencyCost: 1600,
    overheadPct: 0.08,
    overheadCost: 1408,
    profitPct: 0.12,
    profitAmount: 2281.0,
    taxPct: 0.065,
    taxAmount: 1418.77,
    grandTotal: 22707.77,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("buildEstimatePdf", () => {
  it("returns a valid PDF buffer with estimate and takeoff", async () => {
    const buffer = await buildEstimatePdf({
      project: baseProject(),
      materials: [
        material(),
        material({
          id: "mat_2",
          trade: "Electrical",
          category: "Rough",
          name: "14/2 NM Cable",
          quantity: 500,
          unit: "ft",
          unitCost: 0.45,
          laborHours: 8,
          spruceSku: null,
        }),
      ],
      estimate: estimate(),
      bidPackages: [
        {
          id: "bid_1",
          projectId: "proj_1",
          trade: "Framing",
          title: "Framing Bid Package",
          description: "Scope",
          status: "DRAFT",
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as BidPackage,
      ],
    });

    assert.ok(buffer.length > 500, "PDF should have substantial size");
    assert.equal(buffer.subarray(0, 5).toString("ascii"), "%PDF-");
    // EOF marker typically near end
    const tail = buffer.subarray(-32).toString("latin1");
    assert.match(tail, /%%EOF/);
  });

  it("still produces a PDF when estimate is missing", async () => {
    const buffer = await buildEstimatePdf({
      project: baseProject({ status: "DRAFT" }),
      materials: [],
      estimate: null,
      bidPackages: [],
    });
    assert.equal(buffer.subarray(0, 5).toString("ascii"), "%PDF-");
  });
});
