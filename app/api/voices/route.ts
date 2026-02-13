import { NextResponse } from "next/server";
import { AVAILABLE_VOICES, SUPPORTED_LANGUAGES } from "@/lib/twilio";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      voices: AVAILABLE_VOICES,
      languages: SUPPORTED_LANGUAGES,
    });
  } catch (error) {
    console.error("Voices API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
