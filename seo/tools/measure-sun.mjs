#!/usr/bin/env node
/* measure-sun.mjs — bound the error in the sunrise/sunset solver, so
 * /methodology/sunrise-sunset/ can say how close it gets instead of repeating
 * a precision figure copied from somebody else's README.
 *
 *   node seo/tools/measure-sun.mjs      # writes seo/_data/sun-accuracy.json
 *
 * WHAT IS COMPARED. nSunCalc (lib.mjs) finds sunrise the fast way every
 * almanac-style routine does: solve the hour angle once for the day, take solar
 * noon, and place rise and set symmetrically either side of it. That is a
 * closed form with no iteration, which is why it can run in a page for a
 * thousand cities — but it assumes the sun's declination does not move between
 * dawn and dusk, and it does. This measures how much that costs by re-solving
 * the same instant iteratively: step towards the moment the sun's ACTUAL
 * altitude (nSunPos, evaluated at that instant) equals the target −0.833°, and
 * report the gap.
 *
 * WHAT IT DOES NOT MEASURE, and the page says so in the same sentence: both
 * sides share one low-precision solar series (obliquity fixed, no nutation, no
 * aberration). So this bounds the SOLVER, not the astronomy underneath it, and
 * it cannot see refraction being non-standard, altitude above sea level, or a
 * hill in the way — none of which are modelled at all.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { nSunCalc, nSunPos } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const TARGET = -0.833;   /* the horizon angle the site solves for */

/* Newton's method on altitude(t), derivative taken numerically over a minute.
 * Converges in a handful of steps everywhere the sun is actually moving; the
 * iteration cap is what stops it spinning at a latitude where it barely is. */
function refine(guessMs, lat, lon) {
  let t = guessMs;
  for (let i = 0; i < 40; i++) {
    const a = nSunPos(new Date(t), lat, lon).alt;
    const err = a - TARGET;
    if (Math.abs(err) < 0.0005) return t;
    const slope = (nSunPos(new Date(t + 60000), lat, lon).alt - a) / 60000;
    if (!slope) return t;
    t -= err / slope;
  }
  return t;
}

/* The four dates the geometry is most extreme at, which is where a symmetry
 * assumption is worst: declination is changing fastest at the equinoxes and
 * the day is most lopsided at the solstices. A random sample of dates would
 * flatter the result. */
const DATES = [["equinox (March)", "2026-03-20"], ["solstice (June)", "2026-06-21"],
               ["equinox (September)", "2026-09-22"], ["solstice (December)", "2026-12-21"]];
/* equator to the Arctic Circle. Past ~66.5° the sun stops rising or setting on
 * these dates at all and there is no crossing to compare. */
const LATS = [0, 20, 40, 51.5, 60, 65];

const rows = [];
for (const lat of LATS) {
  for (const [label, ds] of DATES) {
    const d = new Date(`${ds}T12:00:00Z`);
    const s = nSunCalc(d, lat, 0, TARGET);
    if (!s.rise || !s.set) continue;   /* polar day/night — nothing to compare */
    rows.push({
      lat, date: ds, season: label,
      riseDeltaSec: Math.round((s.rise - refine(s.rise, lat, 0)) / 1000),
      setDeltaSec: Math.round((s.set - refine(s.set, lat, 0)) / 1000),
    });
  }
}

const deltas = rows.flatMap((r) => [Math.abs(r.riseDeltaSec), Math.abs(r.setDeltaSec)]);
const worst = rows.reduce((w, r) =>
  Math.max(Math.abs(r.riseDeltaSec), Math.abs(r.setDeltaSec)) > Math.abs(w.d)
    ? { d: Math.max(Math.abs(r.riseDeltaSec), Math.abs(r.setDeltaSec)), lat: r.lat, date: r.date } : w,
  { d: 0, lat: null, date: null });

const out = {
  method: "nSunCalc's closed-form rise/set compared with an iterative solution for the same −0.833° crossing, using the same solar-position series.",
  bounds: "This bounds the solver only. Both sides share one low-precision solar series, and neither models non-standard refraction, observer elevation, or terrain.",
  horizonAngleDeg: TARGET,
  latitudes: LATS,
  dates: DATES.map(([, d]) => d),
  samples: rows.length * 2,
  worstDeltaSec: worst.d,
  worstAt: { latitude: worst.lat, date: worst.date },
  medianDeltaSec: (() => { const s = [...deltas].sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); })(),
  rows,
};

writeFileSync(join(root, "seo/_data/sun-accuracy.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote seo/_data/sun-accuracy.json — ${out.samples} comparisons, worst ${out.worstDeltaSec}s at ${out.worstAt.latitude}° on ${out.worstAt.date}, median ${out.medianDeltaSec}s`);
