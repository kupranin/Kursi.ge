import { NextRequest, NextResponse } from "next/server";

import { assertAdminRequest } from "@/lib/adminAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WheelPrizeRow } from "@/lib/wheel/types";

const AUTO_SEGMENT_COLORS = ["#5B2E8F", "#7B4DFF", "#9A6CFF", "#6B1F46", "#A53667", "#B83C73"];

function withProbability(rows: WheelPrizeRow[]) {
  const activeTotalWeight = rows
    .filter((row) => row.is_active)
    .reduce((sum, row) => sum + row.weight, 0);

  return rows.map((row) => ({
    ...row,
    probability:
      row.is_active && activeTotalWeight > 0 ? Number(((row.weight / activeTotalWeight) * 100).toFixed(2)) : 0
  }));
}

async function getAutoSegmentColor(params: {
  campaignId: string | null;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}) {
  let statement = params.supabase.from("wheel_prizes").select("id", { count: "exact", head: true });
  if (params.campaignId) statement = statement.eq("campaign_id", params.campaignId);
  const { count, error } = await statement;
  if (error) return null;

  const index = (count ?? 0) % AUTO_SEGMENT_COLORS.length;
  return AUTO_SEGMENT_COLORS[index];
}

export async function GET(request: NextRequest) {
  try {
    assertAdminRequest(request.headers);
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const supabase = createSupabaseAdminClient();
    let statement = supabase
      .from("wheel_prizes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (campaignId) statement = statement.eq("campaign_id", campaignId);
    const { data, error } = await statement;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prizes: withProbability((data ?? []) as WheelPrizeRow[]) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdminRequest(request.headers);
    const body = await request.json();

    const campaignId = (body.campaign_id as string | null) ?? null;
    const supabase = createSupabaseAdminClient();
    const requestedColor = (body.segment_color as string | null) ?? null;
    const autoColor = await getAutoSegmentColor({ campaignId, supabase });

    const payload = {
      campaign_id: campaignId,
      internal_name: body.internal_name as string,
      display_label: body.display_label as string,
      description: (body.description as string | null) ?? null,
      weight: Number(body.weight ?? 1),
      is_active: Boolean(body.is_active ?? true),
      sort_order: Number(body.sort_order ?? 0),
      segment_color: requestedColor || autoColor,
      starts_at: (body.starts_at as string | null) ?? null,
      ends_at: (body.ends_at as string | null) ?? null,
      stock_limit:
        body.stock_limit === null || body.stock_limit === undefined || body.stock_limit === ""
          ? null
          : Number(body.stock_limit)
    };

    const { data, error } = await supabase.from("wheel_prizes").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ prize: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertAdminRequest(request.headers);
    const body = await request.json();
    const id = body.id as string | undefined;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    const fields = [
      "campaign_id",
      "internal_name",
      "display_label",
      "description",
      "weight",
      "is_active",
      "sort_order",
      "segment_color",
      "starts_at",
      "ends_at",
      "stock_limit"
    ] as const;
    for (const field of fields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if ("weight" in updates) updates.weight = Number(updates.weight);
    if ("sort_order" in updates) updates.sort_order = Number(updates.sort_order);
    if ("stock_limit" in updates) {
      updates.stock_limit =
        updates.stock_limit === null || updates.stock_limit === "" ? null : Number(updates.stock_limit);
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("wheel_prizes").update(updates).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ prize: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertAdminRequest(request.headers);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("wheel_prizes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}
