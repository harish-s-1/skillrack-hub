import Link from "next/link";
import { ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard" };

export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { college: raw } = await searchParams;
  const college = raw && raw.length <= 120 ? raw : null;
  await ensureSchema();

  const colleges = await sql`
    select college, count(*)::int as n from profiles
    where show_on_leaderboard and college <> ''
    group by college order by n desc, college asc limit 100`;

  const rows = await sql`
    select p.slug, p.name, p.dept, p.college, s.points
    from profiles p
    join lateral (
      select points from snapshots where profile_id = p.id order by day desc limit 1
    ) s on true
    where p.show_on_leaderboard and (${college}::text is null or p.college = ${college})
    order by s.points desc, p.id asc
    limit 100`;

  return (
    <main className="wrap">
      <header className="page-head">
        <h1>Leaderboard</h1>
        <p className="muted">Only students who chose to appear are listed.</p>
      </header>

      <form className="panel" method="get" action="/leaderboard">
        <div className="field">
          <label htmlFor="college">College</label>
          <select id="college" name="college" defaultValue={college ?? ""}>
            <option value="">All colleges</option>
            {colleges.map((c) => (
              <option key={c.college} value={c.college}>{c.college} ({c.n})</option>
            ))}
          </select>
        </div>
        <button className="btn ghost" type="submit">Show</button>
      </form>

      <section className="panel">
        {rows.length === 0 ? (
          <p className="muted">Nobody is on the board yet. <Link href="/">Add your profile</Link> and be the first.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>#</th><th>Name</th><th>Department</th><th>College</th><th className="n">Points</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.slug}>
                    <td className="rank">{i + 1}</td>
                    <td><Link href={`/u/${r.slug}`}>{r.name || "Student"}</Link></td>
                    <td>{r.dept}</td>
                    <td>{r.college}</td>
                    <td className="n">{Number(r.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
