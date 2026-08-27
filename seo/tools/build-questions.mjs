#!/usr/bin/env node
/* build-questions.mjs — /questions/, the site's questions-first front door.
 *
 * INDEX, not a wall of answers. Each question is the link to /concepts/<slug>/.
 * Hash ids stay so old inbound links still land. Full essays live on the
 * concept pages; simulators stay on the hub URLs they already occupy.
 *
 *   node seo/tools/build-questions.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD, learningLd } from "./lib.mjs";
import { ico } from "./icons.mjs";
import { loadConcepts, fillConcept } from "./concepts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
export const Q_PATH = "/questions/";

/* ORDER IS THE POINT — each answer honestly raises the next question. */
const CHAIN = [
  { id: "fall-in", slug: "why-dont-planets-fall-into-the-sun" },
  { id: "gravity-motion", slug: "how-does-an-orbit-work" },
  { id: "change-one-thing", slug: "how-does-an-orbit-change" },
  { id: "seasons", slug: "why-do-we-have-seasons" },
  { id: "moon-phases", slug: "why-does-the-moon-change-shape" },
  { id: "tides", slug: "what-causes-tides" },
  { id: "jupiter-moons", slug: "why-does-jupiter-have-so-many-moons" },
  { id: "dark-sky", slug: "why-is-the-night-sky-dark" },
];

const bySlug = new Map(loadConcepts().map((c) => [c.slug, c]));
const QUESTIONS = CHAIN.map((row) => {
  const c = bySlug.get(row.slug);
  if (!c) throw new Error(`questions chain missing concept: ${row.slug}`);
  return { ...row, c };
});

const qCard = (Q, i) => {
  const next = QUESTIONS[i + 1];
  const see = Q.c.seeItLive
    .map((h) => `      <a class="chip" href="${esc(h.href)}">${esc(h.label)}</a>`)
    .join("\n");
  return `  <div class="card hub-teasers" id="${Q.id}">
    <h2>${i + 1} · <a href="/concepts/${esc(Q.c.slug)}/">${esc(Q.c.question)}</a></h2>
    <p class="answer hub-teaser">${esc(fillConcept(Q.c.shortAnswer))} <a class="hub-more" href="/concepts/${esc(Q.c.slug)}/">Get more</a></p>
    <p class="timer-presets">
${see}
    </p>
${next
    ? `    <p class="pullquote">${esc(next.c.question)} <a href="#${next.id}">Next question ↓</a></p>`
    : `    <p class="pullquote">The next question is yours.</p>`}
  </div>
`;
};

const FAQ = QUESTIONS.map((Q) => [Q.c.question, fillConcept(Q.c.shortAnswer)]);

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Big Questions — Why Orbits, Seasons, Phases and Tides Happen</title>
<meta name="description" content="Why don't the planets fall into the sun? Why do we have seasons? Why does the moon change phases, and what do the tides have to do with it? Why is the night sky so dark? Eight questions, each with a short answer and a simulator to test it on.">
<link rel="canonical" href="${SITE}${Q_PATH}">
<meta property="og:title" content="Big Questions — Why Orbits, Seasons, Phases and Tides Happen">
<meta property="og:description" content="Eight questions a curious student asks. The question is the link — a short answer here, the drawing and the deeper pass on the concept page.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Big questions", url: Q_PATH }])}</script>
${learningLd({ name: "Big Questions About the Sky", url: `${SITE}${Q_PATH}`, description: "Why planets stay in orbit, how gravity and motion make an orbit, why Earth has seasons, why the moon has phases, how the tides connect the sun, moon and Earth, why Jupiter has so many moons, and what happens when one part of the system changes.", type: "explanation" })}
${faqLd(FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "questions", url: Q_PATH } })}
  <h1>Big Questions</h1>
  <p class="sub">The questions this site is built around — the ones a curious person actually asks. <strong>The question is the link.</strong> A short answer sits here; tap through for the drawing, a deeper pass, and a simulator to test it on. Each answer hands you the next question.</p>

${QUESTIONS.map(qCard).join("")}  <div class="card">
    <h2>${ico("classroom")} The ninth question is yours</h2>
    <p>These eight have answers. The best question is the one you ask next — the one that starts "but wait, what about…" halfway through a simulator. If it can be computed from real motions and real measurements, there is a good chance it can be built and shown.</p>
    <p>If a class asks it and we build it, <strong>the class is credited on the page</strong> — that is a standing offer, and <a href="/about/work-with-us/">how it works is written down</a>.</p>
    <p class="timer-presets">
      <a class="chip" href="/glossary/">Glossary of every term</a>
      <a class="chip" href="/classroom/#ask">Send us your question</a>
      <a class="chip" href="/about/work-with-us/">How working together goes</a>
      <a class="chip" href="/classroom/">The classroom guide</a>
      <a class="chip" href="/about/">Why this site exists</a>
    </p>
  </div>
  <p class="footer"><a href="/glossary/">Glossary</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;

mkdirSync(join(root, Q_PATH.slice(1, -1)), { recursive: true });
writeFileSync(join(root, Q_PATH.slice(1) + "index.html"), page);
console.log(`questions: wrote ${Q_PATH} (${QUESTIONS.length} questions)`);
