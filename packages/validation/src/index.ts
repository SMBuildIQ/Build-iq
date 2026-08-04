import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  companyName: z.string().min(2).max(160),
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(40).optional(),
  zip: z.string().max(20).optional(),
  squareFeet: z.number().int().positive().optional(),
  stories: z.number().int().min(1).max(4).optional(),
  notes: z.string().max(4000).optional(),
});

export const createProposalSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  customerId: z.string().optional().nullable(),
  depositPct: z.number().min(0).max(1).optional(),
  validDays: z.number().int().min(7).max(120).optional(),
});

export const sendProposalSchema = z.object({
  email: z.string().email().optional(),
  message: z.string().max(2000).optional(),
});

export const acceptProposalSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  signerName: z.string().min(1).max(200),
  signerEmail: z.string().email().optional().nullable().or(z.literal("")),
  signerTitle: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const cartItemSchema = z.object({
  packageId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
  projectId: z.string().optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
