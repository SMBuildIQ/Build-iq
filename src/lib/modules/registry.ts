export type ModuleStatus = "FULL" | "PARTIAL" | "PLANNED";

export type PlatformModule = {
  slug: string;
  name: string;
  status: ModuleStatus;
  description: string;
};

/** Canonical module registry — keep in sync with MODULE_STATUS.md */
export const PLATFORM_MODULES: PlatformModule[] = [
  { slug: "dashboard", name: "Dashboard", status: "PARTIAL", description: "Job list overview. KPI dashboard planned." },
  { slug: "leads-crm", name: "Leads and CRM", status: "PLANNED", description: "Lead capture, pipeline, and follow-ups." },
  { slug: "clients", name: "Clients", status: "PLANNED", description: "Homeowner and client records." },
  { slug: "projects", name: "Projects", status: "FULL", description: "Company-scoped residential jobs." },
  { slug: "estimates", name: "Estimates and budgets", status: "PARTIAL", description: "Cost rollups exist; budget versions planned." },
  { slug: "documents", name: "Plan and document uploads", status: "PARTIAL", description: "Plan uploads work; folders and versions planned." },
  { slug: "takeoffs", name: "Material takeoffs", status: "PARTIAL", description: "AI/local takeoff; true plan digitizing planned." },
  { slug: "bids", name: "Subcontractor bid management", status: "PARTIAL", description: "Internal packages; sub portal planned." },
  { slug: "purchase-orders", name: "Purchase orders", status: "PLANNED", description: "PO creation and vendor fulfillment." },
  { slug: "scheduling", name: "Scheduling", status: "PLANNED", description: "Job schedules and crew calendars." },
  { slug: "daily-logs", name: "Daily logs", status: "PLANNED", description: "Jobsite daily logs with offline sync." },
  { slug: "photos", name: "Photos and videos", status: "PLANNED", description: "Jobsite media capture and galleries." },
  { slug: "rfis", name: "RFIs", status: "PLANNED", description: "Request for information workflows." },
  { slug: "submittals", name: "Submittals", status: "PLANNED", description: "Submittal tracking and approvals." },
  { slug: "change-orders", name: "Change orders", status: "PLANNED", description: "CO pricing and client approval." },
  { slug: "selections", name: "Selections and approvals", status: "PLANNED", description: "Finish selections and sign-off." },
  { slug: "invoices", name: "Invoices and progress billing", status: "PLANNED", description: "Draw schedules and invoices." },
  { slug: "budget-vs-actual", name: "Budget-versus-actual", status: "PLANNED", description: "Cost reporting against budget." },
  { slug: "client-portal", name: "Client portal", status: "PLANNED", description: "Homeowner-facing project view." },
  { slug: "vendor-portal", name: "Vendor and subcontractor portal", status: "PLANNED", description: "External party collaboration." },
  { slug: "punch-lists", name: "Punch lists", status: "PLANNED", description: "Punch items with offline updates." },
  { slug: "warranty", name: "Warranty management", status: "PLANNED", description: "Post-close warranty tickets." },
  { slug: "notifications", name: "Notifications", status: "PLANNED", description: "In-app, email, and push preferences." },
  { slug: "ai-assistant", name: "AI assistant", status: "PARTIAL", description: "Bot pipeline after upload; conversational assistant planned." },
  {
    slug: "ai-orchestration",
    name: "AI Agent Orchestration",
    status: "FULL",
    description:
      "Multi-agent workflows with AgentRun/AgentStep persistence, registry, and SSE streaming.",
  },
  {
    slug: "cabinetry",
    name: "AI Cabinetry Proposals",
    status: "PARTIAL",
    description:
      "Phase 1 started: customers, Mesa/Summit/Pinnacle product lines, opportunities. See OWNER_APPROVALS.md.",
  },
  { slug: "company-settings", name: "Company settings and permissions", status: "PARTIAL", description: "Team invites and RBAC; deeper settings planned." },
];

export function getModule(slug: string) {
  return PLATFORM_MODULES.find((m) => m.slug === slug) || null;
}
