/* build-inline.mjs — inline the shared CSS and per-page JS into every page so
 * the browser makes no render-blocking requests for them.
 *
 * Source of truth stays in assets/css/style.css and assets/js/*.js; this step
 * copies their contents into the HTML. It is idempotent: the injected blocks
 * are tagged with data-ac="css|js", so re-running replaces them in place
 * rather than stacking up. Run it with `npm run build` before committing/
 * deploying.
 *
 * Why inline (not <link>/<script src>): the site is tiny, the per-event result
 * page is the hot path, and a single self-contained document paints without
 * waiting on extra round-trips. The async Google Analytics tag is left external
 * on purpose — it's third-party and already non-blocking.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { ico, faviconSvg } from "./icons.mjs";
import { UNITS_JS, UNITS_MENU_ITEM } from "./units.mjs";
import { LOCALTIME_JS } from "./localtime.mjs";
import { POPOUT_JS, SUN_ICON_DEFS } from "./lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const popular = JSON.parse(await readFile(path.join(root, "seo/_data/popular-countdowns.json"), "utf8"));
const { countries } = JSON.parse(await readFile(path.join(root, "seo/_data/countries.json"), "utf8"));
const { readFileSync } = await import("node:fs");
const { loadEvents, GA_SNIPPET, timerSlug, alarmTimes } = await import("./lib.mjs");
const { composeCss, SECTIONS, sectionsNeeded, PARTS } = await import("./css-parts.mjs");
const timers = JSON.parse(await readFile(path.join(root, "seo/_data/timers.json"), "utf8"));
const timerSlugs = [...timers.durations.map(timerSlug), ...timers.useCases.map((u) => u.slug)];
const { flag } = await import("./flags.mjs");
const { moonFaceSprite } = await import("./moon-face.mjs");
const events = loadEvents(readFileSync, path.join, root);
/* Single source of truth for the production origin (used in canonical/og:url,
 * the sitemap and robots). Change seo/_data/site.json + rebuild to switch
 * domains — the rewrites below replace whatever origin is currently baked in,
 * so re-pointing works even after a previous domain was applied. */
const SITE = JSON.parse(await readFile(path.join(root, "seo/_data/site.json"), "utf8")).origin;

/* Rewrite just the scheme+host of the canonical and og:url tags, keeping the path. */
const setHtmlOrigin = (html) => html
  .replace(/(<link rel="canonical" href=")https?:\/\/[^/"]+/g, `$1${SITE}`)
  .replace(/(<meta property="og:url" content=")https?:\/\/[^/"]+/g, `$1${SITE}`);

/* Every HTML file gets the stylesheet inlined. */
const HTML = [
  "index.html", "countdown/index.html", "c.html", "terms.html", "privacy.html", "404.html", "not-found.html",
  "time/index.html", "earth/index.html", "space/index.html",
  "how-it-works/index.html", "about/index.html", "about/work-with-us/index.html", "sponsors/index.html", "browser-limitations/index.html", "report/index.html", "wrong-date/index.html",
  "suggest-event/index.html",
  "calendar/index.html", "popular/index.html", "trending/index.html", "widget/index.html",
  "classroom/index.html", "classroom/lessons/index.html", "classroom/distance-units/index.html",
  "classroom/submit-a-lesson/index.html",
  ...(await import("./build-classroom.mjs")).CLASSROOM_SUBJECTS.map((s) => `classroom/${s}/index.html`),
  ...(await import("./build-classroom.mjs")).LESSON_PAGES.map((s) => `classroom/lessons/${s}/index.html`),
  ...(await import("./build-classroom.mjs")).LESSON_STUDENT_PAGES.map((s) => `classroom/lessons/${s}/student/index.html`),
  "sun-moon-earth-movement-simulator/index.html", "earth-sun-moon-orbit-simulator/index.html",
  "orbital-velocity-simulator/index.html", "orbital-velocity-simulator/why-planets-dont-fall-into-the-sun/index.html",
  ...(await import("./build-simulator.mjs")).SIM_SLUGS.map((s) => `sun-moon-earth-movement-simulator/${s}/index.html`),
  /* the solar + rocket pages, from the list the generator recorded as it wrote
     them — the planet pages are flat URLs now, so no pattern here could be
     right for long */
  ...(await import("./build-solar.mjs")).SOLAR_URLS.map((u) => `${u.slice(1)}index.html`),
  "planets/index.html", "day-night-map/index.html", "glossary/index.html",
  ...(await import("./concepts.mjs")).CONCEPT_SLUGS().map((s) => `concepts/${s}/index.html`),
  "methodology/index.html", "methodology/sunrise-sunset/index.html", "methodology/moon-phase/index.html",
  "methodology/tide-predictions/index.html", "methodology/time-zones/index.html", "methodology/browser-timing/index.html",
  "stopwatch/index.html", "stopwatch/multiple/index.html", "timer/index.html", "world-clock/index.html", "alarm-clock/index.html", "alarm-clock/about/index.html", "alarm-clock/warnings/index.html",
  "time-difference-calculator/index.html",
  /* the 12/24-hour converter. CONV_SLUGS comes from clock-convert.mjs, which has
     no side effects — importing the generator would re-run all 49 pages here. */
  "24-hour-clock-converter/index.html",
  ...(await import("./clock-convert.mjs")).CONV_SLUGS.map((s) => `24-hour-clock-converter/${s}/index.html`),
  ...(await import("./build-world-clock.mjs")).WC_CITIES.map((c) => `world-clock/${c.slug}/index.html`),
  "tides/index.html", "tides/biggest-tides/index.html", "tides/near-me/index.html",
  "sun/index.html",
  ...(await import("./build-sun.mjs")).SUN_ALL.map((c) => `sun/${c.slug}/index.html`),
  ...(await import("./build-sun.mjs")).SUN_STATES.map((s) => `sun/state/${s.slug}/index.html`),
  "sun/anywhere/index.html", "sun/near-me/index.html",
  "moon/index.html", "moon/full-moon-calendar/index.html", "moon/near-me/index.html",
  "moon/eclipses/index.html", "moon/supermoons/index.html", "moon/blue-moons/index.html",
  ...(await import("./build-eclipses.mjs")).ECLIPSE_SLUGS.map((s) => `moon/eclipses/${s}/index.html`),
  "moon/calendar/index.html",
  ...(await import("./build-moon.mjs")).MOON_YEARS.map((y) => `moon/${y}/index.html`),
  ...(await import("./build-moon.mjs")).CAL_SLUGS.map((sl) => `moon/calendar/${sl}/index.html`),
  ...(await import("./build-sun.mjs")).SUN_ALL.map((c) => `moon/${c.slug}/index.html`),
  ...(await import("./build-sun.mjs")).SUN_STATES.map((st) => `moon/state/${st.slug}/index.html`),
  ...(await import("./tide-stations.mjs")).TIDE_STATIONS.map((s) => `tides/${s.slug}/index.html`),
  ...(await import("./tide-stations.mjs")).tideStatePages().map((p) => `tides/${p.slug}/index.html`),
  ...(JSON.parse(await readFile(path.join(root, "seo/_data/tide-destinations.json"), "utf8")).destinations || []).map((d) => `tides/${d.slug}/index.html`),
  ...alarmTimes().map((t) => `alarm-clock/${t.slug}/index.html`),
  ...timerSlugs.map((s) => `timer/${s}/index.html`),
  ...popular.categories.map((c) => `${c.hub}/index.html`),
  ...popular.categories.map((c) => `${c.hub}/popular/index.html`),
  "countries/index.html",
  ...countries.map((c) => `countries/${c.code}/index.html`),
  ...events.map((e) => `${e.urlPath.replace(/^\//, "")}index.html`),
];

/* Pages that also bundle JS modules (concatenated in dependency order: the
 * libraries attach to window first, the page controller runs last). */
const BUNDLES = {
  /* index.html is the portal (links only, no form) — CSS-inlined, no JS bundle */
};
/* rich event pages just need the effects engine (for the celebrate-on-the-day
 * burst); their countdown logic is a small self-contained inline script. */
for (const e of events) BUNDLES[`${e.urlPath.replace(/^\//, "")}index.html`] = ["effects"];
/* (the 420 novelty countdowns and the /work/ office countdowns sat here until
 * they were retired in August 2026 — see _redirects for where their URLs go.) */
/* every tides page (hub + stations) ships the one tides controller. The
 * /tides/near-me/ page is a plain router (nearest-list only, no chart), so it
 * doesn't load tides.js.
 * "moon" (GENERATED by build-moon.mjs from seo/tools/moon.mjs) must come FIRST:
 * tides.js reads window.AC_MOON for the station's phase, so the pages now quote
 * the same Meeus figures /moon/ does instead of tides.js's old mean-synodic
 * approximation, which could be most of a day out. */
const TIDE_JS = ["moon", "tide-chart", "tides"];
BUNDLES["tides/index.html"] = TIDE_JS;
for (const s of (await import("./tide-stations.mjs")).TIDE_STATIONS) BUNDLES[`tides/${s.slug}/index.html`] = TIDE_JS;
for (const d of (JSON.parse(await readFile(path.join(root, "seo/_data/tide-destinations.json"), "utf8")).destinations || [])) BUNDLES[`tides/${d.slug}/index.html`] = TIDE_JS;

/* how many pages use each bundle — a bundle on one page is cheaper inline */
const bundleUse = new Map();
for (const names of Object.values(BUNDLES)) { const k = names.join("-"); bundleUse.set(k, (bundleUse.get(k) || 0) + 1); }
const bundleShared = (names) => bundleUse.get(names.join("-")) > 1;

const CSS_RE = /<link rel="stylesheet" href="\/assets\/css\/style\.css">|<style data-ac="css">[\s\S]*?<\/style>/;
/* The generator's own empty placeholder for a page opted into DEFER_CSS (see
   styleTagFor), OR the already-filled form from a previous build-inline run —
   matches both so a rebuild replaces rather than appends. */
const CSS_DEFER_RE = /<style data-ac="css-defer">[\s\S]*?<\/style>/;
/* Matches the generator's own tags, the inlined form, AND the hoisted
   `<script defer src>` form, so re-running build-inline over an already-built
   tree replaces the bundle rather than appending a second copy. */
const JS_RE  = /(?:[\t ]*<script (?:defer )?src="\/assets\/js\/[^"]+"><\/script>\s*)+|[\t ]*<script data-ac="(?:js|shared)"[^>]*>[\s\S]*?<\/script>\s*/;

