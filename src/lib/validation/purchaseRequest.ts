import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().min(1),
  category: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unitOfMeasure: z.string().default("each"),
  targetPrice: z.number().positive().optional().nullable(),
  specifications: z.string().optional().nullable(),
  acceptableSubstitutions: z.array(z.string()).default([]),
  deliveryRequirement: z.string().optional().nullable(),
});

export const createPurchaseRequestSchema = z.object({
  title: z.string().min(1).max(300),
  budget: z.number().positive().optional().nullable(),
  requiredDeliveryDate: z.string().datetime().optional().nullable(),
  deliveryLocationId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  costCenterId: z.string().optional().nullable(),
  projectRef: z.string().optional().nullable(),
  paymentTermsRequirement: z.string().optional().nullable(),
  warrantyRequirement: z.string().optional().nullable(),
  certificationRequirement: z.string().optional().nullable(),
  preferredSupplierIds: z.array(z.string()).default([]),
  restrictedSupplierIds: z.array(z.string()).default([]),
  additionalInstructions: z.string().optional().nullable(),
  originalDescription: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1),
});

export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
