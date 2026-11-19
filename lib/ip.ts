import { createHash } from "node:crypto";

/** Hashed visitor id for rate limiting. The raw IP is never stored. */
export function visitorId(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || "unknown";
  return createHash("sha256")
    .update(ip + (process.env.IP_SALT ?? ""))
    .digest("hex")
    .slice(0, 24);
}
