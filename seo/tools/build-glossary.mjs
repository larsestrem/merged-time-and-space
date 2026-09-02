#!/usr/bin/env node
/** Writes /glossary/index.html AND /questions/index.html from the same
 * concepts.json the concept pages use — the A–Z door and the by-topic door
 * to the same 50-odd questions. One data file, two indexes, zero second
 * copies of any answer. */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { CLASSROOM_PAUSED } from "./site-flags.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc, GA_SNIPPET, brand, breadcrumbLD } from "./lib.mjs";
import { loadConcepts, fillConcept, firstSentence } from "./concepts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const data = loadConcepts();
const rows = [...data].sort((a, b) => a.term.localeCompare(b.term));

let letter = "";
const items = rows.map((c) => {
  const L = c.term[0].toUpperCase();
  const head = L !== letter ? ((letter = L), `<h2 class="letter" id="${L}">${L}</h2>\n`) : "";
  /* FIRST SENTENCE ONLY. The glossary used to print each concept's whole
     shortAnswer verbatim — the same string that is the concept page's first
     paragraph and its FAQ answer — 45+ exact-duplicate paragraphs on the one
     page every breadcrumb points at, competing with the pages it links to.
     A glossary entry is a definition, not the article. The term heading is
     an h3 so the letter headings above it keep the hierarchy. */
  return `${head}<li class="glossary-item" id="${esc(c.slug)}">
<h3>${esc(c.term)}</h3>
<p>${esc(firstSentence(fillConcept(c.shortAnswer)))} <a href="/concepts/${esc(c.slug)}/">${esc(c.question)}</a></p>
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
    description: fillConcept(c.shortAnswer),
    url: SITE + `/concepts/${c.slug}/`,
  })),
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glossary of Time, Earth and Space</title>
<meta name="description" content="Short definitions for time zones, UTC, tropics, terminator, tilt, phases, tides and orbits, each linking to the full concept page.">
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
  <p class="sub">Every concept as a short definition — time, Earth and space. The question at the end of each entry is the link through to the drawing and a deeper pass. Prefer them grouped by topic? That door is <a href="/questions/">the questions index</a>. Filter the list.</p>
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
  ["day-night", "Light, day and seasons", "Move the line between day and night, the overhead Sun and Earth’s tilt to explain tropics, polar circles, twilight and the seasons."],
  ["questions", "Gravity, motion and the universe", "Test why an orbit keeps missing, why the night sky is dark, and how gravity ties falling objects, moons and tides together."],
  ["time", "Time from the sky and clocks", "Follow Earth’s turn into days, longitude and time zones, then see how UTC, calendar rules and clock notation describe the same motion."],
  ["solar", "Worlds, materials and formation", "Compare planets, moons, atmospheres and the asteroid belt, then ask what their differences say about how the solar system formed."],
];

const groupHtml = GROUPS.map(([key, name, dek]) => {
  const cs = data.filter((c) => c.cluster === key);
  if (!cs.length) return "";
  return `  <div class="card hub-teasers" id="${esc(key)}">
    <h2>${esc(name)}</h2>
    <p class="sub">${esc(dek)}</p>
    <ul class="hub-qs">
${cs.map((c) => `      <li><p><a href="/concepts/${esc(c.slug)}/">${esc(c.question)}</a> ${esc(firstSentence(fillConcept(c.shortAnswer)))}</p></li>`).join("\n")}
    </ul>
  </div>`;
}).join("\n");

const qCount = data.length;
const questionsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Questions You Can Test About Time, Earth and Space</title>
<meta name="description" content="Choose a question, change one thing in a simulator, observe the result and then read the explanation. ${qCount} questions about time, Earth and space.">
<link rel="canonical" href="${SITE}/questions/">
<link rel="alternate" hreflang="en" href="${SITE}/questions/">
<meta property="og:title" content="Questions You Can Test About Time, Earth and Space">
<meta property="og:description" content="Choose a question. Change one thing. Watch what the universe does.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [
  { name: "Time and Space Science", url: "/" },
  { name: "Questions you can test", url: "/questions/" },
])}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "questions", url: "/questions/" } })}
  <h1>Questions you can test</h1>
  <p class="sub">Choose a question. Change one thing. Watch what the universe does, then explain why. Start with an experiment or browse ${qCount} concise answers by phenomenon. Prefer an A–Z of the terms? Use <a href="/glossary/">the glossary</a>.</p>
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
