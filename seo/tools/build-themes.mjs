#!/usr/bin/env node
/* build-themes.mjs — single source for the theme palettes AND their topical
 * background motifs. Writes the html.t-<id> rules into style.css between the
 * THEMES-START and THEMES-END marker comments.
 *
 * Each theme sets --bg (gradient), --accent, --text, optional --accent-text,
 * and a --motif: a faint, tiling, white SVG pattern (baked low opacity) that
 * makes the theme show its subject — flames for BBQ, a checkered flag for the
 * finish line, bats for spooky, stars for patriotic, and so on. The motif is
 * layered behind the gradient in body{} (see style.css), so it's CSS-only,
 * needs no network request, and stays subtle enough to keep text crisp.
 *
 *   node seo/tools/build-themes.mjs   (runs before build-inline)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

/* tile = SVG viewBox size; size = on-screen px; op = fill opacity (subtlety). */
const M = {
  sparkle: { tile: 120, size: 200, op: 0.07, svg: '<path d="M30 20l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z"/><path d="M88 74l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/>' },
  confetti:{ tile: 120, size: 170, op: 0.08, svg: '<rect x="24" y="22" width="6" height="11" rx="1" transform="rotate(22 27 27)"/><rect x="82" y="40" width="6" height="11" rx="1" transform="rotate(-28 85 45)"/><circle cx="58" cy="86" r="3"/><rect x="44" y="70" width="6" height="11" rx="1" transform="rotate(46 47 75)"/><circle cx="96" cy="96" r="2.5"/>' },
  hearts:  { tile: 120, size: 150, op: 0.08, svg: '<path d="M28 40c-3-4-9-4-9 2 0 5 9 11 9 11s9-6 9-11c0-6-6-6-9-2z"/><path d="M86 92c-3-4-9-4-9 2 0 5 9 11 9 11s9-6 9-11c0-6-6-6-9-2z"/>' },
  snow:    { tile: 150, size: 110, op: 0.05, svg: '<g stroke="#fff" stroke-width="1.3" stroke-linecap="round"><path d="M30 16v20M20 26h20M22.9 18.9l14.2 14.2M37.1 18.9L22.9 33.1"/></g><g stroke="#fff" stroke-width="1.1" stroke-linecap="round"><path d="M88 78v14M81 85h14M83 80l10 10M93 80l-10 10"/></g>' },
  checker: { tile: 40, size: 44, op: 0.05, svg: '<rect width="20" height="20"/><rect x="20" y="20" width="20" height="20"/>' },
  flames:  { tile: 120, size: 150, op: 0.08, svg: '<path d="M32 86c-9-5-10-17-3-24 1 5 4 6 4 6 1-9 7-12 11-18 1 7 4 9 7 14 4 6 2 16-4 22 0-4-1-7-1-7-3 4-7 4-7 8-2 0-5-1-7-1z"/><path d="M92 96c-5-3-6-10-2-14 1 3 2 3 2 3 0-5 4-7 6-10 0 4 2 5 4 8 2 4 1 9-3 13 0-2 0-4 0-4-2 2-4 2-4 5-1 0-3-1-3-1z"/>' },
  bats:    { tile: 120, size: 160, op: 0.08, svg: '<path d="M22 40c6-7 9 1 14 1 5 0 8-8 14-1-2 4-3 7-7 6-3-1-5-4-7-4s-4 3-7 4c-4 1-5-2-7-6z"/><path d="M78 92c6-7 9 1 14 1 5 0 8-8 14-1-2 4-3 7-7 6-3-1-5-4-7-4s-4 3-7 4c-4 1-5-2-7-6z"/>' },
  diamonds:{ tile: 120, size: 130, op: 0.08, svg: '<path d="M30 14l9 14-9 14-9-14z" fill="none" stroke="#fff" stroke-width="2"/><circle cx="30" cy="28" r="2.5"/><path d="M90 64l9 14-9 14-9-14z" fill="none" stroke="#fff" stroke-width="2"/><circle cx="90" cy="78" r="2.5"/>' },
  stars:   { tile: 120, size: 150, op: 0.09, svg: '<path d="M30 16l3.2 9.6h10l-8.1 6 3.1 9.6L30 44.3l-8.2 5.9 3-9.6-8-6h10z"/><path d="M90 74l2.3 7h7.3l-5.9 4.3 2.3 7-6-4.3-6 4.3 2.2-7-5.9-4.3h7.4z"/>' },
  waves:   { tile: 120, size: 170, op: 0.08, svg: '<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M14 36q14-12 28 0t28 0"/><path d="M62 92q14-12 28 0"/></g>' },
  caps:    { tile: 120, size: 160, op: 0.08, svg: '<path d="M30 22l18 7-18 7-18-7z"/><path d="M84 76l18 7-18 7-18-7z"/>' },
  dots:    { tile: 120, size: 150, op: 0.06, svg: '<circle cx="30" cy="30" r="3"/><circle cx="90" cy="84" r="3"/><circle cx="84" cy="26" r="2"/>' },
  soccerball:{ tile: 120, size: 150, op: 0.08, svg: '<circle cx="32" cy="32" r="9" fill="none" stroke="#fff" stroke-width="2"/><path d="M32 27l5 4-2 6h-6l-2-6z"/><circle cx="90" cy="86" r="9" fill="none" stroke="#fff" stroke-width="2"/><path d="M90 81l5 4-2 6h-6l-2-6z"/>' },
  baseball:{ tile: 120, size: 150, op: 0.08, svg: '<g fill="none" stroke="#fff" stroke-width="2"><circle cx="32" cy="32" r="9"/><circle cx="90" cy="86" r="9"/></g><g fill="none" stroke="#fff" stroke-width="1.1"><path d="M26 27q5 5 0 10M38 27q-5 5 0 10M84 81q5 5 0 10M96 81q-5 5 0 10"/></g>' },
  football:{ tile: 120, size: 150, op: 0.08, svg: '<g fill="none" stroke="#fff" stroke-width="2"><ellipse cx="32" cy="32" rx="10" ry="6"/><ellipse cx="90" cy="86" rx="10" ry="6"/></g><g stroke="#fff" stroke-width="1.3"><line x1="28" y1="32" x2="36" y2="32"/><line x1="86" y1="86" x2="94" y2="86"/></g>' },
  golf:    { tile: 120, size: 150, op: 0.08, svg: '<g stroke="#fff" stroke-width="2"><line x1="30" y1="16" x2="30" y2="44"/><line x1="86" y1="70" x2="86" y2="98"/></g><path d="M30 16l11 4-11 4z"/><path d="M86 70l11 4-11 4z"/><circle cx="30" cy="46" r="2"/><circle cx="86" cy="100" r="2"/>' },
};

