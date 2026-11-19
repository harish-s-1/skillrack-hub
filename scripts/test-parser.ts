import assert from "node:assert/strict";
import { normaliseResumeUrl, parseResume, resumeId } from "../lib/skillrack";
import { dailyGains, streaks } from "../lib/stats";

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

// --- Parser logic on a SYNTHETIC page (labels only, not a real SkillRack page)
const fake = `<html><body><h1>Asha K</h1>
  <p>Department: CSE</p><p>College: Test Engineering College</p>
  <div>Code Tutor 120</div><div>Code Track 340</div>
  <div>Daily Challenge 75</div><div>Daily Test 60</div><div>Code Test 30</div>
  <div>Total Points 1,000</div><script>var Code Tutor 9999</script></body></html>`;
const d = parseResume(fake);
assert.equal(d.name, "Asha K");
assert.deepEqual(d.categories, { codeTutor: 120, codeTrack: 340, dc: 75, dt: 60, codeTest: 30 });
assert.equal(d.points, 1000);
assert.throws(() => parseResume("<html><body>Please sign in</body></html>"));

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
// No gain on day one means nothing to show yet
assert.deepEqual(dailyGains([{ day: "2026-11-19", points: 1000, opening: 1000 }]), {});
// Day two is measured against day one's total, not its opening
assert.deepEqual(
  dailyGains([
    { day: "2026-11-19", points: 1045, opening: 1000 },
    { day: "2026-11-20", points: 1060, opening: 1045 },
  ]),
  { "2026-11-19": 45, "2026-11-20": 15 },
);

console.log("parser, url-safety and streak tests passed");