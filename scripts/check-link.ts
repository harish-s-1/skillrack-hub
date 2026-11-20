import { fetchResumeHtml, parseResume, visibleText } from "../lib/skillrack";

// Usage: npm run check:link -- "<your skillrack resume link>"
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: npm run check:link -- "<your skillrack resume link>"');
    process.exit(1);
  }

  const html = await fetchResumeHtml(url);
  console.log(`Fetched ${html.length} characters.\n`);

  try {
    console.log("Parsed result:");
    console.log(JSON.stringify(parseResume(html), null, 2));
  } catch (e) {
    console.error("Parser could not read it:", e instanceof Error ? e.message : e);
  }

  console.log("\nStart of the page text the reader sees (to compare with your profile):\n");
  console.log(visibleText(html).slice(0, 1200));
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});