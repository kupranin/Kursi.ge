import type { SpinResponse } from "@/components/rewards/types";

export const WHEEL_PRIZE_TABLE = [
  { id: 1, shortLabel: "1 კვირა", fullLabel: "სპეც. კურსი 1 კვირით" },
  { id: 2, shortLabel: "1 თვე", fullLabel: "სპეც. კურსი 1 თვით" },
  { id: 3, shortLabel: "0% მარჟა", fullLabel: "0-ოვანი მარჟა 3 დღით" },
  {
    id: 4,
    shortLabel: "1-ლი კონვ.",
    fullLabel: "სპეც. კურსი პირველი კონვერტაციისას"
  },
  { id: 5, shortLabel: "2 კვირა", fullLabel: "სპეც. კურსი 2 კვირით" },
  { id: 6, shortLabel: "365 დღე", fullLabel: "საუკეთესო კურსი 365 დღით" }
] as const;

const TIER_TO_PRIZE_INDEXES: Record<SpinResponse["rewardTier"], [number, number]> = {
  vip: [0, 1],
  vip_plus: [2, 3],
  vip_max: [4, 5]
};

export function getPrizeIndexFromSpin(params: {
  rewardTier: SpinResponse["rewardTier"] | null;
  spinSeed?: number;
}) {
  if (!params.rewardTier) return 0;
  const [first, second] = TIER_TO_PRIZE_INDEXES[params.rewardTier];
  return (params.spinSeed ?? 0) % 2 === 0 ? first : second;
}

export function getPrizeFromSpin(params: {
  rewardTier: SpinResponse["rewardTier"] | null;
  spinSeed?: number;
}) {
  return WHEEL_PRIZE_TABLE[getPrizeIndexFromSpin(params)];
}

export function getPrizeBySegmentIndex(index: number) {
  const safe = ((index % WHEEL_PRIZE_TABLE.length) + WHEEL_PRIZE_TABLE.length) % WHEEL_PRIZE_TABLE.length;
  return WHEEL_PRIZE_TABLE[safe];
}

/** Clockwise degrees from top (12 o'clock) to slice midpoint — matches CSS conic-gradient (0° at top). */
export function getSegmentCenterClockwiseFromTop(segmentIndex: number) {
  const slice = 360 / WHEEL_PRIZE_TABLE.length;
  return segmentIndex * slice + slice / 2;
}
