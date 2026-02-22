import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const AVAILABLE_VOICES = [
  { id: "Polly.Amy", name: "Amy", language: "en-GB", gender: "female" },
  { id: "Polly.Brian", name: "Brian", language: "en-GB", gender: "male" },
  { id: "Polly.Emma", name: "Emma", language: "en-GB", gender: "female" },
  { id: "Polly.Joanna", name: "Joanna", language: "en-US", gender: "female" },
  { id: "Polly.Matthew", name: "Matthew", language: "en-US", gender: "male" },
  { id: "Polly.Salli", name: "Salli", language: "en-US", gender: "female" },
  { id: "Polly.Joey", name: "Joey", language: "en-US", gender: "male" },
  { id: "Polly.Kendra", name: "Kendra", language: "en-US", gender: "female" },
  { id: "Polly.Kimberly", name: "Kimberly", language: "en-US", gender: "female" },
  { id: "Polly.Ivy", name: "Ivy", language: "en-US", gender: "female" },
  { id: "Polly.Conchita", name: "Conchita", language: "es-ES", gender: "female" },
  { id: "Polly.Enrique", name: "Enrique", language: "es-ES", gender: "male" },
  { id: "Polly.Celine", name: "Celine", language: "fr-FR", gender: "female" },
  { id: "Polly.Mathieu", name: "Mathieu", language: "fr-FR", gender: "male" },
  { id: "Polly.Hans", name: "Hans", language: "de-DE", gender: "male" },
  { id: "Polly.Marlene", name: "Marlene", language: "de-DE", gender: "female" },
  { id: "Polly.Giorgio", name: "Giorgio", language: "it-IT", gender: "male" },
  { id: "Polly.Carla", name: "Carla", language: "it-IT", gender: "female" },
  { id: "Polly.Lotte", name: "Lotte", language: "nl-NL", gender: "female" },
  { id: "Polly.Ruben", name: "Ruben", language: "nl-NL", gender: "male" },
  { id: "Polly.Ricardo", name: "Ricardo", language: "pt-BR", gender: "male" },
  { id: "Polly.Vitoria", name: "Vitoria", language: "pt-BR", gender: "female" },
];

const SUPPORTED_LANGUAGES = [
  { code: "en-GB", name: "English (UK)" },
  { code: "en-US", name: "English (US)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "fr-FR", name: "French (France)" },
  { code: "de-DE", name: "German (Germany)" },
  { code: "it-IT", name: "Italian (Italy)" },
  { code: "nl-NL", name: "Dutch (Netherlands)" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
];

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
