#!/usr/bin/env node
/* make-stopwatch-images.mjs — the /stopwatch/ page's search & social images, in
 * the three aspect ratios Google asks for (16:9, 4:3, 1:1).
 *
 *   node seo/tools/make-stopwatch-images.mjs
 *
 * NOT part of `npm run build`, and deliberately not a project dependency: it
 * needs Playwright (to rasterise) and sharp (to encode WebP), which are dev-only
 * tools. Install them ad hoc when you need to regenerate:
 *
 *   npm i --no-save playwright sharp     (then: npx playwright install chromium)
 *
 * The output is committed to assets/img/, so the site build stays dependency-
 * free — same arrangement as make-us-cities.mjs and make-coastal-map.mjs, which
 * are also "rerun only when the inputs change".
 *
 * WHY IT ISN'T ONE IMAGE CROPPED THREE WAYS: each ratio is composed at its own
 * size, with its own type scale, spacing and lap-row count. Nothing is warped or
 * cropped — a square crop of a 16:9 frame would cut the lap table in half, and a
 * stretched one would lie about the numbers. The card is built from the site's
 * OWN pieces (segMarkup() for the 7-segment display, assets/css/style.css for
 * the buttons, stat tiles and lap rows) so the picture in search results is the
 * interface people land on, not an illustration of it.
 *
 * Emits, for each ratio, a WebP for the JSON-LD image array, plus a PNG of the
 * 16:9 for og:image — PNG because a couple of social crawlers still don't
 * handle WebP, and og:image is the one that must never fail.
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { segMarkup } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IMG = join(root, "assets/img");
const CSS = readFileSync(join(root, "assets/css/style.css"), "utf8");

/* A sample session, chosen to show what the tool is for: three miles, one
 * marked fastest (green) and one slowest (red), which is the feature the page
 * is really selling.
 *
 * The splits are a real run — 8:10.24, 8:07.11, 7:59.07, negative-splitting to
 * a 24:16.42 total — because the numbers are the picture. Placeholder seconds
 * read as a demo; a plausible 8-minute mile reads as something you'd share.
 * The running totals and the three stat tiles are DERIVED from these rows
 * below, so the arithmetic can't drift when the splits are edited. */
const SPLITS = [
  ["Mile 1", 8, 10, 24],
  ["Mile 2", 8, 7, 11],
  ["Mile 3", 7, 59, 7],
];
const cs = (m, s, c) => (m * 60 + s) * 100 + c;                 /* to centiseconds */
const show = (t) => {
  const c = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000);
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return p(m) + ":" + p(s) + "." + p(c);                        /* the page's own fmt() */
};
const LAPS = SPLITS.map(([n, m, s, c]) => ({ n, lap: cs(m, s, c) }));
let run = 0;
for (const l of LAPS) l.tot = run += l.lap;
const TOTAL = run;
const fastest = LAPS.reduce((a, b) => (b.lap < a.lap ? b : a));
const slowest = LAPS.reduce((a, b) => (b.lap > a.lap ? b : a));
const average = Math.floor(TOTAL / LAPS.length);
/* newest lap first, the way the page lists them */
const ROWS = LAPS.slice().reverse().map((l) => [
  "lap-row" + (l === fastest ? " lap-fast" : l === slowest ? " lap-slow" : ""),
  l.n, show(l.lap), show(l.tot),
]);

/* Per-ratio layout. `maxw` leaves margin either side on the landscape frame
 * rather than splitting it into columns — the three then read as one family.
 * `rows` is how many laps fit at a legible size, which is what buys the height
 * on 16:9 instead of shrinking the numbers. */
const RATIOS = {
  "16x9": { w: 1200, h: 675, pad: 40, led: 72, title: 33, statLbl: 18, statVal: 30, lap: 26, head: 15, btn: 25, gap: 12, rows: 3, maxw: 780 },
  "4x3": { w: 1200, h: 900, pad: 64, led: 102, title: 42, statLbl: 21, statVal: 38, lap: 33, head: 18, btn: 31, gap: 24, rows: 3 },
  "1x1": { w: 1200, h: 1200, pad: 76, led: 140, title: 50, statLbl: 25, statVal: 50, lap: 42, head: 21, btn: 38, gap: 38, rows: 3 },
};

