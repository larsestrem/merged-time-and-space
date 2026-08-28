#!/usr/bin/env node
/* build-home.mjs — generates TWO pages from the same countdown data:
 *   /            a portal: hero + three section cards (Countdowns · Timer ·
 *                Stopwatch) + search + "happening soon" + live trending.
 *   /countdown/  the countdown hub: the curated "popular countdowns" lists per
 *                category (what the home page used to be).
 * Keeping the bulk of the countdown content on /countdown/ (self-canonical) and
 * a lighter, distinct portal on / avoids duplicate content between them.
 *
 *   node seo/tools/build-home.mjs   (run before build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, hrefFor, when, richMap, loadEvents, nextOccurrence, iso, viewHash, webSiteLd, appLd, segMarkup, syncLabelYear, upcomingFederalHolidays, nSunCalc, sunHm, sunDialSvg } from "./lib.mjs";
import { PANEL_HTML, HOME_CLOCK_JS, HOME_COLOR_JS, FS_ICON } from "./alarm-widget.mjs";
import { ico } from "./icons.mjs";
import { moonIllum, moonName, moonGlyph, moonSnap, nextPhase, remainLabel, MOON_CORE } from "./moon.mjs";
import { tideCurve } from "./tide-curve.mjs";
/* the flagship lesson per grade band — imported so the home card can never
   drift from what the lessons pages actually offer */
import { tideChartSvg, tideSeries, TIDE_W, TIDE_H } from "./tide-chart.mjs";
/* the simulator's OWN dimensions, so the card's little animated version cannot
   drift from the picture it is advertising */
import { ORR_GEOM, ORRERY_JS, orrerySvg, orrSpanDays } from "./orrery.mjs";
/* the orbital-velocity page's URL, from the generator that owns it */
import { OV_PATH } from "./build-orbital.mjs";
/* the beach-ball scale, derived from the real dimensions in build-simulator so
   this card and the simulator's own scale card cannot disagree */
import { SIDEREAL, SYS_PATH } from "./build-simulator.mjs";
/* the same coastline rings the planet globes are drawn from — imported, not
   copied, because two coastline tables would drift apart */
import { WC_CITY_LIST } from "./wc-cities.mjs";
import { DAYNIGHT_PATH, seasonPoints, DN_CORE, DN_W, DN_TOP, DN_BOT, dnX, dnY, dnF, subsolar, nightPath, landPath, cityMark, DN_MAP_EXTRA, DN_MAP_BIG, seasonSunHtml } from "./daynight.mjs";
/* the simulator URLs, imported rather than typed: the planet pages are flat
   (/jupiter-and-moons-simulator/) and the launch hub moved, and a second copy
   of either rule here would rot the first time one changed */
import { planetPath, PLANETS_PATH, LAUNCH_PATH as ROCKET_PATH } from "./solar-pages.mjs";
import { hubQs } from "./concepts.mjs";
import { SECTION_LINKS, sectionSwitcher } from "./section-nav.mjs";
/* the two-zone time-difference widget, shared with /time-difference-calculator/
   so the card and the page are one calculator rather than two */
import { tdiffForm, TDIFF_JS } from "./time-diff.mjs";
/* the 12/24-hour converter, shared with /24-hour-clock-converter/ — one
   converter in two places rather than two that can disagree */
import { convForm, CONV_JS } from "./clock-convert.mjs";
/* the moon systems, for the per-planet cards on the Space tab. Real radii,
   real periods, real diameters — the card computes its picture from them
   rather than carrying a drawing of its own that could drift */
import { SAT_SYS, SAT_COUNT } from "./satellites.mjs";
import { PLANETS_JS, SOLAR_JS } from "./planets.mjs";

