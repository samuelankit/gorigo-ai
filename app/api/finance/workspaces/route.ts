import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finWorkspaces, finAccounts, finTaxCodes, finAuditLog } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { createWorkspaceSchema, getClientIp } from "@/lib/finance-validation";

const PERSONAL_COA = [
  { code: "1000", name: "Cash/Bank", type: "asset" },
  { code: "1200", name: "Savings", type: "asset" },
  { code: "2000", name: "Credit Card", type: "liability" },
  { code: "4000", name: "Salary/Income", type: "income" },
  { code: "4100", name: "Side Income", type: "income" },
  { code: "5000", name: "Housing", type: "expense" },
  { code: "5100", name: "Utilities", type: "expense" },
  { code: "5200", name: "Food & Groceries", type: "expense" },
  { code: "5300", name: "Transport", type: "expense" },
  { code: "5400", name: "Entertainment", type: "expense" },
  { code: "5500", name: "Health", type: "expense" },
  { code: "5600", name: "Subscriptions", type: "expense" },
  { code: "5900", name: "Other Expenses", type: "expense" },
];

const COMPANY_COA = [
  { code: "1000", name: "Cash at Bank", type: "asset", subtype: "current_asset" },
  { code: "1100", name: "Petty Cash", type: "asset", subtype: "current_asset" },
  { code: "1200", name: "Accounts Receivable", type: "asset", subtype: "current_asset", isSystem: true },
  { code: "1300", name: "Prepayments", type: "asset", subtype: "current_asset" },
  { code: "1500", name: "Office Equipment", type: "asset", subtype: "fixed_asset" },
  { code: "2000", name: "Accounts Payable", type: "liability", subtype: "current_liability", isSystem: true },
  { code: "2100", name: "VAT Payable", type: "liability", subtype: "current_liability" },
  { code: "2200", name: "PAYE/NI Payable", type: "liability", subtype: "current_liability" },
  { code: "2300", name: "Corporation Tax", type: "liability", subtype: "current_liability" },
  { code: "2500", name: "Directors Loan", type: "liability", subtype: "long_term" },
  { code: "3000", name: "Share Capital", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "income", isSystem: true },
  { code: "4100", name: "Consulting Revenue", type: "income" },
  { code: "4200", name: "Commission Income", type: "income" },
  { code: "4900", name: "Other Income", type: "income" },
  { code: "5000", name: "Cost of Sales", type: "expense" },
  { code: "6000", name: "Staff Costs", type: "expense" },
  { code: "6100", name: "Rent & Rates", type: "expense" },
  { code: "6200", name: "Utilities", type: "expense" },
  { code: "6300", name: "Insurance", type: "expense" },
  { code: "6400", name: "Office Costs", type: "expense" },
  { code: "6500", name: "Travel & Subsistence", type: "expense" },
  { code: "6600", name: "Legal & Professional", type: "expense" },
  { code: "6700", name: "Marketing & Advertising", type: "expense" },
  { code: "6800", name: "IT & Software", type: "expense" },
  { code: "6900", name: "Bank Charges", type: "expense" },
  { code: "7000", name: "Depreciation", type: "expense" },
  { code: "7500", name: "Miscellaneous Expenses", type: "expense" },
];

const DEFAULT_TAX_CODES = [
  { code: "NO_VAT", name: "No VAT", rate: 0, isDefault: true },
  { code: "STD", name: "Standard Rate", rate: 20, isDefault: false },
  { code: "RED", name: "Reduced Rate", rate: 5, isDefault: false },
  { code: "ZERO", name: "Zero Rate", rate: 0, isDefault: false },
  { code: "EXEMPT", name: "Exempt", rate: 0, isDefault: false },
];

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await db.select().from(finWorkspaces).where(eq(finWorkspaces.orgId, auth.orgId));
    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("List workspaces error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, type, ...rest } = parsed.data;

    const workspace = await db.transaction(async (tx) => {
      const [ws] = await tx.insert(finWorkspaces).values({
        orgId: auth.orgId!,
        name,
        type,
        currency: rest.currency,
        invoicePrefix: rest.invoicePrefix,
        billPrefix: rest.billPrefix,
        fiscalYearStart: rest.fiscalYearStart,
      }).returning();

      const coa = type === "personal" ? PERSONAL_COA : COMPANY_COA;
      for (const account of coa) {
        await tx.insert(finAccounts).values({
          workspaceId: ws.id,
          code: account.code,
          name: account.name,
          type: account.type,
          subtype: (account as any).subtype || null,
          isSystem: (account as any).isSystem || false,
        });
      }

      for (const tax of DEFAULT_TAX_CODES) {
        await tx.insert(finTaxCodes).values({
          workspaceId: ws.id,
          code: tax.code,
          name: tax.name,
          rate: String(tax.rate),
          isDefault: tax.isDefault,
        });
      }

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId: ws.id,
        userId: auth.user.id,
        action: "create",
        entityType: "workspace",
        entityId: ws.id,
        changes: { name, type },
        ipAddress,
      });

      return ws;
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Create workspace error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