/* keep a literal </script> in bundled code from closing our inline tag early */
const safe = (js) => js.replace(/<\/script/gi, "<\\/script");

async function bundle(names) {
  const parts = [];
  for (const n of names) {
    const src = await readFile(path.join(root, "assets/js", `${n}.js`), "utf8");
    parts.push(`/* ${n}.js */\n${src.trim()}`);
  }
  return parts.join("\n\n");
}

/* Conservative minify: drop comments, leading indentation, trailing spaces and
 * blank lines. It never touches whitespace inside a declaration, so strings,
 * url(...) data-URIs and calc() are left intact. (No literal "/*" appears
 * inside the percent-encoded data-URIs, so comment stripping is safe.) */
const minifyCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[\t ]+/gm, "").replace(/[\t ]+$/gm, "").replace(/\n{2,}/g, "\n").trim();

/* ---- per-page CSS: only the sections a page actually renders ----------------
 * The stylesheet is a list of section parts (css-parts.mjs). Which sections a
 * page needs is decided by PROBING ITS OWN MARKUP for that widget's class
 * families rather than from a hand-kept path list — a path list rots silently
 * the moment a generator puts a card somewhere new, and this map has already
 * surprised me twice: the homepage renders the alarm clock AND a tide card, and
 * /work/ reuses the home dashboard's mc-* mini-cards.
 *
 * Every probe matches markup present in the SERVED HTML, never a class a script
 * adds later, so a page can't be handed CSS whose only trigger appears at
 * runtime. `core` is unconditional.
 *
 * `themes` is deliberately never selected: only the per-event pages apply a
 * theme and they bake their own single palette inline, so the ~12KB of shared
 * palettes would be dead weight everywhere (this matches the old build). */
const SECTION_PROBES = {
  seg: /class="[^"]*\b(seg-screen|seg-dot|seg-label)\b|class="[^"]*\bdig\b/,
  tools: /class="[^"]*\b(tool-card|tool-controls|tool-time|laps|lap-stats|lap-head|sw-)\b/,
  alarm: /class="[^"]*\bac-(clock|controls|batt|right|alarms|alarm-row|ampm|time|left)\b|id="ac-(stage|panel|close)"/,
  egg: /class="[^"]*\begg(-wrap)?\b/,
  worldclock: /class="[^"]*\bwc-/,
  home: /class="[^"]*\b(mc-|tc-big|tc-sw|tc-alarm|tc-timer|pc-card|home-hero|home-sechead|home-classcard|sec-switch|home-lede)/,
  search: /class="[^"]*\btd-(qrow|qgo|saved-wrap|panel|myhead)\b/,
  /* the /timer/ hub's multi-timer board. It sat in the same source block as
     the tides search row, so it was mis-tagged `search` and the hub — which
     matches no td-* probe — shipped the board with no CSS at all. */
  multitimer: /class="[^"]*\bmt-/,
  /* the countdown display itself: the cd- stage on event and country pages,
     plus the .clock/.unit digit boxes. (cd420-/leaf420/h420 went with the 420
     pages, and the /work/ widgets with the office countdowns, in August 2026.) */
  countdown: /class="[^"]*\bcd-|class="[^"]*\b(clock|unit|zero)\b/,
  /* the /work/ dashboard widgets and the boss screen */
  work: /class="[^"]*\b(mc-widget|mc-hub-grid|mc-hub-item|mc-actions|boss-screen|mc-pip)\b/,
  /* Document Picture-in-Picture button (timer + stopwatch pages only) */
  popout: /class="[^"]*\bac-popbtn\b|id="[a-z-]*-pop"/,
  /* /sun/ page furniture: stat tiles, dial, year chart, golden hour, hub minis */
  sun: /class="[^"]*\bsun-|id="(sun-arc|sun-mypanel|sun-results|home-sun-grid)"/,
  /* the Sun-Earth-Moon view, on /sun/ and /moon/ place pages alike — the
     solar-system pages, whose sol-* furniture was cut from the same part —
     and the sys-* Earth/moon-round-the-sun schematic on
     /earth-sun-moon-orbit-simulator/ */
  orrery: /class="[^"]*\b(orr|sol|sys|ov|dn)\b/,
  /* event-page media furniture (works chips, songs, artist module) */
  event: /class="[^"]*\b(works-links|work-name|song-list|song-row|media-tile|media-grid|amm-|give-cta|give-line)/,
  tides: /class="[^"]*\btd-(chartsvg|table|tablewrap|sunline|nearme|none|summary-card|err|beta)\b|class="[^"]*\btide-(today|figure|curve)\b|id="td-/,
  hiw: /class="[^"]*\bhiw-/,
  moon: /class="[^"]*\bmn-(hero|next|nextgrid|rise|strip|day|table|tablewrap|stats|badge|lead|county|county-h|cal|cal-g|cal-day|cal-dow)\b/,
  /* the /time-difference-calculator/ result readout — its form reuses .ac-form
     (core) and its DST note reuses .tool-msg-warn (core), so this is the only
     probe the page needs */
  timediff: /class="[^"]*\btdiff-/,
  /* the 12/24-hour converter's two clocks and its chart — its selects and its
     "Use the time now" button are core form/.btn styling, so the cv- family is
     the whole of what this page needs */
  convert: /class="[^"]*\bcv-/,
  concept: /class="[^"]*\b(kicker|hub-teaser|hub-teasers|hub-qs|hub-kicker|hub-sim|glossary-item|more-info|graphic-block)\b/,
};
{
  const unknown = Object.keys(SECTION_PROBES).filter((s) => !SECTIONS.includes(s));
  if (unknown.length) throw new Error(`SECTION_PROBES names sections no css part provides: ${unknown.join(", ")}`);
}
/* Pages that ship a SECOND <style> block near the end of body, for sections
 * the first screen never needs — home is the only page dense enough with
 * cards for this to matter. Keyed by page rel path -> section names to pull
 * out of the head-blocking <style> into <style data-ac="css-defer">, which
 * the generator places right before the scripts at the end of body. This
 * costs no extra request (still zero render-blocking network fetches, same as
 * every other page) — it only changes WHEN the browser is forced to parse the
 * CSS for cards nobody has scrolled to yet, so first paint stops waiting on
 * it. assertDeferIsSuffix() below is what makes this safe rather than merely
 * convenient: see its comment. */
const DEFER_CSS = {
  /* the landing page carries no tide or moon cards any more; /earth/ inherited
     them, at the bottom of its board, which is exactly the below-the-fold
     position the deferral exists for */
  "earth/index.html": ["tides", "moon"],
};

/* css-parts.mjs's whole safety model rests on every page getting its sections
 * as a SUBSEQUENCE of the original monolith's cascade, never reordered.
 * Splitting the CSS into two <style> blocks only preserves that if the
 * deferred sections were already going to be LAST in that page's cascade —
 * otherwise a critical rule ends up after a deferred one in the DOCUMENT that
 * used to come after it in the SOURCE, and a specificity tie could flip which
 * one wins. This derives the page's actual file-level cascade order from
 * css-parts.mjs's own SPEC (via PARTS) and throws if any deferred section's
 * CSS is followed by so much as one file of a section that stayed critical. */
function assertDeferIsSuffix(rel, secs, defer) {
  if (!defer.length) return;
  const wanted = new Set(secs), deferSet = new Set(defer);
  const order = PARTS.filter(([, sec]) => wanted.has(sec)).map(([, sec]) => sec);
  const firstDeferIdx = order.findIndex((sec) => deferSet.has(sec));
  if (firstDeferIdx === -1) return;
  const bad = order.slice(firstDeferIdx).find((sec) => !deferSet.has(sec));
  if (bad) throw new Error(`${rel}: DEFER_CSS wants [${defer.join(",")}] deferred, but "${bad}" section CSS ` +
    `comes after one of them in the cascade — deferring as-is would reorder rules. Add "${bad}" to the deferred ` +
    `list too, or drop it from DEFER_CSS.`);
}

/* one <style> pair per distinct (section set, deferred set) combo, built once
 * and reused across pages */
const styleTagCache = new Map();
const sectionUse = new Map();
const cssShort = [];
function styleTagFor(html, rel) {
  const secs = ["core"];
  for (const [sec, re] of Object.entries(SECTION_PROBES)) if (re.test(html)) secs.push(sec);
  /* The probes are hand-written regexes and a wrong one ships an unstyled page
     that still renders — the worst kind of bug to notice. sectionsNeeded()
     derives the answer from the CSS's own selectors, so this asserts the
     probes never give a page LESS than it could use. Broader is fine. */
  const missing = [...sectionsNeeded(html)].filter((sec) => !secs.includes(sec));
  if (missing.length) cssShort.push([rel, missing.join(", ")]);

  const defer = (DEFER_CSS[rel] || []).filter((sec) => secs.includes(sec));
  assertDeferIsSuffix(rel, secs, defer);
  const critical = secs.filter((sec) => !defer.includes(sec));

  const key = secs.join("+") + (defer.length ? `|defer:${defer.join(",")}` : "");
  sectionUse.set(key, (sectionUse.get(key) || 0) + 1);
  if (!styleTagCache.has(key))
    styleTagCache.set(key, {
      critical: `<style data-ac="css">${minifyCss(composeCss(critical))}</style>`,
      deferred: defer.length ? `<style data-ac="css-defer">${minifyCss(composeCss(defer))}</style>` : "",
    });
  return styleTagCache.get(key);
}

/* The only pages that render the tool widgets themselves. */
/* main-page visit beacon: one count per browser per day via /api/views (the
 * same KV counter events use). Read back on /admin/stats. */
