#!/usr/bin/env node
/* measure-timing.mjs — measure what a browser timer actually does, so
 * /browser-limitations/ can quote numbers instead of adjectives.
 *
 *   npm i --no-save playwright        # dev-only, like the social-card scripts
 *   node seo/tools/measure-timing.mjs
 *
 * Writes seo/_data/browser-timing.json. build-browser-limitations.mjs reads
 * that file and refuses to build a claim it has no measurement for, so a
 * number on the public page can only ever be one that was measured here.
 *
 * WHAT THIS IS NOT. It is one engine on one machine: Chromium, headless,
 * Linux, no GPU. Every figure is reported with that context attached and the
 * page says so in the same breath. Firefox and WebKit are not installed here
 * and their browsers cannot be downloaded in this environment, so there are
 * no Firefox or Safari numbers — and there will not be invented ones. Where a
 * behaviour could not be measured at all, it goes in `unmeasured` with the
 * reason, and the page states it qualitatively as it always has.
 *
 * THE THREE THINGS HEADLESS CANNOT SHOW, and why they are absent rather than
 * estimated:
 *   - Background-tab throttling (hidden tabs clamped to one wake per second,
 *     then one per minute after five minutes). Headless Chromium has no window
 *     manager, so a page is never actually hidden: bringToFront() on a second
 *     tab leaves the first one visibilityState "visible", and CDP has no
 *     Emulation.setVisibilityOverride to force it. The renderer's throttling
 *     policy keys off exactly that state, so it never engages.
 *   - requestAnimationFrame stopping while hidden — same reason.
 *   - Autoplay policy. Playwright launches Chromium with
 *     --autoplay-policy=no-user-gesture-required, so audio.play() resolves
 *     here whether or not real Chrome would allow it. Measuring it would
 *     measure the test harness.
 *   - Page freezing. This one LOOKED measurable and was written, run, and then
 *     thrown out. CDP accepts Page.setWebLifecycleState {state:"frozen"} and
 *     reports no error, but the page keeps running: across a 10s "freeze" the
 *     interval logged ten ticks at 999-1001ms, an unbroken cadence, and
 *     page.evaluate() still executed a busy loop — which a genuinely frozen
 *     page cannot do, since freezing means no tasks run at all. Chromium will
 *     only freeze a page that is already hidden, and it can't be hidden here.
 *     Reporting those ten ticks as "a frozen tab keeps ticking" would have
 *     been a measurement of nothing, stated as a fact about browsers.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
/* The installed browser build and the one this playwright expects can differ;
 * the environment pins the binary rather than downloading a second copy. */
const EXE = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const round = (n, d = 1) => Number(n.toFixed(d));

/* ---------------------------------------------------------------- the run
 * Every test runs in the page, accumulating into a global, and is read back
 * afterwards — a test cannot be sampled from Node while it runs, because the
 * freeze test makes the page unreachable by design. */

/** setInterval(period) for `seconds`, watched two ways at once:
 *  - NAIVE: what a counter that just adds `period` per tick believes.
 *  - CORRECTED: what a counter that recomputes from a target Date.now() sees.
 *  The gap between them is the entire argument for how this site's clocks are
 *  written, so both come out of one run rather than two. */
const driftProbe = (period, seconds) => `(async () => {
  const period = ${period}, ms = ${seconds * 1000};
  const t0 = Date.now(), target = t0 + ms;
  const errs = [];          /* per-tick |actual - scheduled| */
  let ticks = 0, worstCorrected = 0;
  await new Promise((done) => {
    const id = setInterval(() => {
      ticks++;
      const now = Date.now();
      errs.push(now - (t0 + ticks * period));               /* schedule error */
      const corrected = Math.max(0, target - now);          /* what we'd show */
      const truth = Math.max(0, target - Date.now());
      worstCorrected = Math.max(worstCorrected, Math.abs(corrected - truth));
      if (now - t0 >= ms) { clearInterval(id); done(); }
    }, period);
  });
  const wall = Date.now() - t0;
  return { period, seconds: ${seconds}, ticks, wallMs: wall,
           naiveMs: ticks * period, naiveDriftMs: ticks * period - wall,
           tickErrors: errs, correctedWorstMs: worstCorrected };
})()`;

