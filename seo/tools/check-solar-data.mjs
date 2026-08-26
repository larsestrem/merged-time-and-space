#!/usr/bin/env node
/* check-solar-data.mjs — proves the moon table and the comet table.
 *
 * Same principle as check-planets.mjs: a table of orbital numbers is a wall of
 * digits, and a wrong one draws a picture that looks entirely plausible. So
 * nothing here is trusted, and every check leans on a quantity the table did
 * not supply.
 *
 *   1. KEPLER'S THIRD LAW, PER SYSTEM. Every moon carries both a semi-major
 *      axis and a period, and those are not independent: a^3/T^2 = GM/4pi^2 for
 *      every moon of the same planet. So all nine of Saturn's moons must agree
 *      on one GM, and it must be Saturn's. This catches a transposed digit in
 *      EITHER column, which is exactly the failure mode a human proof-read
 *      cannot see.
 *   2. RESONANCES. Io:Europa:Ganymede is the Laplace resonance — n1 - 3n2 + 2n3
 *      must come out at zero, not merely near it. Mimas:Tethys and
 *      Enceladus:Dione are 2:1, Titan:Hyperion 4:3. A plausible-looking set of
 *      periods does not reproduce these by accident.
 *   3. MOONS AGAINST THE PLANETS TABLE. Ganymede and Titan must be wider than
 *      Mercury, and every moon must orbit outside its planet's own radius —
 *      both settled against planets.mjs, which this file does not own.
 *   4. COMETS: a^1.5 must equal the tabulated period and a(1-e) the tabulated
 *      perihelion distance. Both are stored redundantly for exactly this
 *      reason. Then tp plus a whole number of periods must land on the
 *      apparition each comet is known for — which tests the perihelion time
 *      against history rather than against itself.
 *   5. THE KEPLER SOLVER at the eccentricities the comets actually reach
 *      (0.9992), by feeding the solution back into the equation it solves.
 *   6. THE BELT is derived from Jupiter's axis, so the resonance positions must
 *      land on the Kirkwood gaps the belt is known for.
 *
 * Not part of `npm run build` — these tables are static, so this is what you
 * run after touching one.
 *
 *   node seo/tools/check-solar-data.mjs
 */
import { SAT_SYS, SAT_COUNT, satRow, satGravity, satMass } from "./satellites.mjs";
import { SM_COMETS, cometRow, cometPos, nextPerihelion, resonanceAU, beltEdges, keplerSolve } from "./smallbodies.mjs";
import { planetName, planetPeriodDays, planetPos, PL_DIA, PLANET } from "./planets.mjs";
import { launchWindow, transferCost, closestApproaches } from "./transfer.mjs";

let fails = 0;
const mark = (ok) => { if (!ok) fails++; return ok ? "PASS" : "FAIL"; };
const pct = (a, b) => Math.abs(a - b) / b * 100;

/* ---- 1. Kepler's third law, one system at a time ------------------------- */
console.log("CHECK 1 — every moon of a planet must agree on that planet's GM");
for (const idx of Object.keys(SAT_SYS).map(Number).sort((a, b) => a - b)) {
  const sys = SAT_SYS[idx];
  /* the Earth-Moon pair is the barycentre case: the moon is 1/81 of the Earth,
     so the two-body constant is GM(Earth)+GM(Moon), not GM(Earth) alone */
  /* ...and Pluto is the other one, more so: Charon is an EIGHTH of Pluto, so the
     barycentre sits outside Pluto's surface entirely. GM(Pluto)+GM(Charon). */
  const gm = idx === PLANET.EARTH ? sys.gm + 4902.8 : idx === 8 ? sys.gm + 105.9 : sys.gm;
  const expect = gm / (4 * Math.PI ** 2);
  let worst = 0, worstName = "";
  for (const m of sys.moons) {
    const { name, a, period } = satRow(m);
    const T = Math.abs(period) * 86400;
    const got = a ** 3 / T ** 2;
    const off = pct(got, expect);
    if (off > worst) { worst = off; worstName = name; }
  }
  /* PLUTO'S SMALL FOUR GET A WIDER BAND, and the reason is the finding rather
     than an excuse for one. Kepler's third law assumes a point mass at the
     focus; Pluto's is not a point, it is a pair whose barycentre lies outside
     Pluto, and Styx, Nix, Kerberos and Hydra orbit close enough to feel that.
     Styx comes out 3.5% off a strict two-body fit — which is the same physics
     that makes those four tumble chaotically instead of keeping one face
     inward, and is stated on the page. Charon itself, which the law does
     describe, is inside 0.2%. */
  const tol = idx === 8 ? 4.0 : 1.1;
  const ok = worst < tol;
  console.log(`  ${planetName(idx).padEnd(8)} ${String(sys.moons.length).padStart(2)} moons  worst ${worst.toFixed(3)}% (${worstName})  -> ${mark(ok)}`);
}
console.log();

