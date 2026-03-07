import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const AVAILABLE_VOICES = [
  { id: "Polly.Amy-Neural", name: "Amy", language: "en-GB", gender: "female", quality: "neural" },
  { id: "Polly.Emma-Neural", name: "Emma", language: "en-GB", gender: "female", quality: "neural" },
  { id: "Polly.Brian-Neural", name: "Brian", language: "en-GB", gender: "male", quality: "neural" },
  { id: "Polly.Amy", name: "Amy", language: "en-GB", gender: "female", quality: "standard" },
  { id: "Polly.Brian", name: "Brian", language: "en-GB", gender: "male", quality: "standard" },
  { id: "Polly.Emma", name: "Emma", language: "en-GB", gender: "female", quality: "standard" },
  { id: "Polly.Joanna-Neural", name: "Joanna", language: "en-US", gender: "female", quality: "neural" },
  { id: "Polly.Matthew-Neural", name: "Matthew", language: "en-US", gender: "male", quality: "neural" },
  { id: "Polly.Kendra-Neural", name: "Kendra", language: "en-US", gender: "female", quality: "neural" },
  { id: "Polly.Joey-Neural", name: "Joey", language: "en-US", gender: "male", quality: "neural" },
  { id: "Polly.Joanna", name: "Joanna", language: "en-US", gender: "female", quality: "standard" },
  { id: "Polly.Matthew", name: "Matthew", language: "en-US", gender: "male", quality: "standard" },
  { id: "Polly.Salli", name: "Salli", language: "en-US", gender: "female", quality: "standard" },
  { id: "Polly.Joey", name: "Joey", language: "en-US", gender: "male", quality: "standard" },
  { id: "Polly.Kendra", name: "Kendra", language: "en-US", gender: "female", quality: "standard" },
  { id: "Polly.Kimberly", name: "Kimberly", language: "en-US", gender: "female", quality: "standard" },
  { id: "Polly.Ivy", name: "Ivy", language: "en-US", gender: "female", quality: "standard" },
  { id: "Polly.Lucia-Neural", name: "Lucia", language: "es-ES", gender: "female", quality: "neural" },
  { id: "Polly.Conchita", name: "Conchita", language: "es-ES", gender: "female", quality: "standard" },
  { id: "Polly.Enrique", name: "Enrique", language: "es-ES", gender: "male", quality: "standard" },
  { id: "Polly.Lea-Neural", name: "Léa", language: "fr-FR", gender: "female", quality: "neural" },
  { id: "Polly.Celine", name: "Céline", language: "fr-FR", gender: "female", quality: "standard" },
  { id: "Polly.Mathieu", name: "Mathieu", language: "fr-FR", gender: "male", quality: "standard" },
  { id: "Polly.Vicki-Neural", name: "Vicki", language: "de-DE", gender: "female", quality: "neural" },
  { id: "Polly.Hans", name: "Hans", language: "de-DE", gender: "male", quality: "standard" },
  { id: "Polly.Marlene", name: "Marlene", language: "de-DE", gender: "female", quality: "standard" },
  { id: "Polly.Bianca-Neural", name: "Bianca", language: "it-IT", gender: "female", quality: "neural" },
  { id: "Polly.Giorgio", name: "Giorgio", language: "it-IT", gender: "male", quality: "standard" },
  { id: "Polly.Carla", name: "Carla", language: "it-IT", gender: "female", quality: "standard" },
  { id: "Polly.Laura-Neural", name: "Laura", language: "nl-NL", gender: "female", quality: "neural" },
  { id: "Polly.Lotte", name: "Lotte", language: "nl-NL", gender: "female", quality: "standard" },
  { id: "Polly.Ruben", name: "Ruben", language: "nl-NL", gender: "male", quality: "standard" },
  { id: "Polly.Camila-Neural", name: "Camila", language: "pt-BR", gender: "female", quality: "neural" },
  { id: "Polly.Ricardo", name: "Ricardo", language: "pt-BR", gender: "male", quality: "standard" },
  { id: "Polly.Vitoria", name: "Vitoria", language: "pt-BR", gender: "female", quality: "standard" },
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
