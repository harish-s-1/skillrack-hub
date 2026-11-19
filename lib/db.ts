import { neon } from "@neondatabase/serverless";

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return neon(url);
}

export const sql = (strings: TemplateStringsArray, ...values: unknown[]) =>
  client()(strings, ...values) as Promise<Record<string, any>[]>;

let ready: Promise<void> | null = null;

/** Creates the tables on first use. Safe to call on every request. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`create table if not exists profiles (
        id bigserial primary key,
        slug text unique not null,
        resume_url text not null,
        resume_id text unique not null,
        name text not null default '',
        dept text not null default '',
        college text not null default '',
        year text not null default '',
        show_on_leaderboard boolean not null default true,
        created_at timestamptz not null default now(),
        refreshed_at timestamptz not null default now()
      )`;
      await sql`create table if not exists snapshots (
        profile_id bigint not null references profiles(id) on delete cascade,
        day date not null,
        code_tutor int not null default 0,
        code_track int not null default 0,
        dc int not null default 0,
        dt int not null default 0,
        code_test int not null default 0,
        points int not null default 0,
        primary key (profile_id, day)
      )`;
      await sql`alter table snapshots add column if not exists opening_points int`;
      await sql`create index if not exists snapshots_day on snapshots(day)`;
      await sql`create table if not exists rate_limits (
        bucket text not null,
        window_start timestamptz not null,
        hits int not null default 1,
        primary key (bucket, window_start)
      )`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** Fixed-window limiter. Returns true when the call is allowed. */
export async function allow(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    insert into rate_limits (bucket, window_start, hits)
    values (${bucket}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}), 1)
    on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
    returning hits`;
  return Number(rows[0].hits) <= limit;
}