/* ---- 2. resonances ------------------------------------------------------- */
console.log("CHECK 2 — the resonances these systems are known for");
const period = (idx, name) => {
  const m = SAT_SYS[idx].moons.find((x) => x[0] === name);
  if (!m) throw new Error(`no moon ${name} of ${planetName(idx)}`);
  return Math.abs(m[2]);
};
{
  /* Laplace: n1 - 3n2 + 2n3 = 0, in degrees per day */
  const n = (name) => 360 / period(PLANET.JUPITER, name);
  const laplace = n("Io") - 3 * n("Europa") + 2 * n("Ganymede");
  console.log(`  Io-Europa-Ganymede  n1-3n2+2n3 = ${laplace.toFixed(5)} deg/day  -> ${mark(Math.abs(laplace) < 0.01)}`);
}
for (const [idx, a, b, num, den] of [
  [PLANET.SATURN, "Mimas", "Tethys", 2, 1],
  [PLANET.SATURN, "Enceladus", "Dione", 2, 1],
  [PLANET.SATURN, "Titan", "Hyperion", 4, 3],
]) {
  const got = period(idx, b) / period(idx, a), want = num / den;
  console.log(`  ${a}:${b} ${num}:${den}`.padEnd(34) + `ratio ${got.toFixed(4)} vs ${want.toFixed(4)} (${pct(got, want).toFixed(2)}%)  -> ${mark(pct(got, want) < 1)}`);
}
console.log();

/* ---- 3. the moons against the planets table ------------------------------ */
console.log("CHECK 3 — moon sizes and orbits against planets.mjs");
{
  const merc = PL_DIA.Mercury;
  for (const [idx, name] of [[PLANET.JUPITER, "Ganymede"], [PLANET.SATURN, "Titan"]]) {
    const m = satRow(SAT_SYS[idx].moons.find((x) => x[0] === name));
    console.log(`  ${name} ${m.dia} km vs Mercury ${merc} km  -> ${mark(m.dia > merc)}`);
  }
  let inside = [];
  for (const idx of Object.keys(SAT_SYS).map(Number)) {
    const sys = SAT_SYS[idx];
    for (const m of sys.moons) if (m[1] <= sys.req) inside.push(`${m[0]} of ${planetName(idx)}`);
    /* the tabulated equatorial radius must be within a few percent of the mean
       diameter planets.mjs carries — different quantity, same planet */
    const off = pct(sys.req * 2, PL_DIA[planetName(idx)]);
    if (off > 8) { console.log(`  ${planetName(idx)} radius ${sys.req} km vs PL_DIA ${PL_DIA[planetName(idx)]} km (${off.toFixed(1)}%)  -> ${mark(false)}`); }
  }
  console.log(`  every moon orbits outside its planet's radius  -> ${mark(inside.length === 0)}${inside.length ? " " + inside.join(", ") : ""}`);
  /* Phobos laps Mars: its period must be shorter than the Martian day, which is
     why it rises in the west. The rotation figure is in the same table, so this
     also checks that. */
  const ph = period(PLANET.MARS, "Phobos"), marsDay = SAT_SYS[PLANET.MARS].rot / 24;
  console.log(`  Phobos ${ph.toFixed(4)} d < Mars day ${marsDay.toFixed(4)} d  -> ${mark(ph < marsDay)}`);
  /* the retrograde ones, which the drawing colours differently */
  const retro = [];
  for (const idx of Object.keys(SAT_SYS).map(Number))
    for (const m of SAT_SYS[idx].moons)
      if (m[2] < 0) retro.push({ name: m[0], planet: planetName(idx), far: satRow(m).a / SAT_SYS[idx].req });
  /* THIS USED TO ASSERT A COUNT OF TWO, and went stale the moment the moon
     detail levels added the irregular satellites — 13 of them go round
     backwards, which is the whole point of an irregular moon. What is worth
     checking is the PHYSICS, not the tally: a captured moon sits far out, so
     every retrograde one must be well beyond its planet (Triton is the famous
     exception at 14 planet radii, and being the exception is why it is
     interesting), and the two textbook cases must be in the list at all. A
     sign typo on a close regular moon fails this; adding another irregular
     does not. */
  const close = retro.filter((r) => r.far < 40 && r.name !== "Triton");
  const named = ["Triton", "Phoebe"].filter((n) => !retro.some((r) => r.name === n));
  console.log(`  retrograde moons (${retro.length}): ${retro.map((r) => `${r.name} (${r.planet})`).join(", ")}`
    + `  -> ${mark(close.length === 0 && named.length === 0)}`
    + `${close.length ? ` — too close in to be captured: ${close.map((r) => r.name).join(", ")}` : ""}`
    + `${named.length ? ` — missing: ${named.join(", ")}` : ""}`);
  console.log(`  confirmed counts >= drawn counts  -> ${mark(Object.keys(SAT_SYS).every((i) => SAT_COUNT[i] >= SAT_SYS[i].moons.length))}`);
  /* the frame moon sets the edge of the drawing, so a typo there silently
     reframes the picture on the wrong body */
  const badFrame = Object.keys(SAT_SYS).filter((i) => SAT_SYS[i].moons.length
    && !SAT_SYS[i].moons.some((m) => m[0] === SAT_SYS[i].frame));
  console.log(`  every system's frame moon exists in its own list  -> ${mark(badFrame.length === 0)}${badFrame.length ? " " + badFrame.map((i) => planetName(+i)).join(", ") : ""}`);
}
console.log();

