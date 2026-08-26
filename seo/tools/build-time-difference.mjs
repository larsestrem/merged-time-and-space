#!/usr/bin/env node
/* build-time-difference.mjs — /time-difference-calculator/, a single page:
 * enter a start clock time and an end clock time, each with its own time zone,
 * and get the duration between them. Client-side only — the answer changes
 * with what the visitor types, so there is nothing to bake per-page.
 *
 * The form and the maths both come from time-diff.mjs, which the home page's
 * card also uses, so the two calculators cannot drift apart. That module also
 * documents why there is a zone on each side and how the end time is pinned to
 * a calendar day.
 *
 *   node seo/tools/build-time-difference.mjs   (run before build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, appLd, faqLd } from "./lib.mjs";
import { tdiffForm, TDIFF_JS, TDIFF_ZONES } from "./time-diff.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

const FAQ = [
  ["How do I calculate the time difference between two times?",
    "Enter a start time and an end time and this page works out the hours and minutes between them. Each side has its own time zone, so the two times can be in different places — leave both on your device's own zone for an ordinary same-place calculation."],
  ["How do I work out a flight time across time zones?",
    "Put the departure time in the departure city's zone and the arrival time in the arrival city's zone. The answer is the real time in the air, not the difference between the two clock faces — a flight leaving Los Angeles at 10:00 AM and landing in London at 6:00 AM the next day is 13 hours, however little the clocks appear to move."],
  ["What time is it on the other coast right now?",
    "Set the two zones and read the \"put another way\" line under the result: it says what the start time reads on the second clock, and how many hours apart the two are at that moment."],
  ["Does this account for daylight saving time?",
    "Yes. Every calculation is done in real instants rather than clock faces, using today's date in each zone, so a span that crosses a daylight-saving change gets the real elapsed time. When both sides are in one zone and the clock disagrees with the real elapsed time, the page says so."],
  ["What if the end time is before the start time?",
    "It's treated as the next such moment, so the answer is always between zero and 24 hours — 10:00 PM to 6:00 AM is 8 hours, not a negative number, and the result notes \"the next day\"."],
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Time Difference Calculator — Hours Between Two Times</title>
<meta name="description" content="Find the time between two clock times, each in its own time zone — flight times, shift lengths, what time it is on the other coast. Handles daylight saving and midnight. Free, no sign-up.">
<link rel="canonical" href="${SITE}/time-difference-calculator/">
<meta property="og:title" content="Time Difference Calculator">
<meta property="og:description" content="Find the hours and minutes between two clock times, each in its own time zone.">
<meta property="og:type" content="website">
<meta property="og:image" content="/assets/img/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/css/style.css">
${/* breadcrumbLD returns the JSON, not the tag — every other generator wraps it
     and this one never did, so the raw object printed as visible text above the
     page's own header AND the breadcrumb was never structured data at all */""
}<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Time Difference Calculator", url: "/time-difference-calculator/" }])}</script>
${appLd({ name: "Time Difference Calculator", url: `${SITE}/time-difference-calculator/`, description: "Find the hours and minutes between two clock times, each in its own time zone." })}
${faqLd(FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "time-difference-calculator", url: "/time-difference-calculator/" } })}
  <h1>Time Difference Calculator</h1>
  <p class="sub">Find the hours and minutes between two clock times &mdash; each one in its own time zone, so a flight, a shift, or a call across the country all come out right.</p>

  <div class="card">
    ${tdiffForm()}
  </div>

  <div class="card">
    <h2>How this works</h2>
${FAQ.map(([q, a]) => `    <p><strong>${esc(q)}</strong><br>${esc(a)}</p>`).join("\n")}
  </div>

  <div class="more">
    <div class="more-label">Related tools</div>
    <div class="more-links">
      <a href="/24-hour-clock-converter/">12/24-hour clock converter</a>
      <a href="/world-clock/">World clock</a>
      <a href="/timer/">Timer</a>
      <a href="/alarm-clock/">Alarm clock</a>
      <a href="/methodology/time-zones/">How time zones are handled</a>
    </div>
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>${TDIFF_JS}
</script>
</body>
</html>
`;

mkdirSync(join(root, "time-difference-calculator"), { recursive: true });
writeFileSync(join(root, "time-difference-calculator/index.html"), html);
console.log(`Generated /time-difference-calculator/ (${TDIFF_ZONES.length} time zones, one select per side).`);
