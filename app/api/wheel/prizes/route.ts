import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WheelCampaignRow, WheelPrizeRow } from "@/lib/wheel/types";

function isEligibleNow(prize: WheelPrizeRow, nowIso: string): boolean {
  if (!prize.is_active) return false;
  if (prize.starts_at && prize.starts_at > nowIso) return false;
  if (prize.ends_at && prize.ends_at < nowIso) return false;
  if (prize.stock_limit !== null && prize.stock_used >= prize.stock_limit) return false;
  return true;
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    const { data: campaignData, error: campaignError } = await supabase
      .from("wheel_campaigns")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1);
    if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 });

    const campaign = (campaignData?.[0] ?? null) as WheelCampaignRow | null;
    if (!campaign) return NextResponse.json({ error: "NO_ACTIVE_CAMPAIGN" }, { status: 400 });

    const { data: prizeData, error: prizeError } = await supabase
      .from("wheel_prizes")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (prizeError) return NextResponse.json({ error: prizeError.message }, { status: 500 });

    const prizes = ((prizeData ?? []) as WheelPrizeRow[]).filter((prize) => isEligibleNow(prize, nowIso));
    return NextResponse.json({ campaign, prizes });
  } catch {
    return NextResponse.json({ error: "FAILED_TO_LOAD_PRIZES" }, { status: 500 });
  }
}
