#!/usr/bin/env node
/* check-planets.mjs — proves the orbital element table in planets.mjs is right.
 *
 * An element table is a wall of digits and a single wrong one produces a
 * picture that looks entirely plausible and is wrong, so none of it is trusted.
 * Each check leans on something computed INDEPENDENTLY of that table:
 *
 *   1. Earth's heliocentric longitude against the SUN's geocentric longitude
 *      out of moon.mjs — a different series, written years earlier for a
 *      different purpose. They must differ by 180 degrees. They agree to about
 *      a tenth of a degree, which is the residual between two truncated series;
 *      a transposed digit would show tens of degrees, not tenths.
 *   2. Every derived period (from a^1.5, Kepler's third law) against the known
 *      one.
 *   3. Mercury's and Venus's greatest elongations, swept from the geocentric
 *      geometry, against the ranges they are famous for (18-28 and 45-47
 *      degrees). This one exercises both inner orbits AND Earth's, including
 *      their eccentricities and orientations.
 *
 * Not part of `npm run build` — the table is static, so this is what you run
 * after touching it (`npm run check` and `npm run check:solar` both do).
 *
 * EXITS NON-ZERO on any failure. It used to print "FAIL" and exit 0, which made
 * it a script that could only be believed by a human reading its output — the
 * one thing a proof of a digit table must not be.
 *
 *   node seo/tools/check-planets.mjs
 */
import { planetPos, planetName, planetPeriodDays, PLANET } from "./planets.mjs";
import { MOON_CORE } from "./moon.mjs";

const M = new Function(`${MOON_CORE}\nreturn { mnDays, mnSunPos, MN_OBL, MN_RAD };`)();
let failed = 0;
const verdict = (ok) => { if (!ok) failed++; return ok ? "PASS" : "FAIL"; };
const deg = (r) => r * 180 / Math.PI;
const wrap = (d) => ((d % 360) + 360) % 360;

/* CHECK 1 — Earth's heliocentric longitude vs the sun's geocentric longitude
   from moon.mjs. Different series, written for a different purpose; they must
   differ by exactly 180 degrees. */
console.log("CHECK 1 — Earth heliocentric vs sun geocentric (must differ by 180 deg)");
let worst1 = 0;
for (const iso of ["2026-01-01", "2026-04-15", "2026-08-05", "2026-11-20", "2030-06-01", "1990-03-21", "2049-12-31"]) {
  const ms = Date.parse(iso + "T00:00:00Z");
  const e = planetPos(PLANET.EARTH, ms);
  const d = M.mnDays(ms), s = M.mnSunPos(d);
  /* sun's equatorial ra/dec -> ecliptic longitude */
  const ce = Math.cos(M.MN_OBL), se = Math.sin(M.MN_OBL);
  const sunLon = wrap(deg(Math.atan2(Math.sin(s.ra) * ce + Math.tan(s.dec) * se, Math.cos(s.ra))));
  let diff = Math.abs(wrap(e.lon - sunLon) - 180);   /* deviation FROM 180 */
  worst1 = Math.max(worst1, diff);
  console.log(`  ${iso}  Earth ${e.lon.toFixed(3)}  sun ${sunLon.toFixed(3)}  deviation from 180: ${diff.toFixed(4)} deg  r=${e.r.toFixed(5)} AU`);
}
console.log(`  worst: ${worst1.toFixed(4)} deg  -> ${verdict(worst1 < 0.3)}\n`);

/* CHECK 2 — periods from a^1.5 against the known values */
console.log("CHECK 2 — derived orbital periods vs known (days)");
/* Pluto included: it is in the element table, so it is in the proof. Its known
   period is 90,560 days (247.94 years). */
const known = [87.969, 224.701, 365.256, 686.980, 4332.59, 10759.22, 30688.5, 60182.0, 90560.0];
let worst2 = 0;
for (let i = 0; i < known.length; i++) {
  const got = planetPeriodDays(i), pct = Math.abs(got - known[i]) / known[i] * 100;
  worst2 = Math.max(worst2, pct);
  console.log(`  ${planetName(i).padEnd(8)} ${got.toFixed(1).padStart(9)} vs ${String(known[i]).padStart(9)}  (${pct.toFixed(3)}%)`);
}
console.log(`  worst: ${worst2.toFixed(3)}%  -> ${verdict(worst2 < 0.5)}\n`);

