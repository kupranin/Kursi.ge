import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { RewardError, spinRegistrationWheel } from "@/lib/rewards/service";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const { reward } = await spinRegistrationWheel(userId);

    return NextResponse.json({
      success: true,
      rewardTier: reward.rewardTier,
      userLabel: reward.userLabel,
      validDays: 7,
      validUntil: reward.validUntil.toISOString(),
      pipAdjustment: reward.pipAdjustment
    });
  } catch (error) {
    if (error instanceof RewardError) {
      const status =
        error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "ALREADY_SPUN"
            ? 409
            : 400;
      return NextResponse.json({ success: false, code: error.code }, { status });
    }

    console.error("Spin endpoint error", error);
    return NextResponse.json(
      { success: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