/** Questions sit inside the matching card so the picture comes first. */
function withQs(card, slugs, hub) {
  if (!slugs || !slugs.length) return card;
  const qs = hubQs(slugs, hub);
  const i = card.lastIndexOf("</div>");
  if (i < 0) return card + qs;
  return `${card.slice(0, i)}\n      ${qs}\n    ${card.slice(i)}`;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

/* Sunrise & Sunset homepage card: 6 fixed cities strung along a wide band of
 * latitude — from the Arctic (Nome) down across the temperate coast to the
 * tropics (Mexico City) and over the equator into the southern hemisphere
 * (Lima) — so a glance shows how much the day length swings with latitude.
 * Ordered north→south. 6 (not 8) packs the grid into even rows of 2 or 3.
 * Coordinates match the /sun/<slug>/ pages they link to exactly. */
const HOME_SUN_CITIES = [
  { slug: "nome", city: "Nome", st: "AK", tz: "America/Nome", lat: 64.50, lon: -165.41 },
  { slug: "seattle", city: "Seattle", st: "WA", tz: "America/Los_Angeles", lat: 47.6062, lon: -122.3321 },
  { slug: "portland", city: "Portland", st: "OR", tz: "America/Los_Angeles", lat: 45.52, lon: -122.68 },
  { slug: "san-francisco", city: "San Francisco", st: "CA", tz: "America/Los_Angeles", lat: 37.77, lon: -122.42 },
  { slug: "mexico-city", city: "Mexico City", st: "Mexico", tz: "America/Mexico_City", lat: 19.43, lon: -99.13 },
  { slug: "lima", city: "Lima", st: "Peru", tz: "America/Lima", lat: -12.05, lon: -77.04 },
];

const popular = JSON.parse(readFileSync(join(root, "seo/_data/popular-countdowns.json"), "utf8"));
const events = loadEvents(readFileSync, join, root);
const rich = richMap(events);
const N = popular.homeCount || 10;

/* For the "Next Federal Holiday" home card's live mini-countdown — same
 * small multi-year candidate list the /next-federal-holiday/ page itself
 * bakes in (see build-microevents.mjs), computed independently here rather
 * than imported from it, since that module's top level writes its own pages
 * as a side effect and re-running that on every build-home.mjs invocation
 * would be wasteful. */
const { holidays: federalHolidays } = JSON.parse(readFileSync(join(root, "seo/_data/federal-holidays.json"), "utf8"));
const FEDERAL_HOLIDAYS_MINI = upcomingFederalHolidays(federalHolidays);

const richDate = new Map();
for (const e of events) {
  const d = e.once || (nextOccurrence(e) ? iso(nextOccurrence(e)) : null);
  if (d) richDate.set(e.slug ? `${e.type}/${e.slug}` : e.type, d);
}
const dateFor = (l, cat) => richDate.get(l.slug ? `${l.path || cat.path}/${l.slug}` : (l.path || cat.path)) || l.date;

const sections = popular.categories.map((cat) => {
  const ordered = cat.links.slice().sort((a, b) =>
    (dateFor(a, cat) || "9999") < (dateFor(b, cat) || "9999") ? -1 : (dateFor(a, cat) || "9999") > (dateFor(b, cat) || "9999") ? 1 : 0);
  const top = ordered.slice(0, N);
  const total = cat.links.length + (cat.more || []).length;
  const items = top.map((l) =>
    `      <li><a href="${esc(hrefFor(cat, l, rich))}">${esc(syncLabelYear(l.label, dateFor(l, cat)))}</a><span class="when">${when(dateFor(l, cat))}</span></li>`
  ).join("\n");
  const seeAll = total > top.length
    ? `\n    <a class="more-cta" href="/${cat.hub}/">See all ${total} ${cat.nav.toLowerCase()} →</a>` : "";
  return `  <div class="card" id="${cat.id}">
    <h2><a class="cat-link" href="/${cat.hub}/">${esc(cat.title)}</a></h2>
    <ul class="toplist">
${items}
    </ul>${seeAll}
  </div>`;
}).join("\n\n");

const seenUrl = new Set();
const searchIndex = [];
/* dedup by label+url so one page can be found under several search terms
 * (e.g. a school's aliases all point at its one graduation page) */
const addIdx = (label, url) => { const k = `${label}|${url}`; if (url && label && !seenUrl.has(k)) { seenUrl.add(k); searchIndex.push({ l: label, u: url }); } };
for (const cat of popular.categories) {
  addIdx(cat.title, `/${cat.hub}/`);
  for (const l of [...cat.links, ...(cat.more || [])]) addIdx(syncLabelYear(l.label, dateFor(l, cat)), hrefFor(cat, l, rich));
}
/* Beyond countdowns, the search also finds the tools themselves, every tide
 * station/state page, and the timer presets. */
addIdx("Alarm Clock", "/alarm-clock/");
addIdx("Timer", "/timer/");
addIdx("Stopwatch", "/stopwatch/");
addIdx("World Clock", "/world-clock/");
addIdx("Tide Charts & Times", "/tides/");
addIdx("Event Calendar", "/calendar/");
addIdx("Sunrise & Sunset Times", "/sun/");
/* the classroom guide, under the words a teacher would actually type */
addIdx("Classroom timer & stopwatch guide", "/classroom/");
addIdx("Teacher guide (classroom timers)", "/classroom/");
/* the methodology pages, under what someone doubting a number would type */
addIdx("Methodology — how these numbers are worked out", "/methodology/");
addIdx("How sunrise & sunset are calculated", "/methodology/sunrise-sunset/");
addIdx("How the moon phase is calculated", "/methodology/moon-phase/");
addIdx("Where the tide predictions come from", "/methodology/tide-predictions/");
addIdx("How time zones & daylight saving work here", "/methodology/time-zones/");
addIdx("How accurate is a browser timer?", "/methodology/browser-timing/");
{
  const { TIDE_STATIONS, tideStatePages } = await import("./tide-stations.mjs");
  for (const s of TIDE_STATIONS) addIdx(`${s.city}, ${s.st} tide chart`, `/tides/${s.slug}/`);
  for (const sp of tideStatePages()) addIdx(`${sp.name} tide charts`, `/tides/${sp.slug}/`);
  const { timerSlug, timerLabel } = await import("./lib.mjs");
  const { durations } = JSON.parse(readFileSync(join(root, "seo/_data/timers.json"), "utf8"));
  for (const sec of durations) addIdx(timerLabel(sec), `/timer/${timerSlug(sec)}/`);
  /* graduation-page aliases (CSU Chico, Cal State Chico, …) point at the same
   * page so the search finds a school by any of its common names */
  const { events: allEvents } = JSON.parse(readFileSync(join(root, "seo/_data/events.json"), "utf8"));
  for (const e of allEvents)
    if (e.type === "graduation-countdown" && e.slug && e.aliases)
      for (const a of e.aliases) addIdx(`${a} graduation`, `/graduation-countdowns/${e.slug}/`);
}

/* Search index + the site-wide view-id->label map used by the trending card
 * are each 10+ KB — too big to keep inlining into every / and /countdown/
 * load when most visits never touch search and the trending card only needs
 * whatever handful of ids /api/trending happens to rank. Written as static
 * JSON and fetched lazily (search: on first focus/keystroke; views: in
 * parallel with the trending fetch) instead of baked into the HTML. */
mkdirSync(join(root, "assets/data"), { recursive: true });
writeFileSync(join(root, "assets/data/search-index.json"), JSON.stringify(searchIndex));

const soon = events
  .map((e) => { const d = nextOccurrence(e); return d ? { label: e.label || e.name, url: e.urlPath, date: d, iso: iso(d) } : null; })
  .filter(Boolean)
  .sort((a, b) => a.date - b.date)
  .slice(0, 8);
const soonRail = soon.length
  ? `  <div class="rail-head">⏳ Happening soon</div>
  <div class="soon-rail">
${soon.map((s) => `    <a class="soon-card" href="${esc(s.url)}" data-date="${s.iso}"><span class="soon-days"></span><span class="soon-label">${esc(s.label)}</span><span class="soon-date">${esc(when(s.iso))}</span></a>`).join("\n")}
  </div>`
  : "";

const viewsMap = {};
for (const e of events) viewsMap[viewHash(e.urlPath)] = { l: e.label || e.name, u: e.urlPath };
writeFileSync(join(root, "assets/data/home-views.json"), JSON.stringify(viewsMap));

const SEARCH = `  <div class="home-search">
    <label class="hs-label" for="hs-input">Search popular birthdays, sports events, holidays &amp; more</label>
    <div class="hs-row">
      <input id="hs-input" type="search" autocomplete="off" placeholder="Try a celebrity, holiday or event…">
      <button type="button" class="btn hs-btn" id="hs-go">Search</button>
    </div>
    <ul id="hs-results" class="hs-results" hidden></ul>
  </div>`;

const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const upcoming = events
  .map((e) => { const d = nextOccurrence(e); if (!d) return null; let label = e.label || e.name; if (/^\/birthday-countdowns\//.test(e.urlPath) && !/birthday/i.test(label)) label += " Birthday"; return { label, url: e.urlPath, date: d, day: d.getUTCDate(), mon: MON3[d.getUTCMonth()] }; })
  .filter(Boolean).sort((a, b) => a.date - b.date).slice(0, 6);
/* Read as "Month Day — Event" (e.g. "Jul 22  Selena Gomez Birthday"): the date
 * leads, in natural order, instead of a bare day on the left and the month
 * stranded on the right. */
const upcomingRows = upcoming.map((r) => `      <li><a href="${esc(r.url)}"><span class="cal-md">${esc(r.mon)} ${r.day}</span>${esc(r.label)}</a></li>`).join("\n");

/* The "Upcoming events" card renders first (static, from build-time data) and
 * the async "Trending" card second — it starts hidden and un-hides once
 * /api/trending resolves, so whatever it pushes down when it appears is
 * content below it (not the already-visible Upcoming events card above),
 * keeping that late reveal out of the CLS-tracked viewport. */
const UPCOMING_CARD = `  <div class="card">
    <h2>${ico("calendar")} Upcoming events</h2>
    <ul class="toplist">
${upcomingRows}
    </ul>
    <a class="more-cta" href="/calendar/">See the full calendar →</a>
  </div>`;

const TRENDING_CARD = `  <div class="card mw-card" id="tr-card" hidden>
    <h2>${ico("flame")} Trending Events &amp; Birthdays</h2>
    <p class="trend-sub">The most-viewed countdowns over the last 7 days.</p>
    <ul class="toplist rank-list" id="tr-list"></ul>
    <a class="more-cta" href="/trending/">See all the hottest countdowns →</a>
  </div>`;

/* /countdown/ keeps both rank cards; the home portal drops the calendar,
 * trending, popular-events and federal-holiday cards (below) per request. */
const RANK_CARDS = `${UPCOMING_CARD}\n\n${TRENDING_CARD}`;

/* ONE shared, hoisted script — see the note above styleTagFor's DEFER_CSS in
 * build-inline.mjs for why "hoisted, not inlined" matters here: this body is
 * byte-identical between / and /countdown/ (both build from this file), so
 * data-ac="shared" writes it to ONE content-hashed /assets/js/ file cached a
 * year, instead of the same ~2KB of JS being re-downloaded and re-parsed
 * inline on every load of either page. `defer` runs it at the same point in
 * the page lifecycle this already ran at (end of body), so nothing above the
 * fold waits on it either way — the only thing that changes is that a repeat
 * visit to either page can skip fetching it at all. */
const SCRIPTS = `<script data-ac="shared" data-name="home-search">
(function(){var data=null,pending=null,loading=false,input=document.getElementById('hs-input'),box=document.getElementById('hs-results');if(!input||!box)return;var active=-1;function close(){box.hidden=true;box.innerHTML='';active=-1;}function renderNow(q){q=q.trim().toLowerCase();if(!q){close();return;}var out=[];for(var i=0;i<data.length&&out.length<8;i++){if(data[i].l.toLowerCase().indexOf(q)>-1)out.push(data[i]);}box.innerHTML='';active=-1;if(!out.length){var li=document.createElement('li');li.className='hs-empty';li.textContent='No match yet — try another name, or browse Popular Countdowns in the menu.';box.appendChild(li);box.hidden=false;return;}out.forEach(function(it){var li=document.createElement('li'),a=document.createElement('a');a.href=it.u;a.textContent=it.l;li.appendChild(a);box.appendChild(li);});box.hidden=false;}function render(q){if(data){renderNow(q);return;}pending=q;if(loading)return;loading=true;fetch('/assets/data/search-index.json').then(function(r){return r.ok?r.json():[];}).then(function(d){data=d||[];if(pending!==null)renderNow(pending);})['catch'](function(){data=[];});}function move(d){var links=box.querySelectorAll('a');if(!links.length)return;active=(active+d+links.length)%links.length;links.forEach(function(a,i){a.classList.toggle('active',i===active);});}input.addEventListener('focus',function(){if(!data&&!loading)render('');},{once:true});input.addEventListener('input',function(){render(input.value);});input.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){e.preventDefault();move(1);}else if(e.key==='ArrowUp'){e.preventDefault();move(-1);}else if(e.key==='Enter'){var links=box.querySelectorAll('a'),t=active>-1?links[active]:links[0];if(t){e.preventDefault();window.location.href=t.href;}}else if(e.key==='Escape'){close();}});var btn=document.getElementById('hs-go');if(btn)btn.addEventListener('click',function(){function nav(){renderNow(input.value);var a=box.querySelector('a');if(a)window.location.href=a.href;}var links=box.querySelectorAll('a'),t=active>-1?links[active]:null;if(t){window.location.href=t.href;return;}if(data){nav();return;}if(!input.value.trim()){input.focus();return;}loading=true;fetch('/assets/data/search-index.json').then(function(r){return r.ok?r.json():[];}).then(function(d){data=d||[];nav();})['catch'](function(){data=[];});});document.addEventListener('click',function(e){if(!e.target.closest('.home-search'))close();});})();
(function(){var cards=[].slice.call(document.querySelectorAll('.soon-card[data-date]'));if(!cards.length)return;var t=new Date();t=Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate());cards.forEach(function(c){var p=c.getAttribute('data-date').split('-');var d=Date.UTC(+p[0],+p[1]-1,+p[2]);var n=Math.round((d-t)/86400000);var el=c.querySelector('.soon-days');if(el)el.textContent=n<=0?'Today':n===1?'Tomorrow':'in '+n+' days';});})();
(function(){function fill(endpoint,cardId,listId,unit){var card=document.getElementById(cardId),list=document.getElementById(listId);if(!card||!list)return;Promise.all([fetch(endpoint).then(function(r){return r.ok?r.json():null;}),fetch('/assets/data/home-views.json').then(function(r){return r.ok?r.json():{};})['catch'](function(){return{};})]).then(function(res){var d=res[0],map=res[1]||{};if(!d||!d.ok||!d.ranked||!d.ranked.length)return;var rank=1,added=0;d.ranked.forEach(function(it){var ev=map[it.id];if(!ev)return;var li=document.createElement('li'),rk=document.createElement('span'),a=document.createElement('a'),v=document.createElement('span');rk.className='rank';rk.textContent=rank++;a.href=ev.u;a.textContent=ev.l;v.className='when';v.textContent=it.count.toLocaleString()+' '+(it.count===1?unit[0]:unit[1]);li.appendChild(rk);li.appendChild(a);li.appendChild(v);list.appendChild(li);added++;});if(added)card.hidden=false;})['catch'](function(){});}fill('/api/trending?n=6','tr-card','tr-list',['view this week','views this week']);})();
</script>`;

function doc({ title, desc, canon, ogTitle, body, tail = "", extraJs = "", ld = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canon}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="/assets/img/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/css/style.css">
${ld}
${GA_SNIPPET}
</head>
<body>
<div class="wrap wrap-wide">
${body}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${/* Filled by build-inline (see DEFER_CSS/styleTagFor there) with CSS for
     sections that are always well below the first screen on THIS page (the
     tide and moon cards) — placed after all visible content so the browser
     can paint everything above it before it has to parse this. Empty on any
     page build-inline doesn't have a DEFER_CSS entry for (i.e. /countdown/,
     which shares this template but not the cards those sections style). */""
}<style data-ac="css-defer"></style>
${tail}
${SCRIPTS}
${extraJs}
</body>
</html>
`;
}

/* ---- portal (/) — a dashboard of tool cards ---- */
/* bake the "in N days" label at build (day-granular, so tz-agnostic enough) so
 * the countdown chips aren't blank pre-JS; the client script re-derives it */
const _hbNow = new Date();

/* baked sunrise/sunset for the 6 homepage cities — a Node twin of the client
 * SunCalc (nSunCalc, shared via lib.mjs) so the card ships REAL times, not "—",
 * for crawlers and the pre-JS paint; refreshed every rebuild. */
const homeBuildNow = new Date();
const homeSunTimes = (c) => { const s = nSunCalc(homeBuildNow, c.lat, c.lon, -0.833); return { rise: s.rise ? sunHm(s.rise, c.tz) : "—", set: s.set ? sunHm(s.set, c.tz) : "—" }; };
/* static sun dial baked at build (no live "now" hand) so the home card needs
 * no JS for sun at all — the arcs/rise-set marks are accurate all day and
 * refresh on the hourly rebuild */
const homeDial = (c) => sunDialSvg(nSunCalc(homeBuildNow, c.lat, c.lon, -0.833), nSunCalc(homeBuildNow, c.lat, c.lon, -6), c.tz);

/* Sunrise & Sunset card: 6 mini sun-dials (city, state + today's rise/set),
 * baked entirely at build (see homeDial/homeSunTimes above) and refreshed by
 * the hourly rebuild, so the card needs no JS at all — crawlers and the
 * pre-JS paint both get real dials and real times. */
const SUN_HOME_CARD = `  <div class="card" id="home-sun">
    <h2>${ico("sunrise")} Sunrise &amp; Sunset</h2>
    <p class="sun-home-note">The cities below run north to south. The farther from the equator, the more day length swings with the season — long summer days, short winter ones.</p>
    <div class="tool-grid sun-home-grid" id="home-sun-grid">
${HOME_SUN_CITIES.map((c, i) => { const st = homeSunTimes(c); return `      <div class="sun-mini-card" data-sun-idx="${i}">
        <a class="sun-mini-link" href="/sun/${c.slug}/" aria-label="${esc(c.city)}, ${c.st} sunrise and sunset">
          <svg viewBox="0 0 292 292" aria-hidden="true">${homeDial(c)}</svg>
          <span class="sun-mini-name">${esc(c.city)}, ${c.st}</span>
        </a>
        <div class="sun-mini-times">↑ ${st.rise}&nbsp; &nbsp;↓ ${st.set}</div>
      </div>`; }).join("\n")}
    </div>
    ${/* "Sun times near me", not "See My Location": it matches how the thing is
         actually searched for, it says what you get rather than what the button
         does, and it reads the same as the tide card's "Tides near me" right
         above it — three cards, one phrasing for the same idea. */""
    }<div class="home-sun-foot"><a class="btn tc-open-btn" href="/sun/near-me/">Sun times near me</a><a class="btn secondary tc-open-btn" href="/sun/">Search a city</a></div>
  </div>`;

/* Full-width Tide Charts card (below the sun card): today's REAL NOAA tide
 * curve for the two coasts' most-searched cities, drawn at build from the
 * committed predictions file (no client JS, refreshed on each rebuild) and
 * linking to each station's live page. It uses THE tide chart renderer — the
 * same tideChartSvg() the tide pages bake and the browser redraws — so a
 * preview here looks like the chart it opens. The Days / Zoom controls belong
 * to the station page only; a preview is just the picture. Falls back to the
 * schematic tideCurve when a station has no data in the file yet. */
const HOME_TIDE_STATIONS = [
  { slug: "los-angeles-ca", city: "Los Angeles, CA", id: "9410660", tz: "America/Los_Angeles", pattern: "mixed" },
  { slug: "boston-ma", city: "Boston, MA", id: "8443970", tz: "America/New_York", pattern: "semidiurnal" },
  { slug: "seattle-wa", city: "Seattle, WA", id: "9447130", tz: "America/Los_Angeles", pattern: "mixed" },
];
const hodFromT = (t) => { const m = /(\d{2}):(\d{2})$/.exec(t); return m ? +m[1] + +m[2] / 60 : 0; };
const tideLabel = (t) => { const m = /(\d{2}):(\d{2})$/.exec(t); if (!m) return ""; let h = +m[1]; const ap = h < 12 ? "AM" : "PM"; h = h % 12 || 12; return `${h}:${m[2]} ${ap}`; };
const ymdInTz = (tz) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, ""); } catch (e) { const n = new Date(); return `${n.getUTCFullYear()}${String(n.getUTCMonth() + 1).padStart(2, "0")}${String(n.getUTCDate()).padStart(2, "0")}`; } };
/* Today's hi/lo for a station, read from the batch-fetched predictions file
 * (seo/_data/tide-predictions.json, refreshed weekly by fetch-tides.mjs) — no
 * per-build NOAA call. Returns null when the station/day isn't covered yet. */
let _homeTideStore = {};
try { _homeTideStore = JSON.parse(readFileSync(join(root, "seo/_data/tide-predictions.json"), "utf8")).stations || {}; } catch (e) { /* file absent -> schematic fallback */ }
/* the station's own wall clock as UTC ms — one frame for the tide times, the
 * day boundary and the labels, exactly as build-tides does it */
const wallMs = (t) => { const m = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(t); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null; };
/* one day of the station's high/low extremes, in that frame */
function todayHilo(id, tz) {
  const arr = _homeTideStore[id];
  if (!Array.isArray(arr)) return null;
  const ymd = ymdInTz(tz), ymdDash = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  const day0 = Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8));
  /* a day either side too, so the curve enters and leaves the frame properly
     instead of flat-lining at the edges */
  const ev = arr.map((e) => ({ t: wallMs(e.t), v: +e.v, hi: !!e.hi }))
    .filter((e) => e.t !== null && e.t > day0 - 86400000 && e.t < day0 + 2 * 86400000)
    .sort((a, b) => a.t - b.t);
  return ev.some((e) => e.t >= day0 && e.t < day0 + 86400000) ? { ev, day0 } : null;
}
/* the day's chart, drawn by the shared renderer. Hour ticks rather than day
 * ticks (the whole picture is one day) and bigger labels, because the card
 * renders the 700-wide chart at about a third of that. */
function homeTideChart({ ev, day0 }) {
  const t1 = day0 + 86400000;
  const hr = (h) => (h === 0 || h === 24 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`);
  return `<svg class="td-chartsvg home-tidesvg" viewBox="0 0 ${TIDE_W} ${TIDE_H}" role="img" aria-label="Today's tide chart">${tideChartSvg({
    W: TIDE_W, H: TIDE_H, t0: day0, t1,
    pts: tideSeries(ev, day0, t1, 900000),
    hilo: ev.map((e) => ({ t: e.t, v: e.v, hi: e.hi, lbl: `${e.v.toFixed(1) === "-0.0" ? "0.0" : e.v.toFixed(1)}ft` })),
    days: [6, 12, 18].map((h) => [day0 + h * 3600000, hr(h)]),
    marks: true, fs: 2.6, lines: 4,
  })}</svg>`;
}
const _homeTideCharts = HOME_TIDE_STATIONS.map((s) => {
  const day = todayHilo(s.id, s.tz);
  const live = !!day;
  const svg = live ? homeTideChart(day) : tideCurve(s.pattern, { width: 460, height: 150 });
  const note = live ? "Today's high &amp; low tides — open the live chart →" : "Typical daily pattern — open today's live tide chart →";
  return `      <a class="home-tides-chart" href="/tides/${s.slug}/">
        <div class="home-tides-city">${s.city}</div>
        ${svg}
        <div class="home-tides-note">${note}</div>
      </a>`;
});
console.log(`Home tide charts: ${_homeTideCharts.filter((h) => h.includes("home-tidesvg")).length}/${HOME_TIDE_STATIONS.length} baked from NOAA data.`);
const TIDES_HOME_CARD = `  <div class="card home-tides-card">
    <div class="tc-head">${ico("wave")} Tide Charts</div>
    <div class="home-tides-charts">
${_homeTideCharts.join("\n")}
    </div>
    <div class="home-tides-foot"><a class="btn tc-open-btn" href="/tides/near-me/">Tides near me</a><a class="btn secondary tc-open-btn" href="/tides/">Search by city &amp; state</a></div>
  </div>`;

/* Raw JS, no <script> wrapper of its own — combined into the ONE shared,
 * hoisted tag with HOME_CLOCK_JS/HOME_COLOR_JS/HOME_TABS_JS/WORLD_MAP_JS/
 * HOME_MASONRY_JS at the writeFileSync call below (see the note on SCRIPTS
 * above for why hoisting instead of inlining is worth doing here). */
const HOME_WIDGETS_JS = `
window.AC_FEDHOL=${JSON.stringify(FEDERAL_HOLIDAYS_MINI)};
(function(){
  [].slice.call(document.querySelectorAll('.tc[data-href]')).forEach(function(c){ c.addEventListener('click',function(e){ if(e.target.closest('a,button')) return; location.href=c.getAttribute('data-href'); }); });
  /* Sunrise & Sunset card: the dials AND the rise/set times are baked at
     build time (static SVG, see homeDial/homeSunTimes), so there's nothing
     to draw here on load — the home card needs no JS for sun. */
  /* "Countdown to Friday" / "Next Federal Holiday" mini cards — a coarse
   * days+hours readout updated once a minute (these are just a teaser for
   * the full live-ticking page, so second-level precision isn't needed
   * here). Same target-computation rules as microevent-widget.mjs's daily/
   * weekly/dates types, kept as a small standalone version since the full
   * widget also drives fullscreen/wake-lock/burn-in this card doesn't need. */
  function fmtRemain(ms){ if(ms<=0) return 'now!'; var s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);
    if(d>0) return d+'d '+h+'h'; if(h>0) return h+'h '+m+'m'; return m+'m'; }
  function nextFriday5pm(){ var now=new Date(), t=new Date(now.getFullYear(),now.getMonth(),now.getDate(),17,0,0,0);
    var diff=(5-t.getDay()+7)%7; t.setDate(t.getDate()+diff); if(t.getTime()<=now.getTime()) t.setDate(t.getDate()+7); return t; }
  function nextDateItem(items,longWeekendOnly,startOfWeekend){ var now=new Date(), best=null;
    for(var i=0;i<items.length;i++){ if(longWeekendOnly&&!items[i].longWeekend) continue;
      var p=items[i].date.split('-'), d=new Date(+p[0],+p[1]-1,+p[2],8,0,0,0);
      if(startOfWeekend){ var dow=d.getDay(), back=dow===1?2:0; d.setDate(d.getDate()-back); d.setHours(9,0,0,0); }
      if(d.getTime()>now.getTime() && (!best||d.getTime()<best.date.getTime())) best={name:items[i].name,date:d}; }
    return best; }
  function mcTick(){
    var items=window.AC_FEDHOL||[];
    var fEl=document.getElementById('home-wk-friday');
    if(fEl) fEl.textContent=fmtRemain(nextFriday5pm().getTime()-Date.now());
    var hEl=document.getElementById('home-wk-holiday'), nh=nextDateItem(items,false,false);
    if(hEl&&nh) hEl.textContent=fmtRemain(nh.date.getTime()-Date.now());
    var wEl=document.getElementById('home-wk-longweekend'), nw=nextDateItem(items,true,true);
    if(wEl&&nw) wEl.textContent=fmtRemain(nw.date.getTime()-Date.now());
  }
  if(document.getElementById('home-wk-friday')){ mcTick(); setInterval(mcTick,60000); }
  var t=new Date(); t=Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate());
  [].slice.call(document.querySelectorAll('.cd-days[data-date]')).forEach(function(c){ var p=c.getAttribute('data-date').split('-'); var d=Date.UTC(+p[0],+p[1]-1,+p[2]); var n=Math.round((d-t)/86400000); c.textContent=n<=0?'today':n===1?'tomorrow':'in '+n+'d'; });
})();
`;


/* sp(card, n, tab) — put a card on the home board at n/12 of the width and tag
   it for the tab filter. It rewrites the card's OWN root class rather than
   wrapping it in a positioning div: a wrapper would become the grid item, and
   the card inside it would then stretch or not depending on the wrapper's own
   alignment — one more thing between "this card is a third" and the card. */
/* `not` lists tabs the card stays OUT of even when they would otherwise
   include it — "all" is the one that matters, and it is how the planet-moon
   cards stay on the Space tab without adding six cards to the everything
   view. Same attribute the classroom block uses; HOME_TABS_JS reads both. */
const sp = (html, n, hg, not) =>
  html.replace(/class="([^"]*)"/, (_m, c) =>
    `class="${c} sp-${n}" data-hg="${hg}"${not ? ` data-hg-not="${not}"` : ""}`);

const ALARM_CARD = `    <div class="tc tc-alarm" data-href="/alarm-clock/">
      <div class="tc-head">${ico("alarm")} Alarm Clock</div>
      ${PANEL_HTML}
      <div class="ac-controls">
        <div class="ac-ctrl-row ac-ctrl-main"><a class="btn" href="/alarm-clock/?set=1">Add Alarm</a></div>
        <div class="ac-ctrl-row ac-ctrl-icons">
          <a class="btn ac-icon" href="/alarm-clock/#ac-instructions" aria-label="How it works" title="How it works">?</a>
          <button class="btn ac-icon ac-swatch" id="home-ac-color" type="button" aria-label="Change display color" title="Change display color"></button>
          <a class="btn ac-icon" href="/alarm-clock/?bedside=1" aria-label="Full screen bedside clock" title="Full screen bedside clock">${FS_ICON}</a>
        </div>
      </div>
      <p class="tc-alarm-note">Open ${FS_ICON} to see the full screen bedside clock.</p>
    </div>`;
const TIMER_CARD = `    <div class="tc tc-mini" data-href="/timer/"><div class="tc-head">${ico("timer")} Timer</div><div class="tc-big seg-screen">${segMarkup("00:05:00")}</div><div class="tc-presets"><a class="chip" href="/timer/1-minute/">1 min</a><a class="chip" href="/timer/5-minutes/">5 min</a><a class="chip" href="/timer/10-minutes/">10 min</a><a class="chip" href="/timer/15-minutes/">15 min</a></div><div class="tc-foot"><a class="btn tc-open-btn" href="/timer/">Open Timer</a></div></div>`;
/* Static preview of the stopwatch mid-session (a running time + three laps with
   the fastest/slowest highlighted) so the card shows what the tool does at a
   glance. It is purely illustrative — the whole card links to /stopwatch/, which
   always opens fresh at zero; no state carries over. */
const STOPWATCH_CARD = `    <a class="tc tc-mini tc-sw" href="/stopwatch/"><div class="tc-head">${ico("stopwatch")} Stopwatch</div><div class="sw-in"><div class="tc-big seg-screen">${segMarkup("00:13.24")}</div><div class="tool-controls sw-main-controls"><span class="btn">Start</span><span class="btn secondary">Lap</span></div><div class="lap-stats"><span class="lap-stat lap-fast">Fastest<b>00:03.86</b></span><span class="lap-stat lap-slow">Slowest<b>00:04.51</b></span><span class="lap-stat">Average<b>00:04.15</b></span></div><div class="lap-head"><span>Lap</span><span>Lap time</span><span>Total</span></div><ul class="laps"><li class="lap-row lap-slow"><span class="lap-n">Lap 3</span><span>00:04.51</span><span class="lap-tot">00:12.47</span></li><li class="lap-row lap-fast"><span class="lap-n">Lap 2</span><span>00:03.86</span><span class="lap-tot">00:07.96</span></li><li class="lap-row"><span class="lap-n">Lap 1</span><span>00:04.10</span><span class="lap-tot">00:04.10</span></li></ul><div class="tc-foot"><span class="btn tc-open-btn">Open</span></div></div></a>`;
/* World clock teaser: four widely-known clocks, baked at build (the hourly
 * rebuild keeps them within the hour) and each linking to that city's own page,
 * which ticks live. */
/* the dots on the day-and-night map and the four clocks under it. Both lists
   live in daynight.mjs, because /day-night-map/ marks the same cities. */
const MAP_EXTRA = DN_MAP_EXTRA;
const HOME_WC = DN_MAP_BIG;
const wcTime = (tz) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(_hbNow); } catch (e) { return ""; } };

