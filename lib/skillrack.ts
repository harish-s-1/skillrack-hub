import * as cheerio from "cheerio";
import { scorePoints } from "./stats";

/**
 * SkillRack has no public API. A student's resume page is public to anyone
 * with the share link (it carries an id and a key), and that page is what
 * this reads. Only skillrack.com hosts are ever fetched.
 */

/** Programs solved in each SkillRack section. */
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
  /** Everything SkillRack counts as solved (the five categories added up). */
  programsSolved: number;
  /** Worked out from the category counts with POINT_WEIGHTS in stats.ts. */
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

/** The page text with a space between every element, so "280" and "PROGRAMS SOLVED" never glue together. */
export function visibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  $("body *").each((_, el) => {
    $(el).prepend(" ").append(" ");
  });
  return $("body").text().replace(/\s+/g, " ").trim();
}

// A SkillRack roll number such as SEC24CS111. Only used to find the name and
// college next to it. It is never stored or shown.
const ROLL = /\b[A-Z]{2,5}\d{2}[A-Z]{1,5}\d{1,4}\b/;

/**
 * Reads the "Programming Summary" on a SkillRack resume. On that page every
 * figure is a number followed by its label underneath ("280 PROGRAMS SOLVED",
 * "279 CODE TRACK"), so the number we want is the one directly BEFORE the label.
 * Each category is worth a different number of points per solve (see POINT_WEIGHTS).
 */
export function parseResume(html: string): ResumeData {
  const text = visibleText(html);

  const before = (label: string): number | null => {
    const m = text.match(new RegExp(`(?<![\\d,])(\\d[\\d,]*)\\s*${label}\\b`, "i"));
    return m ? num(m[1]) : null;
  };

  const categories: Categories = {
    codeTutor: before("Code\\s*Tutor") ?? 0,
    codeTrack: before("Code\\s*Track") ?? 0,
    dc: before("(?:DC|Daily\\s*Challenge)") ?? 0,
    dt: before("(?:DT|Daily\\s*Test)") ?? 0,
    codeTest: before("Code\\s*Test") ?? 0,
  };
  const categorySum = categories.codeTutor + categories.codeTrack + categories.dc + categories.dt + categories.codeTest;
  const programsSolved = before("Programs\\s*Solved") ?? categorySum;
  if (programsSolved > 0 && categorySum === 0) {
    throw new Error("Found the solved total but not the category counts, so points cannot be worked out.");
  }

  let name = "";
  let dept = "";
  let college = "";
  let year = "";
  const rm = text.match(ROLL);
  if (rm && rm.index !== undefined) {
    const head = text.slice(Math.max(0, rm.index - 80), rm.index).trim();
    const caps = head.match(/((?:[A-Z][A-Z.'-]*\s+){0,4}[A-Z][A-Z.'-]*)$/);
    name = caps && caps[1].trim().length >= 3 ? caps[1].trim() : head.split(" ").slice(-3).join(" ");

    const tail = text.slice(rm.index + rm[0].length).trim();
    const tm = tail.match(/^([A-Za-z&.]{2,12})\s+([^()]{3,120}?)\s*\(([^)]{2,30})\)\s*(\d{4})/);
    if (tm) {
      dept = tm[1];
      college = tm[2];
      year = `${tm[3]} ${tm[4]}`;
    }
  }

  if (programsSolved === 0 && !name) {
    throw new Error("Could not read that page. Check the link opens your resume while signed out.");
  }

  return {
    name: name.slice(0, 80),
    dept: dept.slice(0, 80),
    college: college.slice(0, 120),
    year: year.slice(0, 40),
    categories,
    programsSolved,
    points: scorePoints(categories),
  };
}

export async function readProfile(url: string): Promise<ResumeData> {
  return parseResume(await fetchResumeHtml(url));
}