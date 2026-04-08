import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeUserId(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { userId?: string; user_id?: string };
    const userId = normalizeUserId(body.userId ?? body.user_id);

    if (!/^\d{11}$/.test(userId)) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "INVALID_ID_FORMAT",
          message: "ID უნდა შედგებოდეს ზუსტად 11 ციფრისგან."
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from("clients_import")
      .select("user_identifier", { count: "exact", head: true })
      .eq("user_identifier", userId);

    if (error) {
      return NextResponse.json({ eligible: false, reason: "CHECK_FAILED", message: error.message }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "ID_NOT_ELIGIBLE",
          message:
            "მადლობა ინტერესისთვის. ამ ID-ით ბორბლის შეთავაზება ვერ აქტიურდება. გთხოვთ გადაამოწმოთ მონაცემები."
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ eligible: true }, { status: 200 });
  } catch {
    return NextResponse.json({ eligible: false, reason: "CHECK_FAILED" }, { status: 500 });
  }
}