/* ---- 4. comets: the redundant columns must agree ------------------------- */
console.log("CHECK 4 — comet period from a^1.5, and q from a(1-e)");
for (let i = 0; i < SM_COMETS.length; i++) {
  const c = cometRow(SM_COMETS[i]);
  const P = c.a ** 1.5, q = c.a * (1 - c.e);
  const pOff = pct(P, c.periodYears), qOff = pct(q, c.q);
  console.log(`  ${(c.desig + " " + c.name).padEnd(28)} P ${P.toFixed(2)} vs ${c.periodYears} y (${pOff.toFixed(2)}%)  q ${q.toFixed(4)} vs ${c.q} AU (${qOff.toFixed(2)}%)  -> ${mark(pOff < 0.5 && qOff < 0.5)}`);
}
console.log("\nCHECK 4b — perihelion time plus whole periods must land on a known apparition");
/* Each expected year is the apparition the comet is famous for, or the next one
   that has been published — none of which came from the element row. */
for (const [desig, year] of [["1P", 2061], ["2P", 2027], ["55P", 2031], ["109P", 2126], ["67P", 2028], ["12P", 2095]]) {
  const i = SM_COMETS.findIndex((c) => c[0] === desig);
  const next = nextPerihelion(i, Date.parse("2026-08-01T00:00:00Z"));
  const got = next.getUTCFullYear();
  console.log(`  ${(desig + " " + SM_COMETS[i][1]).padEnd(28)} next perihelion ${next.toISOString().slice(0, 10)} vs expected ${year}  -> ${mark(Math.abs(got - year) <= 1)}`);
}
console.log();

