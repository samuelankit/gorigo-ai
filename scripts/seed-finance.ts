import { db } from "../lib/db";
import { finWorkspaces, finAccounts, finTaxCodes } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const orgId = process.argv[2] ? Number(process.argv[2]) : 2;

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

async function seedWorkspace(
  name: string,
  type: "personal" | "company",
  coa: typeof PERSONAL_COA | typeof COMPANY_COA,
  extra: Record<string, any> = {}
) {
  const existing = await db.select().from(finWorkspaces)
    .where(and(eq(finWorkspaces.orgId, orgId), eq(finWorkspaces.name, name)));

  if (existing.length > 0) {
    console.log(`Workspace "${name}" already exists (id: ${existing[0].id}), skipping.`);
    return existing[0];
  }

  const [workspace] = await db.insert(finWorkspaces).values({
    orgId,
    name,
    type,
    ...extra,
  }).returning();

  console.log(`Created workspace "${name}" (id: ${workspace.id})`);

  for (const account of coa) {
    await db.insert(finAccounts).values({
      workspaceId: workspace.id,
      code: account.code,
      name: account.name,
      type: account.type,
      subtype: (account as any).subtype || null,
      isSystem: (account as any).isSystem || false,
    });
  }
  console.log(`  Seeded ${coa.length} COA accounts`);

  for (const tax of DEFAULT_TAX_CODES) {
    await db.insert(finTaxCodes).values({
      workspaceId: workspace.id,
      code: tax.code,
      name: tax.name,
      rate: String(tax.rate),
      isDefault: tax.isDefault,
    });
  }
  console.log(`  Seeded ${DEFAULT_TAX_CODES.length} tax codes`);

  return workspace;
}

async function main() {
  console.log(`Seeding finance data for orgId: ${orgId}\n`);

  await seedWorkspace("Personal", "personal", PERSONAL_COA);

  await seedWorkspace("IBX", "company", COMPANY_COA, {
    companyName: "International Business Exchange Limited",
  });

  console.log("\nFinance seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
