import { sql } from "./db";
import type { ResumeData } from "./skillrack";
import { todayIST } from "./stats";

export async function saveSnapshot(profileId: number | string, d: ResumeData) {
  const c = d.categories;
  await sql`
    insert into snapshots (profile_id, day, code_tutor, code_track, dc, dt, code_test, points, opening_points)
    values (${profileId}, ${todayIST()}, ${c.codeTutor}, ${c.codeTrack}, ${c.dc}, ${c.dt}, ${c.codeTest}, ${d.points}, ${d.points})
    on conflict (profile_id, day) do update set
      code_tutor = excluded.code_tutor, code_track = excluded.code_track,
      dc = excluded.dc, dt = excluded.dt, code_test = excluded.code_test,
      points = excluded.points,
      opening_points = coalesce(snapshots.opening_points, excluded.opening_points)`;
  await sql`
    update profiles set name = ${d.name}, dept = ${d.dept}, college = ${d.college},
      year = ${d.year}, refreshed_at = now()
    where id = ${profileId}`;
}