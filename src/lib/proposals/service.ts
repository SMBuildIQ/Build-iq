import { randomBytes } from "crypto";
import type { Estimate, MaterialItem, Project, Customer, Company } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lineExtendedCost } from "@/lib/estimate/calculator";
import {
  categorySortIndex,
  mapMaterialToProposalCategory,
  SECTION_BLURBS,
  type ProposalCategory,
} from "@/lib/proposals/categories";
import {
  defaultProposalExclusions,
  defaultProposalIntro,
  defaultProposalTerms,
  defaultScopeNotes,
} from "@/lib/proposals/defaults";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function newPublicToken() {
  return randomBytes(24).toString("base64url");
}

export async function nextProposalNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRO-${year}-`;
  const latest = await prisma.proposal.findFirst({
    where: { companyId, number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let seq = 1;
  if (latest?.number) {
    const part = latest.number.slice(prefix.length);
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

type MaterialLike = Pick<
  MaterialItem,
  | "id"
  | "category"
  | "trade"
  | "name"
  | "description"
  | "quantity"
  | "unit"
  | "unitCost"
  | "laborHours"
  | "laborRate"
  | "wasteFactor"
  | "spruceSku"
>;

type BuildInput = {
  companyId: string;
  createdById?: string | null;
  project: Project & { company?: Pick<Company, "name"> | null; customer?: Customer | null };
  materials: MaterialLike[];
  estimate: Estimate | null;
  customerId?: string | null;
  title?: string;
  depositPct?: number;
  validDays?: number;
  cabinetryOpportunityId?: string | null;
};

export type BuiltSection = {
  category: ProposalCategory;
  title: string;
  notes: string;
  sortOrder: number;
  subtotal: number;
  lines: {
    name: string;
    description: string | null;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
    spruceSku: string | null;
    sortOrder: number;
    sourceMaterialId: string;
  }[];
};

/** Group takeoff materials into polished proposal sections by category. */
export function buildSectionsFromMaterials(materials: MaterialLike[]): BuiltSection[] {
  const buckets = new Map<ProposalCategory, BuiltSection>();

  for (const m of materials) {
    const category = mapMaterialToProposalCategory(m.category, m.trade);
    let section = buckets.get(category);
    if (!section) {
      section = {
        category,
        title: `${category} Package`,
        notes: SECTION_BLURBS[category],
        sortOrder: categorySortIndex(category),
        subtotal: 0,
        lines: [],
      };
      buckets.set(category, section);
    }
    const lineTotal = round2(lineExtendedCost(m));
    section.lines.push({
      name: m.name,
      description: m.description,
      category: m.category,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice: m.unitCost,
      lineTotal,
      spruceSku: m.spruceSku,
      sortOrder: section.lines.length,
      sourceMaterialId: m.id,
    });
    section.subtotal = round2(section.subtotal + lineTotal);
  }

  return [...buckets.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

function addressFromProject(project: Project) {
  return [project.address, project.city, project.state, project.zip].filter(Boolean).join(", ") || null;
}

/** Persist a full proposal from project takeoff (all categories present in materials). */
export async function createProposalFromProject(input: BuildInput) {
  const {
    companyId,
    createdById,
    project,
    materials,
    estimate,
    depositPct = 0.3,
    validDays = 30,
  } = input;

  if (!materials.length) {
    throw Object.assign(new Error("Upload plans and run takeoff before creating a proposal"), {
      status: 400,
    });
  }

  const sections = buildSectionsFromMaterials(materials);
  const companyName = project.company?.name || "your builder";
  const customer = project.customer;
  const customerId = input.customerId ?? project.customerId ?? null;
  const number = await nextProposalNumber(companyId);
  const publicToken = newPublicToken();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  const materialSubtotal = estimate?.materialCost ?? round2(sections.reduce((s, x) => s + x.subtotal, 0));
  const laborSubtotal = estimate?.laborCost ?? 0;
  const wasteSubtotal = estimate?.wasteCost ?? 0;
  const contingencyAmount = estimate?.contingencyCost ?? 0;
  const overheadAmount = estimate?.overheadCost ?? 0;
  const profitAmount = estimate?.profitAmount ?? 0;
  const taxAmount = estimate?.taxAmount ?? 0;
  const grandTotal =
    estimate?.grandTotal ??
    round2(
      materialSubtotal +
        laborSubtotal +
        wasteSubtotal +
        contingencyAmount +
        overheadAmount +
        profitAmount +
        taxAmount
    );
  const depositAmount = round2(grandTotal * depositPct);

  const proposal = await prisma.proposal.create({
    data: {
      companyId,
      projectId: project.id,
      customerId,
      cabinetryOpportunityId: input.cabinetryOpportunityId || null,
      createdById: createdById || null,
      number,
      title: input.title || `Material Proposal — ${project.name}`,
      status: "DRAFT",
      version: 1,
      intro: defaultProposalIntro(project.name, companyName),
      scopeNotes: defaultScopeNotes(),
      exclusions: defaultProposalExclusions(),
      terms: defaultProposalTerms(validDays),
      validUntil,
      depositPct,
      materialSubtotal,
      laborSubtotal,
      wasteSubtotal,
      contingencyAmount,
      overheadAmount,
      profitAmount,
      taxAmount,
      grandTotal,
      depositAmount,
      publicToken,
      customerEmail: customer?.email || null,
      customerName: customer?.name || companyName,
      projectAddress: addressFromProject(project),
      sections: {
        create: sections.map((s) => ({
          category: s.category,
          title: s.title,
          notes: s.notes,
          sortOrder: s.sortOrder,
          subtotal: s.subtotal,
          lines: {
            create: s.lines.map((l) => ({
              name: l.name,
              description: l.description,
              category: l.category,
              quantity: l.quantity,
              unit: l.unit,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
              spruceSku: l.spruceSku,
              sortOrder: l.sortOrder,
              sourceMaterialId: l.sourceMaterialId,
            })),
          },
        })),
      },
    },
    include: {
      sections: { include: { lines: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
      customer: true,
      project: { select: { id: true, name: true, status: true } },
      company: { select: { id: true, name: true, phone: true, city: true, state: true } },
      acceptance: true,
    },
  });

  return proposal;
}

export const proposalInclude = {
  sections: { include: { lines: { orderBy: { sortOrder: "asc" as const } } }, orderBy: { sortOrder: "asc" as const } },
  customer: true,
  project: { select: { id: true, name: true, status: true, address: true, city: true, state: true, zip: true } },
  company: { select: { id: true, name: true, phone: true, city: true, state: true } },
  acceptance: true,
} as const;
