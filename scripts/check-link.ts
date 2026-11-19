import { load } from "cheerio";
import { fetchResumeHtml, parseResume } from "../lib/skillrack";

// Usage: npm run check:link -- "<your skillrack resume link>"
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: npm run check:link -- "<your skillrack resume link>"');
    process.exit(1);
  }

  const html = await fetchResumeHtml(url);
  console.log(`Fetched ${html.length} characters.`);
  try {
    console.log(JSON.stringify(parseResume(html), null, 2));
  } catch (e) {
    console.error("Parser could not read it:", e instanceof Error ? e.message : e);
    console.error("\nFirst 1500 characters of visible text, to see what the page really says:\n");
    const $ = load(html);
    $("script, style").remove();
    console.error($("body").text().replace(/\s+/g, " ").trim().slice(0, 1500));
    process.exit(2);
  }
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});