/* ---- 5. the solver at comet eccentricities ------------------------------- */
console.log("CHECK 5 — Kepler solver residual at the eccentricities in the table");
{
  let worst = 0;
  for (const c of SM_COMETS) {
    const e = c[3];
    for (let k = 0; k < 64; k++) {
      const M = -Math.PI + k / 64 * 2 * Math.PI;
      const E = keplerSolve(M, e);
      worst = Math.max(worst, Math.abs(E - e * Math.sin(E) - M));
    }
  }
  console.log(`  worst |E - e sinE - M| over all rows: ${worst.toExponential(2)}  -> ${mark(worst < 1e-9)}`);
  /* and the orbit it produces must actually reach perihelion at tp */
  let worstQ = 0;
  for (let i = 0; i < SM_COMETS.length; i++) {
    const c = cometRow(SM_COMETS[i]);
    const r = cometPos(i, +c.tp).r;
    worstQ = Math.max(worstQ, pct(r, c.q));
  }
  console.log(`  distance from the sun at tp vs q: worst ${worstQ.toFixed(3)}%  -> ${mark(worstQ < 0.5)}`);
}
console.log();

/* ---- 6. the belt, derived from Jupiter ----------------------------------- */
console.log("CHECK 6 — belt features derived from Jupiter's axis vs the known gaps");
/* The right-hand column is what the Kirkwood gaps are known to be, and none of
   it is in the derivation: that reads only planets.mjs. */
for (const [p, q, want, label] of [[4, 1, 2.06, "inner edge"], [3, 1, 2.50, "3:1 gap"], [5, 2, 2.82, "5:2 gap"],
                                   [7, 3, 2.96, "7:3 gap"], [2, 1, 3.28, "outer edge"], [3, 2, 3.97, "Hildas"], [1, 1, 5.20, "Trojans"]]) {
  const got = resonanceAU(p, q);
  console.log(`  ${(p + ":" + q + " " + label).padEnd(20)} ${got.toFixed(3)} AU vs ${want} AU (${pct(got, want).toFixed(2)}%)  -> ${mark(pct(got, want) < 1)}`);
}
{
  const [i, o] = beltEdges();
  console.log(`  belt spans ${i.toFixed(2)}-${o.toFixed(2)} AU, entirely between Mars and Jupiter  -> ${mark(i > 1.6 && o < 5.2)}`);
}

/* ---- 7. gravity and mass, derived from GM and the radius ----------------- */
console.log("\nCHECK 7 — surface gravity and mass computed from GM vs the published values");
/* The right-hand columns are the textbook figures; the left ones come from
   GM/r^2 and GM/G. Nothing on the pages types either in, so a wrong GM shows up
   here rather than as a plausible number under a picture. */
for (const [idx, g, mass] of [[0, 3.70, 3.301e23], [1, 8.87, 4.867e24], [2, 9.80, 5.972e24], [3, 3.71, 6.417e23],
                              [4, 24.79, 1.898e27], [5, 10.44, 5.683e26], [6, 8.87, 8.681e25], [7, 11.15, 1.024e26]]) {
  const gg = satGravity(idx), mm = satMass(idx);
  const ok = pct(gg, g) < 1 && pct(mm, mass) < 1;
  console.log(`  ${planetName(idx).padEnd(8)} g ${gg.toFixed(2)} vs ${g} m/s2   mass ${mm.toExponential(3)} vs ${mass.toExponential(3)} kg  -> ${mark(ok)}`);
}

/* ---- 8. transfers: solved windows against the textbook Hohmann figures --- */
console.log("CHECK 8 — the textbook Hohmann transfer, worked out here from the axes alone");
/* Step one settles the physics and the axes against numbers everybody
   publishes: a transfer between CIRCULAR orbits at the two mean radii. This
   formula is written out here, independently of transfer.mjs. */
const AU_KM = 149597870, GM_SUN = 1.32712440018e11;
const hohmannDays = (a1, a2) => Math.PI * Math.sqrt(((a1 + a2) / 2 * AU_KM) ** 3 / GM_SUN) / 86400;
const hohmannDv1 = (a1, a2) => Math.sqrt(GM_SUN * (2 / (a1 * AU_KM) - 2 / ((a1 + a2) * AU_KM))) - Math.sqrt(GM_SUN / (a1 * AU_KM));
const meanA = (i) => planetPos(i, Date.parse("2026-01-01T00:00:00Z")).a;
for (const [idx, name, days, dv1] of [[3, "Mars", 259, 2.94], [4, "Jupiter", 997, 8.79], [5, "Saturn", 2209, 10.29]]) {
  const d = hohmannDays(meanA(2), meanA(idx)), v = hohmannDv1(meanA(2), meanA(idx));
  console.log(`  ${name.padEnd(8)} ${d.toFixed(0)} d vs ${days}   departure burn ${v.toFixed(2)} vs ${dv1} km/s  -> ${mark(pct(d, days) < 1.5 && pct(v, dv1) < 3)}`);
}

