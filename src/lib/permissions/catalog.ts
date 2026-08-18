// RBAC permission catalog (brief §2: "Do not hard-code permissions directly into
// individual screens. Build a proper RBAC/permissions architecture.")
//
// Permissions are never checked by role name in application code — always by
// permission key via hasPermission()/requirePermission() (see check.ts). Role→
// permission mappings live in the database (RolePermission) so an organization can
// eventually customize them without a code change; DEFAULT_ROLES below is only the
// seed data for new organizations.

export const PERMISSIONS = [
  // Purchase requests
  { key: "purchase_request:create", category: "purchasing", description: "Create purchase requests" },
  { key: "purchase_request:view", category: "purchasing", description: "View purchase requests" },
  { key: "purchase_request:edit", category: "purchasing", description: "Edit purchase requests" },
  { key: "purchase_request:cancel", category: "purchasing", description: "Cancel purchase requests" },

  // Sourcing / RFQ
  { key: "rfq:create", category: "sourcing", description: "Create and send RFQs" },
  { key: "rfq:view", category: "sourcing", description: "View RFQs and supplier responses" },
  { key: "quote:review", category: "sourcing", description: "Review and compare quotes" },
  { key: "negotiation:initiate", category: "sourcing", description: "Initiate AI-assisted negotiations" },

  // Suppliers
  { key: "supplier:view", category: "suppliers", description: "View supplier records" },
  { key: "supplier:manage", category: "suppliers", description: "Create/edit suppliers, set approved/restricted status" },

  // Approvals
  { key: "approval:decide", category: "approvals", description: "Approve, reject, or request changes on approval steps" },
  { key: "approval:view", category: "approvals", description: "View approval requests" },

  // Purchase orders / fulfillment
  { key: "purchase_order:view", category: "orders", description: "View purchase orders" },
  { key: "purchase_order:issue", category: "orders", description: "Issue purchase orders" },
  { key: "receiving:record", category: "orders", description: "Record receipt of goods" },
  { key: "invoice:manage", category: "orders", description: "Manage invoices and matching" },

  // Admin
  { key: "org:manage_settings", category: "admin", description: "Manage organization settings and policies" },
  { key: "org:manage_users", category: "admin", description: "Invite/remove users, assign roles" },
  { key: "org:manage_roles", category: "admin", description: "Create/edit roles and permission grants" },
  { key: "analytics:view", category: "admin", description: "View dashboards and purchasing intelligence" },
  { key: "audit_log:view", category: "admin", description: "View audit logs" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

// Standard role set seeded for every new organization (brief §2 example roles).
export const DEFAULT_ROLES: { key: string; name: string; permissions: PermissionKey[] }[] = [
  {
    key: "company_owner",
    name: "Company Owner",
    permissions: PERMISSIONS.map((p) => p.key) as PermissionKey[],
  },
  {
    key: "cfo",
    name: "CFO",
    permissions: [
      "purchase_request:view", "rfq:view", "quote:review",
      "approval:decide", "approval:view",
      "purchase_order:view", "invoice:manage",
      "org:manage_settings", "analytics:view", "audit_log:view",
    ],
  },
  {
    key: "purchasing_director",
    name: "Purchasing Director",
    permissions: [
      "purchase_request:create", "purchase_request:view", "purchase_request:edit", "purchase_request:cancel",
      "rfq:create", "rfq:view", "quote:review", "negotiation:initiate",
      "supplier:view", "supplier:manage",
      "approval:decide", "approval:view",
      "purchase_order:view", "purchase_order:issue",
      "org:manage_settings", "analytics:view", "audit_log:view",
    ],
  },
  {
    key: "purchasing_manager",
    name: "Purchasing Manager",
    permissions: [
      "purchase_request:create", "purchase_request:view", "purchase_request:edit",
      "rfq:create", "rfq:view", "quote:review", "negotiation:initiate",
      "supplier:view", "supplier:manage",
      "approval:view",
      "purchase_order:view", "purchase_order:issue",
      "analytics:view",
    ],
  },
  {
    key: "buyer",
    name: "Buyer",
    permissions: [
      "purchase_request:create", "purchase_request:view", "purchase_request:edit",
      "rfq:create", "rfq:view", "quote:review", "negotiation:initiate",
      "supplier:view",
      "purchase_order:view",
    ],
  },
  {
    key: "department_manager",
    name: "Department Manager",
    permissions: [
      "purchase_request:create", "purchase_request:view",
      "approval:decide", "approval:view",
      "analytics:view",
    ],
  },
  {
    key: "accounting",
    name: "Accounting",
    permissions: [
      "purchase_request:view", "purchase_order:view", "invoice:manage",
      "analytics:view", "audit_log:view",
    ],
  },
  {
    key: "receiving",
    name: "Receiving/Warehouse",
    permissions: ["purchase_order:view", "receiving:record"],
  },
  {
    key: "viewer",
    name: "Viewer",
    permissions: ["purchase_request:view", "rfq:view", "purchase_order:view", "analytics:view"],
  },
];

// Platform Super Admin is a global flag on User (out of tenant scope entirely),
// not an org-scoped Role — see src/lib/auth/session.ts.
