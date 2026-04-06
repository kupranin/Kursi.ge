"use client";

import { createClient } from "@supabase/supabase-js";

import { requireEnv } from "@/lib/supabase/shared";

export function createSupabaseBrowserClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
