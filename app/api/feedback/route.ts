import { NextResponse } from "next/server";
import { z } from "zod";
import { allow, ensureSchema, sql } from "@/lib/db";
import { visitorId } from "@/lib/ip";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["idea", "bug", "points", "report", "other"]),
  message: z.string().trim().min(5, "Write at least a few words.").max(2000, "Keep it under 2000 characters."),
  contact: z.string().trim().max(120).optional(),
  slug: z.string().regex(/^[a-f0-9]{10}$/).optional(),
  website: z.string().max(200).optional(), // hidden field that only bots fill in
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Check the form and try again.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { kind, message, contact, slug, website } = parsed.data;

  // A bot filled the hidden field. Pretend it worked and save nothing.
  if (website) return NextResponse.json({ ok: true });

  await ensureSchema();
  if (!(await allow(`feedback:${visitorId(req)}`, 5, 3600))) {
    return NextResponse.json({ error: "You sent a few already. Try again in an hour." }, { status: 429 });
  }

  await sql`
    insert into feedback (kind, message, contact, profile_slug)
    values (${kind}, ${message}, ${contact || null}, ${slug ?? null})`;
  return NextResponse.json({ ok: true });
}
