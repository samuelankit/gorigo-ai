import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demoLeads } from "@/shared/schema";
import { z } from "zod";
import { authLimiter } from "@/lib/rate-limit";
import { withCors, corsOptionsResponse } from "@/lib/v1-cors";
import { handleRouteError } from "@/lib/api-error";

const demoRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export async function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const rl = await authLimiter(request);
    if (!rl.allowed) {
      return withCors(NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }), request);
    }

    const body = await request.json();
    const parsed = demoRequestSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 }), request);
    }

    await db.insert(demoLeads).values({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company || null,
      phone: parsed.data.phone || null,
      message: parsed.data.message || null,
      source: "chatgpt",
    });

    return withCors(NextResponse.json({ success: true, message: "Demo request received. We'll contact you shortly." }, { status: 200 }), request);
  } catch (error) {
    return handleRouteError(error, "V1Demo");
  }
}