const page = (o) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style><style>
  *{box-sizing:border-box} body{margin:0;width:${o.w}px;height:${o.h}px;overflow:hidden}
  .card2{width:${o.w}px;height:${o.h}px;padding:${o.pad}px;display:flex;flex-direction:column;justify-content:center;
    gap:${o.gap}px;background:linear-gradient(160deg,#0b0e1c,#10182e);color:#f8fafc;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif${o.maxw ? `;--maxw:${o.maxw}px` : ""}}
  /* every block shares one left and right edge — the whole card is one column */
  .card2>*{width:100%;max-width:var(--maxw,none);margin-left:auto;margin-right:auto}
  .title{font-size:${o.title}px;font-weight:800;letter-spacing:-.5px;text-align:center;margin:0 auto}
  /* the LED is em-based, so a single font-size scales the whole display */
  .tool-time.seg-screen{font-size:${o.led}px;margin:0 auto;width:100%;display:flex;justify-content:center;padding:.22em .3em}
  /* controls stretch across the frame instead of stacking height */
  .btnrow{display:flex;gap:${Math.round(o.gap * 0.7)}px;width:100%}
  .btnrow .btn{flex:1 1 0;width:auto;font-size:${o.btn}px;padding:${Math.round(o.btn * 0.62)}px 0;border-radius:16px}
  /* one wide row of tiles, nothing wrapping to a second line */
  .lap-stats{max-width:var(--maxw,none);width:100%;gap:${Math.round(o.gap * 0.6)}px;margin:0 auto;flex-wrap:nowrap}
  .lap-stat{flex:1 1 0;padding:${Math.round(o.statLbl * 0.7)}px 8px;font-size:${o.statLbl}px;border-radius:14px;white-space:nowrap;gap:6px}
  .lap-stat b{font-size:${o.statVal}px}
  /* the lap read-out at a size that survives a search thumbnail */
  .lap-head{max-width:none;width:100%;margin:0;font-size:${o.head}px;padding:0 10px}
  .lap-head span:first-child,.laps li>span:first-child{flex:0 0 ${Math.round(o.lap * 5.2)}px}
  .laps{max-width:none;width:100%;margin:0;max-height:none;overflow:visible}
  .laps li{font-size:${o.lap}px;padding:${Math.round(o.lap * 0.42)}px 10px}
</style></head><body><div class="card2">
  <div class="title">Stopwatch with lap times</div>
  <div class="tool-time seg-screen">${segMarkup(show(TOTAL))}</div>
  <div class="btnrow"><span class="btn">Start</span><span class="btn secondary">Lap</span></div>
  <div class="lap-stats">
    <span class="lap-stat lap-fast">Fastest<b>${show(fastest.lap)}</b></span>
    <span class="lap-stat lap-slow">Slowest<b>${show(slowest.lap)}</b></span>
    <span class="lap-stat">Average<b>${show(average)}</b></span></div>
  <div>
    <div class="lap-head"><span>Mile</span><span>Lap time</span><span>Total</span></div>
    <ul class="laps">${ROWS.slice(0, o.rows).map(([c, n, t, tot]) =>
      `<li class="${c}"><span class="lap-n">${n}</span><span>${t}</span><span class="lap-tot">${tot}</span></li>`).join("")}</ul>
  </div>
</div></body></html>`;

const { chromium } = await import("playwright");
const sharp = (await import("sharp")).default;
/* CHROME env var lets a machine point at an already-installed Chromium
   (e.g. PLAYWRIGHT_BROWSERS_PATH builds) instead of a fresh download */
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
for (const [name, o] of Object.entries(RATIOS)) {
  const p = await browser.newPage({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: 1 });
  const tmp = join(IMG, `.stopwatch-${name}.tmp.html`);
  writeFileSync(tmp, page(o));
  await p.goto(`file://${tmp}`);
  await p.waitForTimeout(200);
  /* Guard: a clipped card would ship a chopped-off lap table. scrollHeight
     alone isn't enough — a centred flex column that outgrows its box spills
     into the padding EVENLY, so nothing scrolls and the check passes while the
     title already sits above the top margin. Measure the real content box
     against the padding box instead, and report the slack so a tight ratio is
     visible before it becomes a clipped one. */
  const fit = await p.evaluate(() => {
    const c = document.querySelector(".card2"), box = c.getBoundingClientRect();
    const kids = [...c.children].map((k) => k.getBoundingClientRect());
    const pad = parseFloat(getComputedStyle(c).paddingTop);
    return { top: Math.round(Math.min(...kids.map((k) => k.top)) - box.top),
             bottom: Math.round(box.bottom - Math.max(...kids.map((k) => k.bottom))), pad: Math.round(pad) };
  });
  if (fit.top < 0 || fit.bottom < 0)
    throw new Error(`${name}: content overflows its canvas (${fit.top}px top, ${fit.bottom}px bottom) — adjust the ratio's type scale or lap count`);
  const png = await p.screenshot({ type: "png" });
  unlinkSync(tmp);
  await p.close();
  await sharp(png).webp({ quality: 82 }).toFile(join(IMG, `stopwatch-${name}.webp`));
  if (name === "16x9") writeFileSync(join(IMG, "stopwatch-16x9.png"), png);   /* og:image */
  console.log(`assets/img/stopwatch-${name}.webp  ${o.w}x${o.h}  (margin ${fit.top}px top / ${fit.bottom}px bottom, padding ${fit.pad}px)`);
}
await browser.close();
console.log("assets/img/stopwatch-16x9.png  1200x675 (og:image)");
