#!/usr/bin/env node
/* make-event-images.mjs — the event pages' hero illustrations, in the formats
 * and sizes the page actually needs. Same shape as make-stopwatch-images.mjs
 * and make-timer-images.mjs: dev-only dependency, output committed, so the
 * build itself stays dependency-free.
 *
 *   npm i --no-save sharp && node seo/tools/make-event-images.mjs
 *
 * WHY NOT SIMPLY RE-ENCODE THEM SMALLER. It was the obvious first move and it
 * does not work: these are dense pen-and-ink illustrations — thousands of fine
 * strokes edge to edge — which is the content type lossy compression is worst
 * at. Measured on the largest (Ronaldo, 700x546, 106KB): WebP q75 gives 99KB,
 * q50 gives 81KB and starts smearing the linework, and LOSSLESS gives 457KB.
 * The 0.2 bytes/pixel these run at is not slack; it is what the picture costs.
 *
 * WHAT DOES WORK, and is what this script does:
 *   1. AVIF. It handles high-frequency line art far better than WebP — the
 *      same picture, visually indistinguishable, at about 70% of the bytes.
 *      Emitted as a <source> with the WebP kept as the fallback, so nothing is
 *      lost on a browser that cannot read it.
 *   2. A NARROW VARIANT. The image renders at 340px at most on a wide screen
 *      (.cd-profile-img is 42%/max 340px above 640px) and full width below it,
 *      so a 704px-wide file is oversized for every desktop visit. 384w covers
 *      those and small phones; the full width stays for high-DPR mobile.
 *
 * Rerun when an event's profile image is added or replaced. build-events.mjs
 * probes for each variant on disk, so a missing one degrades to a plain <img>
 * rather than a broken source.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IMG = join(root, "assets/img");

let sharp;
try { sharp = (await import("sharp")).default; }
catch {
  console.error("! sharp is not installed. Run:  npm i --no-save sharp && node seo/tools/make-event-images.mjs");
  process.exit(1);
}

/* the profile images the pages actually reference, read from the data rather
   than listed here, so adding one to events.json or people.json is enough.
   Both files are read: the holidays carry their own `profile`, the celebrity
   birthdays come from people.json. */
const rows = [];
for (const f of ["seo/_data/events.json", "seo/_data/people.json"]) {
  const j = JSON.parse(readFileSync(join(root, f), "utf8"));
  const arr = Array.isArray(j) ? j : Object.values(j).find(Array.isArray) || [];
  rows.push(...arr);
}
const wanted = [...new Set(rows
  .map((e) => e && e.profile)
  .filter((p) => typeof p === "string" && /^\/assets\/img\/.+\.webp$/i.test(p))
  .map((p) => basename(p)))];

if (!wanted.length) {
  console.log("No /assets/img/*.webp profile images referenced by events.json or people.json — nothing to do.");
  process.exit(0);
}

export const NARROW = 384;          /* build-events.mjs reads this name too */
const AVIF_Q = 58;                  /* measured: visually identical, ~70% of WebP */
const WEBP_Q = 80;                  /* only used for the narrow variant       */

const force = process.argv.includes("--force");
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
let made = 0, skipped = 0;

for (const file of wanted) {
  const src = join(IMG, file);
  if (!existsSync(src)) { console.warn(`! ${file} referenced by events.json but not on disk — skipped`); continue; }
  const base = file.replace(/\.webp$/i, "");
  const meta = await sharp(src).metadata();
  const orig = readFileSync(src).length;
  const outs = [
    [`${base}.avif`, (i) => i.avif({ quality: AVIF_Q, effort: 6 })],
    [`${base}-${NARROW}.avif`, (i) => i.resize({ width: NARROW, kernel: "lanczos3" }).avif({ quality: AVIF_Q, effort: 6 })],
    [`${base}-${NARROW}.webp`, (i) => i.resize({ width: NARROW, kernel: "lanczos3" }).webp({ quality: WEBP_Q, effort: 6 })],
  ];
  const sizes = [];
  for (const [name, build] of outs) {
    const dest = join(IMG, name);
    if (existsSync(dest) && !force) { skipped++; sizes.push(`${name} (kept)`); continue; }
    const buf = await build(sharp(src)).toBuffer();
    /* never ship a "smaller" file that is bigger — it would only cost a fetch */
    if (name.endsWith(".avif") && !name.includes(`-${NARROW}`) && buf.length >= orig) {
      console.warn(`! ${name} came out larger than the WebP (${kb(buf.length)} vs ${kb(orig)}) — not written`);
      continue;
    }
    writeFileSync(dest, buf);
    made++;
    sizes.push(`${name} ${kb(buf.length)}`);
  }
  console.log(`${file}  ${meta.width}x${meta.height} ${kb(orig)}  ->  ${sizes.join(", ")}`);
}

/* a quick tally of what an event page's hero now costs at each breakpoint */
const total = (suffix) => readdirSync(IMG)
  .filter((f) => wanted.some((w) => f === w.replace(/\.webp$/, suffix)))
  .reduce((n, f) => n + readFileSync(join(IMG, f)).length, 0);
console.log(`\n${made} file(s) written, ${skipped} already present (--force to redo).`);
console.log(`Across the ${wanted.length} heroes: ${kb(total(".webp"))} as WebP, ${kb(total(".avif"))} as AVIF, ${kb(total(`-${NARROW}.avif`))} at ${NARROW}w.`);