/* ---- the two simulators and the classroom guide ---------------------------
 * STATIC BY DESIGN. Both simulators are heavy pages — a solver, a drawing
 * loop, a slider — and none of that belongs on the home page. What ships here
 * is one baked SVG each and a link. The solar thumbnail is genuinely today's
 * inner planets (drawn at build, refreshed by the same cron as the sun and moon
 * cards); the Earth-Moon one is a schematic, because the real view needs a
 * location and the home page does not have one.
 * ---------------------------------------------------------------------------- */
/* THE MOON GOES ROUND, AND THE PHASE CHANGES WITH IT. The card's job is to say
   "this thing moves", and a still picture of a simulator cannot.

   IT IS THE SIMULATOR'S OWN GEOMETRY, read from ORR_GEOM — same frame shape,
   same sun on the left edge, same orbit, same body sizes — so the card shows
   what the page actually looks like rather than a square cartoon of it. Only
   the detail is dropped: no daily circle, no axis, no city marker.

   In the orbit the moon stays half lit, by two nested rotations that carry it
   round the Earth and turn it back about its own centre. From directly above,
   every moon is exactly half lit whatever its phase — that is the fact the full
   picture is built on, and a rolling crescent here would contradict it.

   The PHASE is therefore a second disc, the same moon seen from the ground,
   which is the pairing the simulator page makes too. It is SYNCHRONISED to the
   orbit rather than merely looping at the same rate: HM_DELAY works out from
   the drawn positions how far round full moon falls, and offsets the phase
   animation by exactly that. */
const G = ORR_GEOM;
const HM = {
  cx: G.CX, cy: G.CY, r: G.R, rm: G.RM, mr: G.MR,
  sx: G.SX, sy: G.SY, rs: G.RS, w: G.W, h: G.H,
  period: 18,
  /* the moon starts up and to the right of the Earth, away from the sun */
  mx: G.CX + G.RM * Math.SQRT1_2, my: G.CY - G.RM * Math.SQRT1_2,
  /* the phase disc, tucked into the bottom-right corner. It was in the open sky
     between the sun and the orbit, where a white disc that size simply read as
     a SECOND MOON sitting between the two — the one misreading this picture
     cannot afford. Out here it is clearly an inset: outside the orbit ring by a
     comfortable margin, and clear of the moon's own path. */
  px: 446, py: 244, pr: 17,
};
const HM_DELAY = (() => {
  const ax = HM.sx - HM.cx, ay = HM.sy - HM.cy;          /* Earth -> sun   */
  const mx = HM.mx - HM.cx, my = HM.my - HM.cy;          /* Earth -> moon  */
  let sep = Math.atan2(ax * my - ay * mx, ax * mx + ay * my) * 180 / Math.PI;
  if (sep < 0) sep += 360;                               /* clockwise, 0..360 */
  const toFull = (180 - sep + 360) % 360 / 360;
  return -(((0.5 - toFull) % 1 + 1) % 1) * HM.period;
})();
const f1 = (n) => Math.round(n * 10) / 10;

const _simThumb = `<svg viewBox="0 0 ${HM.w} ${HM.h}" aria-hidden="true" class="home-simsvg">
<defs><radialGradient id="hm-glow" gradientUnits="userSpaceOnUse" cx="${HM.sx}" cy="${HM.sy}" r="${HM.rs + 26}">
<stop offset="${f1(HM.rs / (HM.rs + 26))}" stop-color="#fcd34d" stop-opacity=".34"/><stop offset="1" stop-color="#fcd34d" stop-opacity="0"/></radialGradient>
<clipPath id="hm-clip"><rect width="${HM.w}" height="${HM.h}" rx="16"/></clipPath></defs>
<g clip-path="url(#hm-clip)">
<rect width="${HM.w}" height="${HM.h}" rx="16" fill="#0a1020"/>
<circle cx="${HM.sx}" cy="${HM.sy}" r="${HM.rs + 26}" fill="url(#hm-glow)"/>
<circle cx="${HM.sx}" cy="${HM.sy}" r="${HM.rs}" fill="#fcd34d"/>
<text x="${HM.sx}" y="${HM.sy + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#4b3a05">Sun</text>
<circle cx="${HM.cx}" cy="${HM.cy}" r="${HM.rm}" fill="none" stroke="#a8b6c8" stroke-opacity=".3" stroke-width="1" stroke-dasharray="2 4"/>
<circle cx="${HM.cx}" cy="${HM.cy}" r="${HM.r}" fill="#2f74ad"/>
<path d="M${HM.cx} ${HM.cy - HM.r}A${HM.r} ${HM.r} 0 0 1 ${HM.cx} ${HM.cy + HM.r}Z" fill="#050a16" fill-opacity=".84"/>
<circle cx="${HM.cx}" cy="${HM.cy}" r="${HM.r}" fill="none" stroke="#9dc2e0" stroke-opacity=".45"/>
<g class="hm-orbit" style="--hm-o:${HM.cx}px ${HM.cy}px"><g class="hm-face" style="--hm-o:${f1(HM.mx)}px ${f1(HM.my)}px">
<circle cx="${f1(HM.mx)}" cy="${f1(HM.my)}" r="${HM.mr}" fill="#4b5563"/>
<path d="M${f1(HM.mx)} ${f1(HM.my - HM.mr)}A${HM.mr} ${HM.mr} 0 0 0 ${f1(HM.mx)} ${f1(HM.my + HM.mr)}Z" fill="#e8eef7"/>
<circle cx="${f1(HM.mx)}" cy="${f1(HM.my)}" r="${HM.mr}" fill="none" stroke="#cbd5e1" stroke-opacity=".55"/>
</g></g>
${/* the same moon seen from the ground, cycling in step with the orbit */""
}<g class="hm-phase" style="--hm-o:${HM.px}px ${HM.py}px;--hm-d:${HM_DELAY.toFixed(2)}s">
<circle cx="${HM.px}" cy="${HM.py}" r="${HM.pr}" fill="#222c3d"/>
<path d="M${HM.px} ${HM.py - HM.pr}A${HM.pr} ${HM.pr} 0 0 1 ${HM.px} ${HM.py + HM.pr}Z" fill="#e8eef7"/>
<ellipse class="hm-term" style="--hm-o:${HM.px}px ${HM.py}px;--hm-d:${HM_DELAY.toFixed(2)}s" cx="${HM.px}" cy="${HM.py}" rx="${HM.pr}" ry="${HM.pr}"/>
<circle cx="${HM.px}" cy="${HM.py}" r="${HM.pr}" fill="none" stroke="#8fa3bd" stroke-opacity=".55"/>
</g>
</g>
</svg>`;

/* NOT the real solar SVG: that frame is 900px square and at thumbnail size the
   planets shrink to sub-pixel mush. This is a schematic at the size it will
   actually be seen, and a tenth of the bytes.
   IT STAYS SQUARE while its neighbour is 16:9, because each card shows the
   shape of the page behind it and those two pages genuinely differ — the solar
   frame is square precisely because concentric circles in a widescreen box are
   limited by the short side and the corners hold nothing. What matches instead
   is the LAYOUT and the HEIGHT: HOME_SQ below sizes this square to exactly the
   height its landscape neighbour renders at, so the two cards line up.
   THE PLANETS GO ROUND, one CSS rotation each about the sun, and the inner ones
   go faster — which is the one true thing a four-ring schematic can say about
   how the real system moves, and the whole reason the page it links to has a
   speed control. Each dot is placed exactly on its own ring (two of the four
   used to sit several pixels off theirs, which nobody could see until they
   started travelling). Off under prefers-reduced-motion. */
/* TILTED, AND THE SAME SHAPE AS THE CARD BESIDE IT. The thumbnail was a square
   of concentric circles, so it sat in a square well next to a 16:9 picture and
   the two cards only lined up because a --sq variable was doing arithmetic to
   make them. Tilting the view makes it genuinely wide and short, which is the
   shape the row wants — and it is the same move the simulator itself now offers
   on a slider, so the card advertises what the page does.
   THE TILT IS DERIVED, NOT PICKED: cos(tilt) is exactly what makes the drawing
   fill the orrery's own frame in both directions, so if that frame ever changes
   shape this follows it rather than drifting out of step.
   Each planet rotates INSIDE the squash group, so a plain rotation traces the
   tilted ellipse; the dots are drawn as ellipses with ry/cos so they come out
   round on the other side of it. */
const _solT = (() => {
  const W = ORR_GEOM.W, H = ORR_GEOM.H, pad = 15;
  const R = W / 2 - pad, cos = (H / 2 - pad) / R;
  return { W, H, cx: W / 2, cy: H / 2, R, cos, tilt: Math.round(Math.acos(cos) * 180 / Math.PI) };
})();
/* lighten (pct>0) or darken (pct<0) a hex colour — the same cheap trick
   planets.mjs's solShade() uses on the real simulator, kept as its own small
   copy here rather than imported: this thumbnail is a standalone schematic
   with its own four-colour palette, not a rendering of SOLAR_JS. Without it
   each dot was one flat fill, which is what "looks flat" was describing. */
const _shade = (hex, pct) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = pct < 0 ? 0 : 255, p = Math.abs(pct);
  const v = (Math.round((t - r) * p) + r << 16) | (Math.round((t - g) * p) + g << 8) | (Math.round((t - b) * p) + b);
  return `#${(0x1000000 + v).toString(16).slice(1)}`;
};
const _solarThumb = (() => {
  const T = _solT, f = (n) => Math.round(n * 10) / 10;
  /* four orbits at the same relative radii the old thumbnail used */
  const rings = [[0.365, "#b8b3ab", ".45"], [0.577, "#e6c98a", ".45"], [0.788, "#4a90c8", ".5"], [1, "#c86a4a", ".45"]];
  /* where each planet starts, and how big — unchanged from the square version */
  const dots = [[0.365, 2.4, "#b8b3ab", 40], [0.577, 3.4, "#e6c98a", 205], [0.788, 3.4, "#4a90c8", 315], [1, 2.8, "#c86a4a", 130]];
  const sq = `<g transform="translate(0 ${f(T.cy * (1 - T.cos))}) scale(1 ${f(T.cos)})">`;
  let o = `<svg viewBox="0 0 ${T.W} ${T.H}" aria-hidden="true" class="home-simsvg">`
    + `<rect width="${T.W}" height="${T.H}" rx="10" fill="#0a1020"/>`;
  /* a highlight near the upper-left and a darker rim, per planet colour — a
     sphere lit from one side, rather than a flat punched-out circle. Keyed to
     each ellipse's OWN bounding box (objectBoundingBox), so one three-stop
     gradient works for all four regardless of their drawn radius. */
  o += `<defs>${dots.map(([, , col], i) => `<radialGradient id="hsg${i}" gradientUnits="objectBoundingBox" cx=".35" cy=".32" r=".75"><stop offset="0" stop-color="${_shade(col, .55)}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${_shade(col, -.35)}"/></radialGradient>`).join("")}</defs>`;
  o += sq;
  for (const [k, col, op] of rings)
    o += `<circle cx="${T.cx}" cy="${T.cy}" r="${f(T.R * k)}" fill="none" stroke="${col}" stroke-opacity="${op}"/>`;
  dots.forEach(([k, r, , deg], i) => {
    const a = deg * Math.PI / 180, x = T.cx + T.R * k * Math.cos(a), y = T.cy + T.R * k * Math.sin(a);
    o += `<g class="hs-p${i + 1}"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${r}" ry="${f(r / T.cos)}" fill="url(#hsg${i})"/></g>`;
  });
  o += `</g>`;
  /* the sun sits OUTSIDE the squash: it is a sphere, not an orbit */
  o += `<circle cx="${T.cx}" cy="${T.cy}" r="11" fill="#fcd34d" fill-opacity=".18"/>`
    + `<circle cx="${T.cx}" cy="${T.cy}" r="7" fill="#fcd34d"/>`;
  return o + `</svg>`;
})();

/* The picture is the pitch here, so it gets the card's full width at the
   simulator's own proportions and the copy comes down to one line. Three
   sentences beside a 96px thumbnail said less than the moving picture does. */
/* THE MOON'S OWN CYCLE, as a dim progress bar under the picture. The puck
   rides the SAME 18s linear infinite animation as .hm-orbit above it (one
   keyframe, translateX 0 -> 100%, restarting the instant it completes) so it
   stays in step with the moon actually going round without a second timer —
   and "restarting the instant it completes" is exactly "goes 0 to 27 and
   starts over". Dim on purpose (opacity, muted colour, 10px type): this is a
   caption for the picture, not a second thing to look at. ${SIDEREAL} is the
   SIDEREAL month — one real orbit, which is what is animating here — not the
   29.53-day cycle of phases; that number lives on the simulator page itself
   (id="learn") rather than being retyped as "27" here. */
const MOONPROG = `<div class="home-moonprog" aria-hidden="true">
        <span class="home-moonprog-n">0</span>
        <span class="home-moonprog-track"><span class="home-moonprog-puck"></span></span>
        <span class="home-moonprog-n">${SIDEREAL}</span>
      </div>
      <p class="home-moonprog-lab" aria-hidden="true">${SIDEREAL}-day orbit</p>`;