const PAGEVIEW_IDS = {
  "index.html": "pghome",
  "time/index.html": "pgsectime",
  "earth/index.html": "pgsecearth",
  "space/index.html": "pgsecspace",
  "tides/index.html": "pgtides",
  "moon/index.html": "pgmoon",
  "alarm-clock/index.html": "pgalarmclock",
  "timer/index.html": "pgtimer",
  "stopwatch/index.html": "pgstopwatch",
  "world-clock/index.html": "pgworldclock",
  "countdown/index.html": "pgcountdown",
  "calendar/index.html": "pgcalendar",
  "popular/index.html": "pgpopular",
  "trending/index.html": "pgtrending",
  /* both simulator hubs. They were the only main pages with no beacon, so
     /admin/stats/ was blind to the two newest families' traffic. */
  "sun-moon-earth-movement-simulator/index.html": "pgsimulator",
  "solar-system-simulator/index.html": "pgsolar",
  "planets/index.html": "pgplanets",
  "classroom/index.html": "pgclassroom",
  "sun/index.html": "pgsun",
};
function injectPageView(html, rel) {
  html = html.replace(/<script data-pgv[\s\S]*?<\/script>\n?/, ""); /* idempotent */
  const id = PAGEVIEW_IDS[rel];
  if (!id) return html;
  const snip = `<script data-pgv="1">(function(){try{if(localStorage.getItem("ac_notrack"))return;}catch(_){}
var vid="";try{vid=localStorage.getItem("ac_vid")||"";if(!vid){vid=Date.now().toString(36)+Math.random().toString(36).slice(2,10);localStorage.setItem("ac_vid",vid);}}catch(_){}
/* sendBeacon, fired at idle: this is a fire-and-forget counter whose reply the
   page discards, so it has no business sitting in the load timeline. sendBeacon
   hands the request to the browser to deliver out-of-band — it does not hold the
   load event open and survives the page being navigated away from, which fetch()
   at parse time did not. fetch is the fallback where sendBeacon is unavailable. */
function pgv(){var u="/api/views?id=${id}"+(vid?"&v="+encodeURIComponent(vid):"");
try{if(navigator.sendBeacon&&navigator.sendBeacon(u))return;}catch(_){}
try{fetch(u,{method:"POST",keepalive:true})["catch"](function(){});}catch(_){}}
if(window.requestIdleCallback)requestIdleCallback(pgv,{timeout:3000});else setTimeout(pgv,800);})();</script>`;
  return html.replace(/<\/body>/, snip + "\n</body>");
}


/* ---- shared top navigation, injected into every page's .brand header ----
 * CSS-only dropdowns (<details>); the one-liner script just closes an open
 * menu when you click elsewhere. Idempotent: any previous .topnav is stripped
 * before re-inserting. */
/* The hamburger menu is now the nav at all widths; this hidden <nav> just keeps
 * the close-on-outside-click script injected idempotently (injectNav strips the
 * old .topnav each build, so the script never duplicates). */
const NAV = `<nav class="topnav"><script>document.addEventListener("click",function(e){document.querySelectorAll(".nav-dd[open]").forEach(function(d){if(!d.contains(e.target))d.removeAttribute("open")})})</script></nav>`;

/* Mobile hamburger menu — hidden on desktop (where .topnav shows the links
 * inline). CSS-only <details>, same pattern as the copy menu; the click-outside
 * script closes it.
 *
 * ONE ENTRY PER SECTION — the seven tools, the two simulators, the teachers'
 * guide, and Countdowns. The individual
 * countdown categories (birthdays, holidays, sports, 420, work, calendar,
 * popular) used to sit here as siblings of the tools, which made the site look
 * like fifteen peers instead of eight sections; they now live one level down,
 * in the category directory on /countdown/ (see build-home.mjs), which every
 * one of them links back to. */
/* Set before first paint so the low-contrast version never flashes, and read
   from the same key the toggle writes. */
const PJ_HEAD = `<script>try{if(localStorage.getItem("ac_pj")==="1")document.documentElement.classList.add("pj")}catch(e){}</script>`;
/* the unit control's script — see units.mjs. It rides with the nav because the
   control does, and because every page has figures it might convert. */
const UNITS_SCRIPT = `<script>${UNITS_JS}</script>`;
const PJ_SCRIPT = `<script>(function(){var b=document.getElementById("ac-pj");if(!b)return;
function sync(){var on=document.documentElement.classList.contains("pj");b.setAttribute("aria-pressed",on?"true":"false");}
sync();b.addEventListener("click",function(){var on=document.documentElement.classList.toggle("pj");
try{on?localStorage.setItem("ac_pj","1"):localStorage.removeItem("ac_pj")}catch(e){}sync();});})();</script>`;

/* ---- the domain-change notice -------------------------------------------
 * The site moved from alarm-clock.org; a person who typed the old address and
 * followed the redirect arrives on a page whose name they have never seen. One
 * line above the logo tells them they are in the right place.
 *
 * It RETIRES ITSELF. A "we moved" banner that outlives the move becomes
 * furniture nobody reads, and the one thing certain about this one is that it
 * should not still be here in a year — so the end date is a constant here
 * rather than a note in the log to remember. Past it NOTICE_ON goes false and
 * the hourly rebuild takes the line off every page on its own.
 *
 * The strip in injectNav runs UNCONDITIONALLY, before that check: the
 * hand-maintained static pages are rewritten in place, so injecting without
 * stripping first is exactly how the projector-mode script reached 48 copies,
 * and stripping only when emitting would freeze the notice onto those pages
 * forever the day it expired. Comment markers rather than a tag match, because
 * the notice holds a button and a script and a non-greedy </div> would cut it
 * in half. */
/* RETIRED 16 August 2026, by the owner: the migration is done and the banner
   had become furniture. NOTICE_ON is false rather than the whole block being
   deleted, because the STRIP in injectNav has to keep running — the
   hand-maintained pages (terms, privacy, about) are rewritten in place, and
   without the strip their copy of the notice would be frozen on them forever.
   Delete all of this only once every page has been rebuilt without it. */
const NOTICE_END = "2026-08-16";   /* the day it was switched off */
const NOTICE_ON = false;
const NOTICE_HEAD = `<script>try{if(localStorage.getItem("ac_nb")==="1")document.documentElement.classList.add("nb-off")}catch(e){}</script>`;
const NOTICE = `<!--nb--><div class="site-notice" id="ac-nb"><p>We've changed our name — <b>alarm-clock.org</b> is now <b>timeandspace.science</b>.<span class="site-notice-sub"> Same tools, same pages, new address.</span></p>` +
  `<button type="button" class="site-notice-x" aria-label="Dismiss this notice"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg></button></div>` +
  `<script>(function(){var b=document.getElementById("ac-nb");if(!b)return;var x=b.querySelector(".site-notice-x");if(!x)return;
x.addEventListener("click",function(){document.documentElement.classList.add("nb-off");try{localStorage.setItem("ac_nb","1")}catch(e){}});})();</script><!--/nb-->`;
const NOTICE_RE = /<!--nb-->[\s\S]*?<!--\/nb-->\s*/g;

const MENU = `<details class="nav-dd menu-dd"><summary class="hamburger" aria-label="Menu">☰</summary><ul class="menu">` +
  /* SAME ORDER AS THE HOME PAGE: time, then earth, then space, then the
     classroom. Labels group the flat list under the five-section nav so the
     two navigations stop reading as two sites. Countdowns and the retired
     Big Questions page stay off this list on purpose. */
  `<li class="menu-lab">Time</li>` +
  `<li><a href="/alarm-clock/">${ico("alarm")} Alarm Clock</a></li>` +
  `<li><a href="/world-clock/">${ico("globe")} World Clock</a></li>` +
  `<li><a href="/timer/">${ico("timer")} Timer</a></li>` +
  `<li><a href="/stopwatch/">${ico("stopwatch")} Stopwatch</a></li>` +
  `<li class="menu-lab">Earth</li>` +
  `<li><a href="/sun/">${ico("sunrise")} Sunrise &amp; Sunset</a></li>` +
  `<li><a href="/moon/">${ico("moon")} Moon</a></li>` +
  `<li><a href="/tides/">${ico("wave")} Tides</a></li>` +
  `<li><a href="/sun-moon-earth-movement-simulator/">${ico("earthmoon")} Sun, Earth &amp; Moon</a></li>` +
  `<li class="menu-lab">Space</li>` +
  `<li><a href="/glossary/">${ico("glossary")} Glossary</a></li>` +
  `<li><a href="/planets/">${ico("solar")} The Planets</a></li>` +
  `<li><a href="/solar-system-simulator/">${ico("solar")} Solar System</a></li>` +
  `<li><a href="/orbital-velocity-simulator/">${ico("solar")} Orbits &amp; Gravity</a></li>` +
  `<li><a href="/rocket-launch-simulator/">${ico("rocket")} Rocket Launches</a></li>` +
  `<li class="menu-lab">Classroom</li>` +
  `<li><a href="/classroom/">${ico("classroom")} For Teachers</a></li>` +
  /* THE ONE ACTION IN A MENU OF PLACES, and in the nav on the owner's call:
     collaborating with teachers is a primary task of the site, and a task
     that lives only at the foot of one page is a footnote. It points at a
     real page (/classroom/submit-a-lesson/), not an anchor — a menu row that
     landed mid-scroll on the hub would arrive with no case made. */
  `<li><a href="/classroom/submit-a-lesson/">${ico("plus")} Submit a Lesson Plan</a></li>` +
  /* PROJECTOR MODE lives in the nav because it has to be reachable from every
     page — a teacher turns it on once at the start of a lesson and then moves
     between the timer, the moon and the simulator without thinking about it
     again. It is a toggle, not a link, so it says which state it is in. */
  /* UNITS SIT ABOVE PROJECTOR MODE (owner's call): both are settings rather
     than destinations, so they share the separated block at the foot of the
     menu, and units come first because far more readers will want them than
     will ever project a page onto a wall. */
  `${UNITS_MENU_ITEM(ico)}` +
  `<li><button type="button" class="menu-pj" id="ac-pj" aria-pressed="false">${ico("projector")} <span>Projector mode</span></button></li>` +
  `</ul></details>${PJ_SCRIPT}${UNITS_SCRIPT}`;


function injectNav(html) {
  html = html.replace(NOTICE_RE, "");   /* idempotent, and how the notice retires */
  /* class="brand" may carry a modifier — the home page's bar is .brand
     .brand-titled because it holds that page's H1. Matching the attribute
     exactly meant the home page silently got no navigation at all. */
  return html.replace(/(<div class="brand[^"]*">)([\s\S]*?)(<\/div>)/, (m, a, b, c) => {
    b = b.replace(/<nav class="topnav">[\s\S]*?<\/nav>/, "")
         .replace(/<a class="btn small nav-create"[\s\S]*?<\/a>/, "")
         .replace(/<details class="nav-dd menu-dd">[\s\S]*?<\/details>/, "")
         /* MENU ends with PJ_SCRIPT, but the strip above stops at the first
            </details> — so on a hand-maintained page (privacy, terms, about…),
            which is rewritten in place build after build, the orphaned toggle
            script was left behind and a fresh one appended every time. Those
            pages had accumulated 48 identical copies. Strip every copy. */
         .split(PJ_SCRIPT).join("")
         /* the units script rides along behind it and needs the same treatment,
            for the same reason */
         .split(UNITS_SCRIPT).join("")
         .trimEnd();
    /* ABOVE the bar, not in it: the notice is about the site, not about this
       page, and inside .brand it would become a third flex item competing with
       the logo and the menu. */
    return (NOTICE_ON ? NOTICE : "") + a + b + NAV + MENU + c;
  });
}