async function main() {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await (await browser.newContext()).newPage();
  await page.goto("about:blank");
  const cdp = await page.context().newCDPSession(page);
  const results = {};

  /* 1. a one-second tick, foreground, undisturbed — the baseline everything
   *    else is compared against. Sixty seconds because drift is cumulative
   *    and a five-second sample says nothing about a ten-minute timer. */
  console.log("1/5  foreground 1s interval, 60s …");
  results.foreground = await page.evaluate(driftProbe(1000, 60));

  /* 2 & 3. the same tick on a machine that is busy. CDP's CPU throttle is the
   *    honest way to reproduce "a laptop compiling something in the next
   *    window" — the condition under which people actually complain that a
   *    timer was wrong. 4x is a mid-range phone; 20x is a machine in trouble. */
  for (const [key, rate] of [["cpu4x", 4], ["cpu20x", 20]]) {
    console.log(`${rate === 4 ? "2" : "3"}/5  1s interval under ${rate}x CPU throttle, 20s …`);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    results[key] = { ...(await page.evaluate(driftProbe(1000, 20))), cpuThrottleRate: rate };
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }

  /* 4. the nested-setTimeout clamp. The spec lets a browser floor setTimeout
   *    at 4ms once a chain is five deep; this measures where Chromium puts it.
   *    It is why "setTimeout(fn, 0)" is not zero, which is the root of a whole
   *    family of "my timer is slow" bug reports. */
  console.log("4/5  nested setTimeout(0) clamp …");
  results.nestedTimeoutClamp = await page.evaluate(`(async () => {
    const gaps = [];
    await new Promise((done) => {
      let n = 0, last = performance.now();
      (function step() {
        const now = performance.now(); gaps.push(now - last); last = now;
        if (++n >= 12) return done();
        setTimeout(step, 0);
      })();
    });
    return { gapsMs: gaps.slice(1).map((g) => Math.round(g * 100) / 100) };
  })()`);

  /* 5. THE FREEZE CHECK IS A CONTROL, NOT A MEASUREMENT. It exists to prove
   *    that this environment cannot freeze a page, so that nobody (including a
   *    later reader of this file) is tempted to add the freeze numbers back.
   *    A genuinely frozen page runs no tasks at all; if evaluate() returns, the
   *    state did not engage and anything measured under it is meaningless. */
  console.log("5/5  control: can this environment freeze a page? …");
  await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
  const ranWhileFrozen = await page
    .evaluate(() => { const t = Date.now(); while (Date.now() - t < 50); return true; })
    .catch(() => false);
  await cdp.send("Page.setWebLifecycleState", { state: "active" });
  if (ranWhileFrozen) console.log("     …no (page still ran JS) — freeze behaviour stays in `unmeasured`.");
  else throw new Error("The page really froze — this environment CAN measure freezing. Write that test properly rather than leaving it in `unmeasured`.");

  const version = browser.version();
  await browser.close();

  /* ---- summarise: the page quotes these, not the raw arrays ---- */
  const sum = (r) => ({
    seconds: r.seconds, ticks: r.ticks,
    expectedTicks: Math.round((r.seconds * 1000) / r.period),
    naiveDriftMs: r.naiveDriftMs,
    tickErrorMedianMs: median(r.tickErrors),
    tickErrorMaxMs: Math.max(...r.tickErrors.map(Math.abs)),
    correctedWorstMs: r.correctedWorstMs,
    ...(r.cpuThrottleRate ? { cpuThrottleRate: r.cpuThrottleRate } : {}),
  });

  const out = {
    /* no measuredAt timestamp: this file is committed, and a field that moves
     * on every run would churn the sitemap revision of a page whose numbers
     * did not change. The git history is the date. */
    engine: { name: "Chromium", version, headless: true, platform: "Linux x86_64", gpu: false },
    caveat: "One engine, one machine, headless, no GPU. Not a cross-browser comparison — Firefox and WebKit could not be installed in the environment these were taken in.",
    foreground: sum(results.foreground),
    cpu4x: sum(results.cpu4x),
    cpu20x: sum(results.cpu20x),
    nestedTimeoutClamp: {
      gapsMs: results.nestedTimeoutClamp.gapsMs,
      clampMs: median(results.nestedTimeoutClamp.gapsMs.slice(4)),
      note: "setTimeout(fn, 0) chained; the spec permits a 4ms floor from the fifth nested level.",
    },
    unmeasured: [
      { what: "Hidden-tab throttling (one timer wake per second, then one per minute after five minutes)",
        why: "Headless Chromium has no window manager, so a page is never actually hidden and the throttling policy never engages. CDP has no visibility override." },
      { what: "requestAnimationFrame stopping while a tab is hidden", why: "Same reason — the page cannot be made hidden." },
      { what: "A frozen background tab",
        why: "CDP accepts the freeze but it does not engage: the page still ran JavaScript while supposedly frozen, which a frozen page cannot do. Chromium only freezes a page that is already hidden." },
      { what: "Autoplay policy (whether audio can start without a user gesture)",
        why: "Playwright launches Chromium with --autoplay-policy=no-user-gesture-required, so this would measure the harness, not the browser." },
    ],
  };
  /* derived once, here, so the page and any future reader agree on it */
  out.foreground.driftPerHourMs = round((out.foreground.naiveDriftMs / out.foreground.seconds) * 3600);
  out.cpu20x.driftPerHourMs = round((out.cpu20x.naiveDriftMs / out.cpu20x.seconds) * 3600);

  writeFileSync(join(root, "seo/_data/browser-timing.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`\nwrote seo/_data/browser-timing.json (${version})`);
  console.log(JSON.stringify({ foreground: out.foreground, cpu4x: out.cpu4x, cpu20x: out.cpu20x, clamp: out.nestedTimeoutClamp.clampMs }, null, 2));
}

main();
