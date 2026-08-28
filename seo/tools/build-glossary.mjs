#!/usr/bin/env node
/** Writes /glossary/index.html AND /questions/index.html from the same
 * concepts.json the concept pages use — the A–Z door and the by-topic door
 * to the same 50-odd questions. One data file, two indexes, zero second
 * copies of any answer. */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
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
  ["questions", "The big questions", "Why things orbit, why we have seasons, what the Moon and the tides are doing — the questions the whole site exists to answer."],
  ["day-night", "Day, night and the year", "The line between day and night, the tropics and polar circles, twilight, and what the tilt does to all of them."],
  ["simulator", "The Moon and its cycle", "Phases and their names, the month, moonrise, eclipses that mostly refuse to happen — the Moon as a machine you can watch."],
  ["time", "Time and clocks", "Time zones, UTC, the 24-hour clock and military time, leap years, and the two kinds of day."],
  ["solar", "The planets and the solar system", "What the worlds beyond ours are like, why they have the moons they have, and what the belt between them is."],
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
<title>Big Questions About Time, Earth and Space</title>
<meta name="description" content="${qCount} questions, each answered on its own page: why we have seasons, what causes tides, why the moon changes shape, what a time zone is, and more.">
<link rel="canonical" href="${SITE}/questions/">
<link rel="alternate" hreflang="en" href="${SITE}/questions/">
<meta property="og:title" content="Big Questions About Time, Earth and Space">
<meta property="og:description" content="Every question the site answers, grouped by topic. The question is the link.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [
  { name: "Time and Space Science", url: "/" },
  { name: "Big questions", url: "/questions/" },
])}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "questions", url: "/questions/" } })}
  <h1>Big questions</h1>
  <p class="sub">Every question this site answers, grouped by topic — ${qCount} of them, each with its own page, its own drawing, and a short answer in the first paragraph. The question is the link. Prefer an A–Z of the terms instead? That is <a href="/glossary/">the glossary</a>.</p>
${groupHtml}
  <div class="card">
    <h2>Have a question we haven't answered?</h2>
    <p>The best pages on this site started as a question somebody's class actually asked. <a href="/classroom/submit-a-lesson/#questions">Send us the questions your class asked</a> — if we build the answer, the page says who asked.</p>
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;

const qOut = join(root, "questions", "index.html");
mkdirSync(dirname(qOut), { recursive: true });
writeFileSync(qOut, questionsHtml);
console.log("wrote /questions/", qCount, "questions in", GROUPS.length, "groups");