/* ---- the lunar near-side sprite ----------------------------------------
 * Every moon glyph is a <use> pointing at one shared drawing, so the maria and
 * craters are paid for ONCE no matter how many moons a page renders (the /moon/
 * hub draws 35).
 *
 * That drawing is now a STATIC FILE, not an inline <defs>. It had grown to
 * 58.8KB and was injected as the first child of <body> on 2,438 pages, so the
 * parser chewed through 58KB of crater geometry before reaching any visible
 * markup — about 8.4KB gzipped, per page, of bytes that are identical
 * everywhere. As a file it is fetched once, cached for a year (see _headers),
 * and shared by every sun, moon and tide page for the rest of the visit. The
 * filename carries a content hash, so a change to the artwork is a new URL and
 * the long cache can never serve a stale one.
 *
 * The rewrite is a plain string replacement over the FINAL html, which matters:
 * glyphs are also created at RUNTIME (the hub redraws its strip for the
 * visitor's own date) and that code is inlined by this same pass, so its
 * "#ac-moon-face" gets pointed at the file too. Idempotent. */
const MOON_SPRITE = moonFaceSprite();
const MOON_SVG_BODY = MOON_SPRITE
  .replace(/^<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">');
const MOON_SVG_HASH = createHash("sha256").update(MOON_SVG_BODY).digest("hex").slice(0, 10);
const MOON_SVG_URL = `/assets/img/moon-face.${MOON_SVG_HASH}.svg`;
{
  /* one file per content hash; older hashes are swept so the tree does not
     accumulate a copy per edit */
  const dir = path.join(root, "assets/img");
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/^moon-face\.[0-9a-f]+\.svg$/.test(f) && f !== path.basename(MOON_SVG_URL)) rmSync(path.join(dir, f));
  writeFileSync(path.join(root, MOON_SVG_URL.slice(1)), MOON_SVG_BODY);
}

/* The same face, pre-rendered small (make-moon-face-raster.mjs, committed).
 * Thumbnail glyphs reference this instead of <use>-ing the 828-element sprite —
 * see the comment in moon.mjs's mnGlyph. Content-hashed on the committed bytes
 * for the same reason the sprite is: a one-year cache needs a new URL, not a
 * new mtime. If the file is absent the token is left alone, which degrades to a
 * face-less disc rather than breaking the build — but the strip goes flat, so
 * say so loudly. */
const MOON_RASTER_SRC = path.join(root, "assets/img/moon-face.webp");
let MOON_RASTER_URL = null;
try {
  const bytes = readFileSync(MOON_RASTER_SRC);
  const h = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  MOON_RASTER_URL = `/assets/img/moon-face.${h}.webp`;
  const dir = path.join(root, "assets/img");
  for (const f of readdirSync(dir)) if (/^moon-face\.[0-9a-f]+\.webp$/.test(f) && f !== path.basename(MOON_RASTER_URL)) rmSync(path.join(dir, f));
  writeFileSync(path.join(root, MOON_RASTER_URL.slice(1)), bytes);
} catch {
  console.warn("! assets/img/moon-face.webp is missing — moon thumbnails will render without the face.\n" +
               "  Regenerate it: npm i --no-save playwright sharp && node seo/tools/make-moon-face-raster.mjs");
}
/* ---- shared page scripts, hoisted out of the HTML ------------------------
 * A <script data-ac="shared" data-name="X"> marks code that is BYTE-IDENTICAL
 * across a whole page family. The /sun/ city controller is 61KB and differs
 * between the ~1,100 cities only in a one-line config object; the /moon/ one is
 * 51KB; the tide bundle is 76KB across ~140 pages. Inlined, that is the single
 * largest gzip cost on the site's largest families, repaid on every page view.
 *
 * Hoisting writes each distinct body once to /assets/js/<name>.<hash>.js and
 * leaves a `defer` tag behind. `defer` runs at the same point in the page
 * lifecycle as an inline script at the end of body, so ordering with the config
 * script above it is preserved and first paint is unchanged — these pages are
 * fully server-rendered and nothing above the fold waits on the script. The
 * hash in the filename is what makes the one-year cache safe: new code is a new
 * URL, and the file does not change when the hourly rebuild re-bakes today's
 * times, so it stays cached across rebuilds too. */
const JS_DIR = path.join(root, "assets/js");
/* KEYED BY NAME **AND** HASH, not by hash alone. The filename carries the name,
   so keying on the hash meant that two families whose scripts happened to be
   byte-identical wrote ONE file — under whichever name came first — while the
   other family's pages kept pointing at a URL with their own name in it that
   nothing had written. A 404 and a dead script, and only on the pages where two
   bodies coincided, which is exactly the case nobody tests. Two identical
   bodies under two names now cost one duplicate file, which is the cheap side
   of that trade. */
const sharedWritten = new Map();   // "name|hash" -> url
const sharedNames = new Set();
function hoistShared(html) {
  return html.replace(/<script data-ac="shared" data-name="([a-z0-9-]+)">([\s\S]*?)<\/script>/g, (m, name, body) => {
    const hash = createHash("sha256").update(body).digest("hex").slice(0, 10);
    const url = `/assets/js/${name}.${hash}.js`;
    const key = `${name}|${hash}`;
    if (!sharedWritten.has(key)) {
      writeFileSync(path.join(root, url.slice(1)), body.trim() + "\n");
      sharedWritten.set(key, url);
      sharedNames.add(name);
    }
    return `<script defer src="${url}"></script>`;
  });
}
/* sweep stale hashes so the tree does not accumulate one file per edit */
function sweepShared() {
  const keep = new Set([...sharedWritten.values()].map((u) => path.basename(u)));
  for (const f of readdirSync(JS_DIR)) {
    const n = /^([a-z0-9-]+)\.[0-9a-f]{10}\.js$/.exec(f);
    if (n && sharedNames.has(n[1]) && !keep.has(f)) rmSync(path.join(JS_DIR, f));
  }
}

function injectMoonSprite(html) {
  /* strip the old inline sprite (idempotent across rebuilds) */
  html = html.replace(/<svg width="0" height="0" style="position:absolute"[\s\S]*?<\/svg>/, "");
  html = html.split('"#ac-moon-face"').join(`"${MOON_SVG_URL}#ac-moon-face"`);
  if (MOON_RASTER_URL) html = html.split('"#ac-moon-raster"').join(`"${MOON_RASTER_URL}"`);
  return html;
}

/* The sun dial's two ring glyphs, defined once per page that draws a dial. The
 * dial emits <use href="#ac-sun-ico">/#ac-moon-ico 24 times per dial (144 times
 * on the home page's six cards); writing the shapes out in full each time was
 * ~108KB of the home page. Injected right after <body> so the defs precede
 * every reference. Idempotent across rebuilds. */
function injectSunIcons(html) {
  html = html.replace(/<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><g id="ac-sun-ico">[\s\S]*?<\/defs><\/svg>/, "");
  if (!html.includes('"#ac-sun-ico"') && !html.includes('"#ac-moon-ico"')) return html;
  return html.replace(/(<body[^>]*>)/, `$1${SUN_ICON_DEFS}`);
}

/* The "It's 5:35 PM in Portland right now" line (seo/tools/localtime.mjs) is
 * emitted by three different generators onto ~2,200 sun, moon and tide pages.
 * Its ticker is injected HERE, once, keyed off the markup itself, so a page can
 * never carry the line without the script that keeps it honest — and no page
 * that lacks the line pays for the script. Idempotent. */
/* window.acPopOut, injected into <head> on any page that calls it. It has to be
 * DEFINED before the page's own inline script runs, which rules out the
 * end-of-body slot injectLocalTime uses; the helper itself touches no DOM until
 * it is called, so <head> is safe. Keyed off the call site so a page that does
 * not pop out never carries it. Idempotent. */
function injectPopout(html) {
  html = html.replace(/<script data-pop="1">[\s\S]*?<\/script>\n?/, "");
  if (!html.includes("acPopOut(")) return html;
  return html.replace(/<\/head>/, `<script data-pop="1">${POPOUT_JS}</script>\n</head>`);
}

function injectLocalTime(html) {
  html = html.replace(/<script data-lt="1">[\s\S]*?<\/script>\n?/, "");
  if (!html.includes('class="lt-line"')) return html;
  return html.replace(/<\/body>/, `<script data-lt="1">${LOCALTIME_JS}</script>\n</body>`);
}

/* Append a "Report abuse" link to every footer (idempotent; the report page
 * itself is skipped). The link carries the page's own canonical URL as
 * ?url=, so /report/'s existing url-prefill (built for the abuse form) also
 * pre-fills it for every page — including Sunrise, Tide and World Clock
 * pages, which have no dedicated error-report page of their own. Read the
 * canonical straight out of the HTML rather than threading it through every
 * call site, since setHtmlOrigin() has already run by this point. */
function injectReportLink(html, rel) {
  if (rel.startsWith("report/")) return html;
  const canon = /<link rel="canonical" href="([^"]+)">/.exec(html);
  const href = canon ? `/report/?url=${encodeURIComponent(canon[1])}` : "/report/";
  return html.replace(/(<p class="footer">)([\s\S]*?)(<\/p>)/, (m, a, b, c) => {
    b = b.replace(/ · <a class="report-link"[\s\S]*?<\/a>/, "");
    return a + b + ` · <a class="report-link" href="${href}">Report abuse</a>` + c;
  });
}

/* "Suggest an event" in every footer (idempotent). The page drops its own
 * self-link. "Promote an event" used to sit beside it — a paid-promotion
 * pitch, retired with the rest of the site's commerce; its link is stripped
 * here as well so a stale footer in a committed page cannot survive a rebuild. */
