/* eclipse.mjs — lunar eclipse prediction, Meeus "Astronomical Algorithms" ch. 54.
 *
 * WHY THIS CAN BE BUILT AT ALL. Chapter 54 is written on top of exactly the
 * quantities the phase solver in moon.mjs already computes for chapter 49 — the
 * same k, T, E, M, M′, F and Ω. A lunar eclipse is just a full moon that happens
 * near a node, so the eclipse test is a condition on F at that full moon, and the
 * magnitudes fall out of two more series. Nothing here is fetched, and nothing
 * here is a table of dates copied from somewhere: it is solved, the same way the
 * phases are.
 *
 * LUNAR ONLY, DELIBERATELY. Solar eclipses are in the same chapter and are NOT
 * implemented. A solar eclipse is a fundamentally different promise: it is
 * visible from a narrow track, it needs Besselian elements to say who sees what,
 * and "a solar eclipse on this date" without a track is close to useless and
 * actively dangerous to squint at. A lunar eclipse is visible to the entire
 * night side of the Earth at once, which is a claim this method can actually
 * support.
 *
 * WHAT IS APPROXIMATE, so the page can say it:
 *   - Circumstances are geocentric. Times of the phases are the same instant
 *     everywhere; only whether the moon is above your horizon is local, and
 *     that is answered with the moon-position code, not guessed.
 *   - ΔT (the gap between dynamical time and UTC) is interpolated from a short
 *     table of observed values plus a long-term formula. It is tens of seconds
 *     this century, and eclipse times are quoted to the minute.
 *   - Magnitudes and durations come from Meeus's own series, which he gives as
 *     good to well under a minute for the era this site covers. No claim is
 *     made beyond that era.
 */
const RAD = Math.PI / 180;
const DAY = 86400000;
const J1970 = 2440588;

const sin = (d) => Math.sin(d * RAD);
const cos = (d) => Math.cos(d * RAD);
/* JDE -> epoch ms. The 0.5 is not optional: Julian Day 2440588.0 is 1970-01-01
 * at NOON, not midnight, so dropping it puts every result exactly twelve hours
 * out — which is what the first run of this file did, and what checking three
 * known eclipse dates caught immediately. moon.mjs's mnDays() carries the same
 * 0.5 for the same reason. */
const fromJde = (jde) => (jde - (J1970 - 0.5)) * DAY;
const toK = (ms) => ((ms / DAY + J1970 - 0.5 - 2451545) / 365.25) * 12.3685;

/* ΔT = TT − UT, seconds. Observed values every decade (rounded, from the
 * long-running IERS/Espenak series) with linear interpolation between them,
 * and Espenak & Meeus's polynomial outside the table. The table exists because
 * ΔT is not predictable from theory — it is measured — and a formula alone is
 * off by seconds in exactly the decades this site covers. */
const DT_TABLE = [[1990, 56.9], [2000, 63.8], [2005, 64.7], [2010, 66.1], [2015, 67.6], [2020, 69.4], [2025, 69.2]];
function deltaT(year) {
  if (year >= DT_TABLE[0][0] && year <= DT_TABLE[DT_TABLE.length - 1][0]) {
    for (let i = 1; i < DT_TABLE.length; i++) {
      const [y0, d0] = DT_TABLE[i - 1], [y1, d1] = DT_TABLE[i];
      if (year <= y1) return d0 + ((d1 - d0) * (year - y0)) / (y1 - y0);
    }
  }
  /* Espenak & Meeus, 2005-2050 branch, used as the forward extrapolation */
  const t = year - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t * t;
}

/** Circumstances of the eclipse (if any) at the full moon numbered by `k`.
 *  k must be an integer + 0.5. Returns null when that full moon misses the
 *  node — which is most of them: about seven months in ten have no lunar
 *  eclipse at all. */
