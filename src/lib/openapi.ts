// Hand-written but hand-in-hand with the actual route handlers under
// src/app/api/v1 — this is the single source of truth for /api/v1/openapi.json
// and the /api-docs page (both render this same object, so there is no
// separate copy to drift out of sync). Update this file whenever a route's
// contract changes. Component schemas are intentionally simplified relative to
// the full Prisma models (see DATABASE_SCHEMA.md for the exhaustive field list)
// — this documents the request/response *shape* a client should code against.

const sessionCookieAuth = { cookieAuth: [] as string[] };

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const idParam = { name: "id", in: "path", required: true, schema: { type: "string" } };

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "BuildIQ Purchasing API",
    version: "1",
    description:
      "Versioned REST API for the BuildIQ AI purchasing platform. Authenticated routes require the " +
      "`buildiq_session` cookie set by /auth/login or /auth/register and are always scoped to that " +
      "session's active organization — there is no way to pass an organization id as a parameter. " +
      "The /portal and /invites/accept routes are the sole public, token-authenticated exceptions.",
  },
  servers: [{ url: "/api/v1" }],
  security: [sessionCookieAuth],
  tags: [
    { name: "Auth" },
    { name: "Purchase Requests" },
    { name: "Suppliers" },
    { name: "RFQs" },
    { name: "Quotes" },
    { name: "Negotiations" },
    { name: "Approvals" },
    { name: "Purchase Orders" },
    { name: "Invoices" },
    { name: "Documents" },
    { name: "Notifications" },
    { name: "Audit Log" },
    { name: "Org Setup" },
    { name: "Invites" },
    { name: "Supplier Portal", description: "Public, token-authenticated — no session cookie." },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create a user and a new organization; caller becomes Company Owner",
        security: [],
        requestBody: jsonBody({
          type: "object",
          required: ["organizationName", "name", "email", "password"],
          properties: {
            organizationName: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 10 },
          },
        }),
        responses: { "200": jsonResponse({ $ref: "#/components/schemas/AuthResult" }), "400": errorResponse, "409": errorResponse },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in. Locks out after 5 failed attempts per email in 15 minutes.",
        security: [],
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
        }),
        responses: { "200": jsonResponse({ $ref: "#/components/schemas/AuthResult" }), "401": errorResponse, "429": errorResponse },
      },
    },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Clear the session cookie", responses: { "200": jsonResponse({ type: "object" }) } } },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user, organization, roles, and permissions",
        responses: { "200": jsonResponse({ $ref: "#/components/schemas/Session" }) },
      },
    },
    "/auth/mfa/enroll": {
      post: {
        tags: ["Auth"],
        summary: "Start TOTP MFA enrollment — generates a secret (not yet active) and a QR code",
        responses: {
          "200": jsonResponse({ type: "object", properties: { secret: { type: "string" }, otpauthUrl: { type: "string" }, qrCodeDataUrl: { type: "string" } } }),
          "400": errorResponse,
        },
      },
    },
    "/auth/mfa/verify": {
      post: {
        tags: ["Auth"],
        summary: "Confirm enrollment with a code from the authenticator app — enables MFA and issues one-time backup codes",
        requestBody: jsonBody({ type: "object", required: ["code"], properties: { code: { type: "string" } } }),
        responses: {
          "200": jsonResponse({ type: "object", properties: { enabled: { type: "boolean" }, backupCodes: { type: "array", items: { type: "string" } } } }),
          "400": errorResponse,
        },
      },
    },
    "/auth/mfa/disable": {
      post: {
        tags: ["Auth"],
        summary: "Disable MFA — requires the current password",
        requestBody: jsonBody({ type: "object", required: ["password"], properties: { password: { type: "string" } } }),
        responses: { "200": jsonResponse({ type: "object", properties: { enabled: { type: "boolean" } } }), "400": errorResponse },
      },
    },
    "/auth/mfa/challenge": {
      post: {
        tags: ["Auth"],
        summary: "Second step of login for an MFA-enrolled account — exchanges the mfaToken from /auth/login plus a TOTP or backup code for a real session",
        security: [],
        requestBody: jsonBody({ type: "object", required: ["mfaToken", "code"], properties: { mfaToken: { type: "string" }, code: { type: "string" } } }),
        responses: { "200": jsonResponse({ $ref: "#/components/schemas/AuthResult" }), "401": errorResponse, "429": errorResponse },
      },
    },
    "/purchase-requests": {
      get: {
        tags: ["Purchase Requests"],
        summary: "List purchase requests for the current organization",
        parameters: [{ name: "status", in: "query", schema: { type: "string" } }],
        responses: { "200": jsonResponse(arrayOf("PurchaseRequest", "purchaseRequests")) },
      },
      post: {
        tags: ["Purchase Requests"],
        summary: "Create a purchase request",
        requestBody: jsonBody({ $ref: "#/components/schemas/CreatePurchaseRequestInput" }),
        responses: { "201": jsonResponse({ type: "object", properties: { purchaseRequest: { $ref: "#/components/schemas/PurchaseRequest" } } }), "400": errorResponse },
      },
    },
    "/purchase-requests/ai-parse": {
      post: {
        tags: ["Purchase Requests"],
        summary: "AI-extract structured fields from a plain-English purchase description. Does not persist a request.",
        requestBody: jsonBody({ type: "object", required: ["description"], properties: { description: { type: "string", minLength: 10, maxLength: 4000 } } }),
        responses: { "200": jsonResponse({ $ref: "#/components/schemas/ExtractionResult" }) },
      },
    },
    "/purchase-requests/{id}": {
      get: {
        tags: ["Purchase Requests"],
        summary: "Get a purchase request",
        parameters: [idParam],
        responses: { "200": jsonResponse({ type: "object", properties: { purchaseRequest: { $ref: "#/components/schemas/PurchaseRequest" } } }), "404": errorResponse },
      },
      patch: {
        tags: ["Purchase Requests"],
        summary: "Transition status (validated against a fixed state machine)",
        parameters: [idParam],
        requestBody: jsonBody({ type: "object", properties: { status: { type: "string" }, note: { type: "string" } } }),
        responses: { "200": jsonResponse({ type: "object", properties: { purchaseRequest: { $ref: "#/components/schemas/PurchaseRequest" } } }), "400": errorResponse },
      },
    },
    "/purchase-requests/{id}/recommend": {
      post: {
        tags: ["Purchase Requests"],
        summary: "AI recommendation over received quotes, with visible rationale",
        parameters: [idParam],
        responses: { "200": jsonResponse({ $ref: "#/components/schemas/Recommendation" }), "400": errorResponse },
      },
    },
    "/purchase-requests/{id}/select-quote": {
      post: {
        tags: ["Purchase Requests"],
        summary: "Select a quote — runs the deterministic policy engine, may create an ApprovalRequest",
        parameters: [idParam],
        requestBody: jsonBody({ type: "object", required: ["quoteId"], properties: { quoteId: { type: "string" } } }),
        responses: { "200": jsonResponse({ type: "object", properties: { ok: { type: "boolean" }, requiredApprovals: { type: "array", items: { type: "object" } }, finalAmount: { type: "number" } } }) },
      },
    },
    "/suppliers": {
      get: { tags: ["Suppliers"], summary: "List suppliers", parameters: [{ name: "status", in: "query", schema: { type: "string" } }], responses: { "200": jsonResponse(arrayOf("Supplier", "suppliers")) } },
      post: {
        tags: ["Suppliers"],
        summary: "Create a supplier",
        requestBody: jsonBody({ $ref: "#/components/schemas/CreateSupplierInput" }),
        responses: { "201": jsonResponse({ type: "object", properties: { supplier: { $ref: "#/components/schemas/Supplier" } } }) },
      },
    },
    "/rfqs": {
      get: {
        tags: ["RFQs"],
        summary: "List RFQs",
        parameters: [{ name: "purchaseRequestId", in: "query", schema: { type: "string" } }],
        responses: { "200": jsonResponse(arrayOf("RFQ", "rfqs")) },
      },
      post: {
        tags: ["RFQs"],
        summary: "Create an RFQ from a purchase request's line items",
        requestBody: jsonBody({
          type: "object",
          required: ["purchaseRequestId", "supplierIds"],
          properties: {
            purchaseRequestId: { type: "string" },
            supplierIds: { type: "array", items: { type: "string" } },
            quoteDeadline: { type: "string", format: "date-time" },
            specialInstructions: { type: "string" },
          },
        }),
        responses: { "201": jsonResponse({ type: "object", properties: { rfq: { $ref: "#/components/schemas/RFQ" } } }) },
      },
    },
    "/rfqs/{id}": { get: { tags: ["RFQs"], summary: "Get an RFQ with line items and supplier statuses", parameters: [idParam], responses: { "200": jsonResponse({ type: "object", properties: { rfq: { $ref: "#/components/schemas/RFQ" } } }) } } },
    "/rfqs/{id}/send": {
      post: {
        tags: ["RFQs"],
        summary: "Send the RFQ to its invited suppliers (enqueues + processes the rfq.send background job)",
        parameters: [idParam],
        responses: { "200": jsonResponse({ type: "object", properties: { rfq: { $ref: "#/components/schemas/RFQ" } } }), "400": errorResponse },
      },
    },
    "/rfq-suppliers/{id}/quotes": {
      post: {
        tags: ["Quotes"],
        summary: "Manually record a quote received outside the portal (PDF/Excel/email/phone)",
        parameters: [idParam],
        requestBody: jsonBody({ $ref: "#/components/schemas/ManualQuoteInput" }),
        responses: { "201": jsonResponse({ type: "object", properties: { quote: { $ref: "#/components/schemas/Quote" } } }) },
      },
    },
    "/quotes/{id}/negotiate": {
      post: {
        tags: ["Negotiations"],
        summary: "Draft an AI negotiation ask for a quote (does not send)",
        parameters: [idParam],
        responses: { "201": jsonResponse({ type: "object", properties: { negotiation: { $ref: "#/components/schemas/Negotiation" } } }) },
      },
    },
    "/negotiations/{id}/send": {
      post: {
        tags: ["Negotiations"],
        summary: "Human-initiated send of a drafted negotiation — the only path out of \"proposed\"",
        parameters: [idParam],
        responses: { "200": jsonResponse({ type: "object", properties: { negotiation: { $ref: "#/components/schemas/Negotiation" } } }), "400": errorResponse },
      },
    },
    "/approval-steps/{id}/decide": {
      post: {
        tags: ["Approvals"],
        summary: "Approve, reject, or request changes on one approval step",
        parameters: [idParam],
        requestBody: jsonBody({
          type: "object",
          required: ["decision"],
          properties: { decision: { type: "string", enum: ["approve", "reject", "request_changes"] }, comments: { type: "string" } },
        }),
        responses: { "200": jsonResponse({ type: "object", properties: { ok: { type: "boolean" }, purchaseRequestStatus: { type: "string", nullable: true } } }), "403": errorResponse },
      },
    },
    "/purchase-orders": {
      get: { tags: ["Purchase Orders"], summary: "List purchase orders", responses: { "200": jsonResponse(arrayOf("PurchaseOrder", "purchaseOrders")) } },
      post: {
        tags: ["Purchase Orders"],
        summary: "Issue a PO from an approved purchase request + a selected quote",
        requestBody: jsonBody({ type: "object", required: ["purchaseRequestId", "quoteId"], properties: { purchaseRequestId: { type: "string" }, quoteId: { type: "string" } } }),
        responses: { "201": jsonResponse({ type: "object", properties: { purchaseOrder: { $ref: "#/components/schemas/PurchaseOrder" } } }), "400": errorResponse },
      },
    },
    "/purchase-orders/{id}": { get: { tags: ["Purchase Orders"], summary: "Get a purchase order", parameters: [idParam], responses: { "200": jsonResponse({ type: "object", properties: { purchaseOrder: { $ref: "#/components/schemas/PurchaseOrder" } } }) } } },
    "/purchase-orders/{id}/status": {
      post: {
        tags: ["Purchase Orders"],
        summary: "Advance PO status (validated state machine: issued → … → closed)",
        parameters: [idParam],
        requestBody: jsonBody({ type: "object", required: ["status"], properties: { status: { type: "string" }, note: { type: "string" } } }),
        responses: { "200": jsonResponse({ type: "object", properties: { purchaseOrder: { $ref: "#/components/schemas/PurchaseOrder" } } }), "400": errorResponse },
      },
    },
    "/purchase-orders/{id}/receipts": {
      post: {
        tags: ["Purchase Orders"],
        summary: "Record receiving against a PO's line items",
        parameters: [idParam],
        requestBody: jsonBody({ $ref: "#/components/schemas/ReceivingInput" }),
        responses: { "201": jsonResponse({ type: "object", properties: { receipt: { type: "object" } } }) },
      },
    },
    "/purchase-orders/{id}/invoices": {
      get: { tags: ["Invoices"], summary: "List invoices recorded against a PO", parameters: [idParam], responses: { "200": jsonResponse(arrayOf("Invoice", "invoices")) } },
      post: {
        tags: ["Invoices"],
        summary: "Record a supplier invoice — runs three-way matching (PO vs. receipt vs. invoice) immediately",
        parameters: [idParam],
        requestBody: jsonBody({ $ref: "#/components/schemas/RecordInvoiceInput" }),
        responses: { "201": jsonResponse({ type: "object", properties: { invoice: { $ref: "#/components/schemas/Invoice" } } }) },
      },
    },
    "/documents": {
      get: {
        tags: ["Documents"],
        summary: "List documents attached to an entity",
        parameters: [
          { name: "entityType", in: "query", required: true, schema: { $ref: "#/components/schemas/DocumentEntityType" } },
          { name: "entityId", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { "200": jsonResponse(arrayOf("Document", "documents")) },
      },
      post: {
        tags: ["Documents"],
        summary: "Upload a file and attach it to an entity (multipart/form-data)",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "entityType", "entityId"],
                properties: {
                  file: { type: "string", format: "binary" },
                  entityType: { $ref: "#/components/schemas/DocumentEntityType" },
                  entityId: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": jsonResponse({ type: "object", properties: { document: { $ref: "#/components/schemas/Document" } } }), "400": errorResponse },
      },
    },
    "/documents/{id}/file": {
      get: { tags: ["Documents"], summary: "Download the file", parameters: [idParam], responses: { "200": { description: "The file", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } } } },
    },
    "/notifications": { get: { tags: ["Notifications"], summary: "Current user's own notifications, most recent 50", responses: { "200": jsonResponse({ type: "object", properties: { notifications: { type: "array", items: { $ref: "#/components/schemas/Notification" } }, unreadCount: { type: "integer" } } }) } } },
    "/notifications/{id}/read": { post: { tags: ["Notifications"], summary: "Mark a notification read", parameters: [idParam], responses: { "200": jsonResponse({ type: "object", properties: { notification: { $ref: "#/components/schemas/Notification" } } }) } } },
    "/audit-log": {
      get: {
        tags: ["Audit Log"],
        summary: "Recent audit log entries for the organization",
        parameters: [{ name: "entityType", in: "query", schema: { type: "string" } }],
        responses: { "200": jsonResponse(arrayOf("AuditLogEntry", "entries")) },
      },
    },
    "/departments": {
      get: { tags: ["Org Setup"], summary: "List departments", responses: { "200": jsonResponse(arrayOf("Department", "departments")) } },
      post: { tags: ["Org Setup"], summary: "Create a department", requestBody: jsonBody({ type: "object", required: ["name"], properties: { name: { type: "string" } } }), responses: { "201": jsonResponse({ type: "object", properties: { department: { $ref: "#/components/schemas/Department" } } }) } },
    },
    "/cost-centers": {
      get: { tags: ["Org Setup"], summary: "List cost centers", responses: { "200": jsonResponse(arrayOf("CostCenter", "costCenters")) } },
      post: { tags: ["Org Setup"], summary: "Create a cost center", requestBody: jsonBody({ type: "object", required: ["code", "name"], properties: { code: { type: "string" }, name: { type: "string" } } }), responses: { "201": jsonResponse({ type: "object", properties: { costCenter: { $ref: "#/components/schemas/CostCenter" } } }) } },
    },
    "/locations": {
      get: { tags: ["Org Setup"], summary: "List locations", responses: { "200": jsonResponse(arrayOf("Location", "locations")) } },
      post: { tags: ["Org Setup"], summary: "Create a location", requestBody: jsonBody({ $ref: "#/components/schemas/CreateLocationInput" }), responses: { "201": jsonResponse({ type: "object", properties: { location: { $ref: "#/components/schemas/Location" } } }) } },
    },
    "/organization": {
      patch: {
        tags: ["Org Setup"],
        summary: "Update organization-wide settings (currently: whether MFA is required for every member)",
        requestBody: jsonBody({ type: "object", required: ["requireMfa"], properties: { requireMfa: { type: "boolean" } } }),
        responses: { "200": jsonResponse({ type: "object", properties: { organization: { $ref: "#/components/schemas/Organization" } } }) },
      },
    },
    "/invites": {
      get: { tags: ["Invites"], summary: "List pending invites", responses: { "200": jsonResponse(arrayOf("Invite", "invites")) } },
      post: {
        tags: ["Invites"],
        summary: "Invite a person into the organization by email + role",
        requestBody: jsonBody({ type: "object", required: ["email", "roleKey"], properties: { email: { type: "string", format: "email" }, roleKey: { type: "string" } } }),
        responses: { "201": jsonResponse({ type: "object", properties: { invite: { $ref: "#/components/schemas/Invite" }, inviteUrl: { type: "string" } } }) },
      },
    },
    "/invites/{id}": { delete: { tags: ["Invites"], summary: "Revoke a pending invite", parameters: [idParam], responses: { "200": jsonResponse({ type: "object", properties: { ok: { type: "boolean" } } }) } } },
    "/invites/accept/{code}": {
      post: {
        tags: ["Invites"],
        summary: "Accept an invite — public, the code itself is the credential. Creates a new account or joins an existing one to a second org.",
        security: [],
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        requestBody: jsonBody({ type: "object", required: ["password"], properties: { name: { type: "string" }, password: { type: "string" } } }),
        responses: { "200": jsonResponse({ type: "object", properties: { user: { type: "object" } } }), "401": errorResponse, "404": errorResponse },
      },
    },
    "/portal/rfq/{token}/quote": {
      post: {
        tags: ["Supplier Portal"],
        summary: "Supplier submits or declines a quote — public, the token is the credential",
        security: [],
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        requestBody: jsonBody({ $ref: "#/components/schemas/PortalQuoteInput" }),
        responses: { "200": jsonResponse({ type: "object", properties: { ok: { type: "boolean" }, quoteId: { type: "string" } } }), "400": errorResponse, "404": errorResponse },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "buildiq_session" },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } } },
      AuthResult: { type: "object", properties: { user: { type: "object" }, organization: { type: "object" } } },
      Session: {
        type: "object",
        properties: {
          user: { type: "object", nullable: true },
          organization: { type: "object" },
          roleKeys: { type: "array", items: { type: "string" } },
          permissions: { type: "array", items: { type: "string" } },
        },
      },
      ExtractionResult: {
        type: "object",
        properties: {
          fields: { type: "object", description: "ExtractedPurchaseFields — see src/lib/ai/purchaseRequestExtraction.ts" },
          missingCriticalFields: { type: "array", items: { type: "string" } },
          confidence: { type: "number" },
          aiActivityLogId: { type: "string" },
        },
      },
      Recommendation: {
        type: "object",
        properties: { recommendedQuoteId: { type: "string" }, rationale: { type: "string" }, aiActivityLogId: { type: "string" } },
      },
      LineItemInput: {
        type: "object",
        required: ["description", "quantity"],
        properties: {
          description: { type: "string" },
          category: { type: "string", nullable: true },
          manufacturer: { type: "string", nullable: true },
          model: { type: "string", nullable: true },
          sku: { type: "string", nullable: true },
          quantity: { type: "number" },
          unitOfMeasure: { type: "string", default: "each" },
          targetPrice: { type: "number", nullable: true },
          acceptableSubstitutions: { type: "array", items: { type: "string" } },
        },
      },
      CreatePurchaseRequestInput: {
        type: "object",
        required: ["title", "lineItems"],
        properties: {
          title: { type: "string" },
          budget: { type: "number", nullable: true },
          requiredDeliveryDate: { type: "string", format: "date-time", nullable: true },
          departmentId: { type: "string", nullable: true },
          costCenterId: { type: "string", nullable: true },
          deliveryLocationId: { type: "string", nullable: true },
          paymentTermsRequirement: { type: "string", nullable: true },
          originalDescription: { type: "string", nullable: true },
          lineItems: { type: "array", items: { $ref: "#/components/schemas/LineItemInput" }, minItems: 1 },
        },
      },
      PurchaseRequest: {
        type: "object",
        properties: {
          id: { type: "string" },
          requestNumber: { type: "string" },
          title: { type: "string" },
          status: { $ref: "#/components/schemas/PurchaseRequestStatus" },
          budget: { type: "number", nullable: true },
          requiredDeliveryDate: { type: "string", format: "date-time", nullable: true },
          lineItems: { type: "array", items: { type: "object" } },
        },
      },
      PurchaseRequestStatus: {
        type: "string",
        enum: [
          "draft", "needs_information", "ready_for_sourcing", "rfq_active", "quotes_received", "under_review",
          "negotiating", "awaiting_approval", "approved", "rejected", "po_issued", "ordered", "shipped",
          "delivered", "closed", "cancelled",
        ],
      },
      CreateSupplierInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          status: { type: "string", enum: ["active", "approved", "restricted", "inactive"] },
          city: { type: "string", nullable: true },
          categories: { type: "array", items: { type: "string" } },
          contact: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" } } },
        },
      },
      Supplier: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          status: { type: "string" },
          responseRate: { type: "number", nullable: true },
          onTimeDeliveryRate: { type: "number", nullable: true },
          performanceScore: { type: "number", nullable: true, description: "Composite score, 0-100; null until enough history exists" },
        },
      },
      RFQ: { type: "object", properties: { id: { type: "string" }, rfqNumber: { type: "string" }, status: { type: "string" }, lineItems: { type: "array", items: { type: "object" } }, suppliers: { type: "array", items: { type: "object" } } } },
      ManualQuoteInput: {
        type: "object",
        required: ["lineItems"],
        properties: {
          lineItems: { type: "array", items: { type: "object", required: ["rfqLineItemId", "unitPrice"], properties: { rfqLineItemId: { type: "string" }, unitPrice: { type: "number" } } } },
          freight: { type: "number", nullable: true },
          leadTimeDays: { type: "integer", nullable: true },
          paymentTerms: { type: "string", nullable: true },
          sourceType: { type: "string", enum: ["manual", "pdf", "excel", "csv", "email"] },
        },
      },
      PortalQuoteInput: {
        type: "object",
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["submit", "decline"] },
          lineItems: { type: "array", items: { type: "object", properties: { rfqLineItemId: { type: "string" }, unitPrice: { type: "number" } } } },
          freight: { type: "number", nullable: true },
          freightIncluded: { type: "boolean" },
          leadTimeDays: { type: "integer", nullable: true },
          paymentTerms: { type: "string", nullable: true },
          warranty: { type: "string", nullable: true },
        },
      },
      Quote: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string" },
          productTotal: { type: "number", nullable: true },
          totalLandedCost: { type: "number", nullable: true },
          freight: { type: "number", nullable: true },
          leadTimeDays: { type: "integer", nullable: true },
          paymentTerms: { type: "string", nullable: true },
        },
      },
      Negotiation: { type: "object", properties: { id: { type: "string" }, status: { type: "string" }, round: { type: "integer" }, requestedPrice: { type: "number", nullable: true }, autonomous: { type: "boolean", description: "Always false in this build — see ARCHITECTURE.md" } } },
      PurchaseOrder: { type: "object", properties: { id: { type: "string" }, poNumber: { type: "string" }, status: { $ref: "#/components/schemas/PurchaseOrderStatus" }, total: { type: "number", nullable: true }, lineItems: { type: "array", items: { type: "object" } } } },
      PurchaseOrderStatus: { type: "string", enum: ["issued", "supplier_confirmed", "processing", "production", "ready_to_ship", "shipped", "partially_delivered", "delivered", "delayed", "cancelled", "closed"] },
      ReceivingInput: {
        type: "object",
        required: ["lineItems"],
        properties: {
          deliveryDate: { type: "string", format: "date-time", nullable: true },
          notes: { type: "string", nullable: true },
          lineItems: {
            type: "array",
            items: {
              type: "object",
              required: ["purchaseOrderLineItemId", "quantityReceived"],
              properties: { purchaseOrderLineItemId: { type: "string" }, quantityReceived: { type: "number" }, quantityDamaged: { type: "number" }, quantityMissing: { type: "number" } },
            },
          },
        },
      },
      RecordInvoiceInput: {
        type: "object",
        required: ["amount", "lineItems"],
        properties: {
          supplierInvoiceNumber: { type: "string", nullable: true },
          amount: { type: "number" },
          freight: { type: "number", nullable: true },
          tax: { type: "number", nullable: true },
          lineItems: { type: "array", items: { type: "object", required: ["purchaseOrderLineItemId", "quantity", "unitPrice"], properties: { purchaseOrderLineItemId: { type: "string" }, quantity: { type: "number" }, unitPrice: { type: "number" } } } },
        },
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["pending_match", "matched", "discrepancy", "approved_for_payment", "paid"] },
          amount: { type: "number" },
          matchExceptions: { type: "array", items: { $ref: "#/components/schemas/InvoiceMatchException" } },
        },
      },
      InvoiceMatchException: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["price_difference", "quantity_difference", "unauthorized_freight", "duplicate_invoice", "unexpected_tax", "item_not_received", "additional_fee"] },
          expected: { type: "number", nullable: true },
          actual: { type: "number", nullable: true },
          difference: { type: "number", nullable: true },
          detail: { type: "string" },
        },
      },
      DocumentEntityType: { type: "string", enum: ["purchase_request", "rfq", "quote", "purchase_order", "receipt", "invoice", "supplier"] },
      Document: { type: "object", properties: { id: { type: "string" }, filename: { type: "string" }, mimeType: { type: "string" }, sizeBytes: { type: "integer" }, virusScanStatus: { type: "string", enum: ["pending", "clean", "infected", "skipped"] } } },
      Notification: { type: "object", properties: { id: { type: "string" }, type: { type: "string" }, title: { type: "string" }, body: { type: "string", nullable: true }, readAt: { type: "string", format: "date-time", nullable: true } } },
      AuditLogEntry: { type: "object", properties: { id: { type: "string" }, actorType: { type: "string", enum: ["user", "ai", "system", "supplier"] }, action: { type: "string" }, entityType: { type: "string" }, entityId: { type: "string" }, createdAt: { type: "string", format: "date-time" } } },
      Organization: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, slug: { type: "string" }, requireMfa: { type: "boolean" } } },
      Department: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } },
      CostCenter: { type: "object", properties: { id: { type: "string" }, code: { type: "string" }, name: { type: "string" } } },
      CreateLocationInput: {
        type: "object",
        required: ["name", "addressLine1", "city"],
        properties: { name: { type: "string" }, addressLine1: { type: "string" }, city: { type: "string" }, state: { type: "string", nullable: true }, postalCode: { type: "string", nullable: true }, country: { type: "string", default: "US" } },
      },
      Location: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, city: { type: "string" }, state: { type: "string", nullable: true } } },
      Invite: { type: "object", properties: { id: { type: "string" }, email: { type: "string" }, roleKey: { type: "string" }, status: { type: "string", enum: ["pending", "accepted", "revoked"] }, expiresAt: { type: "string", format: "date-time" } } },
    },
  },
};

function jsonBody(schema: object) {
  return { required: true, content: { "application/json": { schema } } };
}

function jsonResponse(schema: object) {
  return { description: "OK", content: { "application/json": { schema } } };
}

function arrayOf(schemaName: string, key: string) {
  return { type: "object", properties: { [key]: { type: "array", items: { $ref: `#/components/schemas/${schemaName}` } } } };
}