function injectFooterLinks(html, rel) {
  const sug = rel.startsWith("suggest-event/") ? "" : ` · <a href="/suggest-event/">Suggest an event</a>`;
  const pro = "";
  return html.replace(/(<p class="footer">)([\s\S]*?)(<\/p>)/, (m, a, b, c) => {
    b = b.replace(/ · <a href="\/suggest-event\/">Suggest an event<\/a>/, "")
      .replace(/ · <a href="\/promote-event\/">Promote an event<\/a>/, "");
    /* These separators are appended unconditionally, so a template that emits
       an EMPTY footer rendered a visible dangling "· Suggest an event". Four
       templates did. Both ends are fixed — the templates now carry their own
       Terms/Privacy links, and a leading separator is stripped here so the
       next template to forget cannot render one either. */
    const out = (a + b + sug + pro).replace(/(<p class="footer">)\s*·\s*/, "$1");
    return out + c;
  });
}

/* Standard copyright line under every footer (idempotent: stripped + re-added,
 * so the year refreshes on each rebuild). */
const COPYRIGHT = `\n  <p class="footer copyright">© ${new Date().getFullYear()} Time and Space Science. All rights reserved.</p>`;
function injectCopyright(html) {
  html = html.replace(/\n?\s*<p class="footer copyright">[\s\S]*?<\/p>/g, "");
  return html.replace(/(<p class="footer">[\s\S]*?<\/p>)/, `$1${COPYRIGHT}`);
}

/* ---------------------------------------------------------------------------
 * THE FOOTER SAYS WHAT THE SITE IS FOR.
 *
 * It used to be a row of countdown categories — Political, Sports, Astronomy,
 * Graduations — under every page on the site, including the ~2,900 that are
 * about the sky. Two things were wrong with that. It advertised the part of
 * the site that matters least now; and it said nothing at all about what
 * someone who has just landed here could DO.
 *
 * So the bottom of every page carries two lines instead. The first is the
 * site's actual subject, as links: gravity, motion, time and space are one set
 * of rules seen from different sides, and those are the sides. The second is
 * the invitation — a class can ask for something and be credited for it if it
 * gets built — with an example short enough to fit in a footer.
 *
 * The countdown hub keeps a link, but only from the pages that ARE countdowns.
 * Same for the trademark line: it exists because event pages name trademarks
 * descriptively (Super Bowl, WrestleMania), and a page about sunrise in
 * Portland has never needed it. Both idempotent: stripped and re-added each
 * build, so a change here reaches every page that already exists.
 * ------------------------------------------------------------------------- */
const TOPIC_LINKS = [
  ["/glossary/", "the glossary"],
  ["/sun-moon-earth-movement-simulator/", "the Sun, Earth &amp; Moon"],
  ["/day-night-map/", "day &amp; night on Earth"],
  ["/solar-system-simulator/", "the solar system"],
  ["/planets/", "the planets"],
  ["/orbital-velocity-simulator/", "gravity &amp; orbits"],
  ["/sun/", "sunrise &amp; sunset"],
  ["/moon/", "moon phases"],
  ["/world-clock/", "time zones"],
].map(([u, t]) => `<a href="${u}">${t}</a>`).join(" · ");
/* the countdown family: the hubs, the calendar, the ranking pages, the country
   pages, and every /<something>-countdown[s]/ page */
const EVENT_PAGE = /^(countdown\/|calendar\/|popular\/|trending\/|countries\/|[a-z0-9-]+-countdowns?\/)/;
const HUB_LINK = ` · <a href="/countdown/">event countdowns</a>`;
const TRADEMARK = `\n  <p class="footer trademark">Event names and trademarks are the property of their respective owners. Time and Space Science is not affiliated with or endorsed by any event, league, team, or rights holder.</p>`;
const siteLinks = (rel) =>
  `\n  <p class="footer sitelinks">Gravity, motion, time and space — one set of rules, seen from different sides: ${TOPIC_LINKS}${EVENT_PAGE.test(rel) ? HUB_LINK : ""}</p>`
  + `\n  <p class="footer sitelinks">Built to be taken apart in a classroom, and by anyone else who is curious. Teachers: <a href="/classroom/submit-a-lesson/">send us the lesson you already run</a> and we will build it into a page here, with your name on it — or <a href="/classroom/#ask">ask us to build a simulator</a> your class has thought of. <a href="/classroom/">Classroom</a> · <a href="/about/">About this site</a>.</p>`;
function injectSiteLinks(html, rel) {
  /* GLOBAL, because the injector INSERTS TWO sitelinks paragraphs and a
     non-global strip removed only one. On the generated pages that never
     showed — they are rebuilt from nothing — but the hand-maintained pages
     are rewritten in place, so each build left one extra pair behind and the
     footer quietly multiplied (privacy.html reached thirteen copies).
     check-pages now gates the count, so this class of bug fails the build
     instead of shipping. */
  html = html.replace(/\n?\s*<p class="footer sitelinks">[\s\S]*?<\/p>/g, "");
  html = html.replace(/\n?\s*<p class="footer trademark">[\s\S]*?<\/p>/g, "");
  return html.replace(/(<p class="footer">[\s\S]*?<\/p>)/, `$1${siteLinks(rel)}${EVENT_PAGE.test(rel) ? TRADEMARK : ""}`);
}

/* Site-wide "share an idea" box, injected just above the footer on content
 * pages. It reuses the existing /api/report endpoint with reason "Site idea"
 * (so ideas land in the same Google Sheet / inbox, sorted into their own
 * bucket) and auto-captures the current page URL. Email is optional for ideas
 * (see functions/api/report.js). Idempotent: tagged data-ac="suggest" and
 * stripped before re-inserting. Skipped on the dedicated form pages. */
/* The feedback box. It was headed "How do we make timeandspace.science better? Share
 * an idea", labelled "Your idea", and its button said "Send idea" — a framing
 * that only invites people who think they have a product suggestion. Someone
 * with a QUESTION reads that and decides it is not for them.
 *
 * We know it was doing that, because a visitor used it to ask "How do I choose
 * a sound? It says to choose a sound." — a question, filed as an idea, from a
 * page that genuinely was confusing. That is the most useful message the site
 * has ever received and it arrived in spite of the wording, not because of it.
 *
 * EMAIL COMES FIRST NOW, and that is the other half of the same story: that
 * visitor left it blank, so their question could not be answered — only the
 * page could be fixed. It sits above the message rather than below, where it
 * read as an afterthought you had already skipped past by the time you saw it,
 * and it says what it is FOR ("so we can reply") instead of "optional". Still
 * genuinely optional: nobody is forced to identify themselves to report a
 * problem. */
const SUGGEST =
`<details class="suggest-box" data-ac="suggest">
    <summary>💡 Question, problem or idea? <span class="arrow">Tell us →</span></summary>
    <form class="suggest-form" autocomplete="off">
      <p class="hint" style="margin:0 0 14px">Ask us anything about the tools, tell us what's broken or confusing, or suggest something we're missing. Every message is read by a person.</p>
      <p class="notice">If you are under 13, do not send us your name, email, or any other personal information. If you are under 18, please get a parent or guardian's permission before using this form.</p>
      <label class="cr-check" for="sg-age"><input id="sg-age" name="age_ok" type="checkbox" required> <span>I am 13 or older, and if I am under 18 I have a parent or guardian's permission to send this.</span></label>
      <label for="sg-email">Email <span class="hint" style="display:inline;font-weight:400">(so we can reply — leave blank if you'd rather not)</span></label>
      <input id="sg-email" type="email" placeholder="Your email address">
      <label for="sg-idea">Your question or idea</label>
      <textarea id="sg-idea" maxlength="1000" required placeholder="How do I…? · Something isn't working · A countdown or feature we're missing…"></textarea>
      <input id="sg-hp" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn" id="sg-send" type="submit">Send message</button>
      <p id="sg-note" class="hint suggest-note" role="status"></p>
      <p class="hint" style="margin-top:12px">If you leave an email we'll reply to questions. We can't promise to build every suggestion, but they directly shape what we work on next.</p>
    </form>
  </details>
  <script data-ac="suggest">(function(){var b=document.querySelector('.suggest-box[data-ac="suggest"]');if(!b)return;var f=b.querySelector('.suggest-form'),note=b.querySelector('#sg-note'),btn=b.querySelector('#sg-send');f.addEventListener('submit',function(e){e.preventDefault();if(b.querySelector('#sg-hp').value)return;var idea=b.querySelector('#sg-idea').value.trim();if(!idea){note.textContent='Please add a quick note first.';return;}var age=b.querySelector('#sg-age');if(age&&!age.checked){note.textContent='Please confirm the age notice.';return;}var em=b.querySelector('#sg-email').value.trim();btn.disabled=true;note.textContent='Sending…';fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:location.href,reason:'Site idea',details:idea,email:em,website:''})}).then(function(r){return r.json().catch(function(){return{};});}).then(function(d){if(d&&!d.error){f.reset();note.textContent=em?'Thanks — got it. A reply will go to '+em+'. 🙌':'Thanks — got it. 🙌 (No email given, so this one cannot be answered.)';}else{note.textContent='Sorry, that did not send. Please try again.';btn.disabled=false;}}).catch(function(){note.textContent='Network hiccup — please try again.';btn.disabled=false;});});})();</script>`;
const stripSuggest = (h) => h
  .replace(/\s*<details class="suggest-box"[\s\S]*?<\/details>/, "")
  .replace(/\s*<script data-ac="suggest">[\s\S]*?<\/script>/, "")
  .replace(/\s*<p class="suggest-link"[\s\S]*?<\/p>/, "");
function injectSuggestBox(html, rel) {
  html = stripSuggest(html); /* idempotent: drop any previously injected box */
  if (rel.startsWith("report/") || rel.startsWith("suggest-event/")) return html;
  /* Countdown/event pages: a child often opened these. Keep a link, not the
     age-gated form. Content and classroom pages keep the full box. */
  if (EVENT_PAGE.test(rel)) {
    return html.replace(/(<p class="footer">)/, `<p class="suggest-link" data-ac="suggest"><a href="/report/">Question, problem or idea? Tell us.</a></p>\n  $1`);
  }
  return html.replace(/(<p class="footer">)/, `${SUGGEST}\n  $1`);
}

