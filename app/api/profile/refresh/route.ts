import { NextResponse } from "next/server";
import { z } from "zod";
import { allow, ensureSchema, sql } from "@/lib/db";
import { readProfile } from "@/lib/skillrack";
import { saveSnapshot } from "@/lib/snapshot";

export const runtime = "nodejs";

const Body = z.object({ slug: z.string().regex(/^[a-f0-9]{10}$/) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await ensureSchema();
  const rows = await sql`select id, resume_url from profiles where slug = ${parsed.data.slug}`;
  if (!rows.length) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  if (!(await allow(`refresh:${parsed.data.slug}`, 3, 600))) {
    return NextResponse.json({ error: "Refreshed a moment ago. Try again in a few minutes." }, { status: 429 });
  }

  try {
    await saveSnapshot(Number(rows[0].id), await readProfile(rows[0].resume_url));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not refresh." }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
