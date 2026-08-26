#!/usr/bin/env node
/* check-dates.mjs — audits every dated thing on the site and prints a report
 * of what needs human (or AI) attention. Run by the scheduled maintenance
 * workflow; findings are sent to the owner via the report webhook.
 *
 * Flags:
 *  - one-off events (`once`) whose date has passed: they need next year's
 *    real date (Super Bowl venue/date, election day, premieres…).
 *  - date-table events (`dates: [...]`) with fewer than 2 future entries:
 *    the table is running out and needs more years appended.
 *  - curated links whose date passed and are NOT auto-rollable (no recur):
 *    usually movable feasts or label-contains-year entries needing both a
 *    new date and an updated label.
 *
 *  - `estimated: true` events (owner-set best guesses for a date nobody
 *    controls or has officially announced yet — university commencements,
 *    retailer sale windows) whose next occurrence is within 60 days: a
 *    just-in-time nudge to go verify/update the real date, instead of a
 *    standing daily nag while it's still months away.
 *
 * By default the report goes to stdout (machine-readable lines prefixed with
 * "FINDING\t") and the exit code is 0, so the maintenance webhook never sees a
 * failed build. Pass --strict to make it exit non-zero when any finding
 * exists — use that as an integrity gate in a pre-merge/CI check.
 *
 * --gate is the narrower, harsher one, and it RUNS IN THE BUILD. It fails only
 * on dates that have ALREADY PASSED and are still being presented as upcoming.
 * Everything else here is advice ("this table is thin", "verify this estimate
 * soon") and must never block a deploy; a countdown to a day that is gone is
 * not advice, it is the site being wrong about the one thing it exists to get
 * right. Before this, a passed one-off produced a daily email that a human had
 * to act on, and until they did, every rebuild happily republished the page —
 * which is exactly how a finished tournament stayed listed as upcoming. Now the
 * build aborts and the last good deploy keeps serving, the same contract as
 * check-pages.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { nextOccurrence, iso } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const strict = process.argv.includes("--strict");
const gate = process.argv.includes("--gate");
const today = new Date().toISOString().slice(0, 10);
const findings = [];
const flag = (kind, what, detail) => findings.push({ kind, what, detail });

/* ---- rich events ---- */
const { events } = JSON.parse(readFileSync(join(root, "seo/_data/events.json"), "utf8"));
/* type[/slug] -> the date actually shown (one-off date, or computed next
 * occurrence). Curated links that point at one of these inherit this date on
 * the hub, so we audit the resolved date, not the link's static (often stale)
 * copy of it. */
const richDate = new Map();
for (const e of events) {
  const d = e.once || (nextOccurrence(e) ? iso(nextOccurrence(e)) : null);
  if (d) richDate.set(e.slug ? `${e.type}/${e.slug}` : e.type, d);
}
for (const e of events) {
  const id = `/${e.type}/${e.slug ? e.slug + "/" : ""}`;
  if (e.once && e.once < today) {
    flag("one-off passed", id, `was ${e.once}; needs the next real date (and likely updated copy)`);
  }
  if (Array.isArray(e.dates)) {
    const future = e.dates.filter((d) => d >= today);
    if (future.length === 0) flag("date table exhausted", id, `last date ${e.dates[e.dates.length - 1]}; append future years`);
    else if (future.length < 2) flag("date table thin", id, `only ${future.length} future date left; append more years`);
  }
}

/* ---- estimated dates approaching ---- */
const ESTIMATE_WINDOW_DAYS = 60;
const dayNum = (d) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) / 86400000; };
function nextDateFor(e) {
  if (e.once) return e.once;
  if (Array.isArray(e.dates)) return e.dates.filter((d) => d >= today)[0] || null;
  const occ = nextOccurrence(e);
  return occ ? iso(occ) : null;
}
for (const e of events) {
  if (!e.estimated) continue;
  const next = nextDateFor(e);
  if (!next) continue;
  const daysAway = dayNum(next) - dayNum(today);
  if (daysAway >= 0 && daysAway <= ESTIMATE_WINDOW_DAYS) {
    const id = `/${e.type}/${e.slug ? e.slug + "/" : ""}`;
    flag("estimated date approaching", id, `shows ${next} (~${daysAway}d away) but this is an unconfirmed guess, not an official date; verify and update it`);
  }
}

/* ---- curated links (popular + countries) ---- */
function checkLinks(owner, links, cat) {
  for (const l of links || []) {
    const path = l.path || cat.path;
    const key = path ? (l.slug ? `${path}/${l.slug}` : path) : null;
    /* the date the hub actually shows: the linked rich event's computed date
     * when there is one, else the link's own static date */
    const shown = (key && richDate.get(key)) || l.date;
    /* if it resolves to a rich event, that event's own date is audited above,
     * and recurring events auto-roll — so only flag links whose *shown* date is
     * genuinely past and can't roll (movable feast or year-in-label one-off) */
    if (shown && shown < today && !(l.recur ?? cat.recur)) {
      flag("curated date passed", `${owner}: ${l.label || l.name}`,
        `shows ${shown}; not auto-rollable (movable date or year-in-label), update date + label`);
    }
  }
}
const pc = JSON.parse(readFileSync(join(root, "seo/_data/popular-countdowns.json"), "utf8"));
for (const c of pc.categories) { checkLinks(c.hub, c.links, c); checkLinks(c.hub, c.more, c); }
const cj = JSON.parse(readFileSync(join(root, "seo/_data/countries.json"), "utf8"));
for (const c of cj.countries) checkLinks("countries/" + c.code, c.events, { recur: false });

/* ---- output ---- */
/* the two kinds that mean "the site is currently showing a date that is gone" */
const PASSED = new Set(["one-off passed", "curated date passed", "date table exhausted"]);
const passed = findings.filter((f) => PASSED.has(f.kind));

if (gate) {
  if (!passed.length) {
    console.log(`✓ check-dates: nothing dated is in the past (${findings.length} advisory finding(s), not blocking).`);
    process.exit(0);
  }
  console.log(`✗ check-dates: ${passed.length} thing(s) still presented as upcoming after their date passed — build ABORTED so the last good deploy stays live:`);
  for (const f of passed) console.log(`  ${f.what} — ${f.detail}`);
  console.log(`\nFix the date (and the copy that names it), or retire the page. \`npm run check\` lists everything, including the advisory findings.`);
  process.exit(1);
}

if (!findings.length) {
  console.log("OK: all dates current.");
} else {
  for (const f of findings) console.log(`FINDING\t${f.kind}\t${f.what}\t${f.detail}`);
  console.log(`\n${findings.length} finding(s).`);
  if (strict) process.exit(1);
}