/* ---- GDPR/CCPA privacy notice, injected on every page ----
 * Geo-detection can't happen at build time, so the inlined script asks the
 * existing /api/geo endpoint (already reads Cloudflare's edge `request.cf`,
 * no external lookup) for the visitor's country/region on first load, and
 * only unhides the banner for a qualifying visitor. Consent is remembered in
 * localStorage ("ac_consent") so it shows at most once per visitor/browser.
 * EEA (EU 27 + Iceland/Liechtenstein/Norway) + UK + Switzerland get the
 * GDPR-style opt-in gate (Accept/Reject) since EU/UK law requires consent
 * before non-essential analytics run; California gets the CCPA/CPRA-style
 * opt-out notice ("Do Not Sell or Share..."), since that regime defaults to
 * allowed-unless-you-object rather than blocked-until-accepted.
 * GA4 itself is delivered via Cloudflare Zaraz (edge-side, configured in the
 * Cloudflare dashboard, not in this repo — see lib.mjs's GA_SNIPPET comment),
 * so the accept/reject/opt-out handlers call Zaraz's consent API
 * (window.zaraz.consent), guarded to a no-op if Zaraz or its Consent
 * Management feature isn't present/enabled — same defensive pattern already
 * used for zaraz.track() elsewhere on the site. */
const GDPR_REGIONS = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","GB","CH"];
const PRIVACY_HTML = `<div class="privacy-notice" id="ac-privacy" hidden role="region" aria-label="Privacy notice"><p class="privacy-text" id="ac-privacy-text"></p><span class="privacy-actions" id="ac-privacy-actions"></span><button type="button" class="privacy-close" id="ac-privacy-x" aria-label="Dismiss">×</button></div>`;
const PRIVACY_JS = `<script data-ac="privacy">(function(){
  try{if(localStorage.getItem("ac_consent"))return;}catch(_){}
  var GDPR=${JSON.stringify(GDPR_REGIONS)};
  /* "dismissed" stores the choice-not-to-choose: the strip stops nagging, no
   * consent is recorded (so under GDPR analytics consent stays not-granted). */
  function setConsent(v){
    try{localStorage.setItem("ac_consent",v);}catch(_){}
    try{if(v!=="dismissed"&&window.zaraz&&zaraz.consent){zaraz.consent.set({analytics:v==="granted"});zaraz.consent.sendQueuedEvents&&zaraz.consent.sendQueuedEvents();}}catch(_){}
    var el=document.getElementById("ac-privacy");if(el)el.hidden=true;
  }
  function show(g){
    if(!g||!g.country)return;
    var isGdpr=GDPR.indexOf(g.country)>-1, isCcpa=g.country==="US"&&g.region==="CA";
    if(!isGdpr&&!isCcpa)return;
    var el=document.getElementById("ac-privacy"),txt=document.getElementById("ac-privacy-text"),act=document.getElementById("ac-privacy-actions");
    if(!el)return;
    if(isGdpr){
      txt.textContent="Allow Google Analytics? EU/UK law requires consent for analytics.";
      act.innerHTML='<button type="button" id="ac-priv-a">Accept</button><button type="button" class="plain" id="ac-priv-r">Reject</button><a href="/privacy">Privacy</a>';
      document.getElementById("ac-priv-a").onclick=function(){setConsent("granted");};
      document.getElementById("ac-priv-r").onclick=function(){setConsent("denied");};
    }else{
      txt.textContent="This site uses Google Analytics.";
      act.innerHTML='<a href="#" id="ac-priv-o">Do Not Sell or Share My Personal Information</a><a href="/privacy">Privacy</a>';
      document.getElementById("ac-priv-o").onclick=function(ev){ev.preventDefault();setConsent("denied");};
    }
    document.getElementById("ac-privacy-x").onclick=function(){setConsent("dismissed");};
    el.hidden=false;
  }
  /* ONE lookup per visitor, not one per page view. This notice is site-wide, so
     the fetch was firing on every page — including /timer/ and /stopwatch/,
     which have nothing regional about them. The visitor's country does not
     change between two page views, so it is cached and reused; only a visitor
     who has neither answered the notice nor been looked up yet costs a request.
     Deferred to idle as well, so even that one never sits in the load timeline
     (it decides whether to show a banner, nothing above the fold waits on it).
     The cache carries a 7-day expiry rather than living forever: this signal
     decides whether a consent gate is legally required, and someone who first
     visited from outside the EEA and has since travelled into it must not be
     held to a stale answer. Seven days keeps it one request per visitor per
     week, which is already ~zero. */
  var cached=null;
  try{
    var raw=JSON.parse(localStorage.getItem("ac_geo")||"null");
    if(raw&&raw.t&&(Date.now()-raw.t)<6048e5) cached=raw;
  }catch(_){}
  function go(){
    if(cached&&cached.country){show(cached);return;}
    fetch("/api/geo").then(function(r){return r.ok?r.json():null;}).then(function(g){
      if(!g||!g.country)return;
      try{localStorage.setItem("ac_geo",JSON.stringify({country:g.country,region:g.region,t:Date.now()}));}catch(_){}
      show(g);
    })["catch"](function(){});
  }
  if(window.requestIdleCallback)requestIdleCallback(go,{timeout:2500});else setTimeout(go,700);
})();<\/script>`;
function injectPrivacyNotice(html) {
  html = html.replace(/\s*<div class="privacy-notice"[\s\S]*?<\/div>\n?/, "");
  html = html.replace(/\s*<script data-ac="privacy">[\s\S]*?<\/script>\n?/, "");
  return html.replace(/<\/body>/, `${PRIVACY_HTML}\n${PRIVACY_JS}\n</body>`);
}

/* ---- build identifier, stamped into every page ----
 * One comment per page: the git commit the build ran from + when it ran.
 * This is the audit trail for "is every page being served from the same
 * deployment?" — fetch any two pages, compare stamps. On Cloudflare Pages
 * builds CF_PAGES_COMMIT_SHA is the deployed commit; locally we ask git
 * (the stamp then names the parent of the commit that will carry the
 * regenerated HTML — close enough to answer the only question the stamp
 * exists for). Idempotent: any prior stamp is stripped first. */
import { execSync } from "node:child_process";
const BUILD_SHA = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12)
  || (() => { try { return execSync("git rev-parse --short=12 HEAD", { cwd: root }).toString().trim(); } catch { return "unknown"; } })();
const BUILD_STAMP = `<!-- build ${BUILD_SHA} · generated ${new Date().toISOString()} -->`;
function injectBuildStamp(html) {
  html = html.replace(/<!-- build \S+ · generated [^>]*-->\n?/g, "");
  return html.replace(/<\/head>/, `${BUILD_STAMP}\n</head>`);
}

/* Google Analytics on every page: strip any existing gtag snippet (and a
 * leftover AdSense loader, removed for now) so the ID lives only in lib.mjs,
 * then insert the current snippet just before </head>. Idempotent. */
/* Matches both the old two-tag GA (async loader + inline config) and the new
 * single-tag deferred GA (inline config that lazy-loads gtag.js), so re-running
 * always strips every prior copy before inserting one fresh snippet. */
