export type Snap = {
  day: string; // YYYY-MM-DD
  points: number;
  /** Total at the first reading of that day. Lets the very first day show a gain. */
  opening?: number;
};

/**
 * Points earned for each solve in each SkillRack category. Change these numbers
 * to change scoring everywhere. Checked against an independent points calculator:
 * 186 Code Tutor, 419 Code Track, 5 DC, 5 DT, 0 Code Test = 948 points.
 */
export const POINT_WEIGHTS = { codeTutor: 0, codeTrack: 2, dc: 2, dt: 20, codeTest: 30 };

export type Counts = { codeTutor: number; codeTrack: number; dc: number; dt: number; codeTest: number };

export function scorePoints(c: Counts): number {
  return (
    c.codeTutor * POINT_WEIGHTS.codeTutor +
    c.codeTrack * POINT_WEIGHTS.codeTrack +
    c.dc * POINT_WEIGHTS.dc +
    c.dt * POINT_WEIGHTS.dt +
    c.codeTest * POINT_WEIGHTS.codeTest
  );
}

const dayNum = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
};

/**
 * Points gained on each day = that day's total minus the previous day's total.
 * For the very first day there is no previous day, so it is measured from the
 * first reading taken that day (gains before we started watching are unknown).
 */
export function dailyGains(snaps: Snap[]): Record<string, number> {
  const sorted = [...snaps].sort((a, b) => a.day.localeCompare(b.day));
  const out: Record<string, number> = {};
  for (let i = 0; i < sorted.length; i++) {
    const base = i === 0 ? (sorted[0].opening ?? sorted[0].points) : sorted[i - 1].points;
    const gain = sorted[i].points - base;
    if (gain > 0) out[sorted[i].day] = gain;
  }
  return out;
}

export function streaks(gains: Record<string, number>, today: string) {
  const days = Object.keys(gains).sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of days) {
    const n = dayNum(k);
    run = prev !== null && n === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = n;
  }
  const set = new Set(days.map(dayNum));
  let n = dayNum(today);
  if (!set.has(n)) n--; // today not done yet should not break the streak
  let current = 0;
  while (set.has(n)) {
    current++;
    n--;
  }
  return { current, best };
}

export function todayIST(): string {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}