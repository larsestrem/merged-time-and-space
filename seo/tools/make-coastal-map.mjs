#!/usr/bin/env node
/* make-coastal-map.mjs — build the shared tide<->sun coastal mapping that links
 * a NOAA tide station to the nearest /sun/ city page and back. Anchored on the
 * ~101 curated tide stations (the smaller, coastal set): each station is matched
 * to its NEAREST sun city within MAX_MILES, requiring the same state when the
 * sun candidate carries one (census US cities do; the curated famous coastal
 * cities don't, and are accepted on distance alone since they ARE the port city).
 *
 * The result is a single committed file (seo/_data/coastal-links.json) that both
 * build-tides.mjs and build-sun.mjs read (via coastal.mjs) — one source of truth,
 * so the tide->sun and sun->tide links are always reciprocal. Manual OVERRIDE /
 * EXCLUDE lists below allow hand-tuning without touching the matcher.
 *
 * Rerun after adding tide stations or curated sun cities:
 *   node seo/tools/make-coastal-map.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TIDE_STATIONS } from "./tide-stations.mjs";
import { SUN_ALL } from "./build-sun.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const MAX_MILES = 35;                 // roadmap: auto-match within 35 mi, same state
const EXCLUDE_STATIONS = new Set([]); // station slugs to never link (manual)
const OVERRIDE = {};                  // station slug -> forced sun slug (manual)

const R = 3959, rad = Math.PI / 180;
const miles = (la1, lo1, la2, lo2) => {
  const dl = (la2 - la1) * rad, dg = (lo2 - lo1) * rad;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const pairs = [];
for (const s of TIDE_STATIONS) {
  if (EXCLUDE_STATIONS.has(s.slug)) continue;
  let best = null;
  if (OVERRIDE[s.slug]) {
    const c = SUN_ALL.find((x) => x.slug === OVERRIDE[s.slug]);
    if (c) best = { c, mi: miles(s.lat, s.lng, c.lat, c.lon) };
  } else {
    for (const c of SUN_ALL) {
      if (c.st && c.st !== s.st) continue;        // census city: same-state only
      const mi = miles(s.lat, s.lng, c.lat, c.lon);
      if (mi > MAX_MILES) continue;
      if (!best || mi < best.mi) best = { c, mi };
    }
  }
  if (best) pairs.push({
    station: s.slug, stationCity: s.city, st: s.st, id: s.id,
    sun: best.c.slug, sunCity: best.c.city, mi: Math.round(best.mi),
  });
}
pairs.sort((a, b) => a.station.localeCompare(b.station));

const out = { maxMiles: MAX_MILES, count: pairs.length, generated: "make-coastal-map.mjs", pairs };
writeFileSync(join(root, "seo/_data/coastal-links.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`Coastal map: ${pairs.length}/${TIDE_STATIONS.length} tide stations linked to a sun city within ${MAX_MILES} mi.`);