/* CHECK 3 — greatest elongation of Mercury and Venus, swept from the geometry.
   Exercises both inner orbits AND Earth's. Mercury 18-28 deg, Venus 45-47. */
console.log("CHECK 3 — greatest elongations over 2026-2031");
for (const [idx, lo, hi] of [[PLANET.MERCURY, 17.5, 28.5], [PLANET.VENUS, 44.5, 47.5]]) {
  /* a true local maximum needs three samples: up then down */
  const start = Date.parse("2026-01-01T00:00:00Z");
  const el = (ms) => {
    const p = planetPos(idx, ms), e = planetPos(PLANET.EARTH, ms);
    const px = p.x - e.x, py = p.y - e.y, pz = p.z - e.z, pr = Math.hypot(px, py, pz);
    return deg(Math.acos(Math.max(-1, Math.min(1, (-e.x * px - e.y * py - e.z * pz) / (e.r * pr)))));
  };
  const peaks = [];
  let a = el(start), b = el(start + 86400000);
  for (let d = 2; d < 2000; d++) {
    const c = el(start + d * 86400000);
    if (b > a && b > c) peaks.push(b);
    a = b; b = c;
  }
  const min = Math.min(...peaks), max = Math.max(...peaks);
  const ok = peaks.length > 4 && min >= lo && max <= hi;
  console.log(`  ${planetName(idx).padEnd(8)} ${peaks.length} greatest elongations, ${min.toFixed(1)} to ${max.toFixed(1)} deg  (expect ${lo}-${hi})  -> ${verdict(ok)}`);
}

/* CHECK 4 — the prime-meridian table in globe.mjs, against the rotation periods
   it is not allowed to know. GL_PM holds [W0, degrees per day] for each body;
   360/W1 must come out as that planet's real sidereal day. A transposed digit
   in a nine-significant-figure rate shows up here immediately, and nothing else
   on the site would ever catch it — a planet turning at the wrong speed just
   looks like a planet turning. */
console.log("\nCHECK 4 — rotation periods implied by the prime-meridian rates");
{
  const PM = (await import("./globe.mjs")).PL_PM;
  /* real sidereal rotation periods, in hours. MAGNITUDES ONLY: the SIGN of W1
     is a convention, not a fact about the planet. The IAU picks each body's
     north pole as the one north of the invariable plane and then W increases
     about it — which comes out negative for Venus and Uranus and POSITIVE for
     Pluto, even though all three spin backwards relative to their own orbits.
     Which way a planet turns relative to its orbit is carried by the obliquity
     in PL_OBL (>90 degrees means backwards), so checking the sign here would
     be counting the same fact twice and would fail on a correct table. */
  const REAL = { Mercury: 1407.6, Venus: 5832.5, Earth: 23.9345, Mars: 24.6229,
    Jupiter: 9.9250, Saturn: 10.656, Uranus: 17.24, Neptune: 16.11, Pluto: 153.2928 };
  for (const [name, [, w1]] of Object.entries(PM)) {
    const hours = Math.abs(360 / w1 * 24);
    const want = REAL[name];
    const ok = Math.abs(hours - want) / want <= 0.001;
    console.log(`  ${name.padEnd(8)} |360/W1| = ${hours.toFixed(4)} h  vs real ${want} h  -> ${verdict(ok)}`);
  }
  /* and the two the IAU does publish as negative, which is worth pinning */
  for (const n of ["Venus", "Uranus"]) {
    const ok = PM[n][1] < 0;
    console.log(`  ${n.padEnd(8)} IAU W1 is negative  -> ${verdict(ok)}`);
  }
  const okP = PM.Pluto[1] > 0;
  console.log(`  ${"Pluto".padEnd(8)} IAU W1 is positive (its obliquity carries the retrograde spin)  -> ${verdict(okP)}`);
}

console.log(`\n${failed ? `\u2717 ${failed} CHECK(S) FAILED — the element table in planets.mjs is wrong` : "\u2713 all checks passed"}`);
process.exit(failed ? 1 : 0);
