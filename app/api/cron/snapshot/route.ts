import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { readProfile } from "@/lib/skillrack";
import { saveSnapshot } from "@/lib/snapshot";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH = 150; // profiles per run, least recently refreshed first
const PARALLEL = 5;

/** Runs once a day (see vercel.json). Vercel Cron sends CRON_SECRET as a Bearer token. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const rows = await sql`
    select id, resume_url from profiles order by refreshed_at asc limit ${BATCH}`;

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += PARALLEL) {
    const chunk = rows.slice(i, i + PARALLEL);
    await Promise.all(
      chunk.map(async (r) => {
        try {
          await saveSnapshot(Number(r.id), await readProfile(r.resume_url));
          ok++;
        } catch {
          failed++;
        }
      }),
    );
  }
  return NextResponse.json({ ok, failed, total: rows.length });
}