const SIM_CARD = `    <div class="tc tc-mini tc-sim" data-href="/sun-moon-earth-movement-simulator/">
      <div class="tc-head">${ico("earthmoon")} Sun, Earth &amp; Moon Simulator</div>
      <div class="home-simwide">${_simThumb}</div>
      ${MOONPROG}
      <p class="home-simtxt">Where the sun and moon are from your town, at any moment.</p>
      ${/* TWO WAYS IN: read about it, or go straight to the picture — which is at
           the top of that page, so a plain link lands on it.
           The second link used to be "Full screen", carrying ?fs=1 to arm the
           page to go full screen on the first tap. Full screen needs a user
           GESTURE and a navigation is not one, so it could never simply be
           requested on arrival; arming the next tap works in a lab and is a
           trap on a phone, where the next tap is usually a scroll. The button
           is on the picture itself once you are there. */""
      }<div class="home-simlinks">
        <a class="wk-all" href="/sun-moon-earth-movement-simulator/#learn">Educational info →</a>
        <a class="wk-all" href="/sun-moon-earth-movement-simulator/">Open the simulator →</a>
      </div>
    </div>`;

/* ---- HOW LONG BETWEEN TWO TIMES, IN TWO ZONES -----------------------------
 * The Time tab had every way of measuring a span you are living through — an
 * alarm ahead of you, a timer running down, a stopwatch counting up — and no
 * way to measure one you are not: a flight, a shift, a call at the other end
 * of the country. That is arithmetic, not a clock, and it is the one question
 * the world-clock card next to it raises and cannot answer.
 *
 * A ZONE ON EACH SIDE is what makes it more than a subtraction: the same two
 * fields answer "how long was I in the air" and "what time is it there now",
 * and the second answer is printed under the first. The form and the maths are
 * time-diff.mjs, shared with /time-difference-calculator/ — one calculator in
 * two places rather than two calculators. Compact here: the full page keeps
 * the minutes pill and the onward links.
 *
 * It works with no JavaScript in the sense every card here does — the fields
 * render and the read-out shows its baked 8h 00m — and the moment the script
 * runs it is live. Nothing is hidden behind the script, so a crawler sees a
 * real tool rather than an empty box. */
const TIMEDIFF_CARD = `    <div class="tc tc-mini tc-tdiff">
      <div class="tc-head">${ico("globe")} Time Between Two Times</div>
      ${tdiffForm({ compact: true })}
      <a class="wk-all" href="/time-difference-calculator/">Full time difference calculator →</a>
    </div>`;

/* ---- THE SAME MOMENT, WRITTEN THE OTHER WAY --------------------------------
 * The Time tab could measure a span (the card above) and read a clock anywhere
 * (the one before it), and could not answer the question a timetable, a
 * boarding pass or a hospital chart actually puts in front of someone: what is
 * 18:40. That is not arithmetic about two moments, it is one moment in the
 * other notation, and it is the highest-volume question on this tab.
 *
 * NO data-href, for the same reason the card above has none: the whole card
 * being a link would navigate away the moment somebody used a select.
 *
 * The form and the conversion are clock-convert.mjs, shared with
 * /24-hour-clock-converter/. Compact here — the two clocks stack and "Use the
 * time now" goes; the full page keeps them, plus the chart and the 48 per-time
 * pages. Like every card on this board it renders finished with no JavaScript:
 * both read-outs and the spoken line are baked, so a crawler sees a real
 * conversion rather than an empty widget. */
const CONVERT_CARD = `    <div class="tc tc-mini tc-conv">
      <div class="tc-head">${ico("clock24")} 12/24-Hour Converter</div>
      ${convForm(18, 40, { compact: true })}
      <a class="wk-all" href="/24-hour-clock-converter/">Full converter, chart &amp; every half hour →</a>
    </div>`;

/* ---- THE STEP BETWEEN THE TWO SIMULATORS, as its own card -----------------
 * /earth-sun-moon-orbit-simulator/ draws the three bodies moving
 * TOGETHER — Earth round the sun, moon round the Earth, at once — which is
 * exactly the picture neither neighbouring card shows: the one to its left is
 * the sky over one town, the one to its right is eight planets and no moon.
 * So it sits between them, and the card is that same picture in miniature.
 *
 * A SCHEMATIC, LIKE ITS TWO NEIGHBOURS. build-home runs long before
 * build-simulator in the pipeline and importing that generator's figure would
 * mean either running the whole 1,100-page simulator build here or exporting a
 * 640x420 SVG to be shrunk to card size, where the moon is a third of a pixel.
 * This is drawn at the size it will actually be seen, the same choice
 * _solarThumb documents above it.
 *
 * WHAT IT KEEPS HONEST IS THE ONE THING THE REAL PAGE KEEPS HONEST: the RATIO
 * of the two periods. The moon's animation runs SIDEREAL/365.25 of the Earth's,
 * imported from build-simulator rather than typed, so the moon laps the Earth
 * about thirteen times per orbit here exactly as it does there — and as it does
 * in the sky. Every SIZE and DISTANCE is invented, as the page itself says at
 * length; a card is not the place to repeat the arithmetic, so it links to it.
 * The lit half of each body faces the sun, by the same nested counter-rotation
 * the real figure uses (.sys-rev), so watching the moon round once IS the phase
 * cycle. Off under prefers-reduced-motion, with the rest of the board. */
const SY = { w: 480, h: 300, rs: 19, reo: 112, re: 8, rmo: 20, rm: 3, earthS: 40 };
SY.cx = SY.w / 2; SY.cy = SY.h / 2;
SY.moonS = +(SY.earthS * (+SIDEREAL) / 365.25).toFixed(2);
SY.ex = SY.cx + SY.reo; SY.mx = SY.ex + SY.rmo;
const _systemThumb = `<svg viewBox="0 0 ${SY.w} ${SY.h}" aria-hidden="true" class="home-simsvg">
<defs><clipPath id="sy-clip"><rect width="${SY.w}" height="${SY.h}" rx="16"/></clipPath></defs>
<g clip-path="url(#sy-clip)">
<rect width="${SY.w}" height="${SY.h}" rx="16" fill="#0a1020"/>
<circle cx="${SY.cx}" cy="${SY.cy}" r="${SY.reo}" fill="none" stroke="#94a3b8" stroke-opacity=".28" stroke-dasharray="3 5"/>
<circle cx="${SY.cx}" cy="${SY.cy}" r="${SY.rs + 11}" fill="#fcd34d" fill-opacity=".16"/>
<circle cx="${SY.cx}" cy="${SY.cy}" r="${SY.rs}" fill="#fcd34d"/>
<g class="hy-orbit" style="--hy-o:${SY.cx}px ${SY.cy}px;animation-duration:${SY.earthS}s">
  <circle cx="${SY.ex}" cy="${SY.cy}" r="${SY.re}" fill="#2f74ad"/>
  <path d="M${SY.ex} ${SY.cy - SY.re}A${SY.re} ${SY.re} 0 0 1 ${SY.ex} ${SY.cy + SY.re}Z" fill="#050a16" fill-opacity=".84"/>
  <circle cx="${SY.ex}" cy="${SY.cy}" r="${SY.re}" fill="none" stroke="#9dc2e0" stroke-opacity=".45"/>
  <circle cx="${SY.ex}" cy="${SY.cy}" r="${SY.rmo}" fill="none" stroke="#cbd5e1" stroke-opacity=".3" stroke-dasharray="2 4"/>
  <g class="hy-mo" style="--hy-o:${SY.ex}px ${SY.cy}px;animation-duration:${SY.moonS}s">
    <g class="hy-rev" style="--hy-o:${SY.mx}px ${SY.cy}px;animation-duration:${SY.moonS}s">
      <circle cx="${SY.mx}" cy="${SY.cy}" r="${SY.rm}" fill="#d8dee9"/>
      <path d="M${SY.mx} ${SY.cy - SY.rm}A${SY.rm} ${SY.rm} 0 0 1 ${SY.mx} ${SY.cy + SY.rm}Z" fill="#050a16" fill-opacity=".84"/>
    </g>
  </g>
</g>
</g>
</svg>`;

const SYSTEM_CARD = `    <div class="tc tc-mini tc-sim" data-href="/earth-sun-moon-orbit-simulator/">
      <div class="tc-head">${ico("earthmoon")} Earth, Moon &amp; Sun Together</div>
      <div class="home-simwide">${_systemThumb}</div>
      <p class="home-simtxt">The year and the month running at once — and the moon lapping the Earth about thirteen times on the way round, which is the one ratio this picture keeps real. Tip the whole orbit edge-on and watch the Earth loop in front of the sun, then behind it.</p>
      <div class="home-simlinks">
        <a class="wk-all" href="/earth-sun-moon-orbit-simulator/#learn">Educational info →</a>
        <a class="wk-all" href="/earth-sun-moon-orbit-simulator/">Open the view →</a>
      </div>
    </div>`;

/* ---- A CARD PER PLANET THAT HAS MOONS, on the Space tab only ---------------
 * Six of them — Mars, Jupiter, Saturn, Uranus, Neptune, Pluto — which is
 * exactly the set of planets with a moons rung on the simulator. Mercury and
 * Venus have none and get no card; Earth's moon is not a seventh card, because
 * it already has two of its own directly above (the simulator and the system
 * view), and a third saying the same thing would be the board repeating itself.
 *
 * SPACE TAB ONLY, INCLUDING NOT ON ALL (data-hg-not="all"). Six extra cards in
 * the everything view would bury the tools that view exists to show — the same
 * reasoning, and the same mechanism, as the classroom cards.
 *
 * WHAT IS REAL HERE IS WHAT IS REAL ON THE SIMULATOR: the orbit radii and the
 * periods, read from satellites.mjs, whose table is proved against Kepler's
 * third law by check-solar-data. Each moon's ring is its own semi-major axis
 * as a fraction of the frame moon's, and each moon's animation takes its real
 * period in the same proportion — so Io really does lap Callisto nine times
 * over, and Phobos really does outrun the rest of the picture. WHERE a moon is
 * on its ring at any instant is NOT solved (this repo doesn't solve for that,
 * and says so on the pages); the starting angles are a spread by index, which
 * is why the card claims spacing and speed and never position. Moons beyond
 * the frame moon are left out of the drawing rather than shrinking it to a
 * smudge — the count line says how many the planet really has. */
const MOON_PLANETS = [
  { slug: "mars", idx: 3, name: "Mars", col: "#c86a4a" },
  { slug: "jupiter", idx: 4, name: "Jupiter", col: "#d9a878" },
  { slug: "saturn", idx: 5, name: "Saturn", col: "#e3cd9a" },
  { slug: "uranus", idx: 6, name: "Uranus", col: "#8fd0da" },
  { slug: "neptune", idx: 7, name: "Neptune", col: "#6b8fd8" },
  { slug: "pluto", idx: 8, name: "Pluto", col: "#c9b7a8" },
];
const MOONV = { w: 300, h: 300, pad: 12 };
MOONV.cx = MOONV.w / 2; MOONV.cy = MOONV.h / 2;
MOONV.rMax = MOONV.w / 2 - MOONV.pad;
/* seconds for ONE lap of the frame moon. Every other moon's duration is this
   scaled by its real period ratio, so the whole system's relative speeds are
   the sky's and only the absolute rate is a viewing choice. */
const MOON_LAP = 26;
/* an orbital period in words. Under a day it reads in hours, because "0.3
   days" is not how anybody holds Phobos's 7-hour orbit in their head. */
const fmtDays = (d) => {
  if (d < 1) { const h = d * 24; return `${h < 10 ? h.toFixed(1) : Math.round(h)} hours`; }
  return `${d < 10 ? d.toFixed(1) : Math.round(d)} days`;
};

function moonThumb(p) {
  const sys = SAT_SYS[p.idx];
  const frame = sys.moons.find((m) => m[0] === sys.frame);
  const aMax = frame[1], pFrame = Math.abs(frame[2]);
  /* only the moons inside the frame moon's orbit, plus the frame moon itself */
  const drawn = sys.moons.filter((m) => m[1] <= aMax);
  /* the planet's own disc, to scale against the orbits — the same thing a
     moons rung on the simulator does, and what makes Phobos's orbit read as
     genuinely skimming the surface */
  const rp = Math.max(3, MOONV.rMax * (sys.req / aMax));
  let o = `<svg viewBox="0 0 ${MOONV.w} ${MOONV.h}" aria-hidden="true" class="home-moonsvg">`
    + `<defs><clipPath id="mn-c-${p.slug}"><rect width="${MOONV.w}" height="${MOONV.h}" rx="14"/></clipPath>`
    + `<radialGradient id="mn-g-${p.slug}" gradientUnits="objectBoundingBox" cx=".35" cy=".32" r=".75">`
    + `<stop offset="0" stop-color="${_shade(p.col, .55)}"/><stop offset=".55" stop-color="${p.col}"/>`
    + `<stop offset="1" stop-color="${_shade(p.col, -.35)}"/></radialGradient></defs>`
    + `<g clip-path="url(#mn-c-${p.slug})"><rect width="${MOONV.w}" height="${MOONV.h}" rx="14" fill="#0a1020"/>`;
  /* the ring system, where there is one, drawn from its real inner and outer
     radii on the same scale as everything else */
  if (sys.ring) {
    const ri = MOONV.rMax * (sys.ring[0] / aMax), ro = MOONV.rMax * (sys.ring[1] / aMax);
    o += `<circle cx="${MOONV.cx}" cy="${MOONV.cy}" r="${((ri + ro) / 2).toFixed(1)}" fill="none" stroke="${p.col}" stroke-opacity=".33" stroke-width="${Math.max(1, ro - ri).toFixed(1)}"/>`;
  }
  o += `<circle cx="${MOONV.cx}" cy="${MOONV.cy}" r="${rp.toFixed(1)}" fill="url(#mn-g-${p.slug})"/>`;
  drawn.forEach((m, i) => {
    const r = MOONV.rMax * (m[1] / aMax);
    const dur = (MOON_LAP * Math.abs(m[2]) / pFrame).toFixed(2);
    /* a golden-angle spread so they don't set off from one radius line — the
       same device satellites.mjs uses, and for the same stated reason */
    const a = (i * 137.508) * Math.PI / 180;
    const mx = MOONV.cx + r * Math.cos(a), my = MOONV.cy + r * Math.sin(a);
    /* legibility floor, then real relative size above it: at Jupiter's frame
       Ganymede is 2.4px and Metis 0.02, so a pure scale would draw nothing */
    const rm = Math.max(1.6, Math.min(5, 1.6 + Math.sqrt(m[3] / 400)));
    o += `<circle cx="${MOONV.cx}" cy="${MOONV.cy}" r="${r.toFixed(1)}" fill="none" stroke="#cbd5e1" stroke-opacity=".22" stroke-dasharray="2 4"/>`
      + `<g class="hy-sat${m[2] < 0 ? " hy-retro" : ""}" style="--hy-o:${MOONV.cx}px ${MOONV.cy}px;animation-duration:${dur}s">`
      + `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${rm.toFixed(1)}" fill="#e2e8f0"/></g>`;
  });
  return o + `</g></svg>`;
}

/* One card per planet. The copy is the honest reading of the picture: what the
   spacing and the speeds mean, how many moons are really there against how
   many are drawn, and — where there is one — that a moon goes round backwards,
   which the drawing shows and nothing else on the board does. */
const MOON_CARDS = MOON_PLANETS.map((p) => {
  const sys = SAT_SYS[p.idx];
  const frame = sys.moons.find((m) => m[0] === sys.frame);
  const drawn = sys.moons.filter((m) => m[1] <= frame[1]);
  const total = SAT_COUNT[p.idx];
  /* DRAWN moons only. Saturn's retrograde moon is Phoebe, which is nine times
     further out than the frame moon and therefore not in this picture — a card
     that says "Phoebe goes round backwards" over a drawing with no Phoebe in it
     is the caption describing a different image. Neptune's Triton IS drawn, and
     does run backwards here. */
  const retro = drawn.filter((m) => m[2] < 0).map((m) => m[0]);
  const beyond = sys.moons.length - drawn.length;
  const inner = drawn.reduce((a, m) => (Math.abs(m[2]) < Math.abs(a[2]) ? m : a), drawn[0]);
  const laps = (Math.abs(frame[2]) / Math.abs(inner[2]));
  return `    <div class="tc tc-mini tc-sim tc-moons" data-href="${planetPath(p.slug, p.idx)}">
      <div class="tc-head">${ico("solar")} ${esc(p.name)}&rsquo;s Moons</div>
      <div class="home-moonwrap">${moonThumb(p)}</div>
      <p class="home-simtxt">${drawn.length === 1
    ? `${esc(drawn[0][0])} goes round in ${fmtDays(Math.abs(drawn[0][2]))}.`
    : `${esc(inner[0])} laps ${esc(frame[0])} about ${laps < 10 ? laps.toFixed(1) : Math.round(laps)} times over — ${fmtDays(Math.abs(inner[2]))} against ${fmtDays(Math.abs(frame[2]))}.`
} Orbits, periods and sizes are real; where each moon sits on its ring is not solved here${beyond ? `, and ${beyond} further out ${beyond === 1 ? "is" : "are"} off the edge of this frame` : ""}.${retro.length ? ` ${esc(retro.join(" and "))} goes round backwards.` : ""}</p>
      <p class="home-moonline">${total} confirmed moon${total === 1 ? "" : "s"} · ${drawn.length} drawn</p>
      <a class="wk-all" href="${planetPath(p.slug, p.idx)}">${esc(p.name)} and its moons →</a>
    </div>`;
});

