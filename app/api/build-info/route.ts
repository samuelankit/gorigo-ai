import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  let buildInfo = "unknown";
  try {
    const infoPath = path.join(process.cwd(), "public", "build-info.txt");
    if (fs.existsSync(infoPath)) {
      buildInfo = fs.readFileSync(infoPath, "utf-8").trim();
    }
  } catch {}

  return NextResponse.json({
    build: buildInfo,
    serverTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    commitSha: process.env.COMMIT_SHA || "not-set",
    uptime: process.uptime(),
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
