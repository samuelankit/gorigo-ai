import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { walletTransactions, orgs, users, orgMembers, platformSettings } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const txId = Number(id);
    if (isNaN(txId)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    const [tx] = await db
      .select()
      .from(walletTransactions)
      .where(and(eq(walletTransactions.id, txId), eq(walletTransactions.orgId, auth.orgId)))
      .limit(1);

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const [org] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
    const [user] = await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1);

    const amount = Math.abs(Number(tx.amount));
    const isTopUp = tx.type === "top_up";
    const [vatSetting] = await db.select().from(platformSettings).where(eq(platformSettings.key, "vat_registered")).limit(1);
    const isVatRegistered = vatSetting?.value === "true";
    const [vatNumberSetting] = await db.select().from(platformSettings).where(eq(platformSettings.key, "vat_number")).limit(1);
    const vatNumber = vatNumberSetting?.value || "";
    const vatRate = isVatRegistered ? 0.20 : 0;
    const netAmount = vatRate > 0 ? Number((amount / (1 + vatRate)).toFixed(2)) : amount;
    const vatAmount = vatRate > 0 ? Number((amount - netAmount).toFixed(2)) : 0;

    const receiptDate = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    }) : "N/A";

    const receiptNumber = `GR-${String(tx.id).padStart(6, "0")}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Receipt ${receiptNumber} - GoRigo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 32px; color: #1a1a1a; }
    .receipt { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #189553; padding: 32px; color: #fff; }
    .header h1 { font-size: 28px; font-weight: 700; }
    .header p { margin-top: 4px; opacity: 0.85; font-size: 14px; }
    .body { padding: 32px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .meta-item { }
    .meta-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 500; }
    .divider { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
    .line-items { width: 100%; border-collapse: collapse; }
    .line-items th { text-align: left; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
    .line-items th:last-child { text-align: right; }
    .line-items td { padding: 12px 0; font-size: 14px; }
    .line-items td:last-child { text-align: right; font-weight: 500; }
    .totals { margin-top: 16px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .total-row.grand { font-size: 18px; font-weight: 700; border-top: 2px solid #189553; padding-top: 12px; margin-top: 8px; }
    .company-info { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5; }
    .company-info p { font-size: 12px; color: #888; line-height: 1.6; }
    .footer { background: #f9f9f9; padding: 20px 32px; border-top: 1px solid #e5e5e5; text-align: center; }
    .footer p { font-size: 12px; color: #888; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-deduction { background: #fef2f2; color: #991b1b; }
    .print-btn { display: inline-block; margin: 16px auto; padding: 10px 24px; background: #189553; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .print-btn:hover { background: #147a45; }
    @media print { .no-print { display: none !important; } body { padding: 0; background: #fff; } .receipt { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>GoRigo</h1>
      <p>AI Call Centre Platform</p>
    </div>
    <div class="body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2 style="font-size:20px;">${isTopUp ? "Payment Receipt" : "Transaction Record"}</h2>
        <span class="badge ${isTopUp ? "badge-paid" : "badge-deduction"}">${isTopUp ? "PAID" : tx.type.toUpperCase().replace("_", " ")}</span>
      </div>
      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Receipt Number</div>
          <div class="meta-value">${receiptNumber}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date</div>
          <div class="meta-value">${receiptDate}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Account</div>
          <div class="meta-value">${org?.name || "N/A"}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Email</div>
          <div class="meta-value">${user?.email || "N/A"}</div>
        </div>
      </div>

      <hr class="divider">

      <table class="line-items">
        <thead>
          <tr><th>Description</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${tx.description || (isTopUp ? "Wallet Top-Up" : "Service Usage")}</td>
            <td>&pound;${amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      ${isTopUp ? `
      <div class="totals">
        ${isVatRegistered ? `
        <div class="total-row"><span>Subtotal (excl. VAT)</span><span>&pound;${netAmount.toFixed(2)}</span></div>
        <div class="total-row"><span>VAT @ 20%</span><span>&pound;${vatAmount.toFixed(2)}</span></div>
        ` : ``}
        <div class="total-row grand"><span>Total Paid</span><span>&pound;${amount.toFixed(2)}</span></div>
      </div>
      ` : `
      <div class="totals">
        <div class="total-row grand"><span>Total</span><span>&pound;${amount.toFixed(2)}</span></div>
      </div>
      `}

      <div class="company-info">
        <p><strong>International Business Exchange Limited</strong></p>
        <p>Company Number: 15985956</p>
        <p>Registered in England and Wales</p>
        ${isVatRegistered ? `<p>VAT Registration: ${vatNumber}</p>` : `<p>Not VAT registered</p>`}
        <p style="margin-top:8px;">GoRigo.ai - AI-Powered Call Centre Platform</p>
      </div>
    </div>
    <div class="footer">
      <p>Thank you for using GoRigo. This receipt was generated automatically.</p>
      <p style="margin-top:4px;">For billing enquiries, contact support@gorigo.ai</p>
    </div>
  </div>
  <div style="text-align:center;" class="no-print">
    <button class="print-btn" onclick="window.print()">Print / Download PDF</button>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/wallet/transactions/[id]/receipt");
  }
}
