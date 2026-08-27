#!/usr/bin/env node
/**
 * Writes /concepts/<slug>/index.html from seo/_data/concepts.json.
 * Hub teasers stay in hub builders. This file owns the ranking URL.
 *
 * Chrome matches the live site (brand + wrap); build-inline injects nav/CSS.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc, GA_SNIPPET, brand, breadcrumbLD, faqLd, learningLd } from "./lib.mjs";
import { loadConcepts, conceptBySlug, relatedPartial, graphicHtml, fillConcept, ORBIT_LESSON_JS } from "./concepts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const data = loadConcepts();
const bySlug = conceptBySlug();

export const CONCEPT_URLS = data.map((c) => `/concepts/${c.slug}/`);

for (const raw of data) {
  const c = {
    ...raw,
    shortAnswer: fillConcept(raw.shortAnswer),
    description: fillConcept(raw.description),
    title: fillConcept(raw.title),
    ledeHtml: raw.ledeHtml ? fillConcept(raw.ledeHtml) : "",
    graphicCaption: fillConcept(raw.graphicCaption),
    graphicAlt: fillConcept(raw.graphicAlt),
    sections: raw.sections.map((s) => ({
      ...s,
      heading: fillConcept(s.heading),
      body: s.body.map(fillConcept),
    })),
    seeItLive: raw.seeItLive.map((h) => ({
      ...h,
      label: fillConcept(h.label),
    })),
  };
  const url = `/concepts/${c.slug}/`;
  const canonical = SITE + url;
  const grade = c.sections.filter((s) => s.band === "5-12");
  const deeper = c.sections.filter((s) => s.band === "deeper");
  const sectionHtml = (list) => list.map((s) => `<section data-band="${esc(s.band)}"${s.band === "deeper" ? ' class="band-deeper"' : ""}>
<h2>${esc(s.heading)}</h2>
${s.body.map((p) => `<p>${esc(p)}</p>`).join("\n")}
</section>`).join("\n");
  const see = c.seeItLive
    .map((h) => `<li><a href="${esc(h.href)}">${esc(h.label)}</a></li>`)
    .join("");
  const hubs = c.hubUrls
    .map((h) => `<a href="${esc(h.href)}">${esc(h.label)}</a>`)
    .join(" · ");
  const deeperBlock = deeper.length
    ? `<details class="more-info">
<summary>Get more on this</summary>
${sectionHtml(deeper)}
</details>`
    : "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" hreflang="en" href="${esc(canonical)}">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.description)}">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [
    { name: "Time and Space Science", url: "/" },
    { name: "Glossary", url: "/glossary/" },
    { name: c.term, url },
  ])}</script>
${learningLd({ name: c.question, url: canonical, description: c.shortAnswer, type: "explanation" })}
${faqLd([[c.question, c.shortAnswer]])}
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: c.term,
    description: c.shortAnswer,
    url: canonical,
    inDefinedTermSet: SITE + "/glossary/",
  }).replace(/</g, "\\u003c")}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "concepts", url: "/glossary/" }, page: { label: c.term, url } })}
  <p class="kicker">${esc(c.term)}</p>
  <h1>${esc(c.question)}</h1>
  <p class="answer">${c.ledeHtml || esc(c.shortAnswer)}</p>
  ${graphicHtml(c)}
  ${sectionHtml(grade)}
  ${deeperBlock}
  <div class="card see-live">
    <h2>See it live</h2>
    <ul>${see}</ul>
    <p>On the hub: ${hubs}</p>
  </div>
  <div class="card related">
    <h2>Related questions</h2>
    ${relatedPartial(c.relatedSlugs, bySlug)}
  </div>
  <p class="footer"><a href="/glossary/">Glossary</a> · <a href="/questions/">All questions</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${c.slug === "how-does-an-orbit-work" ? `<script data-ac="js">${ORBIT_LESSON_JS}</script>` : ""}
</body>
</html>
`;
  const out = join(root, "concepts", c.slug, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log("wrote", url);
}
