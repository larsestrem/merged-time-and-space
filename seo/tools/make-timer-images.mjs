#!/usr/bin/env node
/* make-timer-images.mjs — search & social images for every /timer/<duration>/
 * and use-case page, in the three aspect ratios Google asks for.
 *
 *   node seo/tools/make-timer-images.mjs            (all pages)
 *   node seo/tools/make-timer-images.mjs 15-minutes (one, for a quick look)
 *
 * Writes assets/img/timer/<slug>-{16x9,4x3,1x1}.webp. NOT part of `npm run
 * build`: it needs Playwright + sharp as ad-hoc dev tools and its output is
 * committed, so the site build stays dependency-free. Rerun when the dial art,
 * the card design or the duration list changes. See social-card.mjs for the
 * shared shell and the "compose per ratio, never crop one master" rule.
 *
 * Two compositions, because the durations aren't alike:
 *   - whole minutes 1..60 have real dial artwork (timer-dial.mjs), so the dial
 *     leads and the LED read-out sits under it;
 *   - everything else (15 s, 90 s, 1 m 15 s, 2 h…) has no dial, so the LED
 *     becomes the whole picture at a much larger size rather than shipping a
 *     frame with a hole in it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { segMarkup, timerSlug, timerLabel } from "./lib.mjs";
import { dialSvg } from "./timer-dial.mjs";
import { root, shell, htmlPage, renderCards, RATIOS } from "./social-card.mjs";

const OUT = join(root, "assets/img/timer");
const only = process.argv[2] || "";
const timers = JSON.parse(readFileSync(join(root, "seo/_data/timers.json"), "utf8"));

/* HH:MM:SS for the LED, matching what the page itself shows before you start */
const segTime = (sec) => [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60]
  .map((n) => String(n).padStart(2, "0")).join(":");

/* Per-ratio scale. The dial shrinks and the type steps down as the canvas gets
 * shorter; 16:9 also takes a narrower column so it keeps clear margin either
 * side rather than splitting into two columns. */
const WITH_DIAL = {
  "16x9": { pad: 46, dial: 300, led: 74, title: 38, btn: 28, gap: 18, maxw: 760 },
  "4x3": { pad: 64, dial: 420, led: 96, title: 46, btn: 34, gap: 26, maxw: 880 },
  "1x1": { pad: 76, dial: 560, led: 118, title: 52, btn: 38, gap: 34, maxw: 1000 },
};
/* no dial: the read-out is the picture, so it gets the room the dial had */
const LED_ONLY = {
  "16x9": { pad: 56, dial: 0, led: 150, title: 46, btn: 30, gap: 30, maxw: 980 },
  "4x3": { pad: 70, dial: 0, led: 168, title: 52, btn: 34, gap: 40, maxw: 1010 },
  "1x1": { pad: 84, dial: 0, led: 178, title: 58, btn: 38, gap: 48, maxw: 1020 },
};

function card({ ratio, title, seconds, minutes }) {
  const o = { ...RATIOS[ratio], ...(minutes ? WITH_DIAL : LED_ONLY)[ratio] };
  const styles = `${shell(o)}
    .title{font-size:${o.title}px}
    .dial{width:${o.dial}px;height:${o.dial}px;margin:0 auto}
    .dial svg{width:100%;height:100%;display:block}
    .tool-time.seg-screen{font-size:${o.led}px;padding:.2em .3em}
    .btnrow .btn{font-size:${o.btn}px;padding:${Math.round(o.btn * 0.62)}px 0}`;
  const body = `<div class="title">${title}</div>`
    + (minutes ? `<div class="dial">${dialSvg(minutes, { size: 1000 })}</div>` : "")
    + `<div class="tool-time seg-screen">${segMarkup(segTime(seconds))}</div>`
    + `<div class="btnrow"><span class="btn">Start</span></div>`;
  return htmlPage(styles, body);
}

/* every duration page, plus the use-case pages (egg, meditation, study…) */
const pages = [
  /* the page's own H1 wording ("15 Minute Timer"), so the image and the page agree */
  ...timers.durations.map((sec) => ({ slug: timerSlug(sec), seconds: sec, title: timerLabel(sec) })),
  ...(timers.useCases || []).map((u) => ({ slug: u.slug, seconds: u.seconds, title: u.label })),
].filter((p) => !only || p.slug === only);

const jobs = [];
for (const pg of pages) {
  /* dialSvg() only draws whole minutes 1..60 — anything else takes the LED-only
     composition rather than an empty circle */
  const mins = pg.seconds % 60 === 0 && pg.seconds >= 60 && pg.seconds <= 3600 ? pg.seconds / 60 : 0;
  for (const ratio of Object.keys(RATIOS)) {
    jobs.push({ ratio, file: `${pg.slug}-${ratio}`, html: card({ ratio, title: pg.title, seconds: pg.seconds, minutes: mins }) });
  }
}
console.log(`Rendering ${jobs.length} images for ${pages.length} timer pages…`);
const n = await renderCards(jobs, { outDir: OUT, onDone: (job, i) => { if (i % 30 === 0 || i === jobs.length) console.log(`  ${i}/${jobs.length}`); } });
console.log(`Done — ${n} files in assets/img/timer/`);