/* A square that renders at exactly the height of the 16:9 picture beside it:
   that one is width x H/W tall, so a square of the same height is H/W of the
   width. Derived from the orrery's own frame, so if that ever changes shape the
   two cards stay level. */
const HOME_SQ = `${(ORR_GEOM.H / ORR_GEOM.W * 100).toFixed(2)}%`;

const SOLAR_CARD = `    <div class="tc tc-mini tc-sim" data-href="/solar-system-simulator/">
      <div class="tc-head">${ico("solar")} Solar System Simulator</div>
      <div class="home-simwide" style="--hs-o:${_solT.cx}px ${_solT.cy}px">${_solarThumb}</div>
      <p class="home-simtxt">The planets where they actually are today.</p>
      <div class="home-simlinks">
        <a class="wk-all" href="/solar-system-simulator/#learn">Educational info →</a>
        <a class="wk-all" href="/solar-system-simulator/">Open the simulator →</a>
      </div>
    </div>`;

/* THE PLANET PAGES, as their own card. The Solar System tab would otherwise be
   two simulators and nothing else, and the eleven child pages — a page per
   planet, plus the belt and the comets — are the part of that section with the
   most to read. Chips rather than a sentence: the planet name IS the link
   anybody is looking for. */
const PLANETS_CARD = `    <div class="tc tc-mini tc-sim" data-href="${PLANETS_PATH}">
      <div class="tc-head">${ico("solar")} The planets</div>
      <p class="home-simtxt">A picture and a couple of paragraphs for each one, in orbital order, with the asteroid belt where it actually sits and Pluto labelled for what it is — and a page for every one of them, turning on its own axis with its moons going round it.</p>
      <div class="tc-presets">
${["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"].map((sl, i) => `        <a class="chip" href="${planetPath(sl, i)}">${sl[0].toUpperCase() + sl.slice(1)}</a>`).join("")}
        <a class="chip" href="/solar-system-simulator/asteroid-belt/">Asteroid belt</a><a class="chip" href="/solar-system-simulator/comets/">Comets</a>
      </div>
      <a class="wk-all" href="${PLANETS_PATH}">All the planets, side by side →</a>
    </div>`;

/* ---------------------------------------------------------------------------
 * "WHAT IF IT SLOWED DOWN?" — one moon, two buttons.
 *
 * Owner's ask, and the right question to put on a card: everyone who has looked
 * at an orbit has wondered what happens if the thing goes slower, and almost
 * everyone guesses "it spirals in". It does not. It swings out to the same
 * point it was pushed from and comes back, on a longer, more lopsided ellipse.
 *
 * The picture is the honest two-body answer, not an animation of a guess. Give
 * a circular orbit of radius r a speed k times the circular speed and the new
 * ellipse follows from the vis-viva equation alone:
 *
 *     a = r / (2 - k²)          e = |k² - 1|
 *
 * with the push point at perihelion when k > 1 and at aphelion when k < 1. The
 * moon then sweeps equal areas in equal times (Kepler's second law, applied as
 * dθ ∝ 1/r²), which is why it visibly dawdles at the far end — the part of the
 * behaviour a hand-drawn loop always gets wrong.
 *
 * It is ~40 lines and no imports; the real thing, with the sun's pull, escape
 * velocity and the fall into the sun, is one click away on its own page.
 * ------------------------------------------------------------------------- */
const ORBIT_CARD = `    <div class="tc tc-mini tc-sim" data-href="${OV_PATH}">
      <div class="tc-head">${ico("solar")} What if a moon slowed down?</div>
      <div class="home-orb" id="ho-wrap">
        <svg viewBox="0 0 320 200" width="100%" aria-hidden="true" id="ho-svg">
          <rect width="320" height="200" rx="10" fill="#080d1a"/>
          <ellipse id="ho-path" cx="160" cy="100" rx="70" ry="70" fill="none" stroke="#9dc2e0" stroke-opacity=".38" stroke-width="1" stroke-dasharray="3 4"/>
          <circle cx="160" cy="100" r="13" fill="#2f74ad"/>
          <circle id="ho-moon" cx="230" cy="100" r="4.5" fill="#e8eef7"/>
        </svg>
        <p class="home-orbtxt" id="ho-note">A circle: falling exactly as fast as the curve carries it away.</p>
        <p class="home-orbbtns">
          <button type="button" class="chip" id="ho-slow">Slow it down</button>
          <button type="button" class="chip" id="ho-fast">Speed it up</button>
          <button type="button" class="chip chip-alt" id="ho-reset">Circle</button>
        </p>
      </div>
      <p class="home-simtxt">Nothing spirals in. Take speed away and the far side of the orbit drops toward the planet; add speed and it climbs away — and either way the moon comes back through the point where you changed it.</p>
      <a class="wk-all" href="${OV_PATH}">Why planets don't fall into the sun →</a>
    </div>`;

/* the card's own script — kept out of the shared home bundle because it is the
   only thing on the page that uses it, and it is smaller than the comment above */
const ORBIT_JS = `<script>(function(){
  var wrap=document.getElementById('ho-wrap'); if(!wrap) return;
  var path=document.getElementById('ho-path'), moon=document.getElementById('ho-moon'),
      note=document.getElementById('ho-note');
  var R=70, CX=160, CY=100, k=1, th=0, iv=0;
  var NOTE={
    circle:'A circle: falling exactly as fast as the curve carries it away.',
    slow:'Slower at that point \u2014 so the far side of the orbit drops in toward the planet. It speeds up again as it falls.',
    fast:'Faster at that point \u2014 so the far side climbs away. It slows down as it climbs, and comes back.',
    esc:'Past escape speed \u2014 about 1.41 times the circular speed \u2014 the orbit stops being a loop at all.'
  };
  /* the vis-viva result: everything the picture does comes from these two lines */
  function geom(){
    var kk=k*k;
    if(kk>=2) return null;                       /* escape: no closed ellipse */
    var a=R/(2-kk), e=Math.abs(kk-1), b=a*Math.sqrt(1-e*e);
    /* the push point stays put: perihelion for a speed-up, aphelion for a
       slow-down, so the ellipse pivots about the moon rather than sliding */
    var cx=CX+(k<1?(a-R):-(a-R));
    return { a:a, b:b, e:e, cx:cx };
  }
  function draw(){
    var g=geom();
    if(!g){ path.setAttribute('rx',R*2.4); path.setAttribute('ry',R*2.4); path.setAttribute('cx',CX); return; }
    path.setAttribute('rx',g.a.toFixed(2)); path.setAttribute('ry',g.b.toFixed(2));
    path.setAttribute('cx',g.cx.toFixed(2));
  }
  function step(){
    var g=geom(); if(!g) return;
    /* r from the FOCUS — the planet — with the push point held on the right at
       radius R: that point is perihelion when the moon was sped up and
       aphelion when it was slowed down, which is the sign flip below and the
       whole reason the ellipse pivots about the moon instead of sliding. */
    var r=g.a*(1-g.e*g.e)/(1+(k<1?-1:1)*g.e*Math.cos(th));
    /* Kepler's second law, as a drawing rule: sweep dtheta proportional to
       1/r squared, which is what makes it crawl at the far end */
    th+=0.05*Math.pow(R/r,2);
    if(th>Math.PI*2) th-=Math.PI*2;
    moon.setAttribute('cx',(CX+r*Math.cos(th)).toFixed(2));
    moon.setAttribute('cy',(CY+r*Math.sin(th)).toFixed(2));
  }
  function set(nk,msg){ k=Math.max(0.45,Math.min(1.45,nk)); draw();
    note.textContent=(k>=1.414?NOTE.esc:msg); }
  document.getElementById('ho-slow').addEventListener('click',function(e){ e.stopPropagation(); set(k-0.12,NOTE.slow); });
  document.getElementById('ho-fast').addEventListener('click',function(e){ e.stopPropagation(); set(k+0.12,NOTE.fast); });
  document.getElementById('ho-reset').addEventListener('click',function(e){ e.stopPropagation(); th=0; set(1,NOTE.circle); });
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function run(on){ if(iv){ clearInterval(iv); iv=0; } if(on&&!reduce) iv=setInterval(step,45); }
  document.addEventListener('visibilitychange',function(){ run(!document.hidden); });
  draw(); run(!document.hidden);
})();</script>`;

/* Rocket launches has its own page now — the launch-window solver, the flight
   path and what the real missions did instead — so it gets its own way in
   rather than being a control buried in the simulator's settings. */
const ROCKET_CARD = `    <div class="tc tc-mini tc-sim" data-href="${ROCKET_PATH}">
      <div class="tc-head">${ico("rocket")} Rocket Launches</div>
      <p class="home-simtxt">When the next window to Mars, Jupiter or Saturn opens, how long the flight takes and what it costs in speed — every date solved from the real orbits, and the path drawn so you can fly it.</p>
      <div class="tc-presets">
        <a class="chip" href="${ROCKET_PATH}#windows">Next window to Mars</a><a class="chip" href="${ROCKET_PATH}#learn">Why a flyby works</a><a class="chip" href="${ROCKET_PATH}#missions">Cassini, Galileo, Juno</a>
      </div>
      <a class="wk-all" href="${ROCKET_PATH}">Rocket launches &amp; launch windows →</a>
    </div>`;

/* ---------------------------------------------------------------------------
 * THE CLASSROOM TAB — the one part of this site addressed to a teacher.
 *
 * It deliberately does NOT repeat the tool cards. Everywhere else on the page
 * the job is "here is the thing, go and use it". Here the job is "here is what
 * to do with it on a Tuesday morning with thirty eleven-year-olds", which is a
 * different piece of writing and cannot be got at by re-showing the same card.
 *
 * Each card carries: a small picture of the tool, one lesson idea specific
 * enough to run tomorrow, and the link. And each says plainly where the site
 * has taken a liberty — because a lesson built on a simulation should know
 * which parts of it are measurements and which are drawing decisions, and a
 * teacher is exactly the reader who will be asked "is that real?"
 * ------------------------------------------------------------------------- */



/* ---- THE WORLD, LIT ---------------------------------------------------------
 * The world clock card used to be four rows of city + time + an Open button:
 * accurate, useful, and no reason to look at it. What a world clock is ABOUT is
 * that half the planet is in daylight and half is not, and where the line
 * between them falls right now — which is a picture, and a picture a classroom
 * can use. So the card is that picture, with the four city times on it.
 *
 * Equirectangular: x = (lon+180)/360*W, y = (90-lat)/180*H. The coastlines are
 * the same real rings the globes are drawn from, imported rather than copied,
 * because two coastline tables would drift.
 *
 * THE NIGHT SIDE IS SOLVED, NOT DRAWN. A place is in daylight when
 *   sin(dec)*sin(lat) + cos(dec)*cos(lat)*cos(lon - subsolar) > 0,
 * so the terminator is lat = atan(-cos(lon - subsolar) / tan(dec)) — one curve
 * whose SHAPE depends only on the sun's declination and whose POSITION depends
 * only on the subsolar longitude. Declination moves by a fraction of a degree
 * a day, so baking it hourly is exact enough to look at; longitude moves 15
 * degrees an hour, so the browser slides the baked curve to the real position
 * on load. That split is why this costs one number of script instead of a
 * second copy of the solar maths.
 * -------------------------------------------------------------------------- */
/* The geometry, the solar series, the coastline path and the city dots all
   live in daynight.mjs, which /day-night-map/ draws from too — one source, so
   the card and the page it links to cannot draw different maps. */
const WMAP_W = DN_W, WMAP_TOP = DN_TOP, WMAP_BOT = DN_BOT;
const wmX = dnX, wmY = dnY, wmF = dnF;

/* the map and its clock strip are built once and used twice: as the world
   clock card on /time/ and /earth/, and as the HERO of the landing page —
   the one picture that is the whole site (time and space in a single image,
   visibly computed for right now). */
/* the sun's year, solved once — the tropic latitudes the map draws and the
   four instants its season buttons jump to. Shared solver: /day-night-map/
   takes its own from the same function. */
const WK_YEAR = seasonPoints(+_hbNow);
const WK_TILT = WK_YEAR.tilt;

const WK = (() => {
  const ss = subsolar(+_hbNow);
  const land = landPath();
  /* EVERY DOT COMES FROM THE WORLD-CLOCK REGISTRY'S OWN COORDINATES, so a city
     cannot be marked in one place here and another on its own page. Drawn one
     size — landmarks, not a featured four. The world-clock card still puts
     clocks under New York, London, Tokyo and Sydney; the map itself does not
     pick them out. */
  const mark = (tz, big) => cityMark(WC_CITY_LIST, tz, big, esc);
  const dots = MAP_EXTRA.map((tz) => mark(tz, 0)).join("");
  const svg = `<div class="wk-map">
        <svg viewBox="0 ${wmF(wmY(WMAP_TOP))} ${WMAP_W} ${wmF(wmY(WMAP_BOT) - wmY(WMAP_TOP))}" width="100%" aria-label="A world map with the night side shaded and major cities marked" role="img">
          <rect y="${wmF(wmY(WMAP_TOP))}" width="${WMAP_W}" height="${wmF(wmY(WMAP_BOT) - wmY(WMAP_TOP))}" fill="#12304f"/>
          <path d="${land}" fill="#2f5d3a"/>
          ${/* THE EQUATOR AND THE TWO TROPICS. Without a reference line the
               sun marker's latitude is invisible — and that latitude IS the
               season: the sun stands north of the equator through the northern
               summer and south of it through the northern winter, and can
               never leave the band between the tropics, because the band IS
               the tilt. Latitudes from the same solar series that draws the
               night side, so they cannot be typed wrong. */""
          }<g class="wk-grat">
            <line x1="0" y1="${dnF(dnY(0))}" x2="${DN_W}" y2="${dnF(dnY(0))}"/>
            <text x="6" y="${dnF(dnY(0) - 4)}">Equator</text>
            <line class="wk-trop" x1="0" y1="${dnF(dnY(WK_TILT))}" x2="${DN_W}" y2="${dnF(dnY(WK_TILT))}"/>
            <text x="6" y="${dnF(dnY(WK_TILT) - 4)}">Tropic of Cancer</text>
            <line class="wk-trop" x1="0" y1="${dnF(dnY(-WK_TILT))}" x2="${DN_W}" y2="${dnF(dnY(-WK_TILT))}"/>
            <text x="6" y="${dnF(dnY(-WK_TILT) - 4)}">Tropic of Capricorn</text>
          </g>
          ${/* ONE PATH, IN ABSOLUTE MAP COORDINATES. It used to be the curve drawn
               relative to its own subsolar meridian, slid sideways by a
               transform, with a copy either side to cover the wrap — which is
               fine at one repaint a minute and breaks the moment anything
               plays it, because the transform jumps a whole map width each
               time the subsolar longitude crosses the date line. Solving per
               meridian means there is nothing to slide. */""
          }<path id="wk-night" d="${nightPath(ss.dec, ss.lon, 0, 2)}" fill="#050a16" fill-opacity=".66"/>
          ${dots}
          ${/* the point the sun is directly over — the centre of the lit half,
               baked here and moved to the real minute by WORLD_MAP_JS */""
          }<g id="wk-sun" transform="translate(${dnF(dnX(ss.lon))} ${dnF(dnY(ss.dec))})">
            <circle r="11" fill="#fde68a" fill-opacity=".25"/>
            <circle r="5.5" fill="#fde68a" stroke="#b45309" stroke-width="1.4"/>
          </g>
          <g id="wk-me" hidden>
            <circle r="9" fill="#f472b6" fill-opacity=".22"/>
            <circle r="4" fill="#f472b6" stroke="#0b0e1c" stroke-width="1.5"/>
            <text y="-11" text-anchor="middle" font-size="12" font-weight="700" fill="#f9a8d4" paint-order="stroke" stroke="#0b0e1c" stroke-width="3">You</text>
          </g>
        </svg>
      </div>`;
  const strip = `<div class="wk-strip">
${HOME_WC.map((c) => `        <a class="wk-city" href="/world-clock/${c.slug}/"><span>${esc(c.city)}</span><b data-wk-tz="${esc(c.tz)}">${esc(wcTime(c.tz))}</b></a>`).join("\n")}
      </div>`;
  return { svg, strip };
})();

