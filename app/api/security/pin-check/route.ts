import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { generalLimiter } from "@/lib/rate-limit";

const PIN_SECRET = process.env.PIN_CHECK_SECRET || "gorigo-pin-challenge-v1";

const KNOWN_PUBLIC_KEY_HASHES = [
  "sha256/gorigo-ai-primary-pin-2024",
  "sha256/gorigo-ai-backup-pin-2024",
];

function generateChallenge(timestamp: number): string {
  const hmac = crypto.createHmac("sha256", PIN_SECRET);
  hmac.update(`${timestamp}`);
  return hmac.digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const timestamp = Date.now();
    const challenge = generateChallenge(timestamp);

    return NextResponse.json({
      challenge,
      timestamp,
      pins: KNOWN_PUBLIC_KEY_HASHES,
      algorithm: "sha256",
      version: 1,
    });
  } catch {
    return NextResponse.json(
      { error: "Pin check unavailable" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { challenge, timestamp } = body;

    if (!challenge || !timestamp) {
      return NextResponse.json(
        { error: "Missing challenge or timestamp" },
        { status: 400 }
      );
    }

    const age = Date.now() - timestamp;
    if (age > 30000 || age < 0) {
      return NextResponse.json(
        { valid: false, reason: "Challenge expired" },
        { status: 400 }
      );
    }

    const expected = generateChallenge(timestamp);
    const valid = crypto.timingSafeEqual(
      Buffer.from(challenge, "hex"),
      Buffer.from(expected, "hex")
    );

    return NextResponse.json({ valid, timestamp: Date.now() });
  } catch {
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 500 }
    );
  }
}
