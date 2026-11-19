const WEEKS = 26;
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

function level(gain: number, scale: number) {
  if (gain <= 0) return 0;
  return Math.min(4, Math.ceil((gain / scale) * 4));
}

/** `today` is a YYYY-MM-DD string in IST, so server and viewer agree on the date. */
export default function Heatmap({ gains, today }: { gains: Record<string, number>; today: string }) {
  const [y, m, d] = today.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const start = new Date(t);
  start.setUTCDate(t.getUTCDate() - t.getUTCDay() - (WEEKS - 1) * 7);

  const values = Object.values(gains).sort((a, b) => a - b);
  const scale = values.length ? values[Math.floor(values.length * 0.9)] || values[values.length - 1] : 1;

  const weeks = [];
  let lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const first = new Date(start);
    first.setUTCDate(start.getUTCDate() + w * 7);
    const label = first.getUTCMonth() !== lastMonth ? first.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }) : "";
    lastMonth = first.getUTCMonth();
    const cells = [];
    for (let r = 0; r < 7; r++) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + w * 7 + r);
      const k = keyOf(day);
      const g = gains[k] ?? 0;
      cells.push(
        <div
          key={k}
          className={`cell l${level(g, scale)}${k > today ? " future" : ""}`}
          title={`${k}: ${g} points`}
          role="img"
          aria-label={`${k}: ${g} points gained`}
        />,
      );
    }
    weeks.push(
      <div className="week" key={w}>
        <div className="mlabel">{label}</div>
        {cells}
      </div>,
    );
  }

  return (
    <div>
      <div className="heat-head">
        <h2>Last 26 weeks</h2>
        <div className="legend" aria-hidden="true">
          Less <i style={{ background: "var(--h0)" }} /><i style={{ background: "var(--h1)" }} />
          <i style={{ background: "var(--h2)" }} /><i style={{ background: "var(--h3)" }} />
          <i style={{ background: "var(--h4)" }} /> More
        </div>
      </div>
      <div className="heat-scroll">
        <div className="heat">{weeks}</div>
      </div>
    </div>
  );
}
