#!/usr/bin/env node
/* roll-dates.mjs — runs first in `npm run build`. Bumps the year on any
 * curated link date that has passed AND is marked recur (annual fixed-date
 * events: birthdays, Oktoberfest, Boxing Day…), so the dates shown on the
 * home page and hubs stay current on every rebuild — including scheduled
 * rebuilds triggered by the maintenance workflow, with no commit needed.
 *
 * Non-recurring passed dates (one-offs, movable feasts, label-with-year
 * entries) are NOT touched here; check-dates.mjs reports those for a human
 * or AI pass, since labels/names may also need updating.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const today = new Date().toISOString().slice(0, 10);

/* A date string is only valid if it round-trips: "2025-02-29" parses to March
 * 1st, so a naive year bump of a Feb-29 date fabricates a day that does not
 * exist and every page downstream then prints March 1st under a February
 * heading. Skipping to the next year that really has the date is the correct
 * answer for a leap-day event. */
const realDate = (s) => new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;

function bump(dateStr) {
  /* advance the year (keeping month-day) until the date is today or later AND
     is a date that actually exists */
  let [y, md] = [Number(dateStr.slice(0, 4)), dateStr.slice(4)];
  let out = dateStr;
  for (let guard = 0; guard < 12 && (out < today || !realDate(out)); guard++) { y++; out = y + md; }
  return realDate(out) ? out : dateStr;
}

let rolled = 0;
function rollLinks(links, catRecur) {
  for (const l of links || []) {
    if (l.date && l.date < today && (l.recur ?? catRecur)) {
      const next = bump(l.date);
      console.log(`roll  ${l.label || l.name}: ${l.date} -> ${next}`);
      l.date = next; rolled++;
    }
  }
}

const pcPath = join(root, "seo/_data/popular-countdowns.json");
const pc = JSON.parse(readFileSync(pcPath, "utf8"));
for (const c of pc.categories) { rollLinks(c.links, c.recur); rollLinks(c.more, c.recur); }
writeFileSync(pcPath, JSON.stringify(pc, null, 2) + "\n");

const cjPath = join(root, "seo/_data/countries.json");
const cj = JSON.parse(readFileSync(cjPath, "utf8"));
for (const c of cj.countries) rollLinks(c.events, false);
writeFileSync(cjPath, JSON.stringify(cj, null, 2) + "\n");

console.log(`Rolled ${rolled} passed recurring date(s) forward.`);
