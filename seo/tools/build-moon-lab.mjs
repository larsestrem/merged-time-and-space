#!/usr/bin/env node
/* /moon-simulator/ — one URL, selected by a stable ?state=<name> contract. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appLd, brand, breadcrumbLD, esc, GA_SNIPPET, learningLd } from "./lib.mjs";
import { MOON_LAB_JS, MOON_LAB_PATH, MOON_LAB_STATE_NAMES, MOON_LAB_STATES, moonLabHtml } from "./moon-lab.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const title = "Interactive Moon Simulator — Test Phases, Orbits and Eclipses";
const desc = "Choose a Moon question, change one thing and watch the result: phases, tidal locking, libration, moonrise, eclipses, supermoons and blue moons.";
const stateLinks = MOON_LAB_STATE_NAMES.map((state) =>
  `<a class="chip" href="${MOON_LAB_PATH}?state=${state}">${esc(MOON_LAB_STATES[state].question)}</a>`).join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${MOON_LAB_PATH}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [
  { name: "Time and Space Science", url: "/" },
  { name: "Moon simulator", url: MOON_LAB_PATH },
])}</script>
${appLd({ name: title, url: SITE + MOON_LAB_PATH, description: desc })}
${learningLd({ name: "Moon experiments", url: SITE + MOON_LAB_PATH, description: desc, type: "simulation" })}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "moon-simulator", url: MOON_LAB_PATH } })}
  <h1>Test the Moon</h1>
  <p class="sub">Choose a question. Change one thing. Watch what changes, then explain why. The <code>state</code> in the URL selects the experiment, so a teacher or concept page can open this same engine at exactly the right task.</p>
  ${moonLabHtml({ state: "phases", hub: true })}
  <div class="card">
    <h2>Every experiment has a direct link</h2>
    <p>The string after <code>?state=</code> is the learning contract. It chooses the model, starting position, control, task and observation without creating ten copies of the engine.</p>
    <div class="chips">${stateLinks}</div>
  </div>
  <div class="card">
    <h2>What this model does and does not claim</h2>
    <p>These are explanatory models, not an ephemeris. Periods and tilt come from the same Moon and orbit constants used elsewhere on the site; the supermoon distance range is sampled from the site’s Moon solver. Sizes and separations are enlarged to keep the relationships visible.</p>
    <p class="hint">For tonight’s real phase, rise time and distance, use <a href="/moon/">the Moon pages</a>. For the three bodies at a real place and instant, use the <a href="/sun-moon-earth-movement-simulator/">Sun, Moon and Earth movement simulator</a>.</p>
  </div>
  <p class="footer"><a href="/questions/">Questions you can test</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script data-ac="shared" data-name="moon-lab">${MOON_LAB_JS}</script>
</body>
</html>
`;

const out = join(root, MOON_LAB_PATH.slice(1), "index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log("wrote", MOON_LAB_PATH, MOON_LAB_STATE_NAMES.length, "named states");
