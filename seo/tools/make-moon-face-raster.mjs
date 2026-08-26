#!/usr/bin/env node
/* make-moon-face-raster.mjs — bake the moon face to a small raster.
 *
 * WHY THIS EXISTS
 * The face sprite (moon-face.mjs) is 828 vector elements — 438 <ellipse> and
 * 390 <path> for the maria and craters, two radial gradients and two Gaussian
 * blur filters. As artwork for a 200px moon that is exactly right, and the big
 * moon on a /moon/ city page still uses the vector.
 *
 * The problem is the THUMBNAILS. A phase strip draws thirty-one 30px moons,
 * each one a <use> of that sprite. <use> does not draw once and copy: every
 * reference builds its own shadow tree and rasterizes independently, so the
 * home page was drawing ~25,700 vector shapes, through blur filters, to fill
 * thirty 30-pixel circles. Measured in Chromium at 412px: 407ms of style +
 * layout + paint, against ~60ms on a page with no strip.
 *
 * The face is IDENTICAL in every thumbnail — only the terminator, the earthshine
 * opacity and the limb stroke differ per day, and those stay vector. So the face
 * is rendered ONCE here, at build time, and each thumbnail places it as a single
 * <image>. Same pixels (it is rendered from the same sprite, through the same
 * browser engine that would have drawn it live), a fraction of the cost:
 * 407ms -> 167ms, and 144ms with the strip's content-visibility.
 *
 * DEV-ONLY, like make-stopwatch-images.mjs / make-timer-images.mjs:
 *   npm i --no-save playwright sharp && node seo/tools/make-moon-face-raster.mjs
 * The output is committed, so `npm run build` stays dependency-free. Rerun only
 * when the face artwork in moon-face.mjs changes.
 *
 * The sprite's face lives inside <defs>, so it renders only through a <use> —
 * screenshotting the sprite file directly yields a blank image. Hence the
 * wrapper below.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { moonFaceSprite } from "./moon-face.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const OUT = join(root, "assets/img/moon-face.webp");

/* 160px covers the largest size that uses the raster (r<=32 => 64px CSS) at a
 * 2.5x device pixel ratio, and 3x for the 30px strip thumbnails. */
const PX = 160;

const { chromium } = await import("playwright");
const sharp = (await import("sharp")).default;

const sprite = moonFaceSprite();
const inner = sprite.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

/* CHROME reuses an installed Chromium, same convention as social-card.mjs */
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const ctx = await browser.newContext({ viewport: { width: PX, height: PX }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.setContent(
  `<style>html,body{margin:0;background:transparent}svg{display:block}</style>` +
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${PX}" height="${PX}">` +
  `${inner}<use href="#ac-moon-face"/></svg>`
);
const png = await page.screenshot({ omitBackground: true });
await browser.close();

const webp = await sharp(png).webp({ quality: 90 }).toBuffer();

/* guard: a blank render is the failure mode this file exists to avoid (the face
 * is inside <defs>). A transparent or flat image has ~zero variance. */
const stats = await sharp(webp).stats();
const spread = Math.max(...stats.channels.map((c) => c.stdev));
if (spread < 5) {
  console.error(`✗ rendered face is blank/flat (max channel stdev ${spread.toFixed(1)}) — refusing to write ${OUT}`);
  process.exit(1);
}

writeFileSync(OUT, webp);
console.log(`✓ wrote ${OUT} — ${PX}px, ${webp.length} B (max channel stdev ${spread.toFixed(1)})`);
