export const VIP_REWARD_LABEL = "VIP rate unlocked";
export const VIP_VALID_DAYS = 7;
export const NEW_USER_ELIGIBILITY_HOURS = 24;

export type RewardTier = "vip" | "vip_plus" | "vip_max";

export type RewardDefinition = {
  rewardTier: RewardTier;
  pipAdjustment: number;
  probabilityBucket: number;
  weight: number;
};

export const REWARD_TIERS: RewardDefinition[] = [
  {
    rewardTier: "vip",
    pipAdjustment: 1,
    probabilityBucket: 60,
    weight: 60
  },
  {
    rewardTier: "vip_plus",
    pipAdjustment: 2,
    probabilityBucket: 30,
    weight: 30
  },
  {
    rewardTier: "vip_max",
    pipAdjustment: 3,
    probabilityBucket: 10,
    weight: 10
  }
];
