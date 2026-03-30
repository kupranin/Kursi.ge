export type SpinResponse = {
  success: boolean;
  rewardTier: "vip" | "vip_plus" | "vip_max";
  userLabel: string;
  validDays: number;
  validUntil: string;
  pipAdjustment: number;
};
