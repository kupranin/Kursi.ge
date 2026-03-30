import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getWheelEligibility } from "@/lib/rewards/service";

export async function GET() {
  const userId = await getCurrentUserId();
  const eligibility = await getWheelEligibility(userId);

  return NextResponse.json({
    success: true,
    eligible: eligibility.eligible,
    reason: eligibility.eligible ? null : eligibility.reason
  });
}
