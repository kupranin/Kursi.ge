import { unauthorized } from "next/navigation";

type HeadersLike = Pick<Headers, "get">;

function getAllowedAdminIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function isAdminHeaders(headers: HeadersLike): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  const secretFromHeader = headers.get("x-admin-secret");
  if (adminSecret && secretFromHeader && secretFromHeader === adminSecret) {
    return true;
  }

  const userId = headers.get("x-user-id");
  if (!userId) return false;
  return getAllowedAdminIds().has(userId);
}

export function assertAdminRequest(headers: HeadersLike) {
  if (process.env.NODE_ENV !== "production" && process.env.ADMIN_BYPASS_LOCAL === "true") {
    return;
  }
  if (!isAdminHeaders(headers)) {
    throw new Response(JSON.stringify({ error: "FORBIDDEN" }), { status: 403 });
  }
}

export function assertAdminPageAccess(params: { token?: string; userId?: string | null }) {
  if (process.env.NODE_ENV !== "production" && process.env.ADMIN_BYPASS_LOCAL === "true") {
    return;
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && params.token && params.token === adminSecret) return;

  if (params.userId && getAllowedAdminIds().has(params.userId)) return;

  unauthorized();
}
