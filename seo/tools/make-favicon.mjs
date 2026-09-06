#!/usr/bin/env node
/* Dev-only: npm i --no-save sharp && node seo/tools/make-favicon.mjs
 * Commit the PNG and ICO with any change to site-favicon.mjs. SVG and all
 * raster sizes share one source; the page build checks for its hashed PNG. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE_FAVICON_SVG, FAVICON_SVG_HREF, FAVICON_PNG_HREF } from './site-favicon.mjs';
const sharp = createRequire(import.meta.url)('sharp');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
mkdirSync(join(root, 'assets/favicon'), { recursive: true });
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(size => sharp(Buffer.from(SITE_FAVICON_SVG)).resize(size, size).png().toBuffer()));
writeFileSync(join(root, FAVICON_PNG_HREF.slice(1)), pngs[2]);
writeFileSync(join(root, FAVICON_SVG_HREF.slice(1)), SITE_FAVICON_SVG);
writeFileSync(join(root, 'favicon.svg'), SITE_FAVICON_SVG);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const entry = 6 + i * 16;
  header[entry] = size; header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(pngs[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += pngs[i].length;
});
writeFileSync(join(root, 'favicon.ico'), Buffer.concat([header, ...pngs]));
console.log(`Wrote Earth SVG, 48px PNG and 16/32/48px ICO: ${FAVICON_SVG_HREF}`);
