import { type WheelReward, type User } from "@prisma/client";

type RewardWebhookPayload = {
  event: "registration_vip_reward_created";
  user_id: string;
  phone: string | null;
  email: string | null;
  registered_at: string;
  reward_tier: string;
  pip_adjustment: number;
  valid_from: string;
  valid_until: string;
  status: string;
};

export async function sendRewardCreatedWebhook(input: {
  user: User;
  reward: WheelReward;
}) {
  const url = process.env.REWARD_ADMIN_WEBHOOK_URL;
  if (!url) return { sent: false as const, reason: "missing_url" };

  const payload: RewardWebhookPayload = {
    event: "registration_vip_reward_created",
    user_id: input.user.id,
    phone: input.user.phone ?? null,
    email: input.user.email ?? null,
    registered_at: input.user.registeredAt.toISOString(),
    reward_tier: input.reward.rewardTier,
    pip_adjustment: input.reward.pipAdjustment,
    valid_from: input.reward.validFrom.toISOString(),
    valid_until: input.reward.validUntil.toISOString(),
    status: input.reward.status
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("Reward webhook failed", { status: response.status });
      return { sent: false as const, reason: "non_2xx" };
    }

    return { sent: true as const };
  } catch (error) {
    console.error("Reward webhook error", error);
    return { sent: false as const, reason: "network_error" };
  }
}