/* palette: [from,to], accent, text, optional accentText, motif key */
const THEMES = {
  generic:    { bg: ["#0b1026", "#1e1b4b"], accent: "#fcd34d", text: "#f8fafc", at: "#1e1b4b", motif: "sparkle" },
  birthday:   { bg: ["#7c3aed", "#db2777"], accent: "#fde047", text: "#fff7ed", motif: "confetti" },
  wedding:    { bg: ["#4a044e", "#831843"], accent: "#f9a8d4", text: "#fdf2f8", at: "#4a044e", motif: "hearts" },
  graduation: { bg: ["#0f172a", "#1e3a8a"], accent: "#facc15", text: "#f8fafc", motif: "caps" },
  christmas:  { bg: ["#0b1026", "#1e1b4b"], accent: "#fde047", text: "#f8fafc", at: "#1e1b4b", motif: "snow" },
  fireworks:  { bg: ["#020617", "#1e1b4b"], accent: "#fcd34d", text: "#f8fafc", motif: "sparkle" },
  vacation:   { bg: ["#075985", "#0c4a6e"], accent: "#fcd34d", text: "#f0f9ff", at: "#0c4a6e", motif: null },
  school:     { bg: ["#1d4ed8", "#16a34a"], accent: "#fde047", text: "#f8fafc", motif: "dots" },
  love:       { bg: ["#9d174d", "#f43f5e"], accent: "#fecdd3", text: "#fff1f2", at: "#9d174d", motif: "hearts" },
  patriotic:  { bg: ["#0a1a3f", "#7f1d1d"], accent: "#f8fafc", text: "#f8fafc", at: "#0a1a3f", motif: "stars" },
  bbq:        { bg: ["#1c1207", "#7c2d12"], accent: "#f97316", text: "#fff7ed", at: "#1c1207", motif: "flames" },
  party:      { bg: ["#2e1065", "#db2777"], accent: "#fde047", text: "#fff7ed", motif: "confetti" },
  finishline: { bg: ["#0b0f1a", "#374151"], accent: "#ef4444", text: "#f8fafc", motif: "checker" },
  spooky:     { bg: ["#1a0b2e", "#7c2d12"], accent: "#f97316", text: "#fef3c7", at: "#1a0b2e", motif: "bats" },
  fiesta:     { bg: ["#831843", "#ea580c"], accent: "#fde047", text: "#fff7ed", motif: "diamonds" },
  soccer:     { bg: ["#065f46", "#064e3b"], accent: "#fde047", text: "#f8fafc", motif: "soccerball" },
  baseball:   { bg: ["#0f2d5c", "#7f1d1d"], accent: "#f8fafc", text: "#f8fafc", at: "#0f2d5c", motif: "baseball" },
  football:   { bg: ["#14532d", "#052e16"], accent: "#fde047", text: "#f8fafc", motif: "football" },
  golf:       { bg: ["#14532d", "#166534"], accent: "#fde047", text: "#f8fafc", motif: "golf" },
};

