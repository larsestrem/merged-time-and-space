#!/usr/bin/env node
/* Build gate for the Moon Lab's public string-state contract. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MOON_LAB_JS,
  MOON_LAB_STATE_NAMES,
  MOON_LAB_STATES,
  moonLabFrame,
  moonLabHtml,
} from "./moon-lab.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const concepts = JSON.parse(readFileSync(join(root, "seo/_data/concepts.json"), "utf8"));
const failures = [];
const fail = (message) => failures.push(message);

if (MOON_LAB_STATE_NAMES.length !== 10) fail(`expected 10 states, found ${MOON_LAB_STATE_NAMES.length}`);
if (new Set(MOON_LAB_STATE_NAMES).size !== MOON_LAB_STATE_NAMES.length) fail("state names are not unique");
if (!MOON_LAB_JS.includes("URLSearchParams") || !MOON_LAB_JS.includes("searchParams.set('state'"))
  fail("controller no longer reads and writes the state query string");

const defaultSvgs = new Set();
for (const state of MOON_LAB_STATE_NAMES) {
  if (!/^[a-z][a-z0-9-]*$/.test(state)) fail(`${state}: state is not URL-safe`);
  const c = MOON_LAB_STATES[state];
  const choices = c.options?.map(([value]) => value) || [""];
  for (const value of [c.min, c.value, c.max]) {
    for (const option of choices) {
      let frame;
      try { frame = moonLabFrame(state, value, option); }
      catch (error) { fail(`${state}@${value}/${option}: ${error.message}`); continue; }
      const combined = `${frame.svg} ${frame.result} ${frame.value}`;
      if (!frame.svg.startsWith("<svg") || !frame.svg.includes("</svg>")) fail(`${state}: incomplete SVG`);
      if (!frame.svg.includes("role=\"img\"") || !frame.svg.includes("aria-label=")) fail(`${state}: SVG lacks accessible image semantics`);
      if (!frame.result || frame.result.length < 35) fail(`${state}: result is too thin`);
      if (/\b(?:undefined|NaN|Infinity)\b/.test(combined)) fail(`${state}@${value}/${option}: non-finite or missing output`);
    }
  }
  const first = moonLabFrame(state, c.value, c.optionValue || "");
  defaultSvgs.add(first.svg);
  const staticHtml = moonLabHtml({ state, caption: c.observe, alt: c.question });
  if (!staticHtml.includes(`data-state="${state}"`)) fail(`${state}: missing data-state in static HTML`);
  if (!staticHtml.includes(" disabled")) fail(`${state}: controls must start disabled until enhancement loads`);
  if (!staticHtml.includes(first.result.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")))
    fail(`${state}: build-time result missing from static HTML`);
}
if (defaultSvgs.size !== MOON_LAB_STATE_NAMES.length) fail("two named states render the same default SVG");

const moonConcepts = concepts.filter((concept) => concept.graphicId === "moon-lab");
if (moonConcepts.length !== MOON_LAB_STATE_NAMES.length)
  fail(`expected one concept for every state, found ${moonConcepts.length}`);
const assigned = moonConcepts.map((concept) => concept.simulatorState);
for (const state of MOON_LAB_STATE_NAMES) {
  const uses = assigned.filter((value) => value === state).length;
  if (uses !== 1) fail(`${state}: expected one concept assignment, found ${uses}`);
}

if (failures.length) {
  console.error(`Moon Lab gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Moon Lab gate passed: ${MOON_LAB_STATE_NAMES.length} named states, ${moonConcepts.length} distinct concept tasks.`);