const GA_RE = /(?:<!--[^>]*Google[^>]*-->\s*)?(?:<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]*"><\/script>\s*)?<script>\s*window\.dataLayer=window\.dataLayer\|\|\[\][\s\S]*?gtag\('config'[\s\S]*?<\/script>\s*/g;
const ADS_RE = /<script[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/[^"]*"[^>]*><\/script>\s*/g;
/* Per-page favicons: the browser tab shows the same glyph as the hamburger
 * menu item for that tool, instead of the alarm-clock mark everywhere. One
 * file per icon actually assigned below, written from the same G table the
 * menu draws from (icons.mjs) so the two can't drift apart.
 *
 * FAVICON_RULES is checked in order, most specific prefix first; a page that
 * matches nothing keeps the site's alarm-clock mark (/favicon.svg) — that's
 * the safe default for the home page, static/legal pages, and anything new
 * nobody has assigned an icon to yet. Countdown hub folders (birthday-
 * countdowns/, holiday-countdowns/, …) are derived from popular.categories
 * rather than hand-listed, so a new category picks up the rule for free. */
const COUNTDOWN_ICON_HUBS = popular.categories.map((c) => c.hub);
const { planetPath: _planetPath } = await import("./solar-pages.mjs");
const SOLAR_PLANET_PREFIXES = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]
  .map((slug, i) => [_planetPath(slug, i).slice(1), slug === "earth" ? "earthmoon" : "solar"]);
const FAVICON_RULES = [
  ["sun-moon-earth-movement-simulator/", "earthmoon"],
  ["planets/", "solar"],
  ["solar-system-simulator/", "solar"],
  ["orbital-velocity-simulator/", "solar"],
  ["rocket-launch-simulator", "rocket"],
  /* the planet pages are FLAT now (/jupiter-and-moons-simulator/), so the
     solar-system-simulator/ prefix above no longer reaches them. Derived from
     the registry rather than nine hand-typed prefixes, so a planet whose URL
     changes keeps its icon. Earth's own page is the Earth-and-Moon view, so it
     takes the earthmoon glyph the sibling simulator uses. */
  ...SOLAR_PLANET_PREFIXES,
  ["classroom/", "classroom"],
  ["timer/", "timer"],
  ["stopwatch/", "stopwatch"],
  ["world-clock/", "globe"],
  ["time-difference-calculator/", "globe"],
  ["24-hour-clock-converter/", "clock24"],
  ["sun/", "sunrise"],
  ["moon/", "moon"],
  ["tides/", "wave"],
  ["methodology/", "gear"],
  ["work/", "briefcase"],
  ["calendar/", "calendar"],
  ["countdown/", "confetti"],
  ["countries/", "confetti"],
  ...COUNTDOWN_ICON_HUBS.map((h) => [`${h}/`, "confetti"]),
];
function faviconIconFor(rel) {
  for (const [prefix, name] of FAVICON_RULES) if (rel.startsWith(prefix)) return name;
  return null;
}
/* Write one favicon-<name>.svg per icon the rules above actually use. The PNG
 * + apple-touch-icon fallback stays a single site-wide raster — those two
 * exist only for iOS home-screen bookmarks and Bing's favicon crawler, never
 * for the browser tab, so a matching raster per icon isn't worth a render
 * pass per glyph (see make-logo-raster.mjs). */
mkdirSync(path.join(root, "assets/favicon"), { recursive: true });
for (const name of new Set(FAVICON_RULES.map(([, n]) => n))) {
  const svg = faviconSvg(name);
  if (!svg) throw new Error(`favicon rule references unknown icon "${name}"`);
  await writeFile(path.join(root, "assets/favicon", `${name}.svg`), svg);
}
function faviconLinks(rel) {
  const name = faviconIconFor(rel);
  const iconHref = name ? `/assets/favicon/${name}.svg` : "/favicon.svg";
  return `<link rel="icon" type="image/svg+xml" href="${iconHref}">`
    + '<link rel="icon" type="image/png" sizes="512x512" href="/assets/img/logo-512.png">'
    + '<link rel="apple-touch-icon" href="/apple-touch-icon.png">';
}
/* og:site_name appeared on ZERO pages. It is one of Google's documented inputs
 * for the site-name line above a result, and it is one tag — so it is injected
 * here for every page, the same idempotent way the favicon is, rather than
 * added by hand to fifteen generators. */
const SITE_NAME = '<meta property="og:site_name" content="Time and Space Science">';
/* Bing Webmaster Tools site-ownership verification — home page only (that's
 * all Bing needs; BingSiteAuth.xml at the site root does the rest), injected
 * the same idempotent way as og:site_name rather than by hand.
 * TWO TAGS, deliberately: Bing issued the owner a second code in August 2026
 * (a re-verification), and multiple msvalidate.01 tags are valid — keeping
 * the original means whichever property is doing the verifying stays
 * verified, per Bing's own "don't remove the meta tag" instruction. */
const BING_VERIFY = '<meta name="msvalidate.01" content="85CDD28E140D0FDDC67A38DC6AC41245">\n<meta name="msvalidate.01" content="45C4CC7BBFFCBF85B3EB4848DA538910">';
function injectHeadTags(html, rel) {
  html = html.replace(GA_RE, "").replace(ADS_RE, "");
  html = html.replace(/<link rel="icon"[^>]*>\s*/g, "");            /* idempotent */
  html = html.replace(/<link rel="apple-touch-icon"[^>]*>\s*/g, "");
  html = html.replace(/<meta property="og:site_name"[^>]*>\s*/g, "");
  html = html.replace(/<meta name="msvalidate\.01"[^>]*>\s*/g, "");
  html = html.replace(/<script>try\{if\(localStorage\.getItem\("ac_pj"\)[\s\S]*?<\/script>\s*/g, ""); /* idempotent */
  /* Stripped unconditionally, injected only while the notice runs — so it goes
     with the notice rather than outliving it as dead script on every page. */
  html = html.replace(/<script>try\{if\(localStorage\.getItem\("ac_nb"\)[\s\S]*?<\/script>\s*/g, "");
  const nb = NOTICE_ON ? NOTICE_HEAD + "\n" : "";
  const bing = rel === "index.html" ? `${BING_VERIFY}\n` : "";
  return html.replace(/<\/head>/, `${nb}${PJ_HEAD}\n${faviconLinks(rel)}\n${SITE_NAME}\n${bing}${GA_SNIPPET}\n</head>`);
}

/* Drop the " | Time and Space Science" brand suffix from the <title> tag — shorter,
 * less repetitive titles. The brand stays in og:title/site identity; this only
 * trims the browser/search title. Other separators (e.g. the SpaceX "— date"
 * titles) are left untouched. */
function stripTitleBrand(html) {
  return html.replace(/(<title>[\s\S]*?)\s*\|\s*Alarm-clock\.org(\s*<\/title>)/i, "$1$2");
}

/* Brand logo — a self-contained alarm-clock SVG used in place of the
 * "timeandspace.science" wordmark in the top-left. Fixed colours so it reads on any
 * theme/background. The link keeps a visually-hidden wordmark for SEO + a11y. */
const LOGO_SVG =
  '<svg class="logo" viewBox="0 0 200 200" width="48" height="48" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M 55.5 45 C 55.5 5, 144.5 5, 144.5 45" fill="none" stroke="#2A3B4C" stroke-width="6" stroke-linecap="round"/>' +
  '<path d="M 55.5 45 C 55.5 5, 144.5 5, 144.5 45" fill="none" stroke="#D6AF5C" stroke-width="2" stroke-linecap="round"/>' +
  '<path d="M 97 40 V 30 H 90 C 88 30, 88 22, 90 22 H 110 C 112 22, 112 30, 110 30 H 103 V 40 Z" fill="#D6AF5C" stroke="#2A3B4C" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M 60 160 L 50 185 L 60 185 L 75 160 Z" fill="#D6AF5C" stroke="#2A3B4C" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M 140 160 L 150 185 L 140 185 L 125 160 Z" fill="#D6AF5C" stroke="#2A3B4C" stroke-width="3" stroke-linejoin="round"/>' +
  '<circle cx="100" cy="105" r="65" fill="#C04A41" stroke="#2A3B4C" stroke-width="3"/>' +
  '<circle cx="100" cy="105" r="57" fill="#F4EED1" stroke="#2A3B4C" stroke-width="2.5"/>' +
  '<g transform="translate(54.5, 54.5) rotate(-42)" fill="#D6AF5C" stroke="#2A3B4C" stroke-width="3" stroke-linejoin="round"><rect x="-4" y="-34" width="8" height="12" rx="3"/><path d="M -23 0 C -23 -35, 23 -35, 23 0 Z"/></g>' +
  '<g transform="translate(145.5, 54.5) rotate(42)" fill="#D6AF5C" stroke="#2A3B4C" stroke-width="3" stroke-linejoin="round"><rect x="-4" y="-34" width="8" height="12" rx="3"/><path d="M -23 0 C -23 -35, 23 -35, 23 0 Z"/></g>' +
  '<g fill="#2A3B4C"><circle cx="100" cy="63" r="3.4"/><circle cx="121" cy="69" r="3"/><circle cx="136.4" cy="84" r="3"/><circle cx="142" cy="105" r="3"/><circle cx="136.4" cy="126" r="3"/><circle cx="121" cy="141" r="3"/><circle cx="100" cy="147" r="3"/><circle cx="79" cy="141" r="3"/><circle cx="63.6" cy="126" r="3"/><circle cx="58" cy="105" r="3"/><circle cx="63.6" cy="84" r="3"/><circle cx="79" cy="69" r="3"/></g>' +
  '<line x1="100" y1="105" x2="130" y2="75" stroke="#C04A41" stroke-width="4" stroke-linecap="round"/>' +
  '<line x1="100" y1="105" x2="73" y2="90" stroke="#C04A41" stroke-width="5" stroke-linecap="round"/>' +
  '<circle cx="100" cy="105" r="5" fill="#C04A41" stroke="#2A3B4C" stroke-width="3"/>' +
  '</svg>';
/* Use the same clock logo as the favicon: write it to /favicon.svg (a clean
 * standalone SVG, sans the in-page class/aria attributes). */
await writeFile(path.join(root, "favicon.svg"),
  LOGO_SVG.replace('class="logo" ', '').replace(' width="48" height="48"', '').replace(' aria-hidden="true" focusable="false"', ''));
/* ---- THE LOGO IS THE SECTION MENU ---------------------------------------
 * The home page is four tabs — Time, Earth, Space, Classroom — and until now
 * the only way to reach one was to land on the home page and press a tab.
 * From any of the other 4,000 pages there was no route to a section at all.
 * The logo carries it: it sits in the top-left of every page already, it is
 * the one control a reader expects to mean "take me back", and the four
 * sections are exactly what "back" should offer.
 *
 * The sections are PAGES now (/time/, /earth/, /space/, /classroom/), so the
 * menu links straight to them — the old ?tab= addresses survive only as
 * redirects for links shared before the split.
 *
 * HOME LEADS THE MENU (owner's call, August 2026 — it had been dropped as a
 * duplicate of the wordmark link, but a menu of sections with no way back up
 * reads as incomplete, and on the landing page itself the wordmark is an <h1>
 * rather than a link, so there the menu genuinely was the missing route).
 *
 * MARKERS, NOT A TAG MATCH, so this stays re-runnable. The hand-maintained
 * pages are rewritten in place, so the pattern has to find its own previous
 * output as well as the original anchor — otherwise the menu would freeze on
 * those pages the first time it was injected. Same reasoning as NOTICE_RE. */
const BRAND_SECTIONS = [
  ["/", "Home", "home"],
  ["/time/", "Time", "timer"],
  ["/earth/", "Earth", "globe"],
  ["/space/", "Space", "solar"],
  ["/classroom/", "Classroom", "classroom"],
];
const BRAND_DD =
  `<details class="nav-dd brand-dd"><summary aria-label="Site sections">`
  + `${LOGO_SVG}<span class="visually-hidden">Time and Space Science — sections</span></summary>`
  + `<ul class="menu brand-menu">`
  + BRAND_SECTIONS.map(([url, label, icon]) => `<li><a href="${url}">${ico(icon)} ${label}</a></li>`).join("")
  + `</ul></details>`;

/* ---- THE WORDMARK -------------------------------------------------------
 * The domain, set so a run-together string reads as words: capitals at each
 * word start, the two CONNECTORS (And and the dot) in grey against the three
 * CONCEPTS in white. One rule, not three exceptions — grey is the join.
 *
 * THE GAPS ARE MARGINS, NOT SPACES, and that is the whole trick. A real space
 * would let the brand wrap across two lines mid-name, and — worse — it would
 * be COPIED: select the wordmark, paste it in an address bar, and
 * "Time And Space . Science" is a search, not this site. A margin gives the
 * identical optical gap while the text stays the single unbroken string
 * "TimeAndSpace.Science", which is exactly what a reader should carry away.
 * For the same reason the spans are emitted with NO whitespace between the
 * tags: a newline in the source would render as a space.
 *
 * ON THE HOME PAGE IT IS THE <h1>. That page's heading was already the brand
 * ("Time and Space") rather than anything descriptive, so nothing readable is
 * lost — the descriptive text lives in <title> and the lede — and it saves
 * the page carrying the name twice. Everywhere else it is a link home, which
 * also gives back the every-page link to `/` that the wordmark anchor used
 * to be before the logo became a menu. */
const WORDMARK =
  `<span class="wm-w">Time</span><span class="wm-j">And</span><span class="wm-w">Space</span>`
  + `<span class="wm-j wm-dot">.</span><span class="wm-w wm-tld">Science</span>`;
const wordmark = (isHome) => isHome
  ? `<h1 class="brand-word">${WORDMARK}</h1>`
  : `<a class="brand-word" href="/" aria-label="Time and Space Science home">${WORDMARK}</a>`;
const brandBlock = (isHome) => `<!--bd-->${BRAND_DD}${wordmark(isHome)}<!--/bd-->`;

/* Matches its own previous output OR the original anchor — and, crucially,
 * ANY brand-cat crumb links that follow it. The breadcrumb comes out of the
 * bar site-wide (owner's call; the navigation is being reworked separately),
 * and doing the strip HERE rather than in lib.mjs brand() is what reaches the
 * hand-maintained pages too, whose brand markup is literal in the file and
 * never passes through a generator. The BreadcrumbList JSON-LD is emitted
 * separately and is untouched, so search-result breadcrumbs still work. */
const CRUMB_TAIL = '(?:\\s*<a class="brand-cat"[^>]*>[\\s\\S]*?</a>)*';
const BRAND_RE = new RegExp(
  '(?:<!--bd-->[\\s\\S]*?<!--/bd-->'
  + '|<a class="brand-name" href="/"[^>]*>[\\s\\S]*?</a>)'
  /* the crumb-eater hangs off BOTH branches: on a page built before this
     change the markers already exist and the crumbs sit AFTER them, so a
     tail attached only to the anchor branch would leave them behind. */
  + CRUMB_TAIL,
  'g');
/* the copy-a-link chain icon, removed with the breadcrumb. Stripped here as
   well as at the source because the hand-maintained pages (stopwatch, c.html,
   404 and friends) carry it literally and never pass through lib.mjs brand().
   Its script goes with it rather than being left behind wiring up nothing. */
const COPY_DD_RE = /<details class="nav-dd copy-dd">[\s\S]*?<\/details>\s*/g;
const COPY_JS_RE = /<script>document\.addEventListener\("click",function\(e\)\{var b=e\.target\.closest\("\.copy-item"\)[\s\S]*?<\/script>\s*/g;
function injectLogo(html, rel) {
  const isHome = rel === "index.html";
  let out = html.replace(COPY_DD_RE, "").replace(COPY_JS_RE, "");
  out = out.replace(BRAND_RE, brandBlock(isHome));
  /* the home page's centred "Time and Space" heading is now the wordmark on
     the left, so the old one would be a second copy of the same name */
  if (isHome) out = out.replace(/<h1 class="brand-h1">Time and Space<\/h1>\s*/g, "");
  return out;
}

/* Every page needs a working social-share image. Event/countdown pages already
 * point og:image at the /api/og renderer; hubs and static pages had none (and
 * the home/popular pages pointed at a /assets/img/og-default.png that doesn't
 * exist). Give them all a branded, generated card from /api/og built from the
 * page's own <title>, so shares always preview correctly. Pages with a real
 * og:image are left untouched. */
function ogTitle(html) {
  const m = /<title>(.*?)<\/title>/is.exec(html);
  let t = (m ? m[1] : "").replace(/\s*[|—–].*$/s, "").trim()
    .replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return (t || "Time and Space Science").slice(0, 80);
}
function injectOgImage(html) {
  const og = `${SITE}/api/og?name=${encodeURIComponent(ogTitle(html))}&amp;theme=generic`;
  /* fix the broken default references (home / popular pages). These pages went
     down this branch and never got twitter:image, which the no-image branch
     below does inject — so the one set of pages with a placeholder og:image was
     also the one set with no Twitter card image. */
  if (/<meta property="og:image" content="[^"]*og-default\.(?:png|svg)"/.test(html)) {
    html = html.replace(/(<meta property="og:image" content=")[^"]*og-default\.(?:png|svg)(">)/g, `$1${og}$2`);
    if (!/name="twitter:image"/.test(html)) {
      const tw0 = /name="twitter:card"/.test(html) ? "" : `<meta name="twitter:card" content="summary_large_image">\n`;
      html = html.replace(/<\/head>/, `${tw0}<meta name="twitter:image" content="${og}">\n</head>`);
    }
    return html;
  }
  if (/property="og:image"/.test(html)) return html; /* already has a real one */
  const tw = /name="twitter:card"/.test(html) ? "" : `<meta name="twitter:card" content="summary_large_image">\n`;
  return html.replace(/<\/head>/, `<meta property="og:image" content="${og}">\n${tw}<meta name="twitter:image" content="${og}">\n</head>`);
}

/* Let Google & Bing show a large image thumbnail in search results. Pages that
 * already declare a robots meta are left as-is — that's either a deliberate
 * noindex (no SERP entry, so image-preview size is moot) or a generator that
 * already sets max-image-preview:large (events, 420). Idempotent. */
function injectRobots(html) {
  if (/name="robots"/i.test(html)) return html;
  return html.replace(/<\/head>/, `<meta name="robots" content="max-image-preview:large">\n</head>`);
}

let touched = 0;
for (const rel of HTML) {
  const file = path.join(root, rel);
  let html = await readFile(file, "utf8");
  const before = html;

  html = setHtmlOrigin(html); /* canonical / og:url origin */
  html = injectBuildStamp(html); /* deployment-consistency audit trail */
  html = stripTitleBrand(html); /* trim " | Time and Space Science" from <title> */
  html = injectPageView(html, rel); /* main-page daily-visit beacon */
  html = injectLogo(html, rel); /* logo menu + wordmark, breadcrumb stripped */
  html = injectHeadTags(html, rel); /* Google Analytics on every page, Bing verification on home only */
  html = injectOgImage(html);  /* working social-share image on every page */
  html = injectRobots(html);   /* max-image-preview:large so SERPs show a big thumbnail */
  html = injectNav(html);     /* shared top navigation */
  /* a11y: the main landmark and a skip link. This used to string-match
     '<div class="wrap">' exactly, which silently missed every page whose wrap
     carries a second class — the home page, /planets/ and all of the solar
     family use "wrap wrap-wide" — so the site's biggest pages had no main
     landmark at all. The regex takes any wrap variant, and both edits are
     idempotent: the strip runs first, the role is only added where absent. */
  html = html.replace(/\n?\s*<a class="skip-link"[^>]*>[\s\S]*?<\/a>/g, "");
  html = html.replace(/<div class="wrap(?<mods>[^"]*)"(?<rest>(?![^>]*role=)[^>]*)>/, '<div class="wrap$<mods>" id="main" role="main"$<rest>>');
  /* a hand-maintained page may already carry role="main" (some do) — it still
     needs the id the skip link points at */
  html = html.replace(/<div class="wrap(?<mods>[^"]*)"(?<rest>(?![^>]*id=)[^>]*role="main"[^>]*)>/, '<div class="wrap$<mods>" id="main"$<rest>>');
  html = html.replace(/(<body[^>]*>)/, '$1\n<a class="skip-link" href="#main">Skip to main content</a>');
  html = injectFooterLinks(html, rel); /* Suggest / Promote an event in every footer */
  html = injectReportLink(html, rel); /* "Report abuse" in every footer */
  html = injectSiteLinks(html, rel);  /* About + countdown links (per page type) + trademark line */
  html = injectCopyright(html);       /* © line under every footer */
  html = injectSuggestBox(html, rel); /* "share an idea" box above the footer */
  html = injectPrivacyNotice(html);   /* GDPR/CCPA notice, shown only to qualifying visitors */

  if (!CSS_RE.test(html)) console.warn(`! ${rel}: no stylesheet link/block found — CSS not inlined`);
  const { critical, deferred } = styleTagFor(html.replace(CSS_RE, ""), rel);
  html = html.replace(CSS_RE, critical);
  if (deferred) {
    if (!CSS_DEFER_RE.test(html))
      throw new Error(`${rel}: DEFER_CSS names sections to defer but the page has no ` +
        `<style data-ac="css-defer"></style> placeholder to put them in — add one near the end of body.`);
    html = html.replace(CSS_DEFER_RE, deferred);
  } else {
    html = html.replace(CSS_DEFER_RE, "");   /* unused placeholder — pages without a DEFER_CSS entry */
  }

  if (BUNDLES[rel]) {
    /* A bundle used by more than one page is hoisted to a shared file rather
       than inlined into each; a one-page bundle stays inline, where it costs
       one fewer request. */
    const names = BUNDLES[rel];
    const tag = bundleShared(names) ? `data-ac="shared" data-name="b-${names.join("-")}"` : `data-ac="js"`;
    const scriptTag = `<script ${tag}>\n${safe(await bundle(names))}\n</script>\n`;
    if (!JS_RE.test(html)) console.warn(`! ${rel}: no JS bundle block found — JS not inlined`);
    html = html.replace(JS_RE, scriptTag);
  }

  /* AFTER the JS is inlined, on purpose: a tide page draws its moon at runtime
     from the bundled moon.js, so the only way to know it needs the face is to
     look once the bundle is in the document. Checking earlier left those pages
     referencing a sprite that was never injected. */
  html = injectMoonSprite(html);
  html = injectSunIcons(html);
  html = injectPopout(html);
  html = injectLocalTime(html);
  html = hoistShared(html);

  if (html !== before) { await writeFile(file, html); touched++; console.log(`inlined ${rel}`); }
  else console.log(`unchanged ${rel}`);
}

/* Apply the production origin to non-HTML files too (sitemap <loc>, robots Sitemap:). */
for (const rel of ["sitemap.xml", "robots.txt"]) {
  const file = path.join(root, rel);
  const txt = await readFile(file, "utf8");
  const out = txt
    .replace(/(<loc>)https?:\/\/[^/<]+/g, `$1${SITE}`)
    .replace(/(Sitemap:\s*)https?:\/\/[^/\s]+/g, `$1${SITE}`);
  if (out !== txt) { await writeFile(file, out); touched++; console.log(`origin   ${rel}`); }
}
sweepShared();
if (sharedWritten.size) console.log(`shared scripts: ${[...sharedWritten.values()].join(", ")}`);
if (cssShort.length) {
  console.error(`✗ build-inline: ${cssShort.length} page(s) were given LESS CSS than their markup can use — a SECTION_PROBES regex is wrong:`);
  for (const [rel, secs] of cssShort.slice(0, 20)) console.error(`  ${rel} — missing: ${secs}`);
  process.exit(1);
}
console.log(`\nDone — ${touched} file(s) updated. Origin: ${SITE}`);
