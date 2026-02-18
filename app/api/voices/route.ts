import { NextRequest, NextResponse } from "next/server";
import { AVAILABLE_VOICES, SUPPORTED_LANGUAGES } from "@/lib/twilio";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      voices: AVAILABLE_VOICES,
      languages: SUPPORTED_LANGUAGES,
    }, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return handleRouteError(error, "Voices");
  }
}
