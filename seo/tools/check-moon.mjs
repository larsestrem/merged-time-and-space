#!/usr/bin/env node
/* Assert the moon snapshot is internally consistent at fixed timestamps
 * around each primary phase. Age, cycle, waxing and the phase name must
 * all derive from the Meeus instants — the failure mode that produced
 * "full / waxing / 15.1 days / 49%" on one page. */
import { moonSnap, nextPhase, prevPhase, moonIllum } from "./moon.mjs";

const DAY = 86400000;
let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error("FAIL", msg); fails++; } };

const anchors = [
  Date.UTC(2026, 7, 27, 20, 48, 0), /* the audit snapshot */
  Date.UTC(2026, 0, 15, 12, 0, 0),
  Date.UTC(2025, 5, 21, 0, 0, 0),
  Date.UTC(2024, 11, 25, 6, 0, 0),
];

for (const ms of anchors) {
  for (const kind of [0, 1, 2, 3]) {
    const t = nextPhase(ms, kind);
    for (const off of [-20 * 3600000, -6 * 3600000, 0, 6 * 3600000, 20 * 3600000]) {
      const at = t + off;
      const s = moonSnap(at);
      const lastNew = prevPhase(at, 0);
      const nextNew = nextPhase(at, 0);
      const nextFull = nextPhase(at, 2);
      const lun = nextNew - lastNew;
      ok(Math.abs(s.age - (at - lastNew) / DAY) < 1e-6, `age at ${at}`);
      ok(Math.abs(s.phase - (at - lastNew) / lun) < 1e-6, `cycle at ${at}`);
      ok(s.waxing === (nextFull < nextNew), `waxing at ${at}`);
      ok(s.age >= 0 && s.age < 31, `age range ${s.age}`);
      ok(s.phase >= 0 && s.phase <= 1, `cycle range ${s.phase}`);
      const ill = moonIllum(at);
      ok(s.fraction === ill.fraction, `fraction matches elongation at ${at}`);
      if (Math.abs(off) <= 6 * 3600000 && kind === 2) {
        ok(s.name === "Full moon", `near full named Full at off=${off}`);
        ok(s.primary === 2, `primary is full at off=${off}`);
      }
      if (s.primary !== null) {
        ok(["New moon", "First quarter", "Full moon", "Last quarter"].includes(s.name),
          `primary name ${s.name}`);
      }
    }
  }
}

/* the specific audit instant: next full is still ahead.
 * Age can be over 15 days here — this lunation's new-to-full span is longer
 * than half the synodic month (ellipse), so "full still ahead" does not
 * imply age < 15. The original bug was mixing elongation-cycle (49%) with
 * a mean-month age (15.1) and a waxing flag that disagreed with both. */
{
  const at = Date.UTC(2026, 7, 27, 20, 48, 0);
  const s = moonSnap(at);
  const lastNew = prevPhase(at, 0);
  const nextNew = nextPhase(at, 0);
  const nextFull = nextPhase(at, 2);
  const lun = nextNew - lastNew;
  ok(nextFull > at, "full still ahead at audit instant");
  ok(s.waxing === true, "waxing while full is still ahead");
  ok(s.primary === 2, "within 12h of full so primary is full");
  ok(s.name === "Full moon", "named Full moon inside the 12h window");
  ok(Math.abs(s.age - (at - lastNew) / DAY) < 1e-6, "age from last new");
  ok(Math.abs(s.phase - (at - lastNew) / lun) < 1e-6, "cycle from last new / this lunation");
  ok(s.fraction > 0.98, `illumination ${s.fraction} near full`);
  console.log("audit instant", {
    name: s.name, age: s.age.toFixed(2), cycle: Math.round(s.phase * 100) + "%",
    waxing: s.waxing, primary: s.primary, fraction: Math.round(s.fraction * 100) + "%",
    hoursToFull: ((nextFull - at) / 3600000).toFixed(1),
    lunDays: (lun / DAY).toFixed(3),
  });
}

if (fails) {
  console.error(fails, "assertions failed");
  process.exit(1);
}
console.log("check-moon: ok");
