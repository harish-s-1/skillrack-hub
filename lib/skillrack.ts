import * as cheerio from "cheerio";

/**
 * SkillRack has no public API. A student's resume page is public to anyone
 * with the share link (it carries an id and a key), and that page is what
 * this reads. Only skillrack.com hosts are ever fetched.
 */

export type Categories = {
  codeTutor: number;
  codeTrack: number;
  dc: number; // Daily Challenge
  dt: number; // Daily Test
  codeTest: number;
};

export type ResumeData = {
  name: string;
  dept: string;
  college: string;
  year: string;
  categories: Categories;
  points: number;
};

const ALLOWED_HOSTS = new Set(["skillrack.com", "www.skillrack.com"]);

/** Accepts the profile link or the resume link. Returns a clean https URL or null. */
export function normaliseResumeUrl(input: string): string | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!ALLOWED_HOSTS.has(u.hostname.toLowerCase())) return null;

  // https://www.skillrack.com/profile/<id>/<key>
  const m = u.pathname.match(/^\/profile\/(\d{1,12})\/([A-Za-z0-9]{8,64})\/?$/);
  if (m) return `https://www.skillrack.com/profile/${m[1]}/${m[2]}`;

  // https://www.skillrack.com/faces/resume.xhtml?id=<id>&key=<key>
  if (u.pathname.toLowerCase().endsWith("/faces/resume.xhtml")) {
    const id = u.searchParams.get("id") ?? "";
    const key = u.searchParams.get("key") ?? "";
    if (/^\d{1,12}$/.test(id) && /^[A-Za-z0-9]{8,64}$/.test(key)) {
      return `https://www.skillrack.com/faces/resume.xhtml?id=${id}&key=${key}`;
    }
  }
  return null;
}

/** The id in the link is stable and public-safe to show; the key is not. */
export function resumeId(url: string): string | null {
  const m = url.match(/\/profile\/(\d+)\//) ?? url.match(/[?&]id=(\d+)/);
  return m ? m[1] : null;
}

export async function fetchResumeHtml(url: string): Promise<string> {
  const safe = normaliseResumeUrl(url);
  if (!safe) throw new Error("That is not a SkillRack resume link.");

  const res = await fetch(safe, {
    redirect: "manual",
    headers: { "user-agent": "SkillRackHub/0.1 (+student progress tracker)" },
    signal: AbortSignal.timeout(12_000),
  });

  // Follow at most 2 redirects and only to skillrack.com
  let current = res;
  let hops = 0;
  while (current.status >= 300 && current.status < 400 && hops < 2) {
    const loc = current.headers.get("location");
    if (!loc) break;
    const next = new URL(loc, safe);
    if (!ALLOWED_HOSTS.has(next.hostname.toLowerCase())) {
      throw new Error("SkillRack redirected somewhere unexpected.");
    }
    current = await fetch(next, {
      redirect: "manual",
      headers: { "user-agent": "SkillRackHub/0.1 (+student progress tracker)" },
      signal: AbortSignal.timeout(12_000),
    });
    hops++;
  }
  if (!current.ok) throw new Error(`SkillRack returned ${current.status}.`);

  const text = await current.text();
  if (text.length > 3_000_000) throw new Error("Page was larger than expected.");
  return text;
}

const num = (s: string | undefined) => {
  if (!s) return 0;
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Pulls label/value pairs out of the page text. This is deliberately tolerant:
 * it looks for the label and takes the first number after it, so small layout
 * changes do not break it. It must be checked against one real resume page
 * before launch (see README), because the labels below come from the public
 * tracker's field names, not from a saved copy of the page.
 */
export function parseResume(html: string): ResumeData {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const grab = (labels: string[]): number => {
    for (const label of labels) {
      const re = new RegExp(`${label}[^0-9]{0,40}(\\d[\\d,]*)`, "i");
      const m = text.match(re);
      if (m) return num(m[1]);
    }
    return 0;
  };

  const categories: Categories = {
    codeTutor: grab(["Code\\s*Tutor"]),
    codeTrack: grab(["Code\\s*Track"]),
    dc: grab(["Daily\\s*Challenge"]),
    dt: grab(["Daily\\s*Test"]),
    codeTest: grab(["Code\\s*Test"]),
  };

  const field = (labels: string[]): string => {
    for (const label of labels) {
      const re = new RegExp(`${label}\\s*[:\\-]\\s*([A-Za-z0-9 .,&()'\\-]{2,80}?)(?=\\s{2,}|\\s[A-Z][a-z]+\\s*[:\\-]|$)`, "i");
      const m = text.match(re);
      if (m) return m[1].trim();
    }
    return "";
  };

  const name =
    $("h1").first().text().trim() ||
    $("[class*='name']").first().text().trim() ||
    field(["Name"]);

  const total = categories.codeTutor + categories.codeTrack + categories.dc + categories.dt + categories.codeTest;
  const stated = grab(["Total\\s*Points", "Points"]);

  const data: ResumeData = {
    name: name.slice(0, 80),
    dept: field(["Department", "Dept"]).slice(0, 80),
    college: field(["College", "Institution"]).slice(0, 120),
    year: field(["Year", "Batch"]).slice(0, 20),
    categories,
    points: stated || total,
  };

  if (!data.name && data.points === 0) {
    throw new Error("Could not read points from that page. Check the link opens your resume while signed out.");
  }
  return data;
}

export async function readProfile(url: string): Promise<ResumeData> {
  return parseResume(await fetchResumeHtml(url));
}
