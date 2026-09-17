#!/usr/bin/env node
/** Glossary entries have dedicated definitions and destinations.
 * The question index lists only active standalone concept pages. */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { CLASSROOM_PAUSED } from "./site-flags.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc, GA_SNIPPET, brand, breadcrumbLD } from "./lib.mjs";
import { loadConcepts } from "./concepts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const data = loadConcepts();
const glossary = JSON.parse(readFileSync(join(root, "seo/_data/glossary.json"), "utf8"));
for (const entry of glossary) {
  if (!entry.definition?.trim() || !entry.href?.startsWith("/") || !entry.label?.trim()) {
    throw new Error(`Incomplete glossary entry: ${entry.slug}`);
  }
}
for (const concept of data) {
  if (!glossary.some(entry => entry.slug === concept.slug)) throw new Error(`Missing glossary entry: ${concept.slug}`);
}
const rows = [...glossary].sort((a, b) => a.term.localeCompare(b.term));

let letter = "";
const items = rows.map((c) => {
  const L = c.term[0].toUpperCase();
  const head = L !== letter ? ((letter = L), `<h2 class="letter" id="${L}">${L}</h2>\n`) : "";
  return `${head}<li class="glossary-item" id="${esc(c.slug)}">
<h3>${esc(c.term)}</h3>
<p>${esc(c.definition)} <a href="${esc(c.href)}">${esc(c.label)}</a></p>
</li>`;
}).join("\n");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Time and Space Science glossary",
  url: SITE + "/glossary/",
  hasDefinedTerm: rows.map((c) => ({
    "@type": "DefinedTerm",
    name: c.term,
    description: c.definition,
    url: SITE + c.href,
  })),
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glossary of Time, Earth and Space</title>
<meta name="description" content="Short definitions for Moon phases, tides, orbits, planets and clocks, each linking to a focused explanation.">
<link rel="canonical" href="${SITE}/glossary/">
<link rel="alternate" hreflang="en" href="${SITE}/glossary/">
<meta property="og:title" content="Glossary of Time, Earth and Space">
<meta property="og:description" content="Every concept as a short definition. The question is the link.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [
  { name: "Time and Space Science", url: "/" },
  { name: "Glossary", url: "/glossary/" },
])}</script>
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "glossary", url: "/glossary/" } })}
  <h1>Glossary</h1>
  <p class="sub">Find short definitions of words used in the simulations. Search for a term, then open its question for a fuller explanation.</p>
  <label class="sr-only visually-hidden" for="glossary-q">Filter glossary</label>
  <input class="search" id="glossary-q" type="search" placeholder="Filter by term or question" aria-controls="glossary-list">
  <ul class="glossary-list" id="glossary-list">${items}</ul>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>
