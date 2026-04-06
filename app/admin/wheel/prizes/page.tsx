import { headers } from "next/headers";

import { PrizesAdminClient } from "@/components/admin/wheel/PrizesAdminClient";
import { assertAdminPageAccess } from "@/lib/adminAuth";

export default async function AdminWheelPrizesPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const searchParams = await props.searchParams;
  const h = await headers();
  const userId = h.get("x-user-id");
  assertAdminPageAccess({ token: searchParams.token, userId });

  return <PrizesAdminClient adminToken={searchParams.token} />;
}