const WORLD_CLOCK_CARD = `    <div class="tc tc-mini tc-world" data-href="${DAYNIGHT_PATH}">
      <div class="tc-head">${ico("globe")} Where it is day right now</div>
      <a class="home-dn-link" href="${DAYNIGHT_PATH}" aria-label="Open the day and night map">${WK.svg}</a>
      ${WK.strip}
      ${/* TWO LINKS, NOT ONE: the map is the day/night page; "what time is
           it there" is a text link under it, not the picture itself. */""
      }<div class="wk-links">
        <a class="wk-all" href="/world-clock/">World clock →</a>
        <a class="wk-all" href="${DAYNIGHT_PATH}">Day/night map →</a>
      </div>
    </div>`;


/* Moon card: the current phase with the real lunar face, plus the next full
 * moon. Baked at build (like the sun card next to it) — the rebuild cron runs
 * three times a day and a phase name is good for days, so it cannot drift
 * visibly, and the homepage stays free of the moon maths. */
const _mnIll = moonSnap(_hbNow);
const _mnFull = nextPhase(_hbNow, 2);
const MOON_CARD = `    <div class="tc tc-mini tc-moon" data-href="/moon/">
      <div class="tc-head">${ico("moon")} Moon Phase Today</div>
      ${/* the phase and the two buttons share one line on a wide screen. The
           summary is three short lines against a full-width card, so the right
           half of it was empty and the buttons sat on a row of their own
           underneath; putting the actions beside the thing they act on fills
           the gap and saves the row. It wraps back to two lines on a phone. */""
      }<div class="home-moon-top">
      <div class="home-moon">
        <span class="home-moon-g">${moonGlyph(_mnIll.fraction, _mnIll.waxing, 34)}</span>
        <div class="home-moon-t">
          <b>${esc(_mnIll.name)}</b>
          <span>${Math.round(_mnIll.fraction * 100)}% illuminated</span>
          <span>Next full moon in ${remainLabel(+_hbNow, _mnFull)}</span>
        </div>
      </div>
      <div class="home-moon-foot"><a class="btn tc-open-btn" href="/moon/near-me/?geo=1">Moon times near me</a><a class="btn secondary tc-open-btn" href="/moon/">Search a city</a></div>
      </div>
      <div class="mn-strip home-moon-strip">
${(() => {
  /* the next 30 nights, each linking to /moon/ for THAT date. /moon/ resolves
     the visitor's own location from their time zone, so the link lands on the
     moon for that night where they are — which is the point of the card. */
  const day0 = Date.UTC(_hbNow.getUTCFullYear(), _hbNow.getUTCMonth(), _hbNow.getUTCDate(), 12);
  let out = "";
  for (let i = 0; i < 30; i++) {
    const t = day0 + i * 86400000, il = moonIllum(t), d = new Date(t);
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    out += `        <a class="mn-day" href="/moon/?date=${iso}"><span class="mn-day-g">${moonGlyph(il.fraction, il.waxing, 15)}</span>`
      + `<span class="mn-day-d">${esc(new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(t))}</span>`
      + `<span class="mn-day-p">${Math.round(il.fraction * 100)}%</span></a>\n`;
  }
  return out;
})()}      </div>
    </div>`;

/* One crawlable row of hub links directly under the hero — the eight sections,
 * in the order the page then presents them, with descriptive anchor text. It
 * costs almost nothing and it is the clearest internal signal the homepage can
 * send about what this site is. */
const TOOL_NAV = `  <nav class="home-nav" aria-label="Tools">
    <a href="/alarm-clock/">Alarm clock</a><a href="/timer/">Timer</a><a href="/stopwatch/">Stopwatch</a
    ><a href="/sun/">Sunrise &amp; sunset</a><a href="/moon/">Moon phase</a><a href="/tides/">Tide charts</a
    ><a href="/world-clock/">World clock</a><a href="/countdown/">Countdowns</a>
  </nav>`;

/* ONE compact countdown section, not four cards competing with the tools.
 * Countdowns are still a real part of the site — the search stays, and so do
 * the three biggest categories — but they no longer take the middle of the
 * homepage away from what the domain is now positioned as. */
const COUNTDOWN_BLOCK = `  <div class="card home-cd-block">
    <h2>${ico("confetti")} Event countdowns</h2>
    <p class="sub">Live countdowns to birthdays, holidays, sports and the days you're waiting for.</p>
${SEARCH}
    <div class="timer-presets home-cd-links">
      <a class="chip" href="/birthday-countdowns/">Celebrity birthdays</a><a class="chip" href="/holiday-countdowns/">Holidays</a><a class="chip" href="/sports-countdowns/">Sports</a><a class="chip" href="/graduation-countdowns/">Graduations</a><a class="chip" href="/calendar/">Event calendar</a>
    </div>
    <a class="more-cta" href="/countdown/">Browse all event countdowns →</a>
  </div>`;

/* Order (owner's call, from the SEO review): alarm first, then the tool nav,
 * then each tool in turn, then ONE countdown block, then the honest-limits
 * links. The tide/sun/moon cards keep their own place in that run. */
/* ---- the four tabs ---------------------------------------------------------
 * The home page had grown to eleven card blocks in one column, which is a long
 * scroll to reach the thing you came for. The tabs cut it to the section you
 * want without taking anything away: nothing is hidden server-side, so every
 * card is in the HTML a crawler sees and the page works untouched with no
 * script. Each block carries data-hg with the tabs it belongs to; two blocks
 * belong to more than one, which is why it is a list and not a single value.
 */
/* ONE INTRO PER TAB. A single paragraph covering five sections has to be
 * either vague or long, and it was both. Each tab now says what THAT tab is
 * for, in a line, and the tab you are on is the only one showing.
 *
 * All five ship in the HTML — four of them `hidden` — so a crawler and a
 * reader with no script both get the "All" line and nothing is invented at
 * runtime. Every claim in them is a claim the site can actually meet: 1,103
 * sun and moon city pages, six stopwatches, spans from a day to a century.
 */
const LEDE = {
  all: `<strong>Gravity, motion, time and space.</strong> A day is Earth turning. A year is it going round. Seasons are that turn being tilted. Built for classrooms and for anyone else who is curious.`,
  time: `<strong>Clocks, and what they are counting.</strong> An <a href="/alarm-clock/">alarm</a>, a <a href="/timer/">timer</a>, a <a href="/stopwatch/">stopwatch</a>, <a href="/world-clock/">every time zone at once</a>, and a <a href="/countdown/">countdown</a> to the day you are waiting for. All of it runs in the browser, with nothing to install and no sign-up.`,
  earth: `<strong>Your own sky, worked out for your own town.</strong> <a href="/sun/">Sunrise and sunset</a>, <a href="/moon/">tonight's moon and how full it is</a>, and <a href="/tides/">when the tide turns</a> — for more than a thousand cities, on whatever date you pick. Every figure is computed from the real motions rather than looked up in a table.`,
  space: `<strong>Where everything actually is, right now.</strong> <a href="${PLANETS_PATH}">Every planet</a>, a page each, turning on its own axis with its moons going round it — the <a href="/solar-system-simulator/">whole system on its real orbits</a>, and the <a href="${ROCKET_PATH}">next launch window to Mars</a>. The positions are solved when the page loads, not drawn from memory.`,
  class: `<strong>Made to go on a projector.</strong> A timer big enough to read from the back, <a href="/stopwatch/multiple/">six stopwatches at once</a>, and simulators you can drag through a day, a month or a century. The <a href="/classroom/">guide</a> sets out what a browser timer can and cannot be trusted with — before a lesson depends on it.`,
};

/* THE NIGHT SIDE IS REPAINTED FOR NOW. The baked curve is right for the minute
 * the page was built; the subsolar longitude moves 15 degrees an hour, so this
 * re-solves it and rewrites the one path. dnPath comes from daynight.mjs — the
 * same function that baked it, and the same one /day-night-map/ animates — so
 * there is no second copy of the solar maths on this page and no transform to
 * wrap at the date line. */
const WORLD_MAP_JS = `
(function(){${DN_CORE}
  var g=document.getElementById('wk-night'), sunG=document.getElementById('wk-sun');
  if(g){
    var tick=function(){
      if(window.__wkHold) return; /* the landing page's slider owns the map */
      var ss=dnSub(Date.now());
      g.setAttribute('d',dnPath(ss.dec,ss.lon,0,2));
      if(sunG) sunG.setAttribute('transform','translate('+dnF(dnX(ss.lon))+' '+dnF(dnY(ss.dec))+')');
    };
    tick(); setInterval(tick,60000);
  }
  /* and the four clocks under it, to the real minute */
  var cs=document.querySelectorAll('[data-wk-tz]');
  function clocks(){
    if(window.__wkHold) return;
    for(var i=0;i<cs.length;i++){
      try{ cs[i].textContent=new Intl.DateTimeFormat('en-US',{timeZone:cs[i].getAttribute('data-wk-tz'),hour:'numeric',minute:'2-digit',hour12:true}).format(new Date()); }catch(e){}
    }
  }
  clocks(); setInterval(clocks,30000);
})();
`;

/* MASONRY PACKING FOR THE BOARDS. The 12-column grid gives every ROW the
 * height of its tallest card, so a short card beside a tall one left a hole of
 * page background under it. This does not change the grid, the spans, the DOM
 * order or the tab filter: it switches each .home-board to 7px sliver rows
 * (row-gap 0 — see .hb-mas in 11-home.css, whose computed values are the only
 * copy of both numbers) and sets `grid-row: span N` on each card from its own
 * measured height, plus one column-gap of breathing room. Auto-placement then
 * packs every column independently, Pinterest-fashion — and because sparse
 * flow places strictly in DOM order (never `dense`, which back-fills and
 * visually reorders), the time -> earth -> space sequence survives: a card can
 * nestle up beside the tail of the section before it, never ahead of it.
 *
 * Reads first, then writes, so the layout is forced once per pass, not once
 * per card. Relayouts on resize, on crossing the one-column breakpoint (spans
 * are cleared there — a phone column has nothing to pack), when the tab
 * script toggles `hidden` (the MutationObserver), and when a card's content
 * changes height under it — the countdown block filling in, a font arriving
 * (the ResizeObserver). Setting a span never changes the card's own height
 * (the board is align-items:start), so the observer cannot feed itself.
 * Without JS none of this runs and the plain grid renders. */
const HOME_MASONRY_JS = `
(function(){
  var boards=[].slice.call(document.querySelectorAll('.home-board'));
  if(!boards.length||!window.matchMedia) return;
  var mq=window.matchMedia('(min-width:700px)'), queued=false;
  function pack(b){
    b.classList.add('hb-mas');
    var cs=getComputedStyle(b);
    var rowH=parseFloat(cs.gridAutoRows), gap=parseFloat(cs.columnGap)||14;
    if(!rowH){ clear(b); return; } /* stylesheet absent or overridden */
    var kids=[].slice.call(b.children), h=[], i;
    for(i=0;i<kids.length;i++) h[i]=kids[i].hidden?0:kids[i].getBoundingClientRect().height;
    for(i=0;i<kids.length;i++)
      kids[i].style.gridRowEnd=kids[i].hidden?'':'span '+Math.max(1,Math.ceil((h[i]+gap)/rowH));
  }
  function clear(b){
    b.classList.remove('hb-mas');
    for(var i=0;i<b.children.length;i++) b.children[i].style.gridRowEnd='';
  }
  function layout(){
    queued=false;
    for(var i=0;i<boards.length;i++) mq.matches?pack(boards[i]):clear(boards[i]);
  }
  function queue(){ if(!queued){ queued=true; requestAnimationFrame(layout); } }
  window.addEventListener('resize',queue);
  if(mq.addEventListener) mq.addEventListener('change',queue);
  var i,j;
  if(window.ResizeObserver){
    var ro=new ResizeObserver(queue);
    for(i=0;i<boards.length;i++) for(j=0;j<boards[i].children.length;j++) ro.observe(boards[i].children[j]);
  }
  if(window.MutationObserver){
    var mo=new MutationObserver(queue);
    for(i=0;i<boards.length;i++) mo.observe(boards[i],{attributes:true,attributeFilter:['hidden'],subtree:true});
  }
  layout();
})();
`;

/* ---------------------------------------------------------------------------
 * THE LANDING PAGE. The homepage stopped being the dashboard when the
 * dashboard became four pages (/time/, /earth/, /space/, /classroom/). Its job
 * now is the one the wall of cards always did badly: give someone who has
 * never seen the site a working understanding of it in one screen, and a way
 * to jump to whichever part they came for.
 *
 * The design rule, owner's call: DON'T DESCRIBE THE SITE — DEMONSTRATE IT.
 * The hero is the day/night map, live: time and space in one picture,
 * obviously computed for right now, meaningful to a nine-year-old and a
 * fifty-year-old on sight. Under it, three of the real questions (curiosity
 * has no age on it — that is the student door without the word "student"),
 * then one block per section: a line of narrative and three cards, each card
 * an ACTION rather than an audience. "Put it on a projector" self-selects a
 * teacher; "make a planet fall into the sun" self-selects the curious; nobody
 * gets labelled. */
const PORTAL_SECTIONS = [
  { slug: "time", name: "Time", ico: "alarm",
    line: `Clocks, and what they are counting — all running in your browser, nothing to install, no sign-up.`,
    cards: [
      ["alarm", "Alarm, timer &amp; stopwatch", "Set an alarm, run a countdown, time every lap — digits big enough for the back row.", "/time/"],
      ["globe", "World clock", "What time it is anywhere on Earth, and why the line between day and night leans.", "/world-clock/"],
      ["confetti", "Countdowns", "How long until the day you are waiting for — holidays, launches, eclipses, the last day of school.", "/countdown/"],
    ] },
  { slug: "earth", name: "Earth", ico: "sunrise",
    line: `Your own sky, worked out for your own town — computed from the real motions, never looked up in a table.`,
    cards: [
      ["sunrise", "Sunrise &amp; sunset", "Tonight's sunset, tomorrow's sunrise and the whole year of daylight, for over 1,100 towns.", "/sun/"],
      ["moon", "Tonight's moon", "The phase over your house tonight, and every night for the next month.", "/moon/"],
      ["wave", "Tides", "When the water turns on 165 US coasts — and why the moon gets to decide.", "/tides/"],
    ],
    get live() { return `      <a class="pc-card pc-live" href="/sun-moon-earth-movement-simulator/">
        <span class="pc-anim pc-anim-orr" id="home-orr">${orrFirst}</span>
        <b>The moon, round the Earth</b>
        <span class="pc-line">The sun holds still on the left while the moon takes its month-long lap — sped up so a month passes in about 24 seconds. This picture IS the phases.</span>
      </a>`; } },
  { slug: "space", name: "Space", ico: "solar",
    line: `Where everything actually is, right now — positions solved when the page loads, not drawn from memory.`,
    cards: [
      ["solar", "The planets", "Every world in orbital order, each turning on its own axis with its moons going round it.", PLANETS_PATH],
      ["earthmoon", "Solar system simulator", "The real orbits at their real speeds — drag a month, a year, or a century.", "/solar-system-simulator/"],
      ["rocket", "Gravity &amp; orbits", "Slow a planet down and watch what gravity does about it. Then try to hit the sun.", "/orbital-velocity-simulator/"],
    ],
    get live() { return `      <a class="pc-card pc-live" href="/solar-system-simulator/">
        <span class="pc-anim pc-anim-sol" id="home-sol">${solFirst}</span>
        <b>The solar system, flat-on</b>
        <span class="pc-line">The four inner planets on their real orbits, a year every 24 seconds — watch Mercury lap everybody. That difference in speed is the whole story of orbits.</span>
      </a>`; } },
  { slug: "classroom", name: "Teach it — with us", ico: "classroom", href: "/classroom/",
    line: `A diagram has to be believed. A simulator can be <em>asked</em>: slow the planet down, drag the month, tilt the axis — and children see WHY it happens, not just that it does. Everything runs on a projector or a school Chromebook, free, with nothing collected from anyone.`,
    cards: [
      ["question", "Questions that open the door", "Why is the night sky so dark? Why do the planets orbit the sun instead of falling in? Each answered honestly, each answer handing you the next.", "/glossary/"],
      ["classroom", "Lesson plans", "Timed and ready to project, K–2 to high school — every step a link that opens the exact view, with a printable student sheet.", "/classroom/lessons/"],
      ["projector", "Classroom guide", "Projector mode, keyboard shortcuts, and what a browser timer can and cannot be trusted with.", "/classroom/"],
    ] },
];

