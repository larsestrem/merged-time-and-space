#!/usr/bin/env node
/* check-daynight.mjs — prove the day/night map's shading against the formula it
 * is supposed to be drawing.
 *
 * WHY THIS EXISTS. daynight.mjs does not test whether a place is dark; it
 * SOLVES, per meridian, for the latitudes at which the sun sits at a given
 * altitude, and shades between them. That is what makes the picture one cheap
 * path instead of a per-pixel test — and it is also a rule that can be subtly
 * wrong while still LOOKING like a terminator. Writing this check found two
 * such bugs at once: a root coming back as 275° when it meant -85°, thrown
 * away as out of range and shading a lit meridian dark; and an asin handed
 * 1.0000000000000002, which is NaN rather than "straight up". So the shading
 * rule is now checked against the altitude formula at ~850,000 points across
 * three thresholds, eight declinations and a full turn of the Earth.
 *
 *   node seo/tools/check-daynight.mjs          (part of `npm run check`)
 */
import { DN_CORE, subsolar } from "./daynight.mjs";

const F = new Function(`${DN_CORE}
return {dnBands:dnBands,dnAlt:dnAlt,dnPath:dnPath};`)();

let checked = 0, bad = 0;
const fails = [];

/* CHECK 1 — the shaded set agrees with the altitude, everywhere.
 * The shading is up to three pieces per meridian: a cap off each pole and,
 * near the equinoxes at the twilight thresholds, a band across the middle with
 * both poles OUTSIDE it. Whichever piece a point falls in, "shaded" has to
 * mean "the sun is lower than the threshold". Points within a tenth of a
 * degree of a boundary are skipped: there the two answers agree to within the
 * sampling, and disagreeing about a hair's breadth is not an error. */
for (const a of [0, -6, -18]) {
  for (const dec of [23.4, 15, 5, 0.4, -0.4, -5, -15, -23.4]) {
    for (let ss = -180; ss < 180; ss += 31) {
      for (let lon = -179; lon < 180; lon += 11) {
        const b = F.dnBands(dec, ss, lon, a);        /* [sHi, nLo, bLo, bHi] */
        for (let lat = -89.5; lat <= 89.5; lat += 2) {
          const alt = F.dnAlt(lat, lon, dec, ss);
          if (Math.abs(alt - a) < 0.15) continue;
          /* shaded = inside the south cap, the north cap, or the middle band */
          const inFill = lat < b[0] || lat > b[1] || (lat > b[2] && lat < b[3]);
          checked++;
          if (inFill !== (alt < a)) {
            bad++;
            if (fails.length < 5) fails.push({ a, dec, ss, lon, lat, bands: b.map((x) => +x.toFixed(2)), alt: +alt.toFixed(2) });
          }
        }
      }
    }
  }
}
console.log(`CHECK 1 — the shaded side is the dark side, at 0, -6 and -18 degrees`);
console.log(`  ${checked.toLocaleString("en-US")} points  -> ${bad ? `FAIL (${bad} disagree)` : "PASS"}`);
if (bad) console.log(fails.map((f) => `    ${JSON.stringify(f)}`).join("\n"));

/* CHECK 2 — the subsolar point is where the sun is straight up. Two different
 * routines: one returns the point, the other the altitude at a point. */
let worst = 0;
for (let ms = Date.now(); ms < Date.now() + 400 * 86400000; ms += 86400000 * 3.1) {
  const ss = subsolar(ms);
  worst = Math.max(worst, Math.abs(90 - F.dnAlt(ss.dec, ss.lon, ss.dec, ss.lon)));
}
const ok2 = worst < 1e-6;
console.log(`CHECK 2 — the sun is 90 degrees up at the subsolar point`);
console.log(`  worst miss over 400 days: ${worst.toExponential(1)} deg  -> ${ok2 ? "PASS" : "FAIL"}`);

/* CHECK 3 — the declination never leaves the tropics, and gets there. The
 * obliquity is the one number the tropics, the polar circles and the lean of
 * the line on the map are all computed from. */
let hi = -99, lo = 99;
for (let ms = Date.now(); ms < Date.now() + 366 * 86400000; ms += 3600000) {
  const d = subsolar(ms).dec;
  if (d > hi) hi = d;
  if (d < lo) lo = d;
}
const ok3 = hi > 23.3 && hi < 23.5 && lo < -23.3 && lo > -23.5;
console.log(`CHECK 3 — a year of declinations reaches the tropics and stops there`);
console.log(`  ${lo.toFixed(2)} to ${hi.toFixed(2)} deg (expected +-23.4)  -> ${ok3 ? "PASS" : "FAIL"}`);

/* CHECK 4 — a path is always a closed path that spans the whole map. This is
 * the "does it stay in the frame" invariant the Play button depends on: the
 * shading is re-solved rather than slid, so whatever the subsolar longitude,
 * the polygon must still run from the left edge to the right edge. */
let spanBad = 0;
for (let ss = -180; ss <= 180; ss += 7) {
  for (const dec of [23.4, 0.2, -23.4]) {
    const d = F.dnPath(dec, ss, 0, 2);
    const xs = d.match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 0);
    if (!d || Math.min(...xs) !== 0 || Math.max(...xs) !== 720 || !d.endsWith("Z")) spanBad++;
  }
}
console.log(`CHECK 4 — every path closes and spans the full map width`);
console.log(`  156 subsolar longitudes x 3 declinations  -> ${spanBad ? `FAIL (${spanBad})` : "PASS"}`);

const allOk = !bad && ok2 && ok3 && !spanBad;
console.log(allOk ? "\nall day/night checks passed" : "\nDAY/NIGHT CHECKS FAILED");
process.exit(allOk ? 0 : 1);