console.log("\nCHECK 8b — the solved windows, bounded by what eccentricity allows");
/* transfer.mjs does NOT use the mean radii: it solves against where the planets
   really are, so its flight time must differ from the circular answer — and by
   an amount the target's own perihelion and aphelion bound. A solved time
   outside that band would mean the geometry is wrong; one exactly on the
   circular value would mean it is not using the real orbits at all. */
const NOW = Date.parse("2026-08-01T00:00:00Z");
for (const [idx, name, inj] of [[3, "Mars", 3.6], [4, "Jupiter", 6.3], [5, "Saturn", 7.3]]) {
  const w = launchWindow(idx, NOW), c = transferCost(idx, w);
  const p = planetPos(idx, NOW), q = p.a * (1 - p.e), Q = p.a * (1 + p.e);
  const lo = hohmannDays(w.r1AU, q), hi = hohmannDays(w.r1AU, Q);
  const ok = w.flightDays >= lo - 1 && w.flightDays <= hi + 1 && pct(c.injection, inj) < 6;
  console.log(`  ${name.padEnd(8)} flight ${w.flightDays.toFixed(0)} d within [${lo.toFixed(0)}, ${hi.toFixed(0)}]   from low Earth orbit ${c.injection.toFixed(2)} vs ${inj} km/s  -> ${mark(ok)}`);
  console.log(`           depart ${w.depart.toISOString().slice(0, 10)}, arrive ${w.arrive.toISOString().slice(0, 10)}, aphelion ${w.r2AU.toFixed(3)} AU vs the planet's ${p.r.toFixed(3)} AU today`);
}
{
  /* the cadence is the synodic period, which nothing in the solver knows about:
     Mars windows come round every 25.6 months, Jupiter's every 13.1. */
  for (const [idx, name, months] of [[3, "Mars", 25.6], [4, "Jupiter", 13.1], [5, "Saturn", 12.4]]) {
    const a = launchWindow(idx, NOW);
    const b = launchWindow(idx, +a.depart + 30 * 86400000);
    const gap = (b.depart - a.depart) / 86400000 / 30.4369;
    console.log(`  ${name.padEnd(8)} gap to the next window ${gap.toFixed(1)} months vs ${months}  -> ${mark(pct(gap, months) < 5)}`);
  }
  /* the arrival has to actually land on the planet */
  let worstMiss = 0;
  for (const [idx] of [[3], [4], [5]]) {
    const w = launchWindow(idx, NOW);
    worstMiss = Math.max(worstMiss, Math.abs(w.raw.miss) * 180 / Math.PI);
  }
  console.log(`  arrival misses the target's longitude by at most ${worstMiss.toExponential(1)} deg  -> ${mark(worstMiss < 1e-4)}`);
}
console.log("\nCHECK 8c — closest approaches to Mars vs the oppositions they belong to");
{
  /* Mars oppositions run on the same 25.6-month cycle, and the distance swings
     between about 0.37 AU (perihelic) and 0.68 AU (aphelic) — a range this
     solver has to reproduce from the eccentricities alone. */
  const ca = closestApproaches(3, Date.parse("2026-01-01T00:00:00Z"), 5);
  for (const c of ca) console.log(`  ${c.when.toISOString().slice(0, 10)}  ${c.au.toFixed(4)} AU`);
  const gaps = ca.slice(1).map((c, i) => (c.when - ca[i].when) / 86400000 / 30.4369);
  const gapOk = gaps.every((g) => Math.abs(g - 25.6) < 1.5);
  const rangeOk = ca.every((c) => c.au > 0.35 && c.au < 0.72);
  console.log(`  gaps ${gaps.map((g) => g.toFixed(1)).join(", ")} months  -> ${mark(gapOk)}`);
  console.log(`  all between 0.35 and 0.72 AU  -> ${mark(rangeOk)}`);
}

console.log(`\n${fails ? `${fails} CHECK(S) FAILED` : "all checks passed"}`);
process.exit(fails ? 1 : 0);
