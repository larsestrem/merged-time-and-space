/* send-report.cjs — used by .github/workflows/maintenance.yml.
 * Reads date-report.txt + link-report.txt, and if any FINDING lines exist,
 * POSTs a summary to the owner's private Apps Script webhook (REPORT_WEBHOOK
 * env var), which lands in the Google Sheet and Gmail like a normal report. */
const fs = require("fs");

const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };
const all = read("date-report.txt") + "\n" + read("link-report.txt");
const findings = (all.match(/^FINDING\t.*$/gm) || []).map((l) => l.replace(/\t/g, " | "));

if (!findings.length) {
  console.log("No findings; nothing to send.");
  process.exit(0);
}
const details = findings.slice(0, 60).join("\n") +
  (findings.length > 60 ? `\n…and ${findings.length - 60} more` : "");

fetch(process.env.WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "https://timeandspace.science/",
    reason: `Maintenance report: ${findings.length} finding(s)`,
    details,
    email: "",
    ip: "github-actions",
    at: new Date().toISOString(),
  }),
}).then((r) => {
  console.log("webhook status", r.status);
  if (!r.ok) process.exit(1);
});
