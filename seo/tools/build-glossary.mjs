#!/usr/bin/env node
/** Writes /glossary/index.html from the same concepts.json the concept pages use. */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc, GA_SNIPPET, brand, breadcrumbLD } from "./lib.mjs";
import { loadConcepts, fillConcept } from "./concepts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const data = loadConcepts();
const rows = [...data].sort((a, b) => a.term.localeCompare(b.term));

let letter = "";
const items = rows.map((c) => {
  const L = c.term[0].toUpperCase();
  const head = L !== letter ? ((letter = L), `<h2 class="letter" id="${L}">${L}</h2>\n`) : "";
  return `${head}<li class="glossary-item" id="${esc(c.slug)}">
<h2>${esc(c.term)}</h2>
<p>${esc(fillConcept(c.shortAnswer))} <a href="/concepts/${esc(c.slug)}/">${esc(c.question)}</a></p>
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
  <p class="sub">Every concept as a short definition — time, Earth and space. The question at the end of each entry is the link through to the drawing and a deeper pass. Filter the list.</p>
  <label class="sr-only visually-hidden" for="glossary-q">Filter glossary</label>
  <input class="search" id="glossary-q" type="search" placeholder="Filter by term or question" aria-controls="glossary-list">
  <ul class="glossary-list" id="glossary-list">${items}</ul>
  <p class="footer"><a href="/questions/">All questions</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
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
