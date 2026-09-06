#!/usr/bin/env node
/* Regenerate the Earth home button and bookmark icon from the committed
 * 512px Earth master. Dev-only sharp dependency; the build does not run this.
 * Run: npm i --no-save sharp && node seo/tools/make-logo-raster.mjs
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

const src = join(root, "assets/img/logo-512.png");
if (!existsSync(src)) {
  console.error("! assets/img/logo-512.png is missing.");
  process.exit(1);
}
const svg = readFileSync(src);

/* The committed Earth master already has its black margin. Do not add the
   old clock's cream backing or rasterize the generic globe favicon. */
for (const [rel, size] of [["assets/img/earth-home.webp", 128], ["apple-touch-icon.png", 180]]) {
  const out = sharp(svg).resize(size, size);
  const buf = rel.endsWith(".webp") ? await out.webp({ quality: 85 }).toBuffer() : await out.png().toBuffer();
  writeFileSync(join(root, rel), buf);
  console.log(`${rel}: ${size}x${size}`);
}
