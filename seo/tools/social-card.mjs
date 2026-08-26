/* social-card.mjs — the shared machinery behind the tool pages' search & social
 * images (make-stopwatch-images.mjs, make-timer-images.mjs).
 *
 * Google asks for the same image in several aspect ratios. The rule this module
 * exists to enforce: each ratio is COMPOSED at its own size — its own type
 * scale, spacing and content density — never one master cropped or stretched.
 * A square crop of a landscape frame cuts content in half; a stretched one lies
 * about the numbers it's showing.
 *
 * Cards are built from the site's OWN pieces (the real style.css, segMarkup(),
 * dialSvg()) so what appears in a search result is the interface people land on.
 *
 * Dev-only: needs Playwright to rasterise and sharp to encode WebP, installed ad
 * hoc (`npm i --no-save playwright sharp`). Output is committed, so the site
 * build stays dependency-free. Set CHROME to reuse an installed Chromium.
 */
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const root = join(here, "..", "..");
export const SITE_CSS = readFileSync(join(root, "assets/css/style.css"), "utf8");

/* The three ratios Google names, with the canvas each one gets. */
export const RATIOS = { "16x9": { w: 1200, h: 675 }, "4x3": { w: 1200, h: 900 }, "1x1": { w: 1200, h: 1200 } };

/* The card shell every image shares: the site's night-sky gradient, a single
 * centred column, and — the part that matters — one left and right edge for
 * every block in it, so nothing sits a few pixels off from its neighbours. */
export const shell = ({ w, h, pad, maxw, gap }) => `
  *{box-sizing:border-box} body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
  .card2{width:${w}px;height:${h}px;padding:${pad}px;display:flex;flex-direction:column;justify-content:center;
    align-items:center;gap:${gap}px;background:linear-gradient(160deg,#0b0e1c,#10182e);color:#f8fafc;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif${maxw ? `;--maxw:${maxw}px` : ""}}
  .card2>*{width:100%;max-width:var(--maxw,none);margin-left:auto;margin-right:auto}
  .title{font-weight:800;letter-spacing:-.5px;text-align:center;margin:0 auto}
  .btnrow{display:flex;width:100%}
  .btnrow .btn{flex:1 1 0;width:auto;border-radius:16px}
  .tool-time.seg-screen{margin:0 auto;width:100%;display:flex;justify-content:center}`;

export const htmlPage = (styles, body) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${SITE_CSS}</style><style>${styles}</style></head>` +
  `<body><div class="card2">${body}</div></body></html>`;

/* Rasterise a list of {file, html} into WebP (and optionally PNG). Refuses to
 * emit a frame whose content overflows its canvas — a clipped card would ship a
 * chopped-off lap table or a cut-off dial. */
export async function renderCards(jobs, { outDir, quality = 82, onDone } = {}) {
  const { chromium } = await import("playwright");
  const sharp = (await import("sharp")).default;
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  let n = 0;
  for (const job of jobs) {
    const { w, h } = RATIOS[job.ratio];
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const tmp = join(outDir, `.${job.file}.tmp.html`);
    writeFileSync(tmp, job.html);
    await p.goto(`file://${tmp}`);
    await p.waitForTimeout(120);
    const fits = await p.evaluate(() => {
      const c = document.querySelector(".card2");
      return c.scrollHeight <= c.clientHeight && c.scrollWidth <= c.clientWidth;
    });
    if (!fits) throw new Error(`${job.file}: content overflows its ${job.ratio} canvas — adjust that ratio's scale`);
    const png = await p.screenshot({ type: "png" });
    unlinkSync(tmp);
    await p.close();
    await sharp(png).webp({ quality }).toFile(join(outDir, `${job.file}.webp`));
    if (job.png) writeFileSync(join(outDir, `${job.file}.png`), png);
    n++;
    if (onDone) onDone(job, n);
  }
  await browser.close();
  return n;
}
