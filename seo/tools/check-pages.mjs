#!/usr/bin/env node
/* check-pages.mjs — the "fail safely" gate (roadmap #6). Runs LAST in
 * `npm run build`, so if any generated page came out empty, truncated, or is
 * missing an SEO-critical element, the build exits non-zero. On Cloudflare
 * Pages a non-zero build aborts the deploy and the previous good deployment
 * keeps serving — i.e. we never publish an empty page or a 200 with an empty
 * body. It's a guard against silent breakage (a generator writing a partial
 * page WITHOUT throwing); a thrown error already aborts the build on its own.
 *
 * Checks every emitted *.html page:
 *   - file is non-trivial and ends in </html> (not truncated mid-stream)
 *   - has a non-empty <title>
 *   - has real visible <body> text (not a zero-size document)
 * and, for pages meant to be indexed (they carry <link rel="canonical"> and are
 * NOT robots=noindex), additionally:
 *   - a non-empty <meta name="description">
 *   - a non-empty <h1>
 * plus, on every page:
 *   - every application/ld+json block parses
 *   - no double-escaped entity ("&amp;amp;") in the title, description, og:*
 *     tags or any JSON-LD string value
 *
 * Minimal/utility pages (404, the retired /c.html & /widget/ notices, etc.)
 * carry no canonical, so they're held only to the not-empty/not-truncated bar.
 *   node seo/tools/check-pages.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

/* only the published output tree — skip sources, tooling and vendored dirs */
const SKIP_DIRS = new Set(["node_modules", ".git", ".wrangler", ".github", "seo", "assets", "functions", "cloudflare", "docs"]);
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p); }
    else if (e.name.endsWith(".html")) files.push(p);
  }
})(root);

/* ---- the set of internal URLs that actually resolve ----
 * Built from what is on disk (every emitted page and asset) plus the redirect
 * sources in _redirects. An href that matches none of these is a 404 waiting
 * to be crawled — which is exactly how 18 country-page links went on pointing
 * at the retired share-link product long after it was retired. */
const RESOLVES = new Set(["/"]);
const REDIR_PREFIX = [];
(function walkAll(dir, base = "") {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = join(dir, e.name), url = `${base}/${e.name}`;
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) || e.name === "assets") walkAll(p, url); continue; }
    RESOLVES.add(url);
    if (e.name === "index.html") { RESOLVES.add(base + "/"); RESOLVES.add(base || "/"); }
    if (e.name.endsWith(".html")) RESOLVES.add(url.slice(0, -5));   // /terms -> terms.html
  }
})(root);
try {
  for (const line of readFileSync(join(root, "_redirects"), "utf8").split("\n")) {
    const from = line.trim().split(/\s+/)[0];
    if (!from || from.startsWith("#")) continue;
    if (from.endsWith("*")) REDIR_PREFIX.push(from.slice(0, -1)); else RESOLVES.add(from);
  }
} catch { /* no _redirects — then only on-disk paths resolve */ }
/* Functions routes are served by code, not files. */
REDIR_PREFIX.push("/api/");
const resolves = (u) => RESOLVES.has(u) || RESOLVES.has(u.replace(/\/$/, "")) ||
  RESOLVES.has(u + "/") || REDIR_PREFIX.some((p) => u.startsWith(p));

/* strip <script>/<style> then tags, to measure real visible text */
const visibleText = (html) => {
  const body = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html) || [, html])[1];
  return body.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
};
const tagText = (html, re) => { const m = re.exec(html); return m ? m[1].replace(/<[^>]+>/g, "").trim() : null; };

