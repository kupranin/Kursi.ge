import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { weightedSelect } from "@/lib/wheel/weightedSelect";
import type { WheelCampaignRow, WheelPrizeRow } from "@/lib/wheel/types";

function isEligibleNow(prize: WheelPrizeRow, nowIso: string): boolean {
  if (!prize.is_active) return false;
  if (prize.starts_at && prize.starts_at > nowIso) return false;
  if (prize.ends_at && prize.ends_at < nowIso) return false;
  if (prize.stock_limit !== null && prize.stock_used >= prize.stock_limit) return false;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      user_id?: string;
      userId?: string;
      phone?: string;
      email?: string;
    };

    const supabase = createSupabaseAdminClient();
    const userId = String(body.user_id ?? body.userId ?? "").trim();
    if (!/^\d{11}$/.test(userId)) {
      return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
    }
    const { count: blockedCount, error: blockedCheckError } = await supabase
      .from("clients_import")
      .select("user_identifier", { count: "exact", head: true })
      .eq("user_identifier", userId);
    if (blockedCheckError) {
      console.error("wheel spin blocked check failed", blockedCheckError);
      return NextResponse.json({ error: "BLOCKED_CHECK_FAILED" }, { status: 500 });
    }
    if ((blockedCount ?? 0) > 0) {
      return NextResponse.json({ error: "ID_NOT_ELIGIBLE" }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const { data: campaignData, error: campaignError } = await supabase
      .from("wheel_campaigns")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1);
    if (campaignError) {
      console.error("wheel spin campaign load failed", campaignError);
      return NextResponse.json({ error: "CAMPAIGN_LOAD_FAILED" }, { status: 500 });
    }

    const campaign = (campaignData?.[0] ?? null) as WheelCampaignRow | null;
    if (!campaign) return NextResponse.json({ error: "NO_ACTIVE_CAMPAIGN" }, { status: 400 });
    if (
      campaign.total_prizes_limit !== null &&
      campaign.total_prizes_used >= campaign.total_prizes_limit
    ) {
      return NextResponse.json({ error: "CAMPAIGN_STOCK_EXHAUSTED" }, { status: 400 });
    }

    let existingWinCount = 0;
    const scopedWinCheck = await supabase
      .from("wheel_wins")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("user_id", userId);
    if (scopedWinCheck.error && /campaign_id/i.test(scopedWinCheck.error.message)) {
      // Backward compatibility: older schema may not have campaign_id yet.
      const legacyWinCheck = await supabase
        .from("wheel_wins")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (legacyWinCheck.error) {
        console.error("wheel spin legacy win check failed", legacyWinCheck.error);
        return NextResponse.json({ error: "WIN_CHECK_FAILED" }, { status: 500 });
      }
      existingWinCount = legacyWinCheck.count ?? 0;
    } else if (scopedWinCheck.error) {
      console.error("wheel spin win check failed", scopedWinCheck.error);
      return NextResponse.json({ error: "WIN_CHECK_FAILED" }, { status: 500 });
    } else {
      existingWinCount = scopedWinCheck.count ?? 0;
    }
    if (existingWinCount > 0) {
      return NextResponse.json({ error: "ALREADY_SPUN_FOR_CAMPAIGN" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("wheel_prizes")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("wheel spin prize load failed", error);
      return NextResponse.json({ error: "PRIZE_LOAD_FAILED" }, { status: 500 });
    }

    const activePrizes = ((data ?? []) as WheelPrizeRow[]).filter((prize) => isEligibleNow(prize, nowIso));
    if (activePrizes.length === 0) {
      return NextResponse.json({ error: "NO_AVAILABLE_PRIZES" }, { status: 400 });
    }

    const selected = weightedSelect(activePrizes.map((prize) => ({ item: prize, weight: prize.weight })));

    if (selected.stock_limit !== null) {
      const { error: stockError } = await supabase
        .from("wheel_prizes")
        .update({ stock_used: selected.stock_used + 1 })
        .eq("id", selected.id)
        .lt("stock_used", selected.stock_limit);
      if (stockError) {
        console.error("wheel spin prize stock update failed", stockError);
        return NextResponse.json({ error: "PRIZE_STOCK_UPDATE_FAILED" }, { status: 500 });
      }
    }

    if (campaign.total_prizes_limit !== null) {
      const { error: campaignStockError } = await supabase
        .from("wheel_campaigns")
        .update({ total_prizes_used: campaign.total_prizes_used + 1 })
        .eq("id", campaign.id)
        .lt("total_prizes_used", campaign.total_prizes_limit);
      if (campaignStockError) {
        console.error("wheel spin campaign stock update failed", campaignStockError);
        return NextResponse.json({ error: "CAMPAIGN_STOCK_UPDATE_FAILED" }, { status: 500 });
      }
    } else {
      const { error: campaignUsageError } = await supabase
        .from("wheel_campaigns")
        .update({ total_prizes_used: campaign.total_prizes_used + 1 })
        .eq("id", campaign.id);
      if (campaignUsageError) {
        console.error("wheel spin campaign usage update failed", campaignUsageError);
        return NextResponse.json({ error: "CAMPAIGN_USAGE_UPDATE_FAILED" }, { status: 500 });
      }
    }

    const winPayload = {
      user_id: userId,
      phone: body.phone ?? null,
      email: body.email ?? null,
      campaign_id: campaign.id,
      campaign_name_snapshot: campaign.name,
      prize_id: selected.id,
      prize_name_snapshot: selected.internal_name,
      prize_label_snapshot: selected.display_label,
      weight_snapshot: selected.weight
    };

    let { data: insertedWin, error: winError } = await supabase
      .from("wheel_wins")
      .insert(winPayload)
      .select("*")
      .single();

    // Backward compatibility: if campaign snapshot columns are not migrated yet, save win without them.
    if (winError && /campaign_id|campaign_name_snapshot/i.test(winError.message)) {
      const fallbackPayload = {
        user_id: userId,
        phone: body.phone ?? null,
        email: body.email ?? null,
        prize_id: selected.id,
        prize_name_snapshot: selected.internal_name,
        prize_label_snapshot: selected.display_label,
        weight_snapshot: selected.weight
      };
      const fallbackResult = await supabase
        .from("wheel_wins")
        .insert(fallbackPayload)
        .select("*")
        .single();
      insertedWin = fallbackResult.data;
      winError = fallbackResult.error;
    }

    if (winError) {
      console.error("wheel spin win insert failed", winError);
      return NextResponse.json({ error: "WIN_INSERT_FAILED" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      winner: insertedWin,
      prize: {
        id: selected.id,
        internal_name: selected.internal_name,
        display_label: selected.display_label,
        description: selected.description,
        segment_color: selected.segment_color
      }
    });
  } catch (error) {
    console.error("wheel spin unexpected error", error);
    return NextResponse.json({ error: "SPIN_FAILED" }, { status: 500 });
  }
}
