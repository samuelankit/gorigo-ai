import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requirePasswordChanged, requireOrgActive } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const searchSchema = z.object({
  country: z.string().default("GB"),
  type: z.enum(["local", "toll_free", "mobile"]).default("local"),
  areaCode: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pwCheck = requirePasswordChanged(auth);
    if (!pwCheck.allowed) {
      return NextResponse.json({ error: pwCheck.error }, { status: pwCheck.status || 403 });
    }

    const orgCheck = await requireOrgActive(auth.orgId);
    if (!orgCheck.allowed) {
      return NextResponse.json({ error: orgCheck.error }, { status: orgCheck.status || 403 });
    }

    const url = new URL(request.url);
    const params = searchSchema.parse({
      country: url.searchParams.get("country") || "GB",
      type: url.searchParams.get("type") || "local",
      areaCode: url.searchParams.get("areaCode") || undefined,
    });

    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) {
      return NextResponse.json({
        numbers: [],
        message: "Telephony provider not configured. Contact support to enable phone number purchasing.",
        configured: false,
      });
    }

    try {
      const queryParams = new URLSearchParams({
        "filter[country_code]": params.country,
        "filter[phone_number_type]": params.type,
        "filter[limit]": "20",
      });

      if (params.areaCode) {
        queryParams.set("filter[national_destination_code]", params.areaCode);
      }

      const res = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${telnyxKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        return NextResponse.json({ numbers: [], error: "Failed to fetch available numbers" }, { status: 502 });
      }

      const data = await res.json();
      const numbers = (data.data || []).map((n: any) => ({
        phoneNumber: n.phone_number,
        nationalFormat: n.phone_number,
        type: n.phone_number_type || params.type,
        country: params.country,
        region: n.region_information?.[0]?.region_name || "",
        monthlyCost: n.cost_information?.monthly_cost || "1.00",
        currency: n.cost_information?.currency || "GBP",
        features: n.features || [],
      }));

      return NextResponse.json({ numbers, configured: true });
    } catch {
      return NextResponse.json({ numbers: [], error: "Telephony service unavailable" }, { status: 502 });
    }
  } catch (error) {
    return handleRouteError(error, "GET /api/mobile/phone-numbers/available");
  }
}
