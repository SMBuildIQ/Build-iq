import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapMaterialToProposalCategory } from "../src/lib/proposals/categories";
import { buildSectionsFromMaterials } from "../src/lib/proposals/service";
import { buildProposalPdf } from "../src/lib/export/proposal-pdf";
import type {
  Company,
  Proposal,
  ProposalAcceptance,
  ProposalLine,
  ProposalSection,
  Project,
  Customer,
} from "@prisma/client";

describe("proposal category mapping", () => {
  it("maps lumber, windows, doors, millwork, trusses", () => {
    assert.equal(mapMaterialToProposalCategory("Lumber", "Framing"), "Lumber");
    assert.equal(mapMaterialToProposalCategory("Sheathing", "Framing"), "Lumber");
    assert.equal(mapMaterialToProposalCategory("Windows", "Windows & Doors"), "Windows");
    assert.equal(mapMaterialToProposalCategory("Doors", "Windows & Doors"), "Doors");
    assert.equal(mapMaterialToProposalCategory("Hardware", "Windows & Doors"), "Door Hardware");
    assert.equal(mapMaterialToProposalCategory("Roofing", "Roofing"), "Trusses");
    assert.equal(mapMaterialToProposalCategory("Millwork", "Millwork"), "Millwork");
    assert.equal(mapMaterialToProposalCategory("Cabinetry", "Cabinetry"), "Cabinetry");
  });
});

describe("buildSectionsFromMaterials", () => {
  it("groups takeoff into category sections", () => {
    const sections = buildSectionsFromMaterials([
      {
        id: "1",
        category: "Lumber",
        trade: "Framing",
        name: "2x4 Stud",
        description: null,
        quantity: 100,
        unit: "ea",
        unitCost: 5,
        laborHours: 1,
        laborRate: 65,
        wasteFactor: 0.1,
        spruceSku: "LUM-1",
      },
      {
        id: "2",
        category: "Windows",
        trade: "Windows & Doors",
        name: "Vinyl DH",
        description: "Low-E",
        quantity: 12,
        unit: "ea",
        unitCost: 420,
        laborHours: 2,
        laborRate: 65,
        wasteFactor: 0,
        spruceSku: "WIN-1",
      },
      {
        id: "3",
        category: "Doors",
        trade: "Windows & Doors",
        name: "Entry door",
        description: null,
        quantity: 1,
        unit: "ea",
        unitCost: 890,
        laborHours: 1,
        laborRate: 65,
        wasteFactor: 0,
        spruceSku: null,
      },
    ]);

    const cats = sections.map((s) => s.category);
    assert.ok(cats.includes("Lumber"));
    assert.ok(cats.includes("Windows"));
    assert.ok(cats.includes("Doors"));
    assert.equal(sections.find((s) => s.category === "Windows")?.lines.length, 1);
  });
});

describe("buildProposalPdf", () => {
  it("returns a valid PDF for multi-category proposal", async () => {
    const now = new Date();
    const section: ProposalSection & { lines: ProposalLine[] } = {
      id: "sec_1",
      proposalId: "prop_1",
      category: "Lumber",
      title: "Lumber Package",
      notes: "Framing lumber",
      sortOrder: 0,
      subtotal: 550,
      lines: [
        {
          id: "line_1",
          sectionId: "sec_1",
          name: "2x4 Stud",
          description: "SPF",
          category: "Lumber",
          quantity: 100,
          unit: "ea",
          unitPrice: 5,
          lineTotal: 550,
          spruceSku: "LUM-1",
          sortOrder: 0,
          sourceMaterialId: "mat_1",
        },
      ],
    };

    const proposal = {
      id: "prop_1",
      number: "PRO-2026-00001",
      title: "Material Proposal — Oak Street",
      status: "DRAFT",
      version: 1,
      intro: "Thank you for the opportunity.",
      scopeNotes: "Scope includes listed categories.",
      exclusions: "Installation labor.\nPermits.",
      terms: "Valid 30 days.\nDeposit due on accept.",
      validUntil: now,
      depositPct: 0.3,
      materialSubtotal: 550,
      laborSubtotal: 65,
      wasteSubtotal: 55,
      contingencyAmount: 67,
      overheadAmount: 59,
      profitAmount: 95,
      taxAmount: 58,
      grandTotal: 949,
      depositAmount: 284.7,
      publicToken: "test-token",
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      declinedAt: null,
      customerEmail: "builder@example.com",
      customerName: "Demo Builders",
      projectAddress: "123 Oak St, Prescott, AZ",
      createdAt: now,
      updatedAt: now,
      createdById: null,
      companyId: "co_1",
      projectId: "proj_1",
      customerId: null,
      cabinetryOpportunityId: null,
      company: { id: "co_1", name: "Demo Builders", phone: null, city: "Prescott", state: "AZ" },
      customer: null as Customer | null,
      project: {
        id: "proj_1",
        name: "Oak Street Residence",
        status: "ESTIMATED",
        address: "123 Oak St",
        city: "Prescott",
        state: "AZ",
        zip: "86301",
      } as Pick<Project, "id" | "name" | "status" | "address" | "city" | "state" | "zip">,
      acceptance: null as ProposalAcceptance | null,
      sections: [section],
    } satisfies Proposal & {
      company: Pick<Company, "id" | "name" | "phone" | "city" | "state">;
      customer: Customer | null;
      project: Pick<Project, "id" | "name" | "status" | "address" | "city" | "state" | "zip"> | null;
      acceptance: ProposalAcceptance | null;
      sections: (ProposalSection & { lines: ProposalLine[] })[];
    };

    const buffer = await buildProposalPdf(proposal);
    assert.ok(buffer.length > 500);
    assert.equal(buffer.subarray(0, 4).toString("utf8"), "%PDF");
  });
});