function motifVar(key) {
  const m = M[key];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${m.tile}' height='${m.tile}'><g fill='#ffffff' fill-opacity='${m.op}'>${m.svg}</g></svg>`;
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, size: m.size };
}

function decls(t) {
  const v = [`--bg:linear-gradient(160deg,${t.bg[0]},${t.bg[1]})`, `--accent:${t.accent}`, `--text:${t.text}`];
  if (t.at) v.push(`--accent-text:${t.at}`);
  /* a theme with motif:null wants a clean background — set --motif:none so it
   * overrides the generic motif inherited from :root rather than falling back to it */
  if (t.motif) { const mo = motifVar(t.motif); v.push(`--motif:${mo.url}`); v.push(`--motif-size:${mo.size}px`); }
  else v.push(`--motif:none`);
  return v.join(";");
}
/* legacy theme-id aliases: keep old shared links (e.g. ?theme=newyear) rendering
 * after a rename by pointing the old class at the new theme's declarations */
const ALIASES = { newyear: "fireworks" };
const rules = [
  ...Object.entries(THEMES).map(([id, t]) => `html.t-${id}{${decls(t)}}`),
  ...Object.entries(ALIASES).map(([from, to]) => `html.t-${from}{${decls(THEMES[to])}}`),
].join("\n");

/* Untyped pages (home, tools, hubs, content) get a flat dark background: no
 * motif at the :root level. Only pages that opt into a theme (personalized /c
 * countdowns and the create builder) get a gradient + motif, via their html.t-*
 * class below. */
const rootMotif = `:root{--motif:none}`;

/* the palettes are their own stylesheet part now (see css-parts.mjs); build-css
 * then folds every part back into style.css */
const THEMES_PART = join(root, "assets/css/parts/01-themes.css");
const css = readFileSync(THEMES_PART, "utf8");
const out = css.replace(/\/\*THEMES-START\*\/[\s\S]*?\/\*THEMES-END\*\//,
  `/*THEMES-START*/\n${rootMotif}\n${rules}\n/*THEMES-END*/`);
writeFileSync(THEMES_PART, out);
console.log(`Generated ${Object.keys(THEMES).length} theme rules with motifs into parts/01-themes.css.`);
