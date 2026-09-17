import { readFileSync } from "node:fs";
import { esc } from "./lib.mjs";
const entries = JSON.parse(readFileSync(new URL("../_data/consolidated-explanations.json", import.meta.url), "utf8"));
export function consolidatedExplanation(path) {
  return entries.filter(e => e.path === path).map(e => `<section class="card" id="${esc(e.id)}"><h2>${esc(e.heading)}</h2>${e.paragraphs.map(p => `<p>${esc(p)}</p>`).join("")}${e.source ? `<p class="hint">Source: <a href="${esc(e.source)}">NASA Science</a></p>` : ""}</section>`).join("\n");
}
