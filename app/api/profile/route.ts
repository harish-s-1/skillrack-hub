import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { allow, ensureSchema, sql } from "@/lib/db";
import { visitorId } from "@/lib/ip";
import { normaliseResumeUrl, readProfile, resumeId } from "@/lib/skillrack";
import { saveSnapshot } from "@/lib/snapshot";

export const runtime = "nodejs";

const Body = z.object({
  url: z.string().max(500),
  showOnLeaderboard: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paste your SkillRack resume link." }, { status: 400 });

  const url = normaliseResumeUrl(parsed.data.url);
  const rid = url ? resumeId(url) : null;
  if (!url || !rid) {
    return NextResponse.json(
      { error: "That does not look like a SkillRack resume link. It should start with skillrack.com." },
      { status: 400 },
    );
  }

  await ensureSchema();
  if (!(await allow(`add:${visitorId(req)}`, 10, 3600))) {
    return NextResponse.json({ error: "Too many tries. Wait a bit and try again." }, { status: 429 });
  }

  let data;
  try {
    data = await readProfile(url);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read that page." }, { status: 422 });
  }

  const existing = await sql`select id, slug from profiles where resume_id = ${rid}`;
  let id: number;
  let slug: string;
  if (existing.length) {
    id = Number(existing[0].id);
    slug = existing[0].slug;
    await sql`update profiles set resume_url = ${url} where id = ${id}`;
  } else {
    slug = randomBytes(5).toString("hex");
    const row = await sql`
      insert into profiles (slug, resume_url, resume_id, show_on_leaderboard)
      values (${slug}, ${url}, ${rid}, ${parsed.data.showOnLeaderboard ?? true})
      returning id`;
    id = Number(row[0].id);
  }
  await saveSnapshot(id, data);
  return NextResponse.json({ slug });
}
