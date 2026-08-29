/* send-report.cjs — used by .github/workflows/maintenance.yml.
 *
 * Reads date-report.txt + link-report.txt and emails the owner ONLY what a
 * person can act on, via the same private Apps Script webhook the report
 * form uses (REPORT_WEBHOOK env var -> Google Sheet + Gmail).
 *
 * THE OLD VERSION DUMPED EVERY FINDING LINE, and check-links used to emit a
 * finding for every URL it merely could not verify — fifty state election
 * sites that block robots, every single day. The owner's verdict: "a wasted
 * email." The rules now:
 *
 *   - DATE findings (a countdown pointing at a passed or unconfirmed date)
 *     and DEAD links (404/410/no-such-domain, with the page each is used on)
 *     are the email. Each line is an edit somebody can actually make.
 *   - Links that are merely unverifiable (bot walls, rate limits, timeouts)
 *     are ONE count line, taken from check-links' own NOTE summary.
 *   - If there is nothing actionable, NO EMAIL IS SENT — a quiet day earns
 *     a quiet inbox, and the workflow log still has the full detail. */
const fs = require("fs");

const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };
const dateReport = read("date-report.txt");
const linkReport = read("link-report.txt");

const lines = (text) => (text.match(/^FINDING\t.*$/gm) || []).map((l) => l.replace(/^FINDING\t/, "").replace(/\t/g, " — "));
const dates = lines(dateReport);
const deadLinks = lines(linkReport);
const note = (linkReport.match(/^NOTE\t(.*)$/m) || [])[1] || "";

const actionable = dates.length + deadLinks.length;
if (!actionable) {
  console.log(`Nothing actionable (${note || "all links healthy"}); no email sent.`);
  process.exit(0);
}

const cap = (arr, n) => arr.slice(0, n).map((l) => `  • ${l}`).join("\n") + (arr.length > n ? `\n  …and ${arr.length - n} more` : "");
const sections = [];
if (dates.length) sections.push(`DATES TO FIX (${dates.length}) — each is an edit in seo/_data/events.json:\n${cap(dates, 25)}`);
if (deadLinks.length) sections.push(`DEAD LINKS TO REMOVE OR REPLACE (${deadLinks.length}) — the page each is used on is named:\n${cap(deadLinks, 25)}`);
if (note) sections.push(`FYI: ${note}`);
const details = sections.join("\n\n");

fetch(process.env.WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "https://timeandspace.science/",
    reason: `Maintenance report: ${actionable} thing(s) to fix` +
      (dates.length ? ` — ${dates.length} date(s)` : "") +
      (deadLinks.length ? ` — ${deadLinks.length} dead link(s)` : ""),
    details,
    email: "",
    ip: "github-actions",
    at: new Date().toISOString(),
  }),
}).then((r) => {
  console.log("webhook status", r.status);
  if (!r.ok) process.exit(1);
});
