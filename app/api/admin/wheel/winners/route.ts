import { NextRequest, NextResponse } from "next/server";

import { assertAdminRequest } from "@/lib/adminAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    assertAdminRequest(request.headers);
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const prizeId = searchParams.get("prizeId");
    const query = searchParams.get("q");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createSupabaseAdminClient();
    let statement = supabase
      .from("wheel_wins")
      .select("*", { count: "exact" })
      .order("won_at", { ascending: false })
      .range(from, to);

    if (dateFrom) statement = statement.gte("won_at", dateFrom);
    if (dateTo) statement = statement.lte("won_at", dateTo);
    if (prizeId) statement = statement.eq("prize_id", prizeId);
    if (query) {
      statement = statement.or(`phone.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data, error, count } = await statement;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      winners: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: count ? Math.max(1, Math.ceil(count / pageSize)) : 1
      }
    });
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
    if ("is_redeemed" in body) {
      updates.is_redeemed = Boolean(body.is_redeemed);
      updates.redeemed_at = body.is_redeemed ? new Date().toISOString() : null;
    }
    if ("admin_note" in body) {
      updates.admin_note = body.admin_note;
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("wheel_wins").update(updates).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ winner: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}
