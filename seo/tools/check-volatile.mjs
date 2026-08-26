#!/usr/bin/env node
/* check-volatile.mjs — lists events whose dates can change out from under us
 * (cancellations, reschedules, unannounced ceremonies) and how stale their
 * last verification is. Runs offline on purpose: it doesn't verify anything
 * itself, it tells the maintainer (or the /maintain session) exactly what to
 * re-verify. Part of `npm run check`.
 *
 * An event is VOLATILE when any of:
 *   - estimated: true            (date never officially confirmed)
 *   - volatile: true             (explicit flag for movable/cancellable dates)
 *   - type is in MOVABLE_TYPES   (ceremonies/releases that shift or cancel)
 * Each volatile event should carry `verified: "YYYY-MM-DD"` — the last date a
 * human or research agent confirmed the date/status against a live source.
 * Freshness windows (days) depend on how soon the event is:
 *   within 60 days -> 21;  within 180 days -> 45;  else -> 90.
 *   node seo/tools/check-volatile.mjs   (exit 0 always; findings on stdout)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { events } = JSON.parse(readFileSync(join(root, "seo/_data/events.json"), "utf8"));

const MOVABLE_TYPES = new Set([
  "graduation-countdown",          // ceremonies move yearly, announced late
  "avengers-doomsday-countdown", "avengers-secret-wars-countdown",
  "gta-6-countdown",               // release dates slip
  "olympics-countdown", "world-cup-countdown", "super-bowl-countdown",
  "nfl-draft-countdown", "mlb-opening-day-countdown", "selection-sunday-countdown",
  "wrestlemania-countdown", "tour-de-france-countdown", "wimbledon-countdown",
  "monaco-grand-prix-countdown", "coachella-countdown", "eurovision-countdown",
]);

const today = new Date();
const dayMs = 86400e3;
const rows = [];
for (const e of events) {
  if (!e || typeof e !== "object" || !e.type) continue;
  const volatile = e.estimated || e.volatile || MOVABLE_TYPES.has(e.type);
  if (!volatile) continue;
  const key = `${e.type}/${e.slug || ""}`;
  /* next occurrence estimate for urgency: one-off `once`, else month/day roll */
  let next = null;
  if (e.once) next = new Date(e.once + "T12:00:00Z");
  else if (e.month && e.day) {
    next = new Date(Date.UTC(today.getUTCFullYear(), e.month - 1, e.day, 12));
    if (next < today) next = new Date(Date.UTC(today.getUTCFullYear() + 1, e.month - 1, e.day, 12));
  }
  const daysOut = next ? Math.round((next - today) / dayMs) : null;
  const windowDays = daysOut == null ? 90 : daysOut <= 60 ? 21 : daysOut <= 180 ? 45 : 90;
  const verified = e.verified ? new Date(e.verified + "T12:00:00Z") : null;
  const age = verified ? Math.round((today - verified) / dayMs) : null;
  const stale = age == null || age > windowDays;
  rows.push({ key, label: e.label || e.name || key, daysOut, age, windowDays, stale, estimated: !!e.estimated });
}
rows.sort((a, b) => (a.stale === b.stale ? (a.daysOut ?? 9e9) - (b.daysOut ?? 9e9) : a.stale ? -1 : 1));

/* ---- the sports carry-forward rule, enforced -----------------------------
 * CLAUDE.md: "When a sports countdown rolls to its next edition, carry the
 * last one forward — who played and who won, in the page's own prose, not just
 * in the champions table. The page people land on the day after a final is the
 * one counting down to the next one, and 'who won?' is what they came for."
 *
 * That rule was followed on 3 of 13 sports pages, because nothing checked it.
 * A convention nobody can see the state of is a convention that lapses. This
 * flags any event with a champions/winners table whose most recent row is for
 * a year the page's own prose never mentions — which is exactly the "the race
 * finished last week and the page says nothing" case.
 *
 * Advisory, not a gate: the fix needs a real result from a real source, and
 * failing the build would only tempt somebody to invent one. */
const prose = (e) => [e.intro || "", ...(e.sections || []).map((s) => `${s.h || ""} ${s.p || ""}`)].join(" ");
const carry = [];
for (const e of events) {
  const champs = e.champions || e.winners;
  if (!Array.isArray(champs) || !champs.length) continue;
  const years = champs.map((c) => parseInt(c.year, 10)).filter(Number.isFinite);
  if (!years.length) continue;
  const latest = Math.max(...years);
  const key = `${e.type}/${e.slug || ""}`;
  const text = prose(e);
  if (!text.includes(String(latest))) {
    carry.push(`FINDING\tcarry-forward\t${key}\t${e.label || e.name || key} — the champions table ends at ${latest} but no section of the page's prose mentions ${latest}; add a "How the ${latest} … finished" section (CLAUDE.md sports rule)`);
  }
  /* the harder case: the table itself is behind. A table whose newest row is
     older than the edition that has already been run is why /tour-de-france/
     could answer "who won?" with silence. */
  const thisYear = today.getUTCFullYear();
  let ran = null;
  if (e.month && e.day) ran = new Date(Date.UTC(thisYear, e.month - 1, e.day, 12)) < today;
  else if (Array.isArray(e.dates)) ran = e.dates.some((d) => d.startsWith(String(thisYear)) && d < today.toISOString().slice(0, 10));
  if (ran && latest < thisYear) {
    carry.push(`FINDING\tcarry-forward\t${key}\t${e.label || e.name || key} — the ${thisYear} edition has already been held but the champions table still ends at ${latest}; add the ${thisYear} result, then the recap section`);
  }
}
for (const line of carry) console.log(line);
if (carry.length) console.log(`${carry.length} sports page(s) have not carried the last edition forward.`);


const stale = rows.filter((r) => r.stale);
for (const r of stale)
  console.log(`FINDING\tverify\t${r.key}\t${r.label} — ${r.daysOut != null ? r.daysOut + "d out" : "no date"}, ${r.age == null ? "NEVER verified" : "verified " + r.age + "d ago"} (window ${r.windowDays}d)${r.estimated ? " [estimated]" : ""}`);
console.log(`${stale.length} of ${rows.length} volatile event(s) need re-verification.` + (stale.length ? " Re-check each against its official source, fix any moved/cancelled date, then stamp `verified: \"" + today.toISOString().slice(0, 10) + "\"` on the event." : ""));
