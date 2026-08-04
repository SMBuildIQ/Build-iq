import { LEGAL } from "@/lib/legal";

export const PROPOSAL_STATUSES = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "SUPERSEDED",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export function defaultProposalIntro(projectName: string, companyName: string) {
  return (
    `Thank you for the opportunity to propose materials for ${projectName}. ` +
    `${LEGAL.productName} by ${LEGAL.entityName} has prepared this proposal from your ` +
    `project takeoff for ${companyName}. Quantities are based on uploaded plans and ` +
    `AI-assisted takeoff — please field-verify before ordering.`
  );
}

export function defaultProposalExclusions() {
  return [
    "Installation labor unless explicitly listed as supply-and-install.",
    "Permits, engineering stamps (except truss layout drawings when included), and inspections.",
    "Site conditions, frost protection, and unforeseen framing corrections.",
    "Finish hardware finishes beyond the listed schedule.",
    "Sales tax adjustments if job tax status differs from estimate assumptions.",
  ].join("\n");
}

export function defaultProposalTerms(validDays = 30) {
  return [
    `This proposal is valid for ${validDays} days from the date sent unless otherwise noted.`,
    `A deposit of the stated percentage is due upon acceptance to reserve materials and fabrication slots.`,
    `Balance is due per Supply Monkey terms prior to delivery or as otherwise agreed in writing.`,
    `Lead times are estimates and begin after deposit, final selections, and approved shop drawings where required.`,
    `Prices may adjust if takeoff quantities change after field verification or plan revisions.`,
    `Acceptance of this proposal constitutes agreement to the scope, exclusions, and commercial terms herein.`,
    `Governing law: ${LEGAL.governingState}, ${LEGAL.governingCountry}.`,
    `Questions: ${LEGAL.supportEmail} · ${LEGAL.addressOneLine}`,
  ].join("\n");
}

export function defaultScopeNotes() {
  return (
    "Scope includes material packages and line items listed by category below. " +
    "Windows, doors, lumber, trusses, cabinetry, masonry stone, door hardware, and millwork " +
    "are proposed where takeoff quantities were identified."
  );
}
