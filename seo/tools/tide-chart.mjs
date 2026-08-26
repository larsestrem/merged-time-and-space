/* tide-chart.mjs — build-time access to assets/js/tide-chart.js, THE tide
 * chart renderer. The generators (build-tides, build-home) eval the very file
 * the browser runs, so a baked chart and the live one can't drift apart.
 * See the header of assets/js/tide-chart.js for the renderer's contract. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* The station page's chart is the page's main feature, so it gets a tall
 * canvas; the homepage previews keep the short one. */
export const TIDE_W = 700, TIDE_H = 300, TIDE_H_PAGE = 600;

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "..", "..", "assets/js/tide-chart.js"), "utf8");
const _fns = new Function(`${SRC}\nreturn {tideChartSvg:tideChartSvg,tideSeries:tideSeries};`)();
export const tideChartSvg = _fns.tideChartSvg;
export const tideSeries = _fns.tideSeries;
