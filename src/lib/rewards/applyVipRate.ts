import { getActiveVipReward } from "@/lib/rewards/service";

export async function getEffectivePipAdjustment(userId: string): Promise<number> {
  const activeReward = await getActiveVipReward(userId);
  return activeReward?.pipAdjustment ?? 0;
}

export async function applyVipPipAdjustment(params: {
  userId: string;
  baseRate: number;
  pipValue: number;
}) {
  const pipAdjustment = await getEffectivePipAdjustment(params.userId);
  const adjustedRate = params.baseRate + pipAdjustment * params.pipValue;

  return {
    adjustedRate,
    pipAdjustment,
    vipApplied: pipAdjustment > 0
  };
}
