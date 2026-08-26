#!/usr/bin/env node
/* make-logo-raster.mjs — the brand logo as PNG, for the two places SVG is not
 * good enough. Dev-only dependency, output committed; the build never runs it.
 *
 *   npm i --no-save sharp && node seo/tools/make-logo-raster.mjs
 *
 * The site's only logo is the inline SVG in build-inline.mjs, which is also
 * written out as /favicon.svg. That is the right choice for the page and the
 * wrong one for two consumers:
 *
 *   - Google's Organization `logo` property wants a raster it can index and
 *     crop; SVG is not reliably picked up, and the documented floor is 112px on
 *     the shorter side.
 *   - Bing's favicon pipeline and iOS home-screen bookmarks both want a PNG,
 *     and the site had neither, only the SVG.
 *
 * So: 512x512 for the structured-data logo and 180x180 as the apple-touch-icon,
 * both rendered from the SAME favicon.svg the pages already use, so they cannot
 * drift from the mark in the corner. Rerun when the logo changes.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let sharp;
try { sharp = (await import("sharp")).default; }
catch {
  console.error("! sharp is not installed. Run:  npm i --no-save sharp && node seo/tools/make-logo-raster.mjs");
  process.exit(1);
}

const src = join(root, "favicon.svg");
if (!existsSync(src)) {
  console.error("! favicon.svg is missing — run `node seo/tools/build-inline.mjs` first (it writes it from LOGO_SVG).");
  process.exit(1);
}
const svg = readFileSync(src);

/* The mark is drawn on a transparent ground and its bell and feet run to the
   edge of the 200x200 box. Google crops a logo to a square and shows it on
   white, so a flat light ground and a little padding read better than a
   transparent bleed. The apple-touch-icon needs an opaque ground outright —
   iOS composites it onto the home screen with no transparency handling. */
const GROUND = { r: 244, g: 238, b: 209, alpha: 1 };      /* the clock face's own cream */

const outputs = [
  ["assets/img/logo-512.png", 512, 44],
  ["apple-touch-icon.png", 180, 14],
];

for (const [rel, size, pad] of outputs) {
  const inner = size - pad * 2;
  const mark = await sharp(svg, { density: 384 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const buf = await sharp({ create: { width: size, height: size, channels: 4, background: GROUND } })
    .composite([{ input: mark, top: pad, left: pad }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  writeFileSync(join(root, rel), buf);
  console.log(`${rel.padEnd(28)} ${size}x${size}  ${(buf.length / 1024).toFixed(1)}KB`);
}
console.log("\nReferenced from build-inline.mjs (apple-touch-icon + PNG icon link) and lib.mjs (Organization logo).");
