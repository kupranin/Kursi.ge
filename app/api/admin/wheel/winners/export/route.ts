import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { assertAdminRequest } from "@/lib/adminAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    assertAdminRequest(request.headers);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("wheel_wins").select("*").order("won_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []).map((row) => ({
      won_at: row.won_at,
      user_id: row.user_id,
      phone: row.phone,
      email: row.email,
      prize_name_snapshot: row.prize_name_snapshot,
      prize_label_snapshot: row.prize_label_snapshot,
      is_redeemed: row.is_redeemed,
      redeemed_at: row.redeemed_at,
      admin_note: row.admin_note
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "wheel_winners");
    const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(output, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="wheel-winners-${new Date().toISOString().slice(0, 10)}.xlsx"`
      }
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}