/* ---- the live tiles ------------------------------------------------------
 * ORBITAL MOTION, NOT ROTATION (owner's correction — a turning ball was not
 * the point; the site's signature pictures are things going round things).
 * Two of them, small, each a fourth card in its section's grid:
 *   Earth — the orrery: the sun held still at the left, the moon taking its
 *   real month-long lap around the Earth. This drawing IS the phases, and it
 *   is the same orrSvg the ~2,200 sun and moon pages run.
 *   Space — the solar system flat-on: the four inner planets on their real
 *   orbits at their real relative speeds, from the same solSvg the simulator
 *   runs. Mercury visibly laps everybody, which is question one on the page.
 * First frames are baked at build, so no-JS visitors get a still picture; the
 * engines ride in the hoisted, cached home-landing bundle, so the page's own
 * HTML stays light. Time is compressed, and each caption says by how much. */
const ORR_TILE_W = 480;                      /* the drawing's own floor width */
const orrFirst = orrerySvg(+_hbNow, 20, 0, "", ORR_TILE_W).replace(/width="\d+" height="\d+"/, 'width="100%"');
const SOL_MINI = new Function(`${PLANETS_JS}\n${SOLAR_JS}\nreturn solSvg;`)();
const solFirst = SOL_MINI(+_hbNow, "inner", {});

/* the landing hero's interactivity: the time-of-day slider and the share-
 * location button. Its own IIFE with its own copy of the solar core, because
 * WORLD_MAP_JS keeps its core private to its closure — a few duplicated lines
 * in a cached file beats restructuring a script three pages share. */
const HOME_HERO_JS = `
(function(){${DN_CORE}
  var slider=document.getElementById('wk-slider'); if(!slider) return;
  var night=document.getElementById('wk-night'), sunG=document.getElementById('wk-sun'),
      meG=document.getElementById('wk-me'), share=document.getElementById('wk-share'),
      when=document.getElementById('wk-when'), nowB=document.getElementById('wk-nowbtn');
  var cs=document.querySelectorAll('[data-wk-tz]');
  var sunline=document.getElementById('wk-sunline');
  var orbitNow=document.getElementById('wk-orbit-now');
  var TILT=${WK_TILT};
  var seasonSun=function(dec,lon,laterDec){ return (${seasonSunHtml.toString()})(dec,lon,laterDec,TILT); };
  /* DAY0 is the midnight the slider is scrubbing — today's, until a season
     button moves it to a solstice or an equinox. */
  function midnightOf(ms){ var d=new Date(ms); d.setHours(0,0,0,0); return +d; }
  var DAY0=midnightOf(Date.now());
  function paint(at){
    var ss=dnSub(at);
    night.setAttribute('d',dnPath(ss.dec,ss.lon,0,2));
    if(sunG) sunG.setAttribute('transform','translate('+dnF(dnX(ss.lon))+' '+dnF(dnY(ss.dec))+')');
    for(var i=0;i<cs.length;i++){
      try{ cs[i].textContent=new Intl.DateTimeFormat('en-US',{timeZone:cs[i].getAttribute('data-wk-tz'),hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at)); }catch(e){}
    }
    if(sunline){
      sunline.innerHTML=seasonSun(ss.dec,ss.lon,dnSub(at+7*86400000).dec);
    }
    if(orbitNow){
      var op=soXY(dnEcl(at));
      orbitNow.setAttribute('transform','translate('+op.x+' '+op.y+')');
    }
  }
  function fmt(at){ try{ return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at)); }catch(e){ return ''; } }
  function dfmt(at){ try{ return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(at)); }catch(e){ return ''; } }
  function shown(){ return DAY0+(+slider.value)*60000; }
  function label(){
    var at=shown(), today=DAY0===midnightOf(Date.now());
    when.textContent=(today?'':dfmt(at)+', ')+fmt(at)+(today?' your time':'');
  }
  /* the slider opens AT now and follows the clock until touched */
  function syncNow(){ if(window.__wkHold) return; var d=new Date(); slider.value=d.getHours()*60+d.getMinutes(); }
  slider.disabled=false; syncNow(); setInterval(syncNow,60000);
  slider.addEventListener('input',function(){
    window.__wkHold=1; label(); paint(shown());
  });
  if(nowB){
    nowB.disabled=false;
    nowB.addEventListener('click',function(){
      window.__wkHold=0; when.textContent='Right now';
      DAY0=midnightOf(Date.now()); syncNow(); paint(Date.now());
    });
  }
  /* the four corners of the year: keep the time of day, move the date */
  var jumps=document.querySelectorAll('[data-wk-at]');
  for(var j=0;j<jumps.length;j++){
    jumps[j].disabled=false;
    jumps[j].addEventListener('click',function(){
      window.__wkHold=1;
      DAY0=midnightOf(+this.getAttribute('data-wk-at'));
      label(); paint(shown());
    });
  }
  /* ---- your place on the planet ----
     The dot is drawn from coordinates kept ONLY in this browser (the same
     dn_home key the day/night map page uses, so the two share one answer),
     and the same coordinates put you on the Earth in the moon tile below. */
  var LOC=null;
  try{ LOC=JSON.parse(localStorage.getItem('dn_home')||'null'); }catch(e){}
  function showMe(){
    if(!LOC||!meG) return;
    meG.removeAttribute('hidden');
    meG.setAttribute('transform','translate('+dnF(dnX(LOC.lon))+' '+dnF(dnY(LOC.lat))+')');
    if(share) share.hidden=true;
    try{ document.dispatchEvent(new CustomEvent('home:loc',{detail:LOC})); }catch(e){}
  }
  if(share&&navigator.geolocation&&!LOC){
    share.hidden=false;
    share.addEventListener('click',function(){
      share.textContent='Locating\u2026';
      navigator.geolocation.getCurrentPosition(function(p){
        LOC={lat:p.coords.latitude,lon:p.coords.longitude};
        try{ localStorage.setItem('dn_home',JSON.stringify(LOC)); }catch(e){}
        showMe();
      },function(){ share.textContent='Location not shared'; setTimeout(function(){ share.hidden=true; },2200); },{timeout:10000,maximumAge:600000});
    });
  }
  showMe();
})();
`;

const LIVE_TILES_JS = `
${MOON_CORE}
${ORRERY_JS}
${PLANETS_JS}
${SOLAR_JS}
(function(){
  var orr=document.getElementById('home-orr'), sol=document.getElementById('home-sol');
  if(!orr&&!sol) return;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(reduce) return;
  /* one real synodic month across the orrery every 24 seconds; one real year
     around the inner planets every 24 seconds — Mercury laps in about six */
  var MOON_SPEED=${Math.round(orrSpanDays * 86400000 / 24000)};
  var YEAR_SPEED=${Math.round(365.25 * 86400000 / 24000)};
  var t0=Date.now(), iv=0;
  /* when a location has been shared (hero button, or the day/night map page),
     the orrery marks THAT spot riding the turning Earth */
  var LOC=null;
  try{ LOC=JSON.parse(localStorage.getItem('dn_home')||'null'); }catch(e){}
  document.addEventListener('home:loc',function(e){ LOC=e.detail||LOC; });
  function frame(){
    var dt=Date.now()-t0;
    if(orr) orr.innerHTML=orrSvg(t0+dt*MOON_SPEED,LOC?LOC.lat:20,LOC?LOC.lon:0,LOC?'You':'',${ORR_TILE_W}).replace(/width="\\d+" height="\\d+"/,'width="100%"');
    if(sol) sol.innerHTML=solSvg(t0+dt*YEAR_SPEED,'inner',{});
  }
  function run(on){ if(iv){ clearInterval(iv); iv=0; } if(on) iv=setInterval(frame,90); }
  document.addEventListener('visibilitychange',function(){ run(!document.hidden); });
  run(!document.hidden);
})();
`;

const portalSection = (t) => `  <section class="home-sec">
    <div class="home-sechead">
      <h2><a href="${t.href || `/${t.slug}/`}">${ico(t.ico)} ${t.name}</a></h2>
      <a class="wk-all home-secall" href="${t.href || `/${t.slug}/`}">Everything in ${t.slug === "classroom" ? "the classroom" : t.name} →</a>
    </div>
    <p class="home-secline">${t.line}</p>
    <div class="pc-grid${t.live ? " pc-grid-4" : ""}">
${t.cards.map(([ic, title, line, href]) => `      <a class="pc-card" href="${href}">
        <span class="pc-ico">${ico(ic, 30)}</span>
        <b>${title}</b>
        <span class="pc-line">${line}</span>
      </a>`).join("\n")}${t.live ? `\n${t.live}` : ""}
    </div>
  </section>`;

const portalBody = `  ${/* ?tab= URLs from the tabbed era are shared and bookmarked; they now mean
       a page of their own. Inline and first, so the redirect wins the race
       against rendering a page the visitor did not ask for. */""
  }<script>(function(){var m=/[?&]tab=(time|earth|space|class)(?:&|$)/.exec(location.search);if(m)location.replace(m[1]==="class"?"/classroom/":"/"+m[1]+"/");})();</script>
  ${brand({})}
${sectionSwitcher("/")}
  ${/* THE INTRO, one short paragraph before anything else (owner's call): a
       first-time visitor gets told what this is before being shown it. It is
       the same line the old All tab led with, which every claim on the page
       already backs. */""
  }<p class="home-lede">${LEDE.all}</p>
  ${/* THE HERO IS THE SITE — but it must not BE the whole first screen
       (owner's call: at full wrap width the map alone was ~560px tall and
       everything else fell below the fold). Two columns on a desktop: the map
       at 7/12 width, and beside it the pitch, the four clocks stacked two by
       two, and the links. On a phone it stacks back to map-first. */""
  }<div class="card home-hero">
    <p class="hub-kicker">Earth</p>
    <h2><a href="${DAYNIGHT_PATH}">Where is the Sun right now?</a></h2>
    <div class="home-hero-grid">
      <div class="home-hero-map">
        <a class="home-dn-link" href="${DAYNIGHT_PATH}" aria-label="Open the day and night map">
        ${WK.svg}
        </a>
        ${/* the invitation, ON the picture (owner's call: no modal, no panel —
             a button in the map's top-right corner; the browser's own
             permission prompt only appears after a deliberate press). Hidden
             until JS confirms geolocation exists at all. */""
        }<button type="button" class="wk-share" id="wk-share" hidden><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.1 6.1 12.2 6.36 12.5a.85.85 0 0 0 1.28 0C12.9 21.2 19 14.1 19 9a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 14.6 9 2.6 2.6 0 0 1 12 11.6z"/></svg> See your location</button>
        ${/* the day, on a slider: scrub today's 24 hours and watch the night
             side and the overhead sun move; Now hands it back to the clock */""
        }<div class="wk-scrub">
          <input type="range" class="orr-slider" id="wk-slider" min="0" max="1439" step="5" value="720" disabled aria-label="Time of day shown on the map">
          <span class="wk-scrub-lab"><b id="wk-when">Right now</b></span>
        </div>
        ${/* THE FOUR CORNERS OF THE YEAR, roughly three months apart, and the
             reason the equator line is drawn: jump between them and the sun
             marker climbs north of the equator and sinks south of it while the
             day/night line leans the other way. The instants are baked from
             the shared solver — an hourly rebuild keeps them current and they
             move by seconds. */""
        }<div class="wk-seasons">
          <button type="button" class="chip wk-nowbtn" id="wk-nowbtn" disabled>Now</button>
          <button type="button" class="chip" data-wk-at="${WK_YEAR.up}" disabled>Spring equinox</button>
          <button type="button" class="chip" data-wk-at="${WK_YEAR.maxMs}" disabled>Summer solstice</button>
          <button type="button" class="chip" data-wk-at="${WK_YEAR.down}" disabled>Fall equinox</button>
          <button type="button" class="chip" data-wk-at="${WK_YEAR.minMs}" disabled>Winter solstice</button>
        </div>
      </div>
      <div class="home-hero-side">
        <p class="home-hero-line"><strong>Half the Earth is always in daylight, and the other half is night.</strong></p>
        <p class="wk-sunline" id="wk-sunline">${seasonSunHtml(subsolar(+_hbNow).dec, subsolar(+_hbNow).lon, subsolar(+_hbNow + 7 * 86400000).dec, WK_TILT)}</p>
        <a class="wk-all" href="${DAYNIGHT_PATH}">Open the day and night map →</a>
      </div>
    </div>
    ${hubQs(["what-is-the-tropic-of-cancer", "what-is-the-terminator", "why-can-the-moon-be-up-in-the-daytime"], "/")}
  </div>
  ${/* the curiosity door: real questions, no audience label */""
  }<div class="home-q">
    <span class="home-q-lab">Start with a question</span>
    <a class="chip" href="/concepts/why-is-the-night-sky-dark/">Why is the night sky so dark?</a>
    <a class="chip" href="/concepts/why-dont-planets-fall-into-the-sun/">Why don’t planets fall in?</a>
    <a class="chip" href="/concepts/why-do-we-have-seasons/">Why do we have seasons?</a>
    <a class="chip" href="/concepts/why-can-the-moon-be-up-in-the-daytime/">Can the moon be up in the daytime?</a>
    <a class="chip" href="/concepts/why-does-the-moon-change-shape/">Why does the moon change shape?</a>
    <a class="chip chip-alt" href="/glossary/">More questions →</a>
  </div>
  <div class="card hub-sim">
    <p class="hub-kicker">Earth</p>
    <h2>The Moon around the Earth</h2>
    <p class="hub-blurb">The Sun holds still on the left. Earth and the Moon sit to the right so there is more sky between them. The Moon is about a quarter the width of Earth — that size is true. Distances are not: the simulator says by how much.</p>
    <div class="hub-live pc-anim pc-anim-orr" id="home-orr">${orrFirst}</div>
    <p class="home-moonprog-lab">${SIDEREAL}-day orbit. This picture is the phases. A month passes in about 24 seconds.</p>
    <a class="wk-all" href="/sun-moon-earth-movement-simulator/">See the Sun, Earth & Moon simulator →</a>
    ${hubQs(["why-does-the-moon-change-shape", "what-is-a-synodic-month", "what-is-tidal-locking"], "/")}
  </div>
  <div class="card hub-sim">
    <p class="hub-kicker">Earth</p>
    <h2>Earth going around the Sun</h2>
    <p class="hub-blurb">The year and the month running at once. The Moon laps Earth about thirteen times on the way round — that ratio is real. Every size and distance is invented so both orbits fit on one screen.</p>
    <div class="hub-live">${_systemThumb}</div>
    <a class="wk-all" href="${SYS_PATH}">See the Earth, Sun & Moon orbit simulator →</a>
    ${hubQs(["why-do-we-have-seasons", "what-is-earths-axial-tilt"], "/")}
  </div>
  <div class="card hub-sim">
    <p class="hub-kicker">Space</p>
    <h2>The solar system, flat-on</h2>
    <p class="hub-blurb">The inner planets on their real orbits. Mercury laps everybody — that difference in speed is the whole story of orbits. Distances are compressed so they fit.</p>
    <div class="hub-live pc-anim pc-anim-sol" id="home-sol">${solFirst}</div>
    <p class="home-moonprog-lab">A year every 24 seconds. Positions are real. Planet dots are not — they would be smaller than a pixel.</p>
    <a class="wk-all" href="/solar-system-simulator/">See the solar system simulator →</a>
    ${hubQs(["why-dont-planets-fall-into-the-sun"], "/")}
  </div>
  <div class="card hub-sim">
    <p class="hub-kicker">Earth</p>
    <h2>When the tide turns</h2>
    <p class="hub-blurb">The Moon pulls harder on the water nearer to it than on Earth’s centre, and harder on the centre than on the far-side water. The ocean stretches into two bulges. Earth then turns under those bulges, so most coasts see two high tides a day.</p>
    <div class="home-tides-charts">${_homeTideCharts.join("\n")}</div>
    <a class="wk-all" href="/tides/">See the tide charts →</a>
    ${hubQs(["what-causes-tides"], "/")}
  </div>
  <div class="card hub-sim">
    <p class="hub-kicker">Space</p>
    <h2>What if a moon slowed down?</h2>
    <p class="hub-blurb">Nothing spirals in. Take speed away and the far side of the orbit drops toward the planet; add speed and it climbs away — and either way the moon comes back through the point where you changed it.</p>
    <div class="home-orb" id="ho-wrap">
      <div class="hub-live">
        <svg viewBox="0 0 320 200" width="100%" aria-hidden="true" id="ho-svg">
          <rect width="320" height="200" rx="10" fill="#080d1a"/>
          <ellipse id="ho-path" cx="160" cy="100" rx="70" ry="70" fill="none" stroke="#9dc2e0" stroke-opacity=".38" stroke-width="1" stroke-dasharray="3 4"/>
          <circle cx="160" cy="100" r="13" fill="#2f74ad"/>
          <circle id="ho-moon" cx="230" cy="100" r="4.5" fill="#e8eef7"/>
        </svg>
      </div>
      <p class="home-orbtxt" id="ho-note">A circle: falling exactly as fast as the curve carries it away.</p>
      <p class="home-orbbtns">
        <button type="button" class="chip" id="ho-slow">Slow it down</button>
        <button type="button" class="chip" id="ho-fast">Speed it up</button>
        <button type="button" class="chip chip-alt" id="ho-reset">Circle</button>
      </p>
    </div>
    <a class="wk-all" href="${OV_PATH}">See the orbital velocity simulator →</a>
    ${hubQs(["how-does-an-orbit-work"], "/")}
  </div>
  <div class="home-rest">
    <h2>The rest of the site</h2>
    <p class="sub">A hint, not a catalogue. Each tab is its own page.</p>
    <div class="dir-grid">
      <a class="card" href="/time/"><h2>Time</h2><p>Clocks, and what they are counting — a world clock, a countdown to the day you are waiting for.</p></a>
      <a class="card" href="/earth/"><h2>Earth</h2><p>Your own sky: day and night, sunrise, the Moon, and why the tropics sit where they do.</p></a>
      <a class="card" href="/space/"><h2>Space</h2><p>Where everything actually is — planets, orbits, gravity, and the questions that open the door.</p></a>
      <a class="card" href="/classroom/"><h2>Classroom</h2><p>Projector mode, questions written for ten-year-olds first, and a way to send the lesson you already run.</p></a>
    </div>
  </div>
  ${/* THE COLLABORATION ASK, promoted to the page itself (owner's call:
       working WITH teachers is a primary task of the site, not a footnote).
       The form posts to the same /api/report sink as every other form —
       reason "Lesson collaboration", email required so a reply is possible —
       and the name and tools ride inside the details text, so no API change
       and nothing new is stored. */""
  }<div class="card cr-ask" id="teach-together">
    <h2>${ico("classroom")} Have a lesson in mind? Let's build it together.</h2>
    <p><strong>This site gets better by being taught from.</strong> If you have an idea that would make it better — or a lesson you'd like to build together and share with everyone — reach out. We'll shape the tool around your class, write the plan with you, and publish it free for every other classroom. <strong>If we build your idea, your class is credited on the page</strong>, and <a href="/about/work-with-us/">how that works is written down</a>.</p>
    ${/* TWO DOORS, NOT THREE. This form is for a lesson that does not exist
         yet — something to build together. A teacher who already HAS the
         lesson should not have to describe it in a box labelled "what do you
         want to teach": they should paste it, which is what the classroom
         hub's own form is for. Named here so the shorter path is offered
         before the longer one. */""
    }<p class="hint">Already teach it? Then skip all this and just
      <a href="/classroom/submit-a-lesson/">send us the lesson you run</a> — or
      <a href="/classroom/submit-a-lesson/#questions">the questions your class asked</a>. Both are faster than the form below,
      and both end up in the same inbox.</p>
    <form id="tt-form">
      <label for="tt-name">Your name</label>
      <input id="tt-name" type="text" maxlength="80" required placeholder="e.g. Ms Alvarez">
      <label for="tt-email">Email</label>
      <input id="tt-email" type="email" required placeholder="A school address is fine — only used to reply to you">
      <label for="tt-what">What do you want to teach?</label>
      <textarea id="tt-what" maxlength="900" required placeholder="e.g. 5th grade, moon phases in October — I want them to predict tonight's moon before we check it…"></textarea>
      <label for="tt-tools">What tools would make it happen?</label>
      <textarea id="tt-tools" maxlength="600" required placeholder="e.g. a way to show two towns' sunsets side by side · a simpler student view · a printable chart…"></textarea>
      <input id="tt-hp" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <div class="row" style="margin-top:16px"><button class="btn" id="tt-send" type="submit">Start the conversation</button></div>
      <p id="tt-note" class="hint">Read by a person, answered by the same person. Nothing you send is published without you.</p>
    </form>
    <script>(function(){
      var f=document.getElementById("tt-form"); if(!f) return;
      f.addEventListener("submit",function(ev){
        ev.preventDefault();
        var note=document.getElementById("tt-note"), btn=document.getElementById("tt-send");
        btn.disabled=true; note.textContent="Sending\u2026";
        var v=function(id){ return (document.getElementById(id).value||"").trim(); };
        fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ url:location.href, reason:"Lesson collaboration",
            details:"Name: "+v("tt-name")+"\\nWants to teach: "+v("tt-what")+"\\nTools needed: "+v("tt-tools"),
            email:v("tt-email"), website:document.getElementById("tt-hp").value })})
          .then(function(r){ return r.json().catch(function(){return{};}); })
          .then(function(d){
            if(d&&d.ok){ f.reset(); note.textContent="\u2713 Sent \u2014 you'll hear back from a person. Thank you."; }
            else { btn.disabled=false; note.textContent="Something went wrong \u2014 please try again."; }
          })
          .catch(function(){ btn.disabled=false; note.textContent="Network error \u2014 please try again."; });
      });
    })();</script>
  </div>
  ${/* the three differentiators, one line each — why this site is safe to
       trust and safe to hand to a class */""
  }<div class="card home-how">
    <h2>How this site works</h2>
    <div class="wc-facts">
      <div class="wc-frow"><span>Computed, never copied</span><b>Every figure is worked out live from the real motions. Where a picture is not to scale, it says so — in numbers. <a href="/methodology/">How each number is worked out →</a></b></div>
      <div class="wc-frow"><span>Free, with nothing attached</span><b>No account, no app, no ads, nothing for sale, nothing collected from children. <a href="/about/">Why it exists, and how it is paid for →</a></b></div>
      <div class="wc-frow"><span>Built with the people who use it</span><b>If a class asks for something and we build it, the class is credited on the page. <a href="/about/work-with-us/">How that works →</a></b></div>
    </div>
  </div>
  <div class="home-foot">
    <p class="home-suggest">Guides: <a href="/classroom/">using this in a classroom</a> · <a href="/methodology/">how these numbers are worked out</a> · <a href="/how-it-works/">how countdowns work</a> · <a href="/browser-limitations/">browser limitations</a> · <a href="/about/">about this site</a>.</p>
  </div>`;

