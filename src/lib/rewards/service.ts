import { VipRewardStatus, type WheelReward } from "@prisma/client";

import { db } from "@/lib/db";
import {
  NEW_USER_ELIGIBILITY_HOURS,
  VIP_REWARD_LABEL,
  VIP_VALID_DAYS
} from "@/lib/rewards/constants";
import { selectWeightedTier } from "@/lib/rewards/selector";
import { sendRewardCreatedWebhook } from "@/lib/rewards/webhook";

export class RewardError extends Error {
  code: "UNAUTHORIZED" | "NOT_ELIGIBLE" | "ALREADY_SPUN";

  constructor(code: RewardError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function getWheelEligibility(userId: string | null) {
  if (!userId) return { eligible: false, reason: "unauthorized" as const };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { eligible: false, reason: "unauthorized" as const };

  const existing = await db.wheelReward.findUnique({ where: { userId } });
  if (existing) return { eligible: false, reason: "already_spun" as const };

  const ageMs = Date.now() - user.registeredAt.getTime();
  const maxAgeMs = NEW_USER_ELIGIBILITY_HOURS * 60 * 60 * 1000;
  if (ageMs > maxAgeMs) return { eligible: false, reason: "too_old" as const };

  return { eligible: true as const };
}

export async function spinRegistrationWheel(userId: string | null): Promise<{
  reward: WheelReward;
}> {
  if (!userId) {
    throw new RewardError("UNAUTHORIZED", "Authentication required");
  }

  const eligibility = await getWheelEligibility(userId);
  if (!eligibility.eligible) {
    if (eligibility.reason === "already_spun") {
      throw new RewardError("ALREADY_SPUN", "Reward already created for user");
    }
    throw new RewardError("NOT_ELIGIBLE", "User is not eligible for reward");
  }

  const selected = selectWeightedTier();
  const validFrom = new Date();
  const validUntil = new Date(validFrom.getTime() + VIP_VALID_DAYS * 86400000);

  const reward = await db.$transaction(async (tx) => {
    const existing = await tx.wheelReward.findUnique({ where: { userId } });
    if (existing) {
      throw new RewardError("ALREADY_SPUN", "Reward already exists");
    }

    return tx.wheelReward.create({
      data: {
        userId,
        rewardTier: selected.rewardTier,
        pipAdjustment: selected.pipAdjustment,
        probabilityBucket: selected.probabilityBucket,
        userLabel: VIP_REWARD_LABEL,
        validFrom,
        validUntil,
        status: VipRewardStatus.active
      }
    });
  });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    const webhookResult = await sendRewardCreatedWebhook({ user, reward });
    if (webhookResult.sent) {
      await db.wheelReward.update({
        where: { id: reward.id },
        data: { webhookSentAt: new Date() }
      });
    }
  }

  return { reward };
}

export async function getActiveVipReward(userId: string): Promise<WheelReward | null> {
  const now = new Date();
  const reward = await db.wheelReward.findUnique({ where: { userId } });
  if (!reward) return null;

  if (reward.status === VipRewardStatus.cancelled) return null;
  if (reward.validUntil <= now) {
    if (reward.status !== VipRewardStatus.expired) {
      await db.wheelReward.update({
        where: { id: reward.id },
        data: { status: VipRewardStatus.expired }
      });
    }
    return null;
  }

  return reward.status === VipRewardStatus.active ? reward : null;
}
