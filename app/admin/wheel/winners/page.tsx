import { headers } from "next/headers";

import { WinnersAdminClient } from "@/components/admin/wheel/WinnersAdminClient";
import { assertAdminPageAccess } from "@/lib/adminAuth";

export default async function AdminWheelWinnersPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const searchParams = await props.searchParams;
  const h = await headers();
  const userId = h.get("x-user-id");
  assertAdminPageAccess({ token: searchParams.token, userId });

  return <WinnersAdminClient adminToken={searchParams.token} />;
}
