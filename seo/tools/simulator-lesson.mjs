/* Shared, progressively disclosed lessons. Editorial HTML is trusted source. */
import { esc } from "./lib.mjs";
import { conceptsForHub, conceptLearningPath } from "./concepts.mjs";

export const lessonNav = `<nav class="lesson-nav" aria-label="On this page"><a href="#learn">What to look for</a><a href="#questions">Questions answered</a><a href="#related-topics">Explore related topics</a></nav>`;

export function modelNotes(content) {
  return `<details class="lesson-model"><summary aria-label="About this model" title="About this model">?</summary><div class="lesson-model-body"><h3>About this model</h3>${content}</div></details>`;
}

export function activities(prefix, items) {
  return `<section class="card lesson-copy" id="learn"><h2>What to look for</h2><p>Make a guess. Try it. Then check what you noticed.</p><div class="lesson-activities">${items.map(x=>`<article><h3>${x.title}</h3><p>${x.prompt}</p><button class="chip" type="button" data-${prefix}-activity="${x.key}" disabled>${x.action}</button><p>${x.watch}</p><details><summary>What should I notice?</summary><p>${x.answer}</p></details></article>`).join("")}</div><p class="lesson-status" id="${prefix}-activity-status" role="status"></p></section>`;
}

export function questions(items, deeper = "") {
  return `<section class="card lesson-copy" id="questions"><h2>Questions answered</h2>${items.map(([q,a])=>`<details class="lesson-question"><summary>${esc(q)}</summary><p>${a}</p></details>`).join("")}${deeper ? `<details class="lesson-deeper"><summary>A closer look</summary>${deeper}</details>` : ""}</section>`;
}

export const plainFaq = items => items.map(([q,a])=>[q,a.replace(/<[^>]*>/g,"").replace(/&amp;/g,"&")]);

export function relatedTopics(hub, extras = []) {
  const used = new Set();
  const links = extras.map(([href,label,why]) => {used.add(href); return `<li><a href="${href}">${label}</a>${why ? ` <span>${why}</span>` : ""}</li>`;});
  for (const c of conceptsForHub(hub)) {
    const href = conceptLearningPath(c.slug,hub);
    const anchor = c.hubUrls.find(h=>h.href.split('#')[0]===hub)?.href.split('#')[1] || c.slug;
    if(used.has(href)) continue;
    used.add(href); links.push(`<li id="${esc(anchor)}"><a href="${href}">${esc(c.question)}</a></li>`);
  }
  return `<section class="card lesson-copy" id="related-topics"><h2>Explore related topics</h2><ul class="lesson-related">${links.join("")}</ul></section>`;
}

/* A nonmodal disclosure: native keyboard behavior, plus Escape/outside close. */
export const lessonJs = `<script>(function(){
  document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var d=document.querySelector('.lesson-model[open]');if(d){d.open=false;d.querySelector('summary').focus();}});
  document.addEventListener('click',function(e){document.querySelectorAll('.lesson-model[open]').forEach(function(d){if(!d.contains(e.target))d.open=false;});});
})();</script>`;