(function(){
  var q=document.getElementById("glossary-q");
  var list=document.getElementById("glossary-list");
  if(!q||!list)return;
  var items=[].slice.call(list.querySelectorAll(".glossary-item"));
  var letters=[].slice.call(list.querySelectorAll(".letter"));
  q.addEventListener("input",function(){
    var s=q.value.trim().toLowerCase();
    items.forEach(function(li){
      li.hidden=!s||(li.textContent||"").toLowerCase().indexOf(s)!==-1?false:true;
    });
    letters.forEach(function(h){
      var next=h.nextElementSibling;
      var any=false;
      while(next&&!next.classList.contains("letter")){
        if(next.classList.contains("glossary-item")&&!next.hidden)any=true;
        next=next.nextElementSibling;
      }
      h.hidden=!any;
    });
  });
})();
</script>
</body>
</html>
`;

const out = join(root, "glossary", "index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log("wrote /glossary/", rows.length, "terms");

/* ---- /questions/ — the by-topic door --------------------------------------
 * The A–Z list is a poor landing page for a reader who does not yet know the
 * word they need: an alphabetical list of 50 terms distributes internal links
 * badly and answers no browsing intent. This page is the same set grouped by
 * the cluster field the data already carries — questions about the Moon
 * together, questions about time together — with the question as the link and
 * the first sentence as the teaser. It was retired once as a hand-written
 * page; rebuilt here it is derived, so a new concept files itself. */
const GROUPS = [
  ["simulator", "Moon, tides and eclipses", "Change the Moon’s position, spin, distance and orbital tilt. Then connect what moves to phases, moonrise, eclipses and tides."],
  ["day-night", "Light, day and seasons", "Explore twilight, solstices, equinoxes and the daytime Moon."],
  ["questions", "Gravity, motion and the universe", "Explore how orbits work and how the Moon affects tides."],
  ["time", "Time from the sky and clocks", "Explore daylight saving time, leap years and the International Date Line."],
  ["solar", "Worlds, materials and formation", "Compare planets, moons, atmospheres and the asteroid belt, then ask what their differences say about how the solar system formed."],
];

const groupHtml = GROUPS.map(([key, name, dek]) => {
  const cs = data.filter((c) => c.cluster === key).map(c => ({ ...c, ...glossary.find(g => g.slug === c.slug) }));
  if (!cs.length) return "";
  return `  <div class="card hub-teasers" id="${esc(key)}">
    <h2>${esc(name)}</h2>
    <p class="sub">${esc(dek)}</p>
    <ul class="hub-qs">
${cs.map((c) => `      <li><p><a href="${esc(c.href)}">${esc(c.label)}</a> ${esc(c.definition)}</p></li>`).join("\n")}
    </ul>
  </div>`;
}).join("\n");

const qCount = data.length;
const questionsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Questions About Time, Earth and Space</title>
<meta name="description" content="Choose a question, change one thing in a simulator, observe the result and then read the explanation. ${qCount} questions about time, Earth and space.">
<link rel="canonical" href="${SITE}/questions/">
<link rel="alternate" hreflang="en" href="${SITE}/questions/">
<meta property="og:title" content="Questions About Time, Earth and Space">
<meta property="og:description" content="Choose a question. Change one thing. Watch what the universe does.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [
  { name: "Time and Space Science", url: "/" },
  { name: "Questions about time, Earth and space", url: "/questions/" },
])}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "questions", url: "/questions/" } })}
  <h1>Questions about time, Earth and space</h1>
  <p class="sub">Choose a question about the Moon, Earth, planets or time. Read a short answer, then use a related simulation to explore it.</p>
  <section aria-labelledby="try-an-experiment">
    <h2 id="try-an-experiment">Try an experiment</h2>
    <div class="q-experiments">
      <a class="card q-experiment" href="/moon-simulator/?state=phases">
        <span>Moon lab</span><strong>Make every Moon phase</strong>
        <small>Move one angle. Watch a half-lit ball become every shape we name.</small>
      </a>
      <a class="card q-experiment" href="/orbital-velocity-simulator/">
        <span>Orbit lab</span><strong>Slow an orbit without stopping it</strong>
        <small>Change sideways speed and see which part of the path moves.</small>
      </a>
      <a class="card q-experiment" href="/day-night-map/">
        <span>Earth lab</span><strong>Move the overhead Sun</strong>
        <small>Jump between solstices and watch daylight move between hemispheres.</small>
      </a>
    </div>
  </section>
  <h2>Browse by phenomenon</h2>
${groupHtml}
${CLASSROOM_PAUSED ? "" : `  <div class="card">
    <h2>Have a question we haven't answered?</h2>
    <p>The best pages on this site started as a question somebody's class actually asked. <a href="/classroom/submit-a-lesson/#questions">Send us the questions your class asked</a> — if we build the answer, the page says who asked.</p>
  </div>
`}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;

const qOut = join(root, "questions", "index.html");
mkdirSync(dirname(qOut), { recursive: true });
writeFileSync(qOut, questionsHtml);
console.log("wrote /questions/", qCount, "questions in", GROUPS.length, "groups");
