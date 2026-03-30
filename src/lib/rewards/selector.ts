import { REWARD_TIERS, type RewardDefinition } from "./constants";

export function selectWeightedTier(rand = Math.random()): RewardDefinition {
  const totalWeight = REWARD_TIERS.reduce((acc, tier) => acc + tier.weight, 0);
  const normalized = rand * totalWeight;
  let cumulative = 0;

  for (const tier of REWARD_TIERS) {
    cumulative += tier.weight;
    if (normalized < cumulative) return tier;
  }

  return REWARD_TIERS[REWARD_TIERS.length - 1];
}
