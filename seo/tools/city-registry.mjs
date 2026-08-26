/* city-registry.mjs — ONE answer to "what pages exist for this place, and where".
 *
 * The site has FIVE place-based families — /sun/, /moon/, /world-clock/,
 * /tides/ and /sun-moon-earth-movement-simulator/ — and until now each
 * generator worked out the others' URLs for itself:
 * build-world-clock kept a Set of CITY_DB slugs, localtime.mjs kept its own zone
 * lookup, crosslinks.mjs asked the coastal map, and nothing anywhere could say
 * whether a city that has a sun page also has a clock page. That is how the
 * families drifted apart: 109 cities had a clock, ~1,074 had sun and moon, and
 * the only way to find out was to look.
 *
 * This module is the shared index. It has NO side effects — it reads the same
 * data the generators read (cities.mjs, us-cities.json, wc-cities.mjs, the tide
 * stations and the coastal map) and answers questions about it, so any generator
 * can import it without triggering another generator's build.
 *
 * THE CANONICAL CITY SET is curated CITY_DB + the census US top-1000, which is
 * exactly what build-sun turns into /sun/ pages and build-moon mirrors. Sun and
 * moon are therefore always in step by construction. World clock is the family
 * that can lag, which is what `parity()` reports.
 *
 * TIDES ARE DELIBERATELY NOT EXPECTED TO MATCH. NOAA publishes predictions for
 * US coastal stations only, so a tide page exists for a place or it doesn't, and
 * pretending otherwise would mean inventing data. `tide` is null for most cities
 * and that is the correct answer, not a gap.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CITY_DB, citySlug } from "./cities.mjs";
import { WC_SLUGS } from "./wc-cities.mjs";
import { TIDE_STATIONS } from "./tide-stations.mjs";
import { sunToStations } from "./coastal.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* the coastal map's own threshold, so "coastal" means one thing site-wide */
export const MAX_TIDE_MI = 35;
/* exported so crosslinks.mjs measures a station's distance the same way the
   registry chose it, rather than keeping a second copy of the formula */
export const milesBetween = (la1, lo1, la2, lo2) => {
  const R = 3958.8, r = Math.PI / 180;
  const dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/* The nearest NOAA station to a place, within MAX_TIDE_MI.
 *
 * The coastal map is built station -> nearest sun city, so it answers "which
 * stations CHOSE this city" — right for the reciprocal sun/moon/tide strip,
 * wrong for "is this place coastal": the Los Angeles station sits at San Pedro
 * and picked a closer city, which left LA with no tide link at all. So: the
 * curated pair when there is one, otherwise the nearest station by distance. */
function nearestStation(slug, lat, lon) {
  const pair = (sunToStations.get(slug) || [])[0];
  if (pair) return pair.station;
  let best = null, bestMi = MAX_TIDE_MI;
  for (const st of TIDE_STATIONS) {
    const mi = milesBetween(lat, lon, st.lat, st.lng);
    if (mi < bestMi) { bestMi = mi; best = st.slug; }
  }
  return best;
}

const US_RAW = JSON.parse(readFileSync(join(root, "seo/_data/us-cities.json"), "utf8"));

/** slug -> {slug, city, area, st, lat, lon, tz, sun, moon, sim, clock, tide, curated} */
export const CITIES = new Map();
const add = (c, curated) => {
  if (CITIES.has(c.slug)) return;          /* curated wins: it is the hand-checked row */
  CITIES.set(c.slug, {
    ...c,
    curated,
    sun: `/sun/${c.slug}/`,
    moon: `/moon/${c.slug}/`,
    /* build-simulator.mjs builds one page per registry city, so this is the one
       family that is never null — and it was the one family this registry did
       not know about, which made "what pages exist for this place" wrong by a
       fifth for every place on the site. */
    sim: `/sun-moon-earth-movement-simulator/${c.slug}/`,
    clock: WC_SLUGS.has(c.slug) ? `/world-clock/${c.slug}/` : null,
    tide: (() => { const s = nearestStation(c.slug, c.lat, c.lon); return s ? `/tides/${s}/` : null; })(),
  });
};
for (const [city, area, tz, lat, lon] of CITY_DB) add({ slug: citySlug(city), city, area, tz, lat, lon }, true);
for (const e of US_RAW) {
  if (e.alias) continue;
  add({ slug: e.slug, city: e.city, area: e.state, st: e.st, tz: e.tz, lat: e.lat, lon: e.lon, pop: e.pop }, false);
}

/** Everything the site knows about one place, or null. */
export const cityRef = (slug) => CITIES.get(slug) || null;

/** Which families a place has pages in — the question every cross-link asks. */
export function familyLinks(slug) {
  const c = CITIES.get(slug);
  if (!c) return null;
  return { sun: c.sun, moon: c.moon, sim: c.sim, clock: c.clock, tide: c.tide };
}

/** Where the families currently disagree.
 *  sun and moon are generated from the same list, so they cannot diverge; the
 *  gap that matters is cities with sun/moon but no clock page. */
export function parity() {
  const all = [...CITIES.values()];
  return {
    total: all.length,
    withClock: all.filter((c) => c.clock).length,
    missingClock: all.filter((c) => !c.clock).map((c) => c.slug),
    withTide: all.filter((c) => c.tide).length,
    /* a clock city that somehow isn't in the canonical set would be a real bug:
       it would have a clock page and no sun or moon page */
    clockWithoutSun: [...WC_SLUGS].filter((s) => !CITIES.has(s)),
  };
}
