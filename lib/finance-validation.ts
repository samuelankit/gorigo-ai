import { z } from "zod";
import { NextRequest } from "next/server";

export const createInvoiceSchema = z.object({
  workspaceId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  status: z.enum(["draft", "sent"]).default("draft"),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  currency: z.string().length(3).optional(),
  lines: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive().default(1),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).max(100).default(0),
    accountId: z.number().int().positive().optional().nullable(),
  })).optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "voided"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
}).strict();

export const createBillSchema = z.object({
  workspaceId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  status: z.enum(["draft", "received"]).default("draft"),
  category: z.string().max(200).optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional().nullable(),
  receiptUrl: z.string().url().max(2000).or(z.literal("")).optional().nullable(),
  currency: z.string().length(3).optional(),
  lines: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive().default(1),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).max(100).default(0),
    accountId: z.number().int().positive().optional().nullable(),
  })).optional(),
});

export const updateBillSchema = z.object({
  status: z.enum(["draft", "received", "paid", "voided"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  category: z.string().max(200).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  receiptUrl: z.string().url().max(2000).or(z.literal("")).optional().nullable(),
}).strict();

export const createPaymentSchema = z.object({
  workspaceId: z.number().int().positive(),
  type: z.enum(["received", "made"]),
  invoiceId: z.number().int().positive().optional().nullable(),
  billId: z.number().int().positive().optional().nullable(),
  amount: z.number().positive("Amount must be positive"),
  paymentDate: z.string().optional(),
  method: z.enum(["bank_transfer", "cash", "card", "cheque", "other"]).default("bank_transfer"),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  accountId: z.number().int().positive().optional().nullable(),
});

export const createJournalSchema = z.object({
  workspaceId: z.number().int().positive(),
  entryDate: z.string().optional(),
  reference: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  lines: z.array(z.object({
    accountId: z.number().int().positive(),
    debit: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
    description: z.string().max(500).optional().nullable(),
  })).min(2, "At least 2 journal lines required"),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["personal", "company"]).default("company"),
  currency: z.string().length(3).default("GBP"),
  invoicePrefix: z.string().max(10).optional(),
  billPrefix: z.string().max(10).optional(),
  fiscalYearStart: z.number().int().min(1).max(12).optional(),
});

export const createCustomerSchema = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(300).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  defaultPaymentTerms: z.number().int().min(0).max(365).default(30),
});

export const createSupplierSchema = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(300).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  defaultPaymentTerms: z.number().int().min(0).max(365).default(30),
});

export const createCreditNoteSchema = z.object({
  workspaceId: z.number().int().positive(),
  invoiceId: z.number().int().positive().optional(),
  customerId: z.number().int().positive(),
  reason: z.string().min(1, "Reason is required").max(500),
  lines: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().positive().default(1),
    unitPrice: z.number().positive("Unit price must be positive"),
    taxRate: z.number().min(0).max(100).default(0),
    accountId: z.number().int().positive().optional(),
  })).min(1, "At least one line is required"),
});

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