export function eclipseAt(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const jdeMean = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
  const O = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;

  /* THE GATE. |sin F| > 0.36 means the moon is too far from a node for the
   * Earth's shadow to reach it, and no eclipse is possible. This is Meeus's
   * own test and it is why most full moons return null here. */
  if (Math.abs(sin(F)) > 0.36) return null;

  const F1 = F - 0.02665 * sin(O);
  const A1 = 299.77 + 0.107408 * k - 0.009173 * T2;

  const jdeMax = jdeMean
    + (-0.4065 * sin(Mp) + 0.1727 * E * sin(M)
      + 0.0161 * sin(2 * Mp) - 0.0097 * sin(2 * F1)
      + 0.0073 * E * sin(Mp - M) - 0.0050 * E * sin(Mp + M)
      - 0.0023 * sin(Mp - 2 * F1) + 0.0021 * E * sin(2 * M)
      + 0.0012 * sin(Mp + 2 * F1) + 0.0006 * E * sin(2 * Mp + M)
      - 0.0004 * sin(3 * Mp) - 0.0003 * E * sin(M + 2 * F1)
      + 0.0003 * sin(A1) - 0.0002 * E * sin(M - 2 * F1)
      - 0.0002 * E * sin(2 * Mp - M) - 0.0002 * sin(O));

  const P = 0.2070 * E * sin(M) + 0.0024 * E * sin(2 * M) - 0.0392 * sin(Mp)
    + 0.0116 * sin(2 * Mp) - 0.0073 * E * sin(Mp + M) + 0.0067 * E * sin(Mp - M)
    + 0.0118 * sin(2 * F1);
  const Q = 5.2207 - 0.0048 * E * cos(M) + 0.0020 * E * cos(2 * M)
    - 0.3299 * cos(Mp) - 0.0060 * E * cos(Mp + M) + 0.0041 * E * cos(Mp - M);
  const W = Math.abs(cos(F1));
  /* gamma: how far the moon's centre passes from the shadow axis, in Earth
   * radii. Its SIGN says which side (north/south); its size decides the type. */
  const gamma = (P * cos(F1) + Q * sin(F1)) * (1 - 0.0048 * W);
  const u = 0.0059 + 0.0046 * E * cos(M) - 0.0182 * cos(Mp)
    + 0.0004 * cos(2 * Mp) - 0.0005 * cos(M + Mp);

  const magPen = (1.5573 + u - Math.abs(gamma)) / 0.5450;
  const magUmb = (1.0128 - u - Math.abs(gamma)) / 0.5450;
  if (magPen <= 0) return null;   /* misses even the penumbra */

  const kind = magUmb >= 1 ? "total" : magUmb > 0 ? "partial" : "penumbral";

  /* semidurations, minutes. n is the moon's hourly motion in the relevant
   * units; each phase is a chord across a circle of radius p / t / h. */
  const n = 0.5458 + 0.0400 * cos(Mp);
  const semi = (r) => (r * r > gamma * gamma ? (60 / n) * Math.sqrt(r * r - gamma * gamma) : 0);
  const semiPen = semi(1.5573 + u);
  const semiPart = magUmb > 0 ? semi(1.0128 - u) : 0;
  const semiTot = magUmb >= 1 ? semi(0.4678 - u) : 0;

  const maxMs = fromJde(jdeMax);
  const year = new Date(maxMs).getUTCFullYear();
  /* jdeMax is dynamical time; UTC is that minus ΔT */
  const maxUtc = maxMs - deltaT(year) * 1000;
  const at = (min) => maxUtc + min * 60000;

  return {
    kind, gamma,
    magnitudePenumbral: magPen,
    magnitudeUmbral: magUmb,
    /* every instant epoch-ms UTC; the same moment worldwide */
    maxMs: maxUtc,
    penumbralBeginMs: at(-semiPen), penumbralEndMs: at(semiPen),
    partialBeginMs: semiPart ? at(-semiPart) : null,
    partialEndMs: semiPart ? at(semiPart) : null,
    totalBeginMs: semiTot ? at(-semiTot) : null,
    totalEndMs: semiTot ? at(semiTot) : null,
    durationPenumbralMin: 2 * semiPen,
    durationPartialMin: 2 * semiPart,
    durationTotalMin: 2 * semiTot,
    deltaTSec: deltaT(year),
  };
}

/** Every lunar eclipse with maximum inside [fromMs, toMs). Walks full moons,
 *  which is the only way to enumerate them — an eclipse is a property of a
 *  full moon, not of a date. */
export function eclipsesBetween(fromMs, toMs) {
  const out = [];
  /* start a year early and end a year late so an eclipse near the boundary is
   * not missed by the k estimate being a lunation out */
  let k = Math.floor(toK(fromMs) - 13) + 0.5;
  const kEnd = toK(toMs) + 13;
  for (; k < kEnd; k += 1) {
    const e = eclipseAt(k);
    if (e && e.maxMs >= fromMs && e.maxMs < toMs) out.push(e);
  }
  out.sort((a, b) => a.maxMs - b.maxMs);
  return out;
}
