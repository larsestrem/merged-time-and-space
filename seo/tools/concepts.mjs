/**
 * Shared concept helpers. Side-effect free so sitemap / inline / hub builders
 * can import the slug list without writing pages.
 *
 * Graphics reuse the live drawing modules (daynight, orrery, globe). Do not
 * invent a second illustration language.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc } from "./lib.mjs";
import {
  DN_W, DN_VIEW_Y, DN_VIEW_H, DN_VIEWBOX, DN_TOP, DN_BOT,
  dnX, dnY, dnF, subsolar, nightPath, twilightPath, landPath, seasonPoints,
  sideView,
} from "./daynight.mjs";
import { orrerySvg } from "./orrery.mjs";
import { globeSvg, globeRadius } from "./globe.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

let cached = null;
export function loadConcepts() {
  if (cached) return cached;
  cached = JSON.parse(readFileSync(join(root, "seo/_data/concepts.json"), "utf8"));
  const bySlug = new Map(cached.map((c) => [c.slug, c]));
  for (const c of cached) {
    for (const rel of c.relatedSlugs) {
      if (!bySlug.has(rel)) throw new Error(`${c.slug} related missing: ${rel}`);
    }
  }
  return cached;
}

export function conceptBySlug() {
  return new Map(loadConcepts().map((c) => [c.slug, c]));
}

export const CONCEPT_SLUGS = () => loadConcepts().map((c) => c.slug);

export function relatedPartial(slugs, bySlug = conceptBySlug()) {
  return slugs
    .map((slug) => {
      const c = bySlug.get(slug);
      if (!c) throw new Error(`related slug missing: ${slug}`);
      return `<p><a href="/concepts/${esc(c.slug)}/">${esc(c.question)}</a> ${esc(c.shortAnswer)}</p>`;
    })
    .join("\n");
}

/** Concepts whose hubUrls point at this hub path (hash ignored). */
export function conceptsForHub(hubPath) {
  const want = hubPath.endsWith("/") ? hubPath : hubPath + "/";
  return loadConcepts().filter((c) =>
    c.hubUrls.some((h) => {
      const path = h.href.split("#")[0];
      const norm = path.endsWith("/") ? path : path + "/";
      return norm === want;
    }),
  );
}

function teaserAnchor(c, hubPath) {
  const h = c.hubUrls.find((x) => x.href.split("#")[0].replace(/\/?$/, "/") === hubPath.replace(/\/?$/, "/"));
  if (h && h.href.includes("#")) return h.href.split("#")[1];
  return c.slug;
}

/**
 * Hub teaser stack: the question is the link, one sentence after.
 * Hash ids from hubUrls stay so old inbound links still land.
 */
export function hubQuestionsCard(hubPath, heading = "Questions this page answers", { id } = {}) {
  const rows = conceptsForHub(hubPath);
  if (!rows.length) return "";
  const used = new Set();
  const items = rows.map((c) => teaserLi(c, hubPath, used)).join("\n    ");
  const idAttr = id ? ` id="${esc(id)}"` : "";
  return `  <div class="card hub-teasers"${idAttr}>
    <h2>${esc(heading)}</h2>
    <p class="sub">The question is the link. A short answer sits here; tap through for the drawing and the deeper pass.</p>
    <ul class="hub-qs">
    ${items}
    </ul>
  </div>
`;
}

/** Compact list with no card chrome — sits under a picture, as on the home page. */
export function hubQs(slugs) {
  const by = conceptBySlug();
  const used = new Set();
  const items = slugs.map((slug) => {
    const c = by.get(slug);
    if (!c) throw new Error(`hubQs missing: ${slug}`);
    return teaserLi(c, c.hubUrls[0]?.href?.split("#")[0] || "", used);
  }).join("\n");
  return `<ul class="hub-qs">\n${items}\n</ul>`;
}

function teaserLi(c, hubPath, used) {
  let hid = teaserAnchor(c, hubPath);
  if (used.has(hid)) hid = c.slug;
  used.add(hid);
  return `<li id="${esc(hid)}"><p><a href="/concepts/${esc(c.slug)}/">${esc(c.question)}</a> ${esc(c.shortAnswer)}</p></li>`;
}

/* ---- graphics: the live-site drawings, baked at the current instant ------ */
function miniMap() {
  const NOW = Date.now();
  const YEAR = seasonPoints(NOW);
  const SS = subsolar(NOW);
  const TILT = YEAR.tilt;
  const POLAR = 90 - TILT;
  const LAND = landPath();
  const GRAT = [
    [0, "Equator"], [TILT, "Tropic of Cancer"], [-TILT, "Tropic of Capricorn"],
    [POLAR, "Arctic Circle"],
  ].filter(([lat]) => lat <= DN_TOP - 1 && lat >= DN_BOT + 4).map(([lat, label]) => {
    const y = dnF(dnY(lat));
    return `<line class="dn-par" x1="0" y1="${y}" x2="${DN_W}" y2="${y}"/>`
      + `<text class="dn-parlab" x="6" y="${dnF(y - 4)}">${esc(label)}</text>`;
  }).join("");
  return `<svg class="dn-svg" viewBox="${DN_VIEWBOX}" width="100%" role="img" aria-label="A world map with the night side shaded and the sun's overhead point marked">
    <rect y="${DN_VIEW_Y}" width="${DN_W}" height="${DN_VIEW_H}" fill="#12304f"/>
    <path d="${LAND}" fill="#2f5d3a"/>
    <g class="dn-grat">${GRAT}</g>
    <path d="${twilightPath(SS.dec, SS.lon, 1)}" fill-rule="evenodd" fill="#050a16" fill-opacity=".34"/>
    <path d="${nightPath(SS.dec, SS.lon, -18, 1)}" fill="#050a16" fill-opacity=".52"/>
    <g transform="translate(${dnF(dnX(SS.lon))} ${dnF(dnY(SS.dec))})">
      <circle r="13" fill="#fde68a" fill-opacity=".25"/>
      <circle r="6.5" fill="#fde68a" stroke="#b45309" stroke-width="1.5"/>
    </g>
  </svg>`;
}

