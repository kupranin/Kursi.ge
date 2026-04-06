import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { weightedSelect } from "@/lib/wheel/weightedSelect";
import type { WheelPrizeRow } from "@/lib/wheel/types";

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
      phone?: string;
      email?: string;
    };

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wheel_prizes")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const nowIso = new Date().toISOString();
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
      if (stockError) return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    const winPayload = {
      user_id: body.user_id ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      prize_id: selected.id,
      prize_name_snapshot: selected.internal_name,
      prize_label_snapshot: selected.display_label,
      weight_snapshot: selected.weight
    };

    const { data: insertedWin, error: winError } = await supabase
      .from("wheel_wins")
      .insert(winPayload)
      .select("*")
      .single();
    if (winError) return NextResponse.json({ error: winError.message }, { status: 500 });

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
  } catch {
    return NextResponse.json({ error: "SPIN_FAILED" }, { status: 500 });
  }
}
