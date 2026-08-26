#!/usr/bin/env node
/* build-css.mjs — reassemble assets/css/parts/*.css into assets/css/style.css.
 *
 * The parts are the source of truth (see css-parts.mjs); this regenerates the
 * single-file view, still needed by:
 *   - the <link rel="stylesheet" href="/assets/css/style.css"> every page ships
 *     before build-inline replaces it with its own sections,
 *   - social-card.mjs, which reads the whole stylesheet so the search/social
 *     images are rendered from the site's real CSS.
 * Runs right after build-themes (which rewrites 01-themes.css) and before every
 * page generator, so nothing downstream sees a stale style.css.
 */
import { writeFileSync } from "node:fs";
import { fullCss, MONOLITH, PARTS } from "./css-parts.mjs";
const out = fullCss();
writeFileSync(MONOLITH, out);
console.log(`Assembled ${PARTS.length} css parts into style.css (${Math.round(out.length / 1024)}kb).`);