function orbitDiagram() {
  return `<svg class="dns-svg" viewBox="0 0 700 276" width="100%" role="img" aria-label="A planet falling toward the sun and missing, tracing a closed orbit">
    <circle class="dns-glow" cx="54" cy="138" r="54"/><circle class="dns-sun" cx="54" cy="138" r="34"/>
    <ellipse cx="390" cy="138" rx="230" ry="92" fill="none" stroke="rgba(248,250,252,.28)" stroke-width="1.6"/>
    <path d="M390 46 L620 70" fill="none" stroke="rgba(248,250,252,.35)" stroke-dasharray="6 5" stroke-width="1.4"/>
    <circle cx="390" cy="46" r="11" fill="#e8ecf4"/>
    <path d="M390 46 l28 4" stroke="#86efac" stroke-width="2" fill="none" marker-end="url(#ov-v)"/>
    <path d="M390 46 l-36 18" stroke="#fcd34d" stroke-width="2" fill="none"/>
    <defs><marker id="ov-v" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6z" fill="#86efac"/></marker></defs>
    <text class="dns-lab" x="98" y="36">Sun</text>
    <text class="dns-lab" x="410" y="38">sideways</text>
    <text class="dns-lab" x="300" y="90">pull</text>
    <text class="dns-lab" x="520" y="64">no gravity — a straight line</text>
  </svg>`;
}

function tidesDiagram() {
  return `<svg class="dns-svg" viewBox="0 0 700 276" width="100%" role="img" aria-label="Earth with two opposite ocean bulges and the Moon to one side">
    <circle cx="300" cy="138" r="78" fill="#2a3d63"/>
    <ellipse cx="300" cy="138" rx="118" ry="70" fill="#3a6a8a" opacity=".85"/>
    <circle cx="300" cy="138" r="70" fill="#2f5d3a"/>
    <circle class="dns-glow" cx="560" cy="138" r="28"/><circle cx="560" cy="138" r="18" fill="#e8e0c8"/>
    <text class="dns-lab" x="270" y="36">two bulges</text>
    <text class="dns-lab" x="540" y="100">Moon</text>
  </svg>`;
}

function olbersDiagram() {
  const shells = [40, 70, 100, 130].map((r, i) => {
    const n = 6 + i * 4;
    let s = `<circle cx="350" cy="138" r="${r}" fill="none" stroke="rgba(248,250,252,.18)"/>`;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + i * 0.2;
      s += `<circle cx="${(350 + r * Math.cos(a)).toFixed(1)}" cy="${(138 + r * Math.sin(a) * 0.55).toFixed(1)}" r="2.2" fill="#fde68a"/>`;
    }
    return s;
  }).join("");
  return `<svg class="dns-svg" viewBox="0 0 700 276" width="100%" role="img" aria-label="Concentric shells of stars around an observer">
    ${shells}
    <circle cx="350" cy="138" r="6" fill="#f8fafc"/>
    <text class="dns-lab" x="362" y="142">you</text>
  </svg>`;
}

export function graphicHtml(c) {
  const NOW = Date.now();
  const YEAR = seasonPoints(NOW);
  const SS = subsolar(NOW);
  let inner = "";
  switch (c.graphicId) {
    case "sun-earth-line":
      inner = sideView(SS.dec, YEAR.tilt);
      break;
    case "day-night-map":
      inner = miniMap();
      break;
    case "orbit":
      inner = orbitDiagram();
      break;
    case "moon-phase":
      inner = `<div class="orr-fig">${orrerySvg(NOW, 40.7, -74.0, "New York")}</div>`;
      break;
    case "tides":
      inner = tidesDiagram();
      break;
    case "jupiter": {
      const nm = "Jupiter";
      inner = `<svg viewBox="0 0 400 400" width="100%" role="img" aria-label="${esc(c.graphicAlt)}"><rect width="400" height="400" rx="16" fill="#080d1a"/>${globeSvg(nm, NOW, 200, 200, globeRadius(nm, 192), 24, 0.9)}</svg>`;
      break;
    }
    case "olbers":
      inner = olbersDiagram();
      break;
    default:
      inner = `<p>${esc(c.graphicAlt)}</p>`;
  }
  return `<figure class="graphic-block dn">
  ${inner}
  <figcaption>${esc(c.graphicCaption)}</figcaption>
</figure>`;
}
