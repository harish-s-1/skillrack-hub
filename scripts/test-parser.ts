import assert from "node:assert/strict";
import { normaliseResumeUrl, parseResume, resumeId } from "../lib/skillrack";
import { POINT_WEIGHTS as W, dailyGains, scorePoints, streaks } from "../lib/stats";

// --- URL safety: only skillrack.com resume links get through -------------
assert.equal(
  normaliseResumeUrl("http://www.skillrack.com/profile/123456/abcdef123456"),
  "https://www.skillrack.com/profile/123456/abcdef123456",
);
assert.equal(
  normaliseResumeUrl("https://www.skillrack.com/faces/resume.xhtml?id=42&key=abcdef123456"),
  "https://www.skillrack.com/faces/resume.xhtml?id=42&key=abcdef123456",
);
for (const bad of [
  "https://evil.com/profile/123456/abcdef123456",
  "https://skillrack.com.evil.com/profile/123456/abcdef123456",
  "https://www.skillrack.com@evil.com/profile/123456/abcdef123456",
  "http://169.254.169.254/latest/meta-data",
  "http://localhost:3000/",
  "file:///etc/passwd",
  "javascript:alert(1)",
  "https://www.skillrack.com/profile/abc/short",
  "not a url",
  "",
]) {
  assert.equal(normaliseResumeUrl(bad), null, `should reject: ${bad}`);
}
assert.equal(resumeId("https://www.skillrack.com/profile/123456/abcdef123456"), "123456");

// --- Parser on a SYNTHETIC page built from a real profile screenshot -------
// Layout: the number comes first, its label underneath. The elements have no
// whitespace between them on purpose, like a real page often does.
const fake = `<html><body>
  <nav>Dashboard Profile Resume</nav>
  <div><h4>TEST STUDENT A</h4><p>SEC24CS111</p><span>CSE</span>
  <p>Sairam Engineering College, Chennai (Pre-Final Year) 2028</p></div>
  <section><h3>PROGRAMMING SUMMARY</h3>
   <div><b>103227</b><small>RANK</small></div><div><b>0/10</b><small>LEVEL</small></div>
   <div><b>60</b><small>BRONZE</small></div>
   <div><b>280</b><small>PROGRAMS SOLVED</small></div>
   <div><b>0</b><small>CODE TEST</small></div>
   <div><b>279</b><small>CODE TRACK</small></div>
   <div><b>0</b><small>DC</small></div>
   <div><b>0</b><small>DT</small></div>
   <div><b>1</b><small>CODE TUTOR</small></div>
   <div><b>194</b><small>C</small></div><div><b>74</b><small>PYTHON3</small></div><div><b>12</b><small>JAVA</small></div>
  </section><script>var x = "9999 CODE TEST";</script></body></html>`;
const d = parseResume(fake);
assert.deepEqual(d.categories, { codeTutor: 1, codeTrack: 279, dc: 0, dt: 0, codeTest: 0 });
assert.equal(d.programsSolved, 280);
assert.equal(d.points, 1 * W.codeTutor + 279 * W.codeTrack);
assert.equal(d.name, "TEST STUDENT A");
assert.equal(d.dept, "CSE");
assert.equal(d.college, "Sairam Engineering College, Chennai");
assert.equal(d.year, "Pre-Final Year 2028");
assert.ok(!JSON.stringify(d).includes("SEC24CS111"), "roll number must not be kept");

// Programs solved missing: fall back to the sum of the categories
const noTotal = parseResume(`<body><b>5</b><small>CODE TRACK</small><b>3</b><small>DC</small></body>`);
assert.equal(noTotal.programsSolved, 8);
assert.equal(noTotal.points, 5 * W.codeTrack + 3 * W.dc);

// DC and DT sit inside "Programs Solved", so they must not be counted twice
const mixed = parseResume(
  `<body><b>10</b><small>PROGRAMS SOLVED</small><b>3</b><small>CODE TRACK</small><b>2</b><small>CODE TUTOR</small>
   <b>3</b><small>DC</small><b>2</b><small>DT</small></body>`,
);
assert.equal(mixed.programsSolved, 10);
assert.equal(mixed.points, 2 * W.codeTutor + 3 * W.codeTrack + 3 * W.dc + 2 * W.dt);

assert.throws(() => parseResume("<html><body>Please sign in</body></html>"));

// A real profile checked against an independent points calculator:
// 186 Code Tutor, 419 Code Track, 5 DC, 5 DT, 0 Code Test = 615 solved, 948 points
assert.equal(scorePoints({ codeTutor: 186, codeTrack: 419, dc: 5, dt: 5, codeTest: 0 }), 948);
// A solved total with no readable categories must fail loudly, not score 0
assert.throws(() => parseResume(`<body><b>50</b><small>PROGRAMS SOLVED</small></body>`));

// --- Streak maths --------------------------------------------------------
const snaps = [
  { day: "2026-11-10", points: 100 },
  { day: "2026-11-11", points: 130 },
  { day: "2026-11-12", points: 130 }, // no gain: breaks the run
  { day: "2026-11-13", points: 150 },
  { day: "2026-11-14", points: 160 },
  { day: "2026-11-15", points: 190 },
];
const g = dailyGains(snaps);
assert.deepEqual(g, { "2026-11-11": 30, "2026-11-13": 20, "2026-11-14": 10, "2026-11-15": 30 });
assert.deepEqual(streaks(g, "2026-11-15"), { current: 3, best: 3 });
assert.deepEqual(streaks(g, "2026-11-16"), { current: 3, best: 3 }); // today not done yet keeps the streak
assert.deepEqual(streaks(g, "2026-11-17"), { current: 0, best: 3 }); // a missed day ends it

// First day only: gain is measured from the first reading of that day
const first = dailyGains([{ day: "2026-11-19", points: 1045, opening: 1000 }]);
assert.deepEqual(first, { "2026-11-19": 45 });
assert.deepEqual(streaks(first, "2026-11-19"), { current: 1, best: 1 });
assert.deepEqual(dailyGains([{ day: "2026-11-19", points: 1000, opening: 1000 }]), {});
assert.deepEqual(
  dailyGains([
    { day: "2026-11-19", points: 1045, opening: 1000 },
    { day: "2026-11-20", points: 1060, opening: 1045 },
  ]),
  { "2026-11-19": 45, "2026-11-20": 15 },
);

console.log("parser, url-safety and streak tests passed");