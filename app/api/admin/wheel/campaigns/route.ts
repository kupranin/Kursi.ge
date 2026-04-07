import { NextRequest, NextResponse } from "next/server";

import { assertAdminRequest } from "@/lib/adminAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    assertAdminRequest(request.headers);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wheel_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaigns: data ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdminRequest(request.headers);
    const body = await request.json();
    const payload = {
      name: body.name as string,
      starts_at: body.starts_at as string,
      ends_at: body.ends_at as string,
      total_prizes_limit:
        body.total_prizes_limit === null || body.total_prizes_limit === undefined || body.total_prizes_limit === ""
          ? null
          : Number(body.total_prizes_limit),
      is_active: Boolean(body.is_active ?? true)
    };

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("wheel_campaigns").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ campaign: data });
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
    const fields = ["name", "starts_at", "ends_at", "total_prizes_limit", "is_active"] as const;
    for (const field of fields) {
      if (field in body) updates[field] = body[field];
    }
    if ("total_prizes_limit" in updates) {
      updates.total_prizes_limit =
        updates.total_prizes_limit === null || updates.total_prizes_limit === ""
          ? null
          : Number(updates.total_prizes_limit);
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wheel_campaigns")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ campaign: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}
