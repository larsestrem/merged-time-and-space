/* check-crosslinks.mjs — assert the sun/moon/tide cross-links are reciprocal.
 *
 * CLAUDE.md has described these links as reciprocal since the coastal map was
 * added, and coastal.mjs's own comment says both sides "link to the SAME pairs
 * so the relationship is always reciprocal". That was true of the DATA and
 * merely hoped of the PAGES: nothing checked that the page A points at points
 * back. A one-way link is invisible — the page still renders, the build still
 * passes, and the only symptom is a crawl path that dead-ends.
 *
 * So this walks every emitted page for anchors carrying data-xlink (only the
 * shared strip in crosslinks.mjs emits them) and requires that the target page
 * links back. Runs in the build ahead of check-pages, so a broken pairing stops
 * a deploy the same way an empty page does.
 *
 * It deliberately does NOT parse every <a> on the site — only the strip's, so
 * ordinary contextual links stay free to be one-way.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* the families that carry a checkable pairing. The simulator joined them: its
 * city pages name /sun/<slug>/ and /moon/<slug>/, and those two name the
 * simulator page back, so the loop is assertable — it was reciprocal in fact
 * and unenforced, which is the state every one-way link starts in. */
const ROOTS = ["sun", "moon", "tides", "sun-moon-earth-movement-simulator"];
/* World-clock city pages emit the same strip but are DELIBERATELY one-way: the
 * sun and moon pages link to a clock page for their zone, and a clock page
 * representing a zone cannot link back to every city in it. They were not
 * scanned at all, though, so retiring a sun or moon city would have left dead
 * links on the clock pages with the gate still green. They are scanned for
 * target-exists only — see ONE_WAY below. */
const ONE_WAY_ROOTS = ["world-clock"];
const SKIP = new Set(["node_modules", ".git", ".wrangler"]);

function pages(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (e === "index.html") out.push(p);
  }
  return out;
}

/* "/sun/portland/" -> the file that serves it */
const fileFor = (url) => join(root, url.replace(/^\/|\/$/g, ""), "index.html");
/* the file -> its URL path */
const urlFor = (file) => "/" + relative(root, file).replace(/index\.html$/, "").replace(/\\/g, "/");

const XLINK = /<a[^>]+href="([^"]+)"[^>]*data-xlink="([^"]+)"/g;

const links = new Map();   /* page url -> Set(target urls), reciprocity required */
const oneWay = new Map();  /* page url -> Set(target urls), existence only */
let scanned = 0;
for (const r of ROOTS) {
  const dir = join(root, r);
  if (!existsSync(dir)) continue;
  for (const f of pages(dir)) {
    const html = readFileSync(f, "utf8");
    if (!html.includes("data-xlink")) continue;
    scanned++;
    const set = new Set();
    for (const m of html.matchAll(XLINK)) set.add(m[1]);
    links.set(urlFor(f), set);
  }
}

for (const r of ONE_WAY_ROOTS) {
  const dir = join(root, r);
  if (!existsSync(dir)) continue;
  for (const f of pages(dir)) {
    const html = readFileSync(f, "utf8");
    if (!html.includes("data-xlink")) continue;
    scanned++;
    const set = new Set();
    for (const m of html.matchAll(XLINK)) set.add(m[1]);
    oneWay.set(urlFor(f), set);
  }
}

const problems = [];
for (const [from, targets] of oneWay) {
  for (const to of targets) {
    if (!existsSync(fileFor(to))) problems.push(`${from} -> ${to} : target page does not exist`);
  }
}
for (const [from, targets] of links) {
  for (const to of targets) {
    if (!existsSync(fileFor(to))) { problems.push(`${from} -> ${to} : target page does not exist`); continue; }
    const back = links.get(to);
    if (!back) { problems.push(`${from} -> ${to} : target emits no cross-links at all (one-way)`); continue; }
    if (!back.has(from)) problems.push(`${from} -> ${to} : not reciprocal — ${to} links to [${[...back].join(", ") || "nothing"}]`);
  }
}

if (problems.length) {
  console.error(`✗ check-crosslinks: ${problems.length} non-reciprocal cross-link(s):`);
  for (const p of problems.slice(0, 25)) console.error(`  ${p}`);
  if (problems.length > 25) console.error(`  … and ${problems.length - 25} more`);
  process.exit(1);
}

/* concept ↔ hub: every concept page exists, every hubUrl and seeItLive
   target exists, and every hub that claims a concept actually links to it. */
{
  const { loadConcepts } = await import("./concepts.mjs");
  const concepts = loadConcepts();
  for (const c of concepts) {
    const url = `/concepts/${c.slug}/`;
    if (!existsSync(fileFor(url))) problems.push(`concept page missing: ${url}`);
    else {
      const html = readFileSync(fileFor(url), "utf8");
      for (const h of [...c.hubUrls, ...c.seeItLive]) {
        const path = h.href.split("#")[0];
        const norm = path.endsWith("/") ? path : path + "/";
        if (!html.includes(`href="${norm}`) && !html.includes(`href="${h.href}"`)) {
          /* concept pages must point back at the hub; the exact hash is optional */
          if (!html.includes(`href="${path}`) && !html.includes(`href="${norm}`)) {
            problems.push(`${url} does not link back to hub ${h.href}`);
          }
        }
      }
    }
    for (const h of [...c.hubUrls, ...c.seeItLive]) {
      const path = h.href.split("#")[0];
      const norm = path.endsWith("/") ? path : path + "/";
      if (!existsSync(fileFor(norm))) problems.push(`${url} target missing: ${h.href}`);
    }
    for (const h of c.hubUrls) {
      const path = h.href.split("#")[0];
      const norm = path.endsWith("/") ? path : path + "/";
      if (!existsSync(fileFor(norm))) continue;
      const hubHtml = readFileSync(fileFor(norm), "utf8");
      if (!hubHtml.includes(`/concepts/${c.slug}/`)) {
        problems.push(`hub ${norm} does not link to /concepts/${c.slug}/`);
      }
    }
  }
  if (problems.length) {
    console.error(`✗ check-crosslinks: ${problems.length} problem(s) after concept check:`);
    for (const p of problems.slice(0, 25)) console.error(`  ${p}`);
    if (problems.length > 25) console.error(`  … and ${problems.length - 25} more`);
    process.exit(1);
  }
  console.log(`✓ check-crosslinks: ${concepts.length} concept page(s) reciprocal with their hubs.`);
}

const total = [...links.values()].reduce((n, s) => n + s.size, 0);
const oneWayTotal = [...oneWay.values()].reduce((n, s) => n + s.size, 0);
console.log(`✓ check-crosslinks: ${total} reciprocal cross-link(s) across ${scanned} pages, plus ${oneWayTotal} one-way link(s) from ${oneWay.size} world-clock page(s), all resolving.`);