/* ---------------------------------------------------------------------------
 * THE SECTION PAGES. The tab views became pages: same cards, same spans, same
 * board grid — but each with a URL, a title that can rank for its own subject,
 * its own lede (the tab ledes, verbatim), and a beacon. The switcher row is
 * the old tab row grown up: the same chips, now real links, on every one of
 * the four pages and marked with aria-current where you stand.
 * ------------------------------------------------------------------------- */

const SECTION_PAGES = [
  {
    slug: "time", h1: "Time",
    title: "Time — Online Alarm Clock, Timer, Stopwatch, World Clock & Countdowns",
    desc: "Free, full-screen clock tools that run in your browser: an alarm clock, a countdown timer, a stopwatch with laps, every time zone at once, a time-difference calculator, a 12/24-hour converter and countdowns to the days you are waiting for.",
    lede: LEDE.time,
    board: [
      [ALARM_CARD, 4], [TIMER_CARD, 4], [STOPWATCH_CARD, 4],
      [withQs(WORLD_CLOCK_CARD, ["what-is-a-time-zone", "what-is-utc", "what-is-the-international-date-line"], "/time/"), 6],
      [withQs(TIMEDIFF_CARD, ["what-is-daylight-saving-time"], "/time/"), 6],
      [withQs(CONVERT_CARD, ["what-is-the-24-hour-clock"], "/time/"), 6], [COUNTDOWN_BLOCK, 6],
    ],
    js: () => `<script data-ac="shared" data-name="sec-time">${HOME_CLOCK_JS}${HOME_COLOR_JS}${WORLD_MAP_JS}${TDIFF_JS}${CONV_JS}${HOME_MASONRY_JS}${HOME_WIDGETS_JS}</script>`,
  },
  {
    slug: "earth", h1: "Earth",
    title: "Earth — Sunrise, Sunset, Moon Phases, Tides & the Day/Night Map",
    desc: "Your own sky, computed for your own town: sunrise and sunset times, tonight's moon phase, NOAA tide predictions, the live day/night map and the Sun–Earth–Moon simulator — for more than a thousand cities, on any date.",
    lede: LEDE.earth,
    board: [
      [withQs(MOON_CARD, ["why-does-the-moon-change-shape"], "/earth/"), 6],
      [withQs(SIM_CARD, ["what-is-a-synodic-month", "why-does-moonrise-get-later", "what-is-tidal-locking"], "/earth/"), 6],
      [withQs(SYSTEM_CARD, ["why-do-we-have-seasons", "what-is-earths-axial-tilt", "why-isnt-there-an-eclipse-every-month"], "/earth/"), 6],
      [SUN_HOME_CARD, 6],
      [withQs(TIDES_HOME_CARD, ["what-causes-tides"], "/earth/"), 12],
      [withQs(WORLD_CLOCK_CARD, ["what-is-the-tropic-of-cancer", "what-is-the-terminator", "why-can-the-moon-be-up-in-the-daytime"], "/earth/"), 12],
    ],
    js: () => `<script data-ac="shared" data-name="sec-earth">${WORLD_MAP_JS}${HOME_MASONRY_JS}${HOME_WIDGETS_JS}</script>`,
  },
  {
    slug: "space", h1: "Space",
    title: "Space — The Planets, Orbits, Moons & Solar System Simulators",
    desc: "Where everything actually is, right now: the solar system on its real orbits, every planet with its moons, gravity and orbital-velocity simulators, launch windows to Mars, and the moon systems of Jupiter, Saturn, Uranus and Neptune.",
    lede: LEDE.space,
    board: [
      [withQs(SOLAR_CARD, ["why-dont-planets-fall-into-the-sun", "how-are-the-planets-formed", "why-arent-the-inner-planets-gas-giants"], "/space/"), 4],
      [withQs(ORBIT_CARD, ["how-does-an-orbit-work"], "/space/"), 4],
      [withQs(PLANETS_CARD, ["why-didnt-the-asteroid-belt-become-a-planet", "why-do-asteroids-collide"], "/space/"), 4],
      [withQs(SYSTEM_CARD, ["why-do-we-have-seasons"], "/space/"), 4],
      [ROCKET_CARD, 4],
      [SIM_CARD, 4],
      ...MOON_CARDS.map((c, i) => {
        const qs = {
          mars: ["why-is-mars-red"],
          jupiter: ["why-does-jupiter-have-so-many-moons", "why-do-planets-have-moons"],
          saturn: ["why-does-saturn-have-so-many-moons", "why-doesnt-earth-have-a-ring"],
          uranus: ["why-do-other-planets-have-seasons"],
          neptune: ["why-does-triton-orbit-backwards"],
          pluto: ["why-does-pluto-have-so-many-moons", "why-is-pluto-a-dwarf-planet"],
        }[MOON_PLANETS[i].slug];
        return [qs ? withQs(c, qs, "/space/") : c, 4];
      }),
    ],
    js: () => `<script data-ac="shared" data-name="sec-space">${HOME_MASONRY_JS}${HOME_WIDGETS_JS}</script>${ORBIT_JS}`,
  },
];

for (const S of SECTION_PAGES) {
  const body = `  ${brand({ crumb: { slug: S.slug, url: `/${S.slug}/` } })}
  <h1>${S.h1}</h1>
${sectionSwitcher(`/${S.slug}/`)}
  <p class="home-lede">${S.lede}</p>
  <div class="home-board">
${S.board.map(([card, n]) => sp(card, n, S.slug)).join("\n")}
  </div>
  <div class="home-foot">
    <p class="home-suggest">Start with a question — <a href="/concepts/why-dont-planets-fall-into-the-sun/">why don't the planets fall into the sun</a>, or <a href="/glossary/">any of the others</a>. Or jump across: ${SECTION_LINKS.filter(([u]) => u !== `/${S.slug}/`).map(([u, l]) => `<a href="${u}">${l}</a>`).join(" · ")}.</p>
  </div>`;
  mkdirSync(join(root, S.slug), { recursive: true });
  writeFileSync(join(root, `${S.slug}/index.html`), doc({
    title: S.title, desc: S.desc, canon: `/${S.slug}/`, ogTitle: S.title, body,
    ld: `<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: S.h1, url: `/${S.slug}/` }])}</script>`,
    extraJs: S.js(),
  }));
}

writeFileSync(join(root, "index.html"), doc({
  /* THE TITLE IS THE DOMAIN (owner's call): the landing page is the one place
     the address IS the name, set the way the wordmark sets it. The section
     pages carry the keyword titles now. */
  title: "TimeAndSpace.Science",
  desc: "Free tools and simulators for gravity, motion, time and space: alarm clock, timer, stopwatch, world clock, sunrise and sunset, moon phases, tides, the day/night map and the planets on their real orbits. No sign-up, no ads.",
  canon: "/",
  ogTitle: "TimeAndSpace.Science — Track, Record & Understand the Universe",
  body: portalBody,
  ld: webSiteLd(SITE) + appLd({ name: "Time and Space Science", url: SITE + "/", description: "Free online alarm clock, timer, stopwatch and shareable countdowns — no sign-up.", category: "UtilitiesApplication" }),
  extraJs: `<script data-ac="shared" data-name="home-landing">${WORLD_MAP_JS}${HOME_HERO_JS}${LIVE_TILES_JS}</script>${ORBIT_JS}`,
}));

/* ---- countdown hub (/countdown/) ---- */
/* Category directory. The top nav carries one "Countdowns" entry (the seven
 * tools plus this), so /countdown/ is now the single doorway to every countdown
 * category — it has to link to ALL of them, not just the ones with a card
 * further down this page. Two rows: the curated categories from
 * popular-countdowns.json (with their link counts, so the sizes are honest),
 * then the countdown pages that aren't a category — the calendar, the two
 * ranked lists and the country pages. Plain chips, so no new
 * CSS: .timer-presets/.chip are core parts every page already ships. */
const catCount = (c) => c.links.length + (c.more || []).length;
const dirChips = popular.categories.map((c) =>
  `      <a class="chip" href="/${c.hub}/">${esc(c.nav)} · ${catCount(c)}</a>`).join("\n");
const MORE_COUNTDOWNS = [
  ["/calendar/", "Event calendar"],
  ["/popular/", "Most watched"],
  ["/trending/", "Trending now"],
  ["/countries/", "By country"],
];
const CATEGORY_DIR = `  <div class="card" id="all-categories">
    <h2>${ico("confetti")} All countdown categories</h2>
    <p class="sub">Every countdown on the site lives in one of these — pick a category to see its full list.</p>
    <div class="timer-presets">
${dirChips}
    </div>
    <p class="sub">More countdowns</p>
    <div class="timer-presets">
${MORE_COUNTDOWNS.map(([u, l]) => `      <a class="chip" href="${u}">${esc(l)}</a>`).join("\n")}
    </div>
  </div>`;

const countdownBody = `  ${brand({ crumb: { slug: "countdown", url: "/countdown/" } })}
  <h1>Popular Event Countdowns</h1>
  <p class="sub">Live countdowns to holidays, birthdays, sports, elections, graduations and what the sky is about to do. Free, no sign-up.</p>
${SEARCH}

${CATEGORY_DIR}

${soonRail}

${RANK_CARDS}

${sections}`;

mkdirSync(join(root, "countdown"), { recursive: true });
writeFileSync(join(root, "countdown/index.html"), doc({
  title: "Event Countdowns — Live Countdowns to Every Occasion",
  desc: "Live countdowns to popular birthdays, holidays, sports, weddings and graduations. No sign-up.",
  canon: "/countdown/",
  ogTitle: "Countdowns to everything worth waiting for",
  body: countdownBody,
  ld: `<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Countdowns", url: "/countdown/" }])}</script>`,
}));

const total = popular.categories.reduce((a, c) => a + c.links.length + (c.more || []).length, 0);
console.log(`Generated / portal + /countdown/ hub (${popular.categories.length} categories, ${total} curated links).`);
