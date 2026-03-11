import { NextRequest, NextResponse } from "next/server";

export function rejectMobilePayments(request: NextRequest): NextResponse | null {
  const clientType = request.headers.get("x-client-type");
  if (clientType === "mobile") {
    return NextResponse.json(
      {
        error: "Payments are only available via the web dashboard. Please visit gorigo.ai to manage your balance.",
        code: "MOBILE_PAYMENT_BLOCKED",
      },
      { status: 403 }
    );
  }
  return null;
}
