/* coastal.mjs — reads the committed tide<->sun mapping (seo/_data/coastal-links.json,
 * produced by make-coastal-map.mjs) and exposes it to BOTH builders as lookup
 * maps. Because it only reads a data file (no build-sun/build-tides import), it
 * introduces no import cycle, and both sides link to the SAME pairs so the
 * relationship is always reciprocal.
 *   stationToSun: station slug -> pair   (for build-tides: tide page -> sun page)
 *   sunToStation: sun slug -> closest pair (for build-sun: sun page -> tide page) */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

let pairs = [];
try { pairs = JSON.parse(readFileSync(join(root, "seo/_data/coastal-links.json"), "utf8")).pairs || []; }
catch (e) { /* file absent -> no coastal links, cards simply omitted */ }

export const stationToSun = new Map(pairs.map((p) => [p.station, p]));

/* one sun city can be the nearest for several stations; the sun page links back
 * to the CLOSEST of them, keeping the pairing reciprocal for that closest pair. */
export const sunToStation = (() => {
  const m = new Map();
  for (const p of pairs) { const ex = m.get(p.sun); if (!ex || p.mi < ex.mi) m.set(p.sun, p); }
  return m;
})();

/* ALL stations that chose this sun city, nearest first. Four cities are the
 * nearest listed city for two stations each (Mobile AL, Jacksonville FL,
 * Hampton VA, Wilmington NC). Linking back only to the closest — which is what
 * sunToStation above does, and what the shared cross-link strip used at first —
 * left the other station pointing at a page that did not point back.
 * check-crosslinks.mjs caught all four. The strip uses this map so every pair
 * is two-way. */
export const sunToStations = (() => {
  const m = new Map();
  for (const p of pairs) { if (!m.has(p.sun)) m.set(p.sun, []); m.get(p.sun).push(p); }
  for (const list of m.values()) list.sort((a, b) => a.mi - b.mi);
  return m;
})();
