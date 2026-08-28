/* lesson-index.mjs — the side-effect-free reader for the tool -> lesson map.
 *
 * seo/_data/lesson-index.json is written by build-classroom.mjs (which runs
 * earlier in the build) by scanning each lesson's own copy for the tools it
 * opens. This module exists because the tool builders that want a "lessons
 * that run on this" card — the day/night map, the simulators, the sun and
 * moon hubs — run AFTER build-classroom and must not import it: importing a
 * builder re-runs it, and that one writes twenty-five pages.
 *
 * A missing file means no cards, never a crash — the same posture
 * elevations.json takes. A stale file cannot ship a dead link: check-pages'
 * internal-link gate fails the build if a row points at a retired lesson. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

let LESSONS = [];
try { LESSONS = JSON.parse(readFileSync(join(root, "seo/_data/lesson-index.json"), "utf8")); }
catch { /* build-classroom has not run -> no cards */ }

/** Every lesson whose own copy opens this tool, in catalog order. */
export function lessonsForTool(path) {
  return LESSONS.filter((l) => l.tools.includes(path));
}

/**
 * The "lessons that run on this" card for a tool page. Empty string when no
 * lesson uses the tool — an honest absence, not a placeholder. At most four
 * rows; the hint routes to the filterable catalog for the rest.
 */
export function lessonsCard(path, heading = "Lessons that run on this") {
  const rows = lessonsForTool(path);
  if (!rows.length) return "";
  const shown = rows.slice(0, 4);
  return `  <div class="card">
    <h2>${esc(heading)}</h2>
    <p class="sub">Timed, projector-ready plans a class can run on the page above — free, no sign-up, each with its minutes and its grade band.</p>
    <div class="wc-facts">
${shown.map((l) => `      <div class="wc-frow"><span>${esc(l.band)} · ~${l.mins} min</span><b><a href="${esc(l.url)}">${esc(l.title)}</a></b></div>`).join("\n")}
    </div>
    <p class="hint">${rows.length > shown.length ? `${rows.length - shown.length} more that use this page, plus ` : ""}the full catalog, filterable by grade, topic and time: <a href="/classroom/lessons/">lesson plans</a>.</p>
  </div>
`;
}
