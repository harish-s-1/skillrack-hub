import { notFound } from "next/navigation";
import Heatmap from "@/components/Heatmap";
import RefreshButton from "@/components/RefreshButton";
import { ensureSchema, sql } from "@/lib/db";
import { POINT_WEIGHTS, dailyGains, streaks, todayIST } from "@/lib/stats";

export const dynamic = "force-dynamic";

const CATS = [
  ["Code Tutor", "code_tutor"],
  ["Code Track", "code_track"],
  ["Daily Challenge", "dc"],
  ["Daily Test", "dt"],
  ["Code Test", "code_test"],
] as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await ensureSchema();
  const rows = await sql`select name, show_on_leaderboard from profiles where slug = ${slug}`;
  const name = rows[0]?.name;
  return { title: name ? `${name}'s progress` : "SkillRack progress" };
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-f0-9]{10}$/.test(slug)) notFound();
  await ensureSchema();

  const rows = await sql`
    select id, name, dept, college, year, refreshed_at from profiles where slug = ${slug}`;
  if (!rows.length) notFound();
  const p = rows[0];

  const snaps = await sql`
    select to_char(day, 'YYYY-MM-DD') as day, code_tutor, code_track, dc, dt, code_test, points, opening_points
    from snapshots where profile_id = ${p.id} order by day asc`;
  const latest = snaps[snaps.length - 1];
  const today = todayIST();
  const gains = dailyGains(
    snaps.map((s) => ({
      day: s.day,
      points: Number(s.points),
      opening: s.opening_points == null ? undefined : Number(s.opening_points),
    })),
  );
  const { current, best } = streaks(gains, today);
  const programs = CATS.reduce((a, [, k]) => a + Number(latest?.[k] ?? 0), 0);

  const maxCat = Math.max(1, ...CATS.map(([, k]) => Number(latest?.[k] ?? 0)));
  const sub = [p.dept, p.college, p.year].filter(Boolean).join(" · ");
  const refreshed = new Date(p.refreshed_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <main className="wrap">
      <header className="head-row">
        <div className="page-head">
          <h1>{p.name || "SkillRack student"}</h1>
          {sub && <p className="muted">{sub}</p>}
          <p className="muted small">Updated {refreshed} IST. Refreshes automatically every day.</p>
        </div>
        <RefreshButton slug={slug} />
      </header>

      <dl className="panel stats" aria-label="Summary">
        <div className="stat"><dt>Total points</dt><dd>{Number(latest?.points ?? 0)}</dd></div>
        <div className="stat"><dt>Current streak</dt><dd>{current}<span className="muted small"> days</span></dd></div>
        <div className="stat"><dt>Best streak</dt><dd>{best}<span className="muted small"> days</span></dd></div>
        <div className="stat"><dt>Programs solved</dt><dd>{programs}</dd></div>
      </dl>

      <section className="panel">
        <h2>Solved by category</h2>
        <p className="muted small">
          Points per solve: Code Tutor {POINT_WEIGHTS.codeTutor}, Code Track {POINT_WEIGHTS.codeTrack}, Daily Challenge{" "}
          {POINT_WEIGHTS.dc}, Daily Test {POINT_WEIGHTS.dt}, Code Test {POINT_WEIGHTS.codeTest}.
        </p>
        <div className="cats">
          {CATS.map(([label, key]) => {
            const v = Number(latest?.[key] ?? 0);
            return (
              <div className="cat" key={key}>
                <span>{label}</span>
                <div className="bar"><span style={{ width: `${(v / maxCat) * 100}%` }} /></div>
                <span className="v">{v}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <Heatmap gains={gains} today={today} />
        {snaps.length < 2 && (
          <p className="muted small">
            Your streak and heatmap start from the day you joined. They fill in as your points change from day to day.
          </p>
        )}
      </section>
    </main>
  );
}