const MIN_BYTES = 500, MIN_VISIBLE = 120;
const problems = [];
for (const f of files) {
  const rel = relative(root, f);
  let html = "";
  try { html = readFileSync(f, "utf8"); } catch (e) { problems.push([rel, `unreadable (${e.message})`]); continue; }
  const fail = (msg) => problems.push([rel, msg]);

  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);

  /* every page (incl. the minimal noindex notices/404) must be a real, complete
   * document — this is what catches an empty file or truncated stream */
  if (html.length < MIN_BYTES) fail(`tiny file (${html.length} B) — likely empty/broken`);
  if (!/<\/html>\s*$/i.test(html.trimEnd() + "")) fail("no closing </html> — truncated output");
  const title = tagText(html, /<title>([\s\S]*?)<\/title>/i);
  if (!title) fail("missing or empty <title>");

  /* indexable pages get the stricter content bar — a real body + description +
   * H1 (this is the zero-document-size guard for the pages that get crawled) */
  if (hasCanonical && !noindex) {
    const vis = visibleText(html);
    if (vis.length < MIN_VISIBLE) fail(`near-empty body (${vis.length} visible chars) — zero-document-size risk`);
    const desc = /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html);
    if (!desc || !desc[1].trim()) fail("indexable page missing a non-empty meta description");
    const h1 = tagText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (!h1) fail("indexable page missing a non-empty <h1>");
    /* AND ITS NAVIGATION. build-inline injects the hamburger by matching the
       .brand div; a page whose brand markup drifts out of that match loses the
       whole site menu and everything else about it still looks right, which is
       exactly how it shipped once. A crawl path and a reader's only way off
       the page are worth a gate. */
    if (!/class="nav-dd menu-dd"/.test(html)) fail("no site navigation — build-inline did not inject the menu into this page's .brand");
  }

  /* AN UNRESOLVED MERGE ISN'T ONLY A CODE PROBLEM — IT IS A PUBLISHED PAGE.
   * Ten hand-maintained pages shipped with an empty "<<<<<<< HEAD / ======= /
   * >>>>>>> origin/main" block sitting in their <head>. The parser treats the
   * stray text as body content, closes <head> early, and every visitor to
   * /about/, /privacy, /404 and seven others read a line of conflict markers
   * above the logo. Nothing else here could catch it: the title, the body, the
   * description and the nav were all perfectly fine. */
  if (/^(<{7}|={7}|>{7})[ \t]/m.test(html) || /^={7}$/m.test(html))
    fail("unresolved merge-conflict markers in the emitted page");

  /* Every page build-inline handles must carry its own <style data-ac="css">.
   * A page still holding the raw <link rel="stylesheet"> means a generator ran
   * WITHOUT build-inline afterwards — which is easy to do by hand (running one
   * generator to test it strips the inlined CSS from all of its pages) and ships
   * a render-blocking request on a site whose whole design is that there are
   * none. The pages genuinely outside build-inline's list (the /admin/
   * dashboards) carry their own <style> and no link, so they pass too. */
  if (/<link[^>]+rel=["']stylesheet["'][^>]*href=["']\/assets\/css\/style\.css/i.test(html))
    fail("still links /assets/css/style.css — build-inline did not run over it (run the full `npm run build`)");

  /* Every ld+json block must parse, and nothing search-facing may carry a
   * DOUBLE-escaped entity. A generator that hands an already-escaped string to
   * a head() that escapes again produces "&amp;amp;" — which renders literally
   * in the browser tab, in Google's result, in the JSON-LD name and in the text
   * drawn into the /api/og social card. It shipped on 1,103 simulator city
   * pages and nothing here could see it, because the page is otherwise
   * perfectly well-formed. The signature is an entity whose "&" is itself
   * encoded, so that is exactly what is matched. */
  /* THE PERFORMANCE BUDGET. Every page ships self-contained, so a bug that
   * bloats the inliner bloats every page silently — the multiplying footer
   * got to thirteen copies before anyone looked, and a doubled script block
   * would read the same way. The largest legitimate page today is /planets/
   * at ~292KB; 400KB is a third above that. A page that trips this is a bug
   * or a page that has genuinely outgrown one URL — either way, a decision,
   * not a deploy. (Raw bytes, not gzipped: the ratio is stable, and raw is
   * what the gate can measure for 4,000 pages in milliseconds.) */
  const BUDGET_HTML = 400 * 1024;
  if (html.length > BUDGET_HTML) fail(`page is ${(html.length / 1024).toFixed(0)}KB — over the ${BUDGET_HTML / 1024}KB budget (biggest legitimate page is ~292KB; a jump this size is usually an injection bug)`);

  /* THE FOOTER MUST NOT MULTIPLY. build-inline strips the injected footer
   * paragraphs and re-adds them on every run; a non-global strip against the
   * two-paragraph insert once left one extra pair behind PER BUILD, and the
   * hand-maintained pages (rewritten in place rather than regenerated) piled
   * up thirteen copies of the sitelinks block before anyone noticed. The
   * injection is supposed to be idempotent — this makes that a gate instead
   * of a comment. */
  const countOf = (re) => (html.match(re) || []).length;
  if (countOf(/class="footer sitelinks"/g) > 2) fail(`footer sitelinks injected ${countOf(/class="footer sitelinks"/g)} times — build-inline's strip is not idempotent`);
  if (countOf(/class="footer copyright"/g) > 1) fail("footer copyright injected more than once");
  if (countOf(/class="footer trademark"/g) > 1) fail("footer trademark injected more than once");

  const DOUBLE_ESC = /&amp;(?:amp|quot|lt|gt|apos|#\d+|#x[0-9a-f]+);/i;
  if (title && DOUBLE_ESC.test(title)) fail(`double-escaped entity in <title>: ${title.slice(0, 80)}`);
  const desc0 = /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html);
  if (desc0 && DOUBLE_ESC.test(desc0[1])) fail("double-escaped entity in <meta name=description>");
  for (const m of html.matchAll(/<meta[^>]+property=["']og:(title|description|site_name)["'][^>]*content=["']([^"']*)["']/gi))
    if (DOUBLE_ESC.test(m[2])) fail(`double-escaped entity in og:${m[1]}`);
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(m[1]); }
    catch (e) { fail(`JSON-LD does not parse: ${e.message}`); continue; }
    /* walk every string VALUE in the graph — a double escape anywhere in it is
       a name/description a search engine will show back verbatim */
    (function walk(v) {
      if (typeof v === "string") { if (DOUBLE_ESC.test(v)) fail(`double-escaped entity in JSON-LD value: ${v.slice(0, 80)}`); return; }
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === "object") Object.values(v).forEach(walk);
    })(data);
  }

  /* every internal href must resolve to something we actually publish */
  const bad = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\shref=["'](\/[^"'#?]*)[^"']*["']/gi)) {
    const u = m[1];
    if (!resolves(u)) bad.add(u);
  }
  /* A template interpolating a missing value produces a RELATIVE href that
     resolves against the page's own directory — /birthday-countdowns/<slug>/
     plus "undefined". Those never start with "/", so the absolute check above
     cannot see them, and 21 of them shipped on six birthday pages. */
  for (const m of html.matchAll(/<a\b[^>]*\shref=["'](undefined|null|NaN|\[object [A-Za-z]+\])["']/gi))
    bad.add(m[1] + " (a template interpolated a missing value)");
  for (const u of [...bad].slice(0, 5)) fail(`internal link goes nowhere: ${u}`);

  /* THE SAME DESTINATION MUST NOT PILE UP IN BODY COPY. Chrome links one URL
   * once per surface by design (menu, footer, crumb); body copy that links
   * the same href four or more times is a pattern that drifted — the sun
   * city pages reached four near-identical moon links and the day/night map
   * five "Earth's orbit"s before anyone counted. Chrome and scripts are
   * stripped first so the gate measures only what an author wrote into the
   * page. Fragments and queries distinguish: /x/#a and /x/?d=1 are different
   * intents, not repeats. */
  const bodyOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<details class="nav-dd[\s\S]*?<\/details>/g, "")
    .replace(/<!--bd-->[\s\S]*?<!--\/bd-->/g, "")
    .replace(/<nav class="brand-crumbs"[\s\S]*?<\/nav>/g, "")
    .replace(/<nav class="sol-crumbs"[\s\S]*?<\/nav>/g, "")
    .replace(/<nav class="(?:home-tabs|sec-switch)[^"]*"[\s\S]*?<\/nav>/g, "")
    .replace(/<p class="footer[\s\S]*?<\/p>/g, "");
  const hrefCount = new Map();
  for (const m of bodyOnly.matchAll(/<a\b[^>]*\shref=["'](\/[^"']*)["']/gi))
    hrefCount.set(m[1], (hrefCount.get(m[1]) || 0) + 1);
  for (const [u, n] of hrefCount)
    if (n >= 4) fail(`body links ${u} ${n} times — one destination, one link (or at most a contextual echo); fold the extras`);
}

if (problems.length) {
  console.error(`✗ check-pages: ${problems.length} problem(s) across ${files.length} page(s) — build ABORTED so the last good deploy stays live:`);
  for (const [rel, msg] of problems.slice(0, 100)) console.error(`  ${rel} — ${msg}`);
  if (problems.length > 100) console.error(`  … and ${problems.length - 100} more`);
  process.exit(1);
}
console.log(`✓ check-pages: all ${files.length} pages have a title, real body content, inlined CSS, no merge-conflict markers, parsing JSON-LD with no double-escaped entities, and (where indexable) a description, an H1 and the site nav.`);
