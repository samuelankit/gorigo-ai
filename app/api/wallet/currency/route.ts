import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  GBP: { GBP: 1, EUR: 1.17, USD: 1.27 },
  EUR: { GBP: 0.85, EUR: 1, USD: 1.09 },
  USD: { GBP: 0.79, EUR: 0.92, USD: 1 },
};

const SUPPORTED_CURRENCIES = [
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
];

const convertSchema = z.object({
  amount: z.number().positive(),
  from: z.enum(["GBP", "EUR", "USD"]),
  to: z.enum(["GBP", "EUR", "USD"]),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    return NextResponse.json({ currencies: SUPPORTED_CURRENCIES, rates: EXCHANGE_RATES });
  } catch (error) {
    return handleRouteError(error, "GET /api/wallet/currency");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, from, to } = convertSchema.parse(body);

    const rate = EXCHANGE_RATES[from]?.[to];
    if (!rate) {
      return NextResponse.json({ error: "Unsupported currency pair" }, { status: 400 });
    }

    const converted = Number((amount * rate).toFixed(2));

    return NextResponse.json({
      original: { amount, currency: from },
      converted: { amount: converted, currency: to },
      rate,
      disclaimer: "Exchange rates are indicative. Final rate applied at time of transaction.",
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/wallet/currency");
  }
}
