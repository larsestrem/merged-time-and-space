#!/usr/bin/env node
/* build-tides.mjs — NOAA tide charts: /tides/ (the tool + station directory)
 * plus one page per curated station (/tides/<slug>/, e.g. /tides/miami-fl/).
 * Data is fetched CLIENT-side (assets/js/tides.js) straight from NOAA
 * CO-OPS's free, keyless, CORS-open API for official tide predictions (a
 * year+ ahead) — so these pages stay static and edge-cached like everything
 * else on the site. Astronomical predictions only — no weather, storm, or
 * pressure overlay.
 *   node seo/tools/build-tides.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { esc, GA_SNIPPET, brand, appLd, faqLd, breadcrumbLD, nSunCalc, sunHm } from "./lib.mjs";
import { TIDE_STATIONS, tideStatePages, TIDE_STATE_NAMES } from "./tide-stations.mjs";
import { tideCurve } from "./tide-curve.mjs";
import { tideChartSvg, tideSeries, TIDE_W, TIDE_H_PAGE } from "./tide-chart.mjs";
import { stationToSun } from "./coastal.mjs";
import { astroStripForStation, simLink } from "./crosslinks.mjs";
import { hubQuestionsCard, placeQuestionsCard } from "./concepts.mjs";
import { placeFacts, resolvePlace } from "./place.mjs";
import { localTimeLine } from "./localtime.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

/* IANA time zone per station, resolved once at build time (no network) so the
 * client can compute an exact, DST-aware UTC offset via Intl — same
 * technique as /world-clock/ — for sunrise/sunset and night-shading, without
 * any weather/geo API call. tz-lookup's boundary data misresolves a couple of
 * stations right on a political (not geographic) time-zone line — verified
 * against all 101 curated stations and overridden here rather than trusting
 * the library blindly near a border. */
const tzlookup = createRequire(import.meta.url)("./vendor/tz-lookup.cjs");
const TZ_OVERRIDE = {
  "eastport-me": "America/New_York",   // tz-lookup returns America/Moncton (Atlantic Canada); Eastport, ME is Eastern time
  "pago-pago-as": "Pacific/Pago_Pago", // tz-lookup returns Pacific/Apia (Samoa, UTC+13); American Samoa is UTC-11 — opposite side of the date line
};
for (const s of TIDE_STATIONS) s.tz = TZ_OVERRIDE[s.slug] || tzlookup(s.lat, s.lng);
/* slug -> station, used by the near-me page and the destination generator */
const stationBySlug = new Map(TIDE_STATIONS.map((s) => [s.slug, s]));

/* Curated destinations: popular beach/coastal towns that have NO NOAA station
 * of their own and estimate from the nearest one. Loaded here (early) so the
 * /tides/near-me/ page can include them in its "closest to you" list — the
 * recognizable beach names people actually search for, not just the harbor
 * stations. The per-destination pages are generated later from the same list. */
const DESTINATIONS = JSON.parse(readFileSync(join(root, "seo/_data/tide-destinations.json"), "utf8")).destinations || [];
for (const d of DESTINATIONS) d.tz = TZ_OVERRIDE[d.slug] || tzlookup(d.lat, d.lng);

/* compact station index baked into every tides page for instant search +
 * nearest-station: [slug, city, st, id, lat, lng, tz] */
/* 8th field = the official NOAA station name when it differs from the display
 * city (e.g. Norfolk → "Sewells Point", New York → "The Battery", Savannah →
 * "Fort Pulaski"), so search can match the real station name people also use;
 * "" when the name is just the city, to keep the baked index lean. */
/* Curated beach/town destinations (Lincoln City, Cannon Beach, …) are appended
 * so the hub search + "nearest" suggestions surface the recognizable names people
 * search — not just the NOAA harbour stations. A 9th field (1) marks a
 * destination; it carries its SOURCE station's NOAA id (so results stay valid)
 * and links to its own /tides/<slug>/ page. */
const SEARCH_INDEX = TIDE_STATIONS.map((s) => [s.slug, s.city, s.st, s.id, s.lat, s.lng, s.tz, (s.name && s.name !== s.city) ? s.name : ""])
  .concat(DESTINATIONS.filter((d) => stationBySlug.get(d.source)).map((d) => { const src = stationBySlug.get(d.source); return [d.slug, d.name, d.st, src.id, d.lat, d.lng, d.tz, "", 1]; }));
const INDEX_JS = `window.TIDE_STATIONS=${JSON.stringify(SEARCH_INDEX)};`;

const FAQ = (label) => [
  ["Where does the tide data come from?", `Straight from NOAA CO-OPS, the official U.S. source for tide predictions${label ? ` — for ${label} it uses the NOAA station listed above` : ""}. Heights are in feet above MLLW (mean lower low water, the standard chart datum) and times are shown in the station's own local time.`],
  ["How far ahead can I see the tides?", "Tide predictions are computed from astronomy (the positions of the moon and sun), so they're available about a year ahead. Use the date-range finder to list every high tide between any two dates — for general reference and low-risk scheduling only. Before any marine or shoreline activity, confirm conditions with official local forecasts, alerts, harbor guidance, and NOAA."],
  ["What is a king tide?", "An informal name for the highest tides of the year, which happen when a new or full moon lines up with the moon's closest approach to Earth. In the finder, the top 10% highest tides in your range are marked with a crown — periods with some of the highest predicted astronomical tides of the year."],
  ["What actually makes the tide bigger or smaller?", "The engine is gravity: the moon and sun pull the ocean into bulges. When they line up at a new or full moon you get the biggest swings (spring tides); at quarter moons their pulls partly cancel (neap tides), and the moon's closest approach (perigee) super-sizes things further — that's a king tide. River flow, the shape of the bay, and long-term sea-level cycles can also affect the actual water level, which is why real conditions can differ from the astronomical prediction shown here."],
  ["What are the highest tides in the world — and in the U.S.?", "The world's largest tides are in Canada's Bay of Fundy, where the range between low and high can top 50 feet (it's outside NOAA's network, so it isn't listed here). In the U.S., the giants are Alaska's Cook Inlet — Anchorage sees swings around 26–30 feet — along with Southeast Alaska ports like Skagway, and on the East Coast, Eastport, Maine at roughly 18 feet. All of those have dedicated pages here."],
  ["Can I save my home beach and other spots I follow?", "Yes — tap ＋ Add to Saved Stations next to any station's name (it turns into a green Saved note), or ＋ Add nearest inside the Saved Stations dropdown to add the station closest to you (allow location access). Your saved spots appear as one-tap cards on the tides home page, the Default column's radio button picks your primary station, and Edit removes stations. Everything is stored on your device; no account needed."],
  ["Is this free? Do I need an account?", "Completely free, no sign-up. It's built on public NOAA data and works on any device."],
];

/* safety warning, shown above the tool on every tides page; the matching
 * legal section is /terms#tides-data and the footer repeats the
 * use-at-your-own-risk line. */
const BETA_NOTE = `  <div class="notice notice-warn td-beta"><strong>⚠ Warning:</strong> NOAA astronomical tide predictions only — <strong>not for navigation or safety decisions.</strong> For those, check NOAA and the U.S. Coast Guard. Use at your own risk — <a href="/terms#tides-data">Terms</a>.</div>`;

/* footer used on every tides page: repeats the no-liability line */
const TIDE_FOOTER = `  <p class="footer">Tide information is provided "as is" for general reference — <strong>use at your own risk</strong>; we accept no liability. <a href="/terms#tides-data">Terms</a> · <a href="/privacy">Privacy</a></p>`;

/* ---- shared UI fragments ---- */
const MAG_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>`;

/* /tides/near-me/ list: on page load it geolocates automatically and fills in
 * the tide stations AND beaches closest to you, sorted by distance (each links
 * to its own page). No chart here on purpose — this page is a router to the
 * real tide pages. If location is denied/unavailable it shows a "Use my
 * location" retry and points to the popular list + state directory below.
 * Reads window.TIDE_NEAR = [[slug, "City, ST", lat, lng, kind], …]. */
const NEARME_LIST_JS = `<script>(function(){
    var listEl=document.getElementById('nm-list'), status=document.getElementById('nm-status'), locate=document.getElementById('nm-locate'), spin=document.getElementById('nm-spinner');
    if(!listEl) return;
    function showSpin(on){ if(spin) spin.hidden=!on; }
    function hav(la1,lo1,la2,lo2){var p=Math.PI/180,dl=(la2-la1)*p,dg=(lo2-lo1)*p,
      h=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(la1*p)*Math.cos(la2*p)*Math.sin(dg/2)*Math.sin(dg/2);
      return 2*3959*Math.asin(Math.sqrt(h));}
    function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function render(la,lo){
      showSpin(false);
      var S=window.TIDE_NEAR||[];
      var rows=S.map(function(a){return {slug:a[0],label:a[1],mi:hav(la,lo,a[2],a[3])};});
      rows.sort(function(x,y){return x.mi-y.mi;});
      var near=rows.slice(0,8);
      if(!near.length){ if(status) status.textContent='No tide locations found — pick a popular spot or your state below.'; return; }
      if(status) status.textContent='Tide spots closest to you — tap any for its tide times and chart:';
      if(locate){ locate.hidden=false; locate.textContent='📍 Update my location'; }
      listEl.innerHTML=near.map(function(r){
        return '<a class="nm-item" href="/tides/'+r.slug+'/"><span class="nm-city">'+esc(r.label)+'</span><span class="nm-mi">'+Math.round(r.mi)+' mi</span></a>';
      }).join('');
    }
    function fail(msg){ showSpin(false); if(status) status.textContent=msg; if(locate){ locate.hidden=false; locate.textContent='📍 Use my location'; } }
    function locateNow(){
      if(!navigator.geolocation){ fail('Your browser can’t share your location. Pick a popular spot or your state below.'); return; }
      showSpin(true);
      if(status) status.textContent='Finding the tide spots closest to you…';
      if(locate) locate.hidden=true;
      navigator.geolocation.getCurrentPosition(
        function(pos){ render(pos.coords.latitude,pos.coords.longitude); },
        function(){ fail('We couldn’t get your location. Tap “Use my location” to try again, or pick a popular spot or your state below.'); },
        {timeout:8000, maximumAge:600000});
    }
    if(locate) locate.addEventListener('click',locateNow);
    locateNow();
  })();</script>`;

/* search box + one-character magnifying-glass submit; suggestions appear as
 * you type (states list a few of their stations; cities match directly) */
const SEARCH_HTML = `<div class="td-search">
      <div class="td-qrow">
        <input id="td-q" type="search" placeholder="Search a coastal town, state, or NOAA station ID…" autocomplete="off" aria-label="Search tide stations">
        <button class="td-qgo" id="td-qgo" type="button" aria-label="Search">${MAG_SVG}</button>
      </div>
      <ul class="td-results" id="td-results" hidden></ul>
    </div>`;

/* the admin/search card — IDENTICAL on the hub and every station page:
 * search on top; current station + add-button (or green saved note); then
 * [My Stations ▾ + Edit] */
const summaryInner = `<p class="td-cur"><span id="td-cur"></span></p>
    <p class="td-curid" id="td-curid"></p>
    <div class="td-myrow">
      <div class="td-saved-wrap">
        <a class="chip td-nearest-chip" href="/tides/near-me/">Nearest tides</a>
        <button type="button" class="chip" id="td-mybtn">Saved Stations ▾</button>
        <button type="button" class="chip" id="td-myedit">Edit</button>
        <div class="td-panel" id="td-mypanel" hidden>
          <div class="td-myhead"><span>Station</span><span id="td-mycol">Default</span></div>
          <div id="td-mylist"></div>
          <p class="td-mymsg" id="td-mymsg" hidden></p>
        </div>
      </div>
    </div>
    <div class="td-quick" id="td-quick"></div>`;

/* the "current information" readouts (now/next tide, today's highs & lows)
 * — moved out of the admin card into their own card that sits beside the
 * tide chart on a wide screen (below it, stacked, on a narrow one — see
 * .td-hero in 21-tides.css). (td-quick, the saved-station quick-nav, stays
 * in the admin card since it belongs with My Stations and shows on the bare
 * hub.) */
const SUMMARY_CARD = `
  <div class="card td-summary-card">
    <div class="td-grid" id="td-summary"></div>
    <div class="td-grid td-grid2" id="td-highest"></div>
    <div class="td-today" id="td-today"></div>
    <p class="tool-msg" id="td-sum-note"></p>
  </div>`;

/* the interactive tide chart card, shared by the full tool and the chart-only
 * /tides/near-me/ preview. finderHint adds the "prefer a plain list?" pointer,
 * which only makes sense where the finder card is also present (the full tool);
 * the near-me preview omits it. */
const chartCardHtml = (finderHint) => `
  <div class="card td-chart-card">
    <h2>Tide chart</h2>
    <div class="td-chart-head">
      <span class="td-sellab" id="td-selA"></span>
      <span class="td-sellab td-selr" id="td-selB"></span>
    </div>
    <div class="td-chartwrap"><svg id="td-chart" class="td-chartsvg" viewBox="0 0 700 600" role="img" aria-label="Tide chart: the water curve with today's highs and lows"><!--TDSSR--></svg><span class="td-movebtn" id="td-move" hidden aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12H3"/><path d="M6.5 8.5 3 12l3.5 3.5"/><path d="M15 12h6"/><path d="M17.5 8.5 21 12l-3.5 3.5"/></svg></span><div class="td-tip" id="td-tip" hidden></div></div>
    <div class="td-chartset">
      <label>Days <select id="td-days" aria-label="Number of days shown in the chart"><option>2</option><option selected>3</option><option>4</option><option>5</option><option>6</option><option>7</option></select></label>
      <button type="button" class="chip" id="td-zoomtg">Zoom out · 15 days</button>
    </div>
    <details class="td-help">
      <summary>How to read this chart</summary>
      <p class="hint">Pick the number of days with <strong>Days</strong> · hold <span class="td-mini" aria-hidden="true"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12H3"/><path d="M6.5 8.5 3 12l3.5 3.5"/><path d="M15 12h6"/><path d="M17.5 8.5 21 12l-3.5 3.5"/></svg></span> or <strong>Zoom out</strong> to slide to other dates · tap the curve for exact heights.</p>
      <p class="hint">Dark bands are night. Heights are feet above MLLW; times are the station's own local time.</p>
    </details>
    <!-- The safety line stays OUT of the dropdown on purpose: a disclaimer that
         only appears once you go looking for it is not a disclaimer. Only the
         how-to-use instructions collapse. -->
    <p class="hint"><strong>Not a flood, navigation, or public-safety forecast.</strong></p>
    <p class="hint td-attr">Tide times and predicted heights: NOAA CO-OPS.</p>
    ${finderHint ? `<p class="hint">See the <a href="#td-finder">numeric tide table</a> below.</p>` : ""}
    <p class="tool-msg" id="td-chart-note"></p>
  </div>`;

/* the tide tool's data cards, as named pieces so the hub and the station pages
 * can order them differently (hub: search-first; station: chart-first). */
const KING_CARD = `  <div class="card" id="td-king-card" hidden>
    <h2>Next king tides</h2>
    <p>The biggest predicted tides of the coming year at this station, and the lowest-water windows that typically follow — periods with some of the highest predicted astronomical tides of the year. Consult official local forecasts and alerts before planning any beach, boating or shoreline activity.</p>
    <div class="td-grid" id="td-king"></div>
    <p class="hint">Computed from a full year of NOAA predictions: the top 10% of high tides, grouped into date windows.</p>
  </div>`;

const SUN_CARD = `  <div class="card">
    <h2>Sun &amp; moon</h2>
    <div class="td-grid" id="td-sun"></div>
    <p class="hint" id="td-sun-note"></p>
    <p class="hint">Spring tides follow the new and full moon: see the <a href="/moon/full-moon-calendar/">full moon calendar</a> or <a href="/moon/">today's moon phase</a>.</p>
  </div>`;

const FINDER_CARD = `  <div class="card td-finder-card" id="td-finder">
    <h2>Find high tides by date</h2>
    <p>The next 5 days to start — every high and low. Add 5 more days as many times as you like, or pick any range up to a year out.</p>
    <div class="td-controls">
      <label>From <input type="date" id="td-from"></label>
      <label>To <input type="date" id="td-to"></label>
      <button class="td-qgo td-upd" id="td-apply" type="button" aria-label="Update the list" title="Update"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg></button>
      <button class="btn secondary" id="td-csv" type="button">Download CSV</button>
      <button class="btn secondary" id="td-print" type="button" onclick="window.print()">Print</button>
    </div>
    <div class="td-tablewrap"><table class="td-table" id="td-table"></table></div>
    <div class="td-print-note">NOAA astronomical tide predictions only — not for navigation or safety decisions. For those, check NOAA and the U.S. Coast Guard.</div>
    <p class="td-morerow"><button class="btn secondary" id="td-more" type="button">Show 5 more days</button></p>
    <p class="tool-msg" id="td-tbl-note"></p>
  </div>`;

const TOOL_CARDS = `
<div class="td-hero">
${chartCardHtml(true)}
${SUMMARY_CARD}
</div>

${KING_CARD}

${SUN_CARD}

${FINDER_CARD}`;

/* the search + saved-stations "admin" card (search on top, current station,
 * Nearest tides / Saved Stations / Edit). On the hub it leads the page; on a
 * station page it drops BELOW the chart so the chart is the first thing seen. */
const ADMIN_CARD = (stateLink) => `  <div class="card td-card">
    ${SEARCH_HTML}
    ${summaryInner}
    ${stateLink ? `<p class="td-statelink">${stateLink}</p>` : ""}
  </div>`;

/* HUB layout: admin card first, then the data cards inside #td-tool (hidden
 * until a default station or ?station= deep link loads). */
const TOOL = (hideData, stateLink, ssrChart = "") => `
${ADMIN_CARD(stateLink)}
  <div id="td-tool"${hideData ? " hidden" : ""}>
${TOOL_CARDS.replace("<!--TDSSR-->", ssrChart)}
  </div>`;

/* STATION / DESTINATION layout: the chart leads the page, the safety warning
 * sits directly beneath it, then today's numbers, then the search/saved card,
 * then the rest of the tool. (Per owner: the warning is still prominent — right
 * under the chart — and the disclaimer is repeated in the chart card, the
 * finder, the footer and /terms.) On a wide screen the warning and today's
 * numbers ride beside the chart instead of under it (.td-hero, 21-tides.css) —
 * same reading order, just spent sideways once there's room for it. No
 * #td-tool wrapper needed here (nothing hides these cards); the print rule
 * keeps only the finder card via .wrap>* matching. The short cards between the
 * hero and the finder ride two abreast on a wide screen (.td-pair,
 * 21-tides.css) — they flow, so an absent table or strip closes the gap. The
 * finder stays outside the wrapper: full width for its table, and a direct
 * child of .wrap for the print rule. */
const STATION_TOOL = ({ stateLink = "", ssrChart = "", note = "", bakedTable = "", sunCard = "" }) => `
<div class="td-hero">
${chartCardHtml(true).replace("<!--TDSSR-->", ssrChart)}
${note}
${SUMMARY_CARD}
</div>
<div class="td-pair">
  ${bakedTable}
  ${sunCard}
${ADMIN_CARD(stateLink)}

${KING_CARD}

${SUN_CARD}
</div>

${FINDER_CARD}`;

/* Static SVG tide chart baked into a station page from its file-sourced hi/lo,
 * so the chart isn't a blank <canvas> before JS runs (crawlers + no-JS see real
 * data). The interactive canvas replaces it — tides.js removes #td-chart-ssr on
 * its first real draw. `data` is a todayTides entry ({ ymd, events:[{t,v,hi}] }). */
const hodFromT = (t) => { const m = /(\d{2}):(\d{2})$/.exec(t); return m ? +m[1] + +m[2] / 60 : 0; };
const label12 = (t) => { const m = /(\d{2}):(\d{2})$/.exec(t); if (!m) return ""; let h = +m[1]; const ap = h < 12 ? "AM" : "PM"; h = h % 12 || 12; return `${h}:${m[2]} ${ap}`; };
/* ---- the chart that ships in the HTML ----
 * Same renderer the browser runs (tide-chart.mjs), same window the browser
 * opens with, drawn from the same NOAA extremes — so the page no longer swaps
 * one chart for a different-looking one a moment after it loads.
 *
 * All the maths happens in the STATION's own wall clock, expressed as UTC ms:
 * one frame for the tide times (NOAA gives them in station-local time already),
 * the day boundaries and the night shading, so no timezone handling leaks into
 * the renderer. The browser does the same thing in ITS frame. */
const CHART_DAYS = 3;      // the window a tide page opens on
const BAKE_DAYS = 16;      // hi/lo shipped to the client: covers the 7-day table + the 15-day zoom-out
const wallMs = (t) => { const m = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(t); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null; };
const tzOffset = (tz, ms) => {
  try {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms));
    const g = (k) => +p.find((x) => x.type === k).value;
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - ms;
  } catch (e) { return 0; }
};
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
/* the station's high/low events for a window, in the wall-clock frame */
function bakedEvents(id, fromMs, toMs) {
  const arr = _tideStore[id];
  if (!Array.isArray(arr)) return [];
  return arr.map((e) => ({ t: wallMs(e.t), v: e.v, hi: !!e.hi }))
    .filter((e) => e.t !== null && e.t >= fromMs && e.t <= toMs)
    .sort((a, b) => a.t - b.t);
}
/* sunset→sunrise spans to shade, in the same frame */
function nightBands(lat, lng, tz, t0, t1) {
  const out = [];
  for (let d = t0 - 86400000; d <= t1 + 86400000; d += 86400000) {
    const real = d - tzOffset(tz, d);                       // frame ms -> a real instant that day
    const s = nSunCalc(new Date(real), lat, lng, -0.833);
    const nx = nSunCalc(new Date(real + 86400000), lat, lng, -0.833);
    if (!s.set || !nx.rise) continue;
    out.push([s.set + tzOffset(tz, s.set), nx.rise + tzOffset(tz, nx.rise)]);
  }
  return out;
}
/* Everything a tide page needs to draw its chart without calling NOAA: the
 * baked window, the default view, and the SVG itself. Returns "" when the
 * station has no data yet (the live chart still fills in). */
function bakedChart(st, { days = CHART_DAYS, marks = true } = {}) {
  const nowLocal = Date.now() + tzOffset(st.tz, Date.now());
  const t0 = Math.floor(nowLocal / 86400000) * 86400000;    // the station's local midnight
  const t1 = t0 + days * 86400000;
  const ev = bakedEvents(st.id, t0 - 86400000, t1 + 86400000);
  if (ev.length < 3) return "";
  const ticks = [];
  for (let d = t0; d <= t1; d += 86400000) {
    const dd = new Date(d);
    ticks.push([d, `${DOW[dd.getUTCDay()]} ${dd.getUTCMonth() + 1}/${dd.getUTCDate()}`]);
  }
  return tideChartSvg({
    W: TIDE_W, H: TIDE_H_PAGE, t0, t1,
    pts: tideSeries(ev, t0, t1, 900000),
    hilo: ev.map((e) => ({ t: e.t, v: e.v, hi: e.hi, lbl: `${e.v.toFixed(1) === "-0.0" ? "0.0" : e.v.toFixed(1)}ft` })),
    nights: nightBands(st.lat, st.lng, st.tz, t0, t1),
    days: ticks,
    marks, now: null,   /* the build's clock isn't the visitor's — the page adds "now" on load */
  });
}
/* the hi/lo the client starts from, so the first paint needs no NOAA call */
function bakedData(st) {
  const nowLocal = Date.now() + tzOffset(st.tz, Date.now());
  const t0 = Math.floor(nowLocal / 86400000) * 86400000 - 86400000;
  const arr = _tideStore[st.id];
  if (!Array.isArray(arr)) return "";
  const ev = arr.filter((e) => { const t = wallMs(e.t); return t !== null && t >= t0 && t <= t0 + (BAKE_DAYS + 1) * 86400000; })
    .map((e) => [e.t, +e.v.toFixed(2), e.hi ? 1 : 0]);
  return ev.length ? `<script>window.TIDE_BAKED=${JSON.stringify({ id: st.id, ev })};</script>` : "";
}
function ssrChartFor(st) { return st ? bakedChart(st) : ""; }

/* Reciprocal coastal link (roadmap #9): when a station is mapped to a nearby
 * /sun/ city (coastal.mjs), bake today's sunrise/sunset/day-length for the
 * station (sun times are day-stable, so a baked value is accurate all day and
 * refreshes each hourly build) and link to that city's full sun page. The sun
 * page links back to this station, so the relationship is reciprocal. */
const fmtDaylight = (ms) => { const m = Math.round(ms / 60000), h = Math.floor(m / 60), mm = m % 60; return `${h} hour${h === 1 ? "" : "s"} ${mm} minute${mm === 1 ? "" : "s"}`; };
function sunCardFor(s) {
  /* was a one-way sunrise/sunset card; now the shared strip, so a tide page
     offers the same fields the sun and moon pages do, in the same voice, and
     the link is checkable in both directions (check-crosslinks.mjs). */
  const strip = astroStripForStation({ station: s.slug, lat: s.lat, lon: s.lng, tz: s.tz });
  if (strip) return strip;
  /* A station more than 35 miles from any city we publish has no paired place,
     so there is no "sun and moon HERE" to link to and the strip stays away. The
     simulator still applies — it works from any coordinates — so those pages get
     it on its own rather than nothing at all. */
  return `  <div class="card">
    <h2>The sun and moon behind these tides</h2>
    <p class="hint">This station sits away from any city with its own sun and moon pages, so there are no local times to link to. The tides here are still the moon's doing, with the sun adding to or working against it — which is what the simulator shows.</p>
${simLink({})}  </div>
`;
}

/* ogImage: an absolute /api/og URL for the page's share card. Defaults to a
 * generic tide card (the old /assets/img/og-default.png reference was broken —
 * that file doesn't exist). Station pages pass a station-specific tide card. */
const head = ({ title, desc, path, ogImage }) => {
  const og = ogImage || `${SITE}/api/og?tpl=tide&amp;label=${encodeURIComponent("Tide charts")}&amp;pat=semidiurnal`;
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<!-- tides.js fetches NOAA predictions the moment the chart draws; warming the
     connection here saves a DNS+TLS handshake off the first data render. -->
<link rel="preconnect" href="https://api.tidesandcurrents.noaa.gov" crossorigin>
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${og}">
<link rel="stylesheet" href="/assets/css/style.css">
${GA_SNIPPET}`;
};

const scripts = (cfg) => `<script>${INDEX_JS}${cfg ? `window.TIDE_CFG={station:${JSON.stringify(cfg)}};` : ""}</script>
<script src="/assets/js/tides.js"></script>`;

/* ---- hub: /tides/ ---- */
const byState = {};
for (const s of TIDE_STATIONS) (byState[s.st] = byState[s.st] || []).push(s);
/* hub directory: one chip per state. States with a state hub link there
 * (county-grouped list of every station); single-station states link
 * straight to their only station page. */
const HUB_STATE_PAGES = tideStatePages();
const directory = Object.keys(byState).sort().map((st) => {
  const sp = HUB_STATE_PAGES.find((p) => p.st === st);
  if (sp) return `<a class="chip" href="/tides/${sp.slug}/">${esc(sp.name)}</a>`;
  const s = byState[st][0];
  return `<a class="chip" href="/tides/${s.slug}/">${esc(s.city)}, ${st}</a>`;
}).join("");

const hubHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: "Tide Charts & Tide Times — High, Low & King Tides",
  desc: "Free NOAA tide charts for any U.S. coastal station: today's high and low tides, an interactive tide graph, and a date-range high-tide finder up to a year out.",
  path: "/tides/",
})}
${appLd({ name: "Tide Charts & Tide Times", url: `${SITE}/tides/`, description: "NOAA tide predictions with an interactive chart and date-range high-tide finder." })}
${faqLd(FAQ(""))}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "tides", url: "/tides/" } })}
  <h1>Tide Charts &amp; Tide Times</h1>
  <p class="sub">Official NOAA tide predictions for 3,300+ U.S. coastal stations — today's highs and lows, an interactive chart, and a high-tide finder that looks up to a year ahead. Want your local tides? <a href="/tides/near-me/">Tides near me →</a></p>
${BETA_NOTE}
${TOOL(true, "")}
  <div class="card" id="how">
    <h2>What this is, and how it works</h2>
    <p>Official NOAA tide predictions for 3,300+ U.S. coastal stations. Today’s highs and lows, an interactive chart, and a high-tide finder that looks a year ahead live on each location’s own page. Your Saved Stations appear above as one-tap cards; type a coastal town, a state, or a NOAA station ID.</p>
    <p><strong>The chart is the date control.</strong> Drag the ‹ › handles to resize the bright band, hold the ⇔ button to move it, and use Settings under the chart for the day count.</p>
  </div>
${hubQuestionsCard("/tides/")}
  <div class="card">
    <h2>Tide charts by state</h2>
    <div class="td-states">${directory}</div>
    <p class="hint">Each state opens its full list of stations, organized by county. States with a single station open that station directly.</p>
  </div>
  <div class="card">
    <h2>The largest tides</h2>
    <p>The world record belongs to Canada’s Bay of Fundy. America’s giants are Alaska’s Cook Inlet and Eastport, Maine. The height is not the hidden danger — the <strong>speed</strong> is. Same clock, a bigger tide moves faster. <a href="/concepts/what-causes-tides/">What causes tides?</a> · <a href="/tides/biggest-tides/">The biggest tides on Earth</a>.</p>
  </div>
${TIDE_FOOTER}
</div>
${scripts(null)}
</body>
</html>
`;
mkdirSync(join(root, "tides"), { recursive: true });
writeFileSync(join(root, "tides/index.html"), hubHtml);

/* ---- dedicated "tides near me" page: /tides/near-me/ ------------------------
 * Owns the "near me" query cluster (tides near me, high tide near me, nearest
 * beach tides) with an exact-match title/H1 so it doesn't cannibalize the hub.
 * It is a ROUTER, not a tool: on load it auto-geolocates and lists the tide
 * stations AND beaches closest to you, sorted by distance, each linking to its
 * own page — no chart here on purpose (a chart would make opening the real
 * pages pointless). If location is denied it falls back to popular spots +
 * browse-by-state, never a dead end. ---- */
const NEARME_POPULAR = ["san-diego-ca", "los-angeles-ca", "san-francisco-ca", "seattle-wa", "miami-fl", "boston-ma", "new-york-ny", "galveston-tx", "honolulu-hi", "myrtle-beach-sc", "virginia-beach-va", "portland-me"]
  .map((sl) => stationBySlug.get(sl)).filter(Boolean);
/* combined "closest to you" index: every station AND every destination beach,
 * so beach towns people actually search for (Lincoln City, Cannon Beach, …)
 * surface in the nearest list, not just the harbor stations. */
/* The 6th field is the NOAA station id. It carries no display role: it is what
 * lets the client dedupe its own curated pages out of the full NOAA directory.
 * The filter was already written (`have[p.id]`) but the tuples had no id, so
 * `have` was always empty — typing "Seattle" listed the curated
 * /tides/seattle-wa/ page AND a duplicate directory row pointing at the generic
 * ?station= viewer, and nearestAny() could pick the generic one over the real
 * page. A destination inherits its source station's id, which is the station it
 * shows tides for. */
const NEARME_PLACES = [
  ...TIDE_STATIONS.map((s) => [s.slug, `${s.city}, ${s.st}`, s.lat, s.lng, 0, String(s.id)]),
  ...DESTINATIONS.map((d) => [d.slug, `${d.name}, ${d.st}`, d.lat, d.lng, 1, String((stationBySlug.get(d.source) || {}).id || "")]),
];
const NEARME_INDEX_JS = `window.TIDE_NEAR=${JSON.stringify(NEARME_PLACES)};`;

/* shared intro copy: the meta description AND the on-page sub use the same
 * sentence (the sub just adds a "pick a location" call to action), so the two
 * never drift. */
const NEARME_INTRO = "High tide, low tide, tide times, tide charts and more. See what you can expect when you get to the beach.";

/* Search box that replaces the old "tide charts by state" directory. It
 * pre-populates from the existing tide pages (window.TIDE_NEAR — every station
 * and destination beach) as you type; when the query matches no existing page
 * (a coastal town we don't have) it geocodes via Open-Meteo — same free,
 * keyless service the /sun/ search uses — and routes to the NEAREST tide
 * station's page, so a typed beach we don't cover still returns a usable chart. */
const NEARME_SEARCH_HTML = `<div class="card">
    <h2>Search tide locations</h2>
    <p class="hint" style="margin:0 0 10px">Start typing a coastal town, beach, or state to jump to its tide chart — or search any beach and we'll open the nearest tide station.</p>
    <div class="td-search">
      <div class="td-qrow">
        <input id="nm-q" type="search" placeholder="Search a coastal town, beach, or state…" autocomplete="off" aria-label="Search tide locations">
        <button class="td-qgo" id="nm-qgo" type="button" aria-label="Search">${MAG_SVG}</button>
      </div>
      <ul class="td-results" id="nm-results" hidden></ul>
    </div>
  </div>`;

/* The search widget. Local matches (existing tide pages) are instant; only a
 * query with no local match triggers a debounced Open-Meteo geocode, whose top
 * hits each route to the nearest station page (with the distance shown). */
const NEARME_SEARCH_JS = `<script>(function(){
    var box=document.getElementById('nm-q'), list=document.getElementById('nm-results'), go=document.getElementById('nm-qgo');
    if(!box||!list) return;
    var PLACES=(window.TIDE_NEAR||[]).map(function(a){return {slug:a[0],label:a[1],lat:a[2],lng:a[3],id:a[5]||null};});
    /* ---- the FULL NOAA directory ------------------------------------------
       PLACES is the ~100 curated harbours that get their own page. The other
       ~3,200 NOAA tide-prediction locations already have a working viewer at
       /tides/?station=<id> — the state pages have listed them that way for
       ages — but this search never looked at them, so "Nome" (a real NOAA
       station) came back "no coastal match" while /tides/alaska/ listed it.
       Fetched once on idle, exactly like /sun/'s city index, so the first
       keystroke already has everything. */
    var FULL=null, fullFetching=false, fullWaiting=[];
    function ensureFull(cb){ if(cb) fullWaiting.push(cb);
      if(FULL){ var w=fullWaiting; fullWaiting=[]; w.forEach(function(f){f();}); return; }
      if(fullFetching) return; fullFetching=true;
      fetch("https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions")
        .then(function(r){return r.json();})
        .then(function(d){
          var have={}; PLACES.forEach(function(p){ if(p.id) have[String(p.id)]=1; });
          FULL=(d.stations||[]).filter(function(x){ return x.lat!=null&&x.lng!=null; })
            .map(function(x){ return {id:String(x.id), label:(x.name||'')+((x.state||'').trim()?', '+(x.state||'').trim():''),
              name:x.name||'', st:(x.state||'').trim(), lat:x.lat, lng:x.lng}; });
          var w2=fullWaiting; fullWaiting=[]; w2.forEach(function(f){f();});
        })["catch"](function(){ fullFetching=false; fullWaiting=[]; });
    }
    if(window.requestIdleCallback) requestIdleCallback(function(){ ensureFull(); },{timeout:3000});
    else setTimeout(function(){ ensureFull(); },700);
    /* "Nome Alaska" / "nome, ak" -> {q:"Nome", st:"AK"}. Open-Meteo matches on
       the place NAME only, so the raw string found nothing and the search said
       "no coastal match" for a town that has its own NOAA station. This is the
       same split /sun/ and /moon/ have always done. */
    /* all 28 coastal state names, not just the 20 with a curated station —
       NOAA has locations in states we carry no hand-picked harbour for */
    var ST_NAMES=${JSON.stringify(Object.fromEntries(Object.entries(TIDE_STATE_NAMES).map(([ab, nm]) => [nm, ab])))};
    function splitPlace(v){ v=v.trim().replace(/  +/g,' ');
      var lo=v.toLowerCase(), k, kl;
      for(k in ST_NAMES){ kl=k.toLowerCase();
        if(lo.length>kl.length+1&&lo.slice(-kl.length)===kl){ var rest=v.slice(0,v.length-kl.length).replace(/[ ,]+$/,''); if(rest) return {q:rest, st:ST_NAMES[k]}; } }
      var m=v.match(/^(.+?)[ ,]+([A-Za-z]{2})$/);
      if(m){ var up=m[2].toUpperCase(); for(k in ST_NAMES){ if(ST_NAMES[k]===up) return {q:m[1].replace(/[ ,]+$/,''), st:up}; } }
      return {q:v, st:null}; }
    /* the nearest NOAA location of ANY kind to a point, curated or not */
    function nearestAny(la,lo){
      var best=null,bd=1e9,i,d;
      for(i=0;i<PLACES.length;i++){ d=hav(la,lo,PLACES[i].lat,PLACES[i].lng); if(d<bd){bd=d;best={href:'/tides/'+PLACES[i].slug+'/',label:PLACES[i].label};} }
      if(FULL) for(i=0;i<FULL.length;i++){ d=hav(la,lo,FULL[i].lat,FULL[i].lng);
        if(d<bd){bd=d;best={href:'/tides/?station='+encodeURIComponent(FULL[i].id)+'&name='+encodeURIComponent(FULL[i].label),label:FULL[i].label};} }
      return best?{p:best,mi:Math.round(bd)}:null; }
    var POPULAR=${JSON.stringify(NEARME_POPULAR.map((s) => s.slug))};
    function hav(la1,lo1,la2,lo2){var p=Math.PI/180,dl=(la2-la1)*p,dg=(lo2-lo1)*p,
      h=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(la1*p)*Math.cos(la2*p)*Math.sin(dg/2)*Math.sin(dg/2);
      return 2*3959*Math.asin(Math.sqrt(h));}
    function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function bySlug(sl){ for(var i=0;i<PLACES.length;i++){ if(PLACES[i].slug===sl) return PLACES[i]; } return null; }
    function nearestTo(la,lo){ var best=null,bd=1e9; for(var i=0;i<PLACES.length;i++){ var d=hav(la,lo,PLACES[i].lat,PLACES[i].lng); if(d<bd){bd=d;best=PLACES[i];} } return best?{p:best,mi:Math.round(bd)}:null; }
    function go2(href){ list.hidden=true; location.href=href; }
    function addStation(p){ var li=document.createElement('li'), b=document.createElement('button'); b.type='button';
      b.textContent=p.label; b.addEventListener('click',function(){ go2('/tides/'+p.slug+'/'); }); li.appendChild(b); list.appendChild(li); }
    function addGeocoded(r){ var li=document.createElement('li'), b=document.createElement('button'); b.type='button';
      b.innerHTML='<span class="nm-city">'+esc(r.place)+'</span> <span class="nm-mi">nearest chart · '+esc(r.stationLabel)+' · '+r.mi+' mi</span>';
      b.addEventListener('click',function(){ go2(r.href); }); li.appendChild(b); list.appendChild(li); }
    function addNote(txt){ var li=document.createElement('li'); li.className='td-none'; li.textContent=txt; list.appendChild(li); }
    function localMatches(v){ v=v.trim().toLowerCase(); if(!v) return [];
      var pre=[], sub=[];
      for(var i=0;i<PLACES.length;i++){ var l=PLACES[i].label.toLowerCase();
        if(l.indexOf(v)===0) pre.push(PLACES[i]); else if(l.indexOf(v)>-1) sub.push(PLACES[i]); }
      return pre.concat(sub).slice(0,10); }
    function showPopular(){ list.innerHTML=''; addNote('Popular tide locations — or type to search any beach:');
      POPULAR.forEach(function(sl){ var p=bySlug(sl); if(p) addStation(p); }); list.hidden=false; }
    /* NOAA locations that match by NAME, after the curated ones */
    function fullMatches(v){
      if(!FULL) return [];
      var sp=splitPlace(v), q=sp.q.toLowerCase(), out=[], i;
      if(!q) return [];
      for(i=0;i<FULL.length&&out.length<8;i++){
        var f=FULL[i];
        if(sp.st&&f.st!==sp.st) continue;
        if(f.name.toLowerCase().indexOf(q)!==0) continue;
        out.push(f);
      }
      return out; }
    function addFull(f){ var li=document.createElement('li'), b=document.createElement('button'); b.type='button';
      b.innerHTML='<span class="nm-city">'+esc(f.label)+'</span> <span class="nm-mi">NOAA #'+esc(f.id)+'</span>';
      b.addEventListener('click',function(){ go2('/tides/?station='+encodeURIComponent(f.id)+'&name='+encodeURIComponent(f.label)); });
      li.appendChild(b); list.appendChild(li); }
    function paintLocal(){ var v=box.value.trim(); list.innerHTML='';
      if(!v){ showPopular(); return; }
      var m=localMatches(v); m.forEach(addStation);
      var fm=fullMatches(v); fm.forEach(addFull);
      if(!m.length&&!fm.length) addNote(v.length>=3?'Searching the map…':'Keep typing, or search any beach town.');
      list.hidden=false; }
    var omSeq=0, omTimer=null;
    function omSearch(v,cb){ var seq=++omSeq, sp=splitPlace(v);
      fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(sp.q)+'&count=10&language=en&format=json')
        .then(function(r){ return r.json(); })
        .then(function(j){ if(seq!==omSeq) return;
          var rs=j.results||[];
          if(sp.st) { var f=rs.filter(function(r2){ return r2.country_code==='US'&&ST_NAMES[r2.admin1]===sp.st; }); if(f.length) rs=f; }
          var rows=rs.slice(0,5).map(function(r2){ var nb=nearestAny(r2.latitude,r2.longitude); if(!nb) return null;
            var place=r2.name+(r2.admin1?', '+r2.admin1:'')+(r2.country_code&&r2.country_code!=='US'?' · '+r2.country_code:'');
            return {place:place, href:nb.p.href, stationLabel:nb.p.label, mi:nb.mi}; }).filter(Boolean);
          cb(rows); })
        .catch(function(){ if(seq!==omSeq) return; cb(null); }); }
    /* Beyond this, "nearest station" stops being a useful answer: a tide
       prediction 200 miles inland is not that place's tide, it is a different
       coast's. Say so rather than quietly serving it. */
    var FAR_MI=120;
    function paintGeocoded(v){ omSearch(v,function(rows){ if(box.value.trim()!==v) return; list.innerHTML='';
      if(rows===null){ addNote('Couldn’t reach the search service — pick a popular spot below instead.'); list.hidden=false; return; }
      if(!rows.length){ addNote('No match for "'+v+'" — check the spelling or try a nearby town.'); list.hidden=false; return; }
      var near=rows.filter(function(r){ return r.mi<=FAR_MI; });
      if(!near.length){
        var f=rows[0];
        addNote(f.place+' is about '+f.mi+' miles from the nearest tide station, so it is almost certainly inland — tides are only predicted on the coast.');
        addGeocoded(f);
        list.hidden=false; return; }
      addNote('Nearest tide chart to your search:'); near.forEach(addGeocoded); list.hidden=false; }); }
    function onInput(){ if(omTimer) clearTimeout(omTimer); ensureFull(paintLocal); paintLocal();
      var v=box.value.trim();
      if(v.length>=3 && !localMatches(v).length && !fullMatches(v).length) omTimer=setTimeout(function(){ paintGeocoded(v); },350); }
    box.addEventListener('input',onInput);
    box.addEventListener('focus',function(){ if(!box.value.trim()) showPopular(); });
    box.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault();
      var hit=list.querySelector('button'); if(hit){ hit.click(); return; }
      var v=box.value.trim(); if(v.length>=2) paintGeocoded(v); } });
    if(go) go.addEventListener('click',function(){ var v=box.value.trim(); if(!v){ box.focus(); return; }
      var m=localMatches(v); if(m.length){ go2('/tides/'+m[0].slug+'/'); return; } paintGeocoded(v); });
    document.addEventListener('click',function(e){ if(!e.target.closest('.td-search')) list.hidden=true; });
  })();</script>`;

const nearMeFaq = [
  ["How do I find the tides near me?", "Allow location access and this page lists the tide stations and beaches closest to you, sorted by distance — tap any to open its high and low tide times, chart, and year-ahead finder. No app and no sign-up. If you'd rather not share your location, pick one of the popular spots or browse by state below."],
  ["Why does the list mix beaches and tide stations?", "NOAA measures tides at official stations (often at a harbor or pier), but the place you're headed is usually a nearby beach town. So the list includes both: the stations with their own predictions, and popular beaches that estimate from the nearest station. Whichever you tap, the page tells you which NOAA station the times come from and how far away it is."],
  ["Is it my exact location's tide?", "Each result links to the nearest official NOAA station, or a beach that estimates from one a few miles away. Along an open coast the high and low times shift only slightly with distance, so it's a close guide — but for anything safety-related, use NOAA directly."],
  ...FAQ(""),
];
const nearMeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: "Tides near me — Find high & low tides at your location",
  desc: NEARME_INTRO,
  path: "/tides/near-me/",
  ogImage: `${SITE}/api/og?tpl=tide&amp;label=${encodeURIComponent("Tides near me")}&amp;pat=semidiurnal`,
})}
${appLd({ name: "Tides Near Me", url: `${SITE}/tides/near-me/`, description: "The tide stations and beaches closest to you, with today's high and low tides." })}
${faqLd(nearMeFaq)}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Tide Charts", url: "/tides/" }, { name: "Tides Near Me", url: "/tides/near-me/" }]).replace(/</g, "\\u003c")}</script>
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "tides", url: "/tides/" }, page: { label: "Tides near me", url: "/tides/near-me/" } })}
  <h1>High &amp; low tides near me</h1>
  <p class="sub">${NEARME_INTRO} Select a location below to see local tide charts.</p>
${BETA_NOTE}
  <div class="card td-nearme">
    <h2>Nearest tide locations</h2>
    <div class="nm-statusrow">
      <span class="nm-spinner" id="nm-spinner" aria-hidden="true"></span>
      <p class="nm-status" id="nm-status" role="status">Finding the tide spots closest to you…</p>
    </div>
    <div class="nm-list" id="nm-list"></div>
    <button type="button" class="btn" id="nm-locate" style="width:auto" hidden>📍 Use my location</button>
    <noscript><p class="hint">Turn on JavaScript to auto-detect your location, or pick a popular spot or your state below.</p></noscript>
  </div>
  <div class="card">
    <h2>Popular tide locations</h2>
    <p class="hint" style="margin:0 0 8px">Prefer not to share your location? Jump straight to a well-known coast:</p>
    <div class="timer-presets">${NEARME_POPULAR.map((s) => `<a class="chip" href="/tides/${s.slug}/">${esc(s.city)}, ${esc(s.st)}</a>`).join("")}</div>
  </div>
  ${NEARME_SEARCH_HTML}
  <div class="card cd-answer">
    ${nearMeFaq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ")}
  </div>
${TIDE_FOOTER}
</div>
<script>${NEARME_INDEX_JS}</script>
${NEARME_LIST_JS}
${NEARME_SEARCH_JS}
</body>
</html>
`;
mkdirSync(join(root, "tides", "near-me"), { recursive: true });
writeFileSync(join(root, "tides/near-me/index.html"), nearMeHtml);

/* ---- one page per curated station ---- */
/* coast/region name per state, for the per-station "about" copy */
const REGION = { ME: "New England coast", NH: "New England coast", MA: "New England coast", RI: "New England coast", CT: "New England coast",
  NY: "Mid-Atlantic coast", NJ: "Mid-Atlantic coast", PA: "tidal Delaware River", DE: "Delaware Bay", MD: "Chesapeake Bay region", DC: "Potomac River", VA: "Chesapeake Bay region",
  NC: "Southeast Atlantic coast", SC: "Southeast Atlantic coast", GA: "Southeast Atlantic coast", FL: "Florida coast",
  AL: "Gulf Coast", MS: "Gulf Coast", LA: "Gulf Coast", TX: "Gulf Coast",
  CA: "California coast", OR: "Pacific Northwest coast", WA: "Pacific Northwest coast",
  AK: "Alaska coast", HI: "Hawaiian Islands", PR: "Caribbean coast of Puerto Rico",
  GU: "western Pacific (Guam)", AS: "South Pacific (American Samoa)" };   /* NH is set on the first line */
const miles = (a, b) => { const p = Math.PI / 180, dl = (b.lat - a.lat) * p, dg = (b.lng - a.lng) * p,
  h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dg / 2) ** 2;
  return Math.round(2 * 3959 * Math.asin(Math.sqrt(h))); };

/* Regional tidal character — the pattern (how many tides a day) and typical
 * range magnitude for each coast. These are well-established regional
 * generalizations, deliberately framed as "typically/usually" and always
 * paired with a pointer to the live chart for the exact numbers, since the
 * precise range varies station to station. Purpose: give each station page
 * genuinely unique, accurate, useful content instead of one shared template.
 * `pattern`: diurnal (1 high + 1 low/day), semidiurnal (2 near-equal), or
 * mixed (2 unequal). `range`: a plain-language size class. */
const TIDE_TYPE = {
  semidiurnal: { count: "two high tides and two low tides", each: "roughly every 6 hours 12 minutes", note: "the two highs each day are usually close in height" },
  mixed: { count: "two high tides and two low tides", each: "at uneven intervals", note: "the two highs (and two lows) each day are often noticeably unequal — a higher high and a lower high" },
  diurnal: { count: "just one high tide and one low tide", each: "about once every 24 hours 50 minutes", note: "single daily tides are typical of the Gulf of Mexico and make for gentle, slow water changes" },
};
/* state -> { pattern, range, rangeText }. Florida is split by longitude below
 * (Gulf side is diurnal/small, Atlantic side semidiurnal/moderate). */
const STATE_TIDE = {
  ME: ["semidiurnal", "large", "large — often 9 to 12 feet, and far more in the far northeast (Eastport swings ~18 feet)"],
  NH: ["semidiurnal", "moderate-to-large", "moderate to large, commonly 8 to 9 feet"],
  MA: ["semidiurnal", "moderate-to-large", "moderate to large, often 9 to 10 feet in Boston Harbor"],
  RI: ["semidiurnal", "moderate", "moderate, usually 3 to 5 feet"],
  CT: ["semidiurnal", "moderate", "moderate, roughly 2 to 7 feet and larger toward the state's western end"],
  NY: ["semidiurnal", "moderate", "moderate, generally 4 to 5 feet"],
  NJ: ["semidiurnal", "moderate", "moderate, generally 4 to 6 feet"],
  PA: ["semidiurnal", "moderate", "moderate, around 6 feet on the tidal Delaware"],
  DE: ["semidiurnal", "moderate", "moderate, generally 4 to 6 feet"],
  MD: ["semidiurnal", "small", "small inside the Chesapeake, often 1 to 2 feet"],
  DC: ["semidiurnal", "small", "small, roughly 3 feet on the tidal Potomac"],
  VA: ["semidiurnal", "small-to-moderate", "small to moderate, about 2 to 4 feet"],
  NC: ["semidiurnal", "moderate", "moderate, generally 3 to 5 feet"],
  SC: ["semidiurnal", "moderate-to-large", "moderate to large, often 5 to 7 feet"],
  GA: ["semidiurnal", "large", "among the largest on the Southeast coast, frequently 7 to 9 feet"],
  AL: ["diurnal", "small", "small, typically only 1 to 2 feet"],
  MS: ["diurnal", "small", "small, typically only 1 to 2 feet"],
  LA: ["diurnal", "small", "small, typically 1 to 2 feet"],
  TX: ["diurnal", "small", "small, typically 1 to 2 feet"],
  CA: ["mixed", "moderate", "moderate, generally 4 to 6 feet between the day's extremes"],
  OR: ["mixed", "moderate-to-large", "moderate to large, often 6 to 8 feet"],
  WA: ["mixed", "large", "large, especially in Puget Sound where the range can reach 10 to 15 feet"],
  AK: ["mixed", "very large", "among the largest in the United States — Cook Inlet near Anchorage can swing 26 to 30 feet"],
  HI: ["mixed", "small", "small, typically only 1 to 2 feet"],
  PR: ["mixed", "small", "small, typically around 1 to 2 feet"],
  GU: ["mixed", "small", "small, typically 1 to 2 feet"],
  AS: ["mixed", "small", "small, typically 2 to 3 feet"],
};
/* Florida spans three distinct tidal regimes and a single longitude line can't
 * separate them (the southwest Gulf coast — Naples, Fort Myers — sits east of
 * the panhandle yet is still Gulf), so the curated FL stations are classified
 * by hand. Panhandle = diurnal; Gulf peninsula + Keys = mixed (two unequal
 * tides); Atlantic coast = semidiurnal. Anything not listed falls back to a
 * safe "mixed". */
const FL_TIDE = {
  "pensacola-fl": ["diurnal", "small, typically only 1 to 2 feet"],
  "panama-city-fl": ["diurnal", "small, typically only 1 to 2 feet"],
  "apalachicola-fl": ["diurnal", "small, typically only 1 to 2 feet"],
  "cedar-key-fl": ["mixed", "small, generally 2 to 4 feet"],
  "clearwater-beach-fl": ["mixed", "small, generally 1 to 3 feet"],
  "st-petersburg-fl": ["mixed", "small, generally 1 to 3 feet"],
  "fort-myers-fl": ["mixed", "small, generally 1 to 3 feet"],
  "naples-fl": ["mixed", "small, generally 1 to 3 feet"],
  "key-west-fl": ["mixed", "small, generally 1 to 2 feet"],
  "marathon-fl": ["mixed", "small, generally 1 to 2 feet"],
  "jacksonville-fl": ["semidiurnal", "moderate, generally 3 to 5 feet on the Atlantic side"],
  "fernandina-beach-fl": ["semidiurnal", "moderate to large, often 5 to 6 feet"],
  "st-augustine-fl": ["semidiurnal", "moderate, generally 4 to 5 feet"],
  "cape-canaveral-fl": ["semidiurnal", "moderate, generally 3 to 4 feet"],
  "palm-beach-fl": ["semidiurnal", "moderate, generally 2 to 3 feet"],
  "miami-fl": ["semidiurnal", "small to moderate, generally 2 to 3 feet"],
  "cocoa-beach-fl": ["semidiurnal", "moderate, generally 3 to 4 feet on the Atlantic side"],
  "daytona-beach-fl": ["semidiurnal", "moderate, generally 3 to 5 feet on the Atlantic side"],
  /* FL destinations (no station of their own) */
  "sarasota-fl": ["mixed", "small, typically 1 to 2 feet"],
  "siesta-key-fl": ["mixed", "small, generally 1 to 2 feet"],
  "fort-lauderdale-fl": ["semidiurnal", "moderate, generally 2 to 3 feet on the Atlantic side"],
  "destin-fl": ["diurnal", "small, typically only 1 to 2 feet"],
};
function tidalCharacter(s) {
  let pat, rangeText;
  if (s.st === "FL") {
    const row = FL_TIDE[s.slug] || ["mixed", "small — see the chart above for the exact range"];
    pat = row[0]; rangeText = row[1];
  } else {
    const row = STATE_TIDE[s.st] || ["semidiurnal", "moderate", "moderate — see the chart above for the exact range"];
    pat = row[0]; rangeText = row[2];
  }
  return { pat, type: TIDE_TYPE[pat], rangeText };
}

const STATE_PAGES = tideStatePages();
/* state -> its hub slug, for destinations to link "All <state> tides →". Single-
 * station states (e.g. DE = Lewes only) have no hub, so those fall back to the
 * main /tides/ index instead of a 404. */
const STATE_HUB = new Map(STATE_PAGES.map((p) => [p.st, p.slug]));

/* ---- baked "today's tides" table -------------------------------------------
 * The station pages' tide times are otherwise 100% client-side, so the HTML a
 * crawler or AI engine indexes for "<city> tide today" contains no actual
 * times. We bake each station's high/low predictions for ITS OWN local today
 * into the page. The data comes from seo/_data/tide-predictions.json — a 45-day
 * window of hi/lo per station, batch-fetched from NOAA WEEKLY by fetch-tides.mjs
 * (see .github/workflows/fetch-tides.yml). Reading a committed file means the
 * hourly builds make ZERO NOAA calls (predictions are fixed astronomy, so a
 * 45-day window is always accurate); NOAA is hit ~100x/week, spaced out, well
 * within acceptable use. If the file is missing or a station/day isn't covered
 * (e.g. before the first fetch runs), the table is simply omitted — the live
 * chart still works. NOAA times are station-local wall time (lst_ldt). */
let _tideStore = {};
try { _tideStore = JSON.parse(readFileSync(join(root, "seo/_data/tide-predictions.json"), "utf8")).stations || {}; } catch (e) { /* file absent -> tables omitted */ }
const todayTides = new Map();
for (const s of TIDE_STATIONS) {
  const arr = _tideStore[s.id];
  if (!Array.isArray(arr)) continue;
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: s.tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date()).replace(/-/g, "");
  const ymdDash = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  const events = arr.filter((e) => typeof e.t === "string" && e.t.startsWith(ymdDash));
  if (events.length) todayTides.set(s.slug, { ymd, events });
}
const _baked = todayTides.size;
console.log(`Tide predictions: baked today's table for ${_baked}/${TIDE_STATIONS.length} stations from tide-predictions.json${_baked ? "" : " (no window data yet — run fetch-tides; tables omitted, live chart still works)"}`);

/* Render a station's baked table. Times are already station-local (lst_ldt). */
/* `estimate` (destination pages only) = { name, dist } of the source station.
 * When present the table is clearly labelled an ESTIMATE from that station, not
 * the place's own measured times. */
function tidesTable(data, s, estimate) {
  if (!data) return "";
  const fmtTime = (t) => {
    const m = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(t);
    if (!m) return t;
    let h = +m[4]; const mi = m[5], ap = h < 12 ? "AM" : "PM"; h = h % 12 || 12;
    return `${h}:${mi} ${ap}`;
  };
  const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${data.ymd.slice(0, 4)}-${data.ymd.slice(4, 6)}-${data.ymd.slice(6, 8)}T00:00:00Z`));
  const rows = data.events.map((e) =>
    `<tr><td>${e.hi ? "High" : "Low"} tide</td><td>${fmtTime(e.t)}</td><td>${e.v.toFixed(1)} ft</td></tr>`).join("");
  return `<div class="card">
    <h2>${estimate ? "Estimated tide times" : `${esc(s.city)} tide times`} for ${esc(dayLabel)}</h2>
    <table class="tide-today"><thead><tr><th>Tide</th><th>Time</th><th>Height</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="hint">${estimate
      ? `Estimated for ${esc(s.city)} from the nearest NOAA station, ${esc(estimate.name)} (${estimate.dist} mi away) — actual times can differ by a few minutes. Heights in feet above MLLW.`
      : `Predicted heights above MLLW (mean lower low water), in ${esc(s.city)} local time, from NOAA station ${esc(s.id)}.`} For any other day, use the chart above. Refreshed daily.</p>
  </div>`;
}

/* The day's tides as a SENTENCE, server-rendered under the H1.
 *
 * The table below already carries the same numbers, but a table is not an
 * answer: the crawlable version of "what time is high tide in Seattle" was a
 * grid of cells with no statement anywhere on the page. This says it in words,
 * from the same baked NOAA data (so it can't disagree with the table), and it
 * is day-stable — the times don't move, and each rebuild refreshes the date.
 *
 * Voice: it states predicted times and heights and names the source. It does
 * not rate conditions, suggest an activity, or imply the figures are fit for
 * planning around — the warning block above the tool covers the rest.
 * Returns "" when the day isn't in tide-predictions.json, so the page simply
 * has no sentence rather than a sentence full of blanks. */
function tideAnswer(place, data, src) {
  if (!data || !Array.isArray(data.events) || !data.events.length) return "";
  const name = plainPlace(place);
  const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${data.ymd.slice(0, 4)}-${data.ymd.slice(4, 6)}-${data.ymd.slice(6, 8)}T00:00:00Z`));
  /* −0.4, not -0.4: this is prose, and "-0.4 ft" reads as a hyphen. */
  const ft = (v) => `${v.toFixed(1) === "-0.0" ? "0.0" : v.toFixed(1)}`.replace(/^-/, "−");
  const phrase = (arr) => {
    const parts = arr.map((e) => `<b>${metaClock(e.t)}</b> (${ft(e.v)} ft)`);
    return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  };
  const hi = data.events.filter((e) => e.hi), lo = data.events.filter((e) => !e.hi);
  const clauses = [];
  if (hi.length) clauses.push(`high tide${hi.length > 1 ? "s" : ""} at ${phrase(hi)}`);
  if (lo.length) clauses.push(`low tide${lo.length > 1 ? "s" : ""} at ${phrase(lo)}`);
  if (!clauses.length) return "";
  const source = src
    ? `estimated from the nearest NOAA station, ${esc(src.name)} (${src.dist} mi away), in local time`
    : `NOAA astronomical predictions in ${esc(name)} local time, with heights in feet above MLLW`;
  return `  <p class="sub td-answer">On ${esc(dayLabel)}, ${esc(name)} has ${clauses.join(", and ")}. These are ${source}.</p>\n`;
}

/* Dynamic, DAY-STABLE tide meta description (roadmap #9). Uses today's actual
 * tide TIMES ("high 4:05 AM & 3:41 PM, low 10:12 AM & 9:58 PM") rather than a
 * "next high tide" — the times are fixed for the day, so a baked value stays
 * accurate all day and just refreshes each hourly rebuild (a "next" tide would
 * go stale between builds). Falls back to the static description when the day's
 * data isn't in tide-predictions.json. `name` is the place shown in the copy.
 *
 * The snippet leads with the ANSWER (both today's highs and today's lows, plus
 * the day's peak height) and then says what else the visitor gets for clicking —
 * the live chart, sunrise/sunset, king-tide dates, free and no sign-up. Someone
 * searching "low tide <place>" should see their answer in the SERP and still
 * have a reason to open the page. Candidates are tried longest-first and the
 * first one that fits a ~160-char snippet wins, so long place names shed the
 * height, then the extras, instead of being truncated mid-sentence.
 * `dest` = true for beach/town pages whose data comes from a nearby station;
 * their tails say so, so the snippet never implies an on-site station. */
const metaClock = (t) => { const m = /(\d{2}):(\d{2})$/.exec(t); if (!m) return ""; let h = +m[1]; const ap = h < 12 ? "AM" : "PM"; h = h % 12 || 12; return `${h}:${m[2]} ${ap}`; };
/* "Kauai (Nawiliwili)" / "Nikiski (Cook Inlet)" → the place. The harbour note
 * belongs in the page's own copy, not in a sentence of running prose. */
const plainPlace = (n) => n.replace(/\s*\(.*\)\s*$/, "").trim();

/* Title for a single place's page — station and beach/town pages share it so
 * the set reads consistently in search results.
 *
 * It leads with "Tide Times Today" rather than "Tide Chart". Both phrasings are
 * real searches, but the old title carried only one of them: "<City> Tide
 * Chart — Today's High, Low & King Tides" never contained the words "tide
 * times", which is how the query is most often typed, and it spent its scarce
 * characters on king tides — a genuine feature of the page, but a far rarer
 * search than today's high and low water. The new form keeps "tide chart" in
 * the tail, so nothing is lost, and adds the phrase that was missing. King
 * tides stay in the description and on the page itself.
 *
 * Candidates longest-first, first fit under ~62 characters wins (roughly where
 * Google truncates), so a long place name sheds "Today" and then the tail
 * instead of being cut off mid-word. */
const tideTitle = (label) => {
  const cands = [
    `${label} Tide Times Today — High, Low & Tide Chart`,
    `${label} Tide Times Today — High & Low Tide Chart`,
    `${label} Tide Times — High & Low Tide Chart`,
    `${label} Tide Times — High & Low Water`,
    `${label} Tide Times & Tide Chart`,
  ];
  return cands.find((c) => c.length <= 62) || cands[cands.length - 1];
};
function tideMeta(place, data, fallback, dest) {
  if (!data || !Array.isArray(data.events)) return fallback;
  const name = plainPlace(place);
  const clocks = (arr) => arr.map((e) => metaClock(e.t)).filter(Boolean);
  const highs = data.events.filter((e) => e.hi);
  const hi = clocks(highs), lo = clocks(data.events.filter((e) => !e.hi));
  if (!hi.length) return fallback;
  const join = (a) => (a.length === 1 ? a[0] : `${a.slice(0, -1).join(", ")} & ${a[a.length - 1]}`);
  const ft = Math.max(...highs.map((e) => e.v)).toFixed(1);
  const lead = (withFt, withLo) =>
    `${name} tides today: high ${join(hi)}${withFt ? ` (${ft} ft)` : ""}${withLo && lo.length ? `, low ${join(lo)}` : ""}.`;
  const tails = dest
    ? [" Free tide chart from the nearest NOAA station — heights, sunrise & sunset, king tides.",
       " Free chart from the nearest NOAA station, with heights and king-tide dates.",
       " Free NOAA-based chart, heights and king tides."]
    : [" Free NOAA chart with heights, sunrise & sunset, and king tides up to a year ahead.",
       " Free NOAA chart with heights, sunrise & sunset and king-tide dates.",
       " Free NOAA chart, water heights and king tides."];
  const cands = [
    lead(true, true) + tails[0], lead(true, true) + tails[1],
    lead(false, true) + tails[1], lead(false, true) + tails[2],
    lead(false, false) + tails[2],
  ];
  return cands.find((c) => c.length <= 160) || cands[cands.length - 1];
}

for (const s of TIDE_STATIONS) {
  const label = `${s.city}, ${s.st}`;
  const nearest = TIDE_STATIONS.filter((x) => x.slug !== s.slug)
    .map((x) => ({ x, mi: miles(s, x) })).sort((a, b) => a.mi - b.mi).slice(0, 5);
  const tc = tidalCharacter(s);
  /* unique-per-station content: the local tidal pattern + typical range, so
   * each page carries real, differentiated information rather than one shared
   * template. Always points back to the live chart for exact numbers. */
  const character = `<div class="card">
    <h2>What the tides are like at ${esc(s.city)}</h2>
    <p>${esc(s.city)} has <strong>${tc.type.count}</strong> most days — a <strong>${tc.pat}</strong> tide pattern, cycling ${tc.type.each}. ${tc.type.note.charAt(0).toUpperCase() + tc.type.note.slice(1)}. The tidal range here is ${tc.rangeText}. For the exact heights and times today, read them straight off the live chart above — it's drawn from NOAA's harmonic prediction for this station.</p>
    <figure class="tide-figure">${tideCurve(tc.pat)}<figcaption>Typical ${esc(tc.pat)} daily pattern — a schematic of the shape, not today's exact heights (see the live chart above for those).</figcaption></figure>
  </div>`;
  /* The place facts come first: a tide page is about a shoreline in a county
     in a state, and the station id alone never said so. County rides in via
     `extra` — the tide data has it and the sun/moon lists do not. */
  /* The nearby city comes from coastal.mjs, the station-to-sun-city mapping
     this file already imports — not from SUN_ALL. Importing build-sun.mjs to
     reach that list would re-run the entire sun build (1,100 pages) inside the
     tide build, and the coastal pair is the better answer regardless: it is the
     same city this page already links to reciprocally, which check-crosslinks
     verifies. */
  const pair = stationToSun.get(s.slug);
  const placeBlock = placeFacts({
    ...resolvePlace(s),
    nearby: pair ? { slug: pair.sun, city: pair.sunCity, st: pair.st, miles: pair.mi, bearing: "" } : null,
    kind: "sun",
    extra: [...(s.county ? [["County", esc(s.county)]] : []), ["NOAA station", `${esc(s.id)} (${esc(s.name)})`]],
    elevKey: `tide:${s.slug}`,
  });
  /* the two station-metadata cards ride side by side on a wide screen —
     both are short, and both answer "what IS this station" */
  const about = placeBlock + `<div class="duo"><div class="card">
    <h2>About this station</h2>
    <p>NOAA station <strong>${esc(s.id)}</strong> (${esc(s.name)}) sits at ${s.lat.toFixed(2)}, ${s.lng.toFixed(2)} on the ${esc(REGION[s.st] || "U.S. coast")}. Predictions on this page come straight from NOAA's harmonic model for this station — heights in feet above MLLW, times in the station's local time. Conditions a few miles along the shore can differ, so pick the station nearest where you'll actually be.</p>
    <p>Nearest stations: ${nearest.map((n) => `<a href="/tides/${n.x.slug}/">${esc(n.x.city)}, ${n.x.st}</a> (${n.mi} mi)`).join(" · ")}</p>
  </div>
  <div class="card">
    <h2>Official source</h2>
    <p>For anything safety-related, go straight to NOAA's own prediction page for this station, not this page — and see <a href="/methodology/tide-predictions/">what an astronomical prediction leaves out</a> before you rely on the times above:</p>
    <p>
      <a class="btn secondary" style="width:auto;display:inline-flex;margin:0 8px 8px 0" href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${esc(s.id)}" rel="noopener" target="_blank">NOAA official predictions for this station →</a>
    </p>
  </div></div>`;
  const others = TIDE_STATIONS.filter((x) => x.st === s.st && x.slug !== s.slug);
  const statePage = STATE_PAGES.find((p) => p.st === s.st);
  /* a plain LINK (not a chip) so it reads differently from the location
   * buttons around it — per the owner, a chip here looked like just another
   * station until you squinted */
  const stateLine = statePage ? `<p class="td-statelink"><a href="/tides/${statePage.slug}/">More tide charts in ${esc(statePage.name)} →</a></p>` : "";
  const adminStateLink = statePage ? `<a href="/tides/${statePage.slug}/">${esc(statePage.name)} tide charts →</a>` : "";
  const nearby = others.length
    ? `<div class="card"><h2>More ${s.st} tide stations</h2><div class="timer-presets" style="margin-top:6px">${others.map((x) => `<a class="chip" href="/tides/${x.slug}/">${esc(x.city)}</a>`).join("")}<a class="chip" href="/tides/">All stations →</a></div>${stateLine}</div>`
    : `<div class="card"><h2>More tide stations</h2><div class="timer-presets" style="margin-top:6px"><a class="chip" href="/tides/">Browse all stations →</a></div>${stateLine}</div>`;
  /* station-specific FAQ items lead the list so the FAQ block (and its
   * FAQPage JSON-LD) is genuinely different per page, not one shared template.
   * Answers are derived from the station's own tidal character. */
  const stationFaq = [
    [`How many tides a day does ${label} get?`, `${s.city} typically gets ${tc.type.count} each day — a ${tc.pat} pattern. Exact times for today are on the live chart above.`],
    [`What is the tidal range at ${label}?`, `The range between low and high water at ${s.city} is ${tc.rangeText}. The chart above shows the exact predicted heights for the days you pick, straight from NOAA station ${s.id}.`],
    ...FAQ(label),
  ];
  /* Tide pages already carried Place markup — sun and moon did not. Rather
     than emit a second Place block (two entities for one page is worse than
     one), this is the original enriched with the county, the containing state
     and country, and the page's own URL, so all three families now assert the
     same shape. Named placeJsonLd, not placeLd: the old name shadowed the
     imported helper of that name and silently turned a function call into a
     string call. */
  const stPlace = resolvePlace(s);
  const placeJsonLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Place", name: `${s.name} tide station (NOAA ${s.id})`,
    url: `${SITE}/tides/${s.slug}/`,
    geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng },
    address: { "@type": "PostalAddress", addressLocality: s.city, addressRegion: stPlace.state || s.st, addressCountry: "US" },
    containedInPlace: [
      ...(s.county ? [{ "@type": "AdministrativeArea", name: s.county }] : []),
      ...(stPlace.state ? [{ "@type": "AdministrativeArea", name: stPlace.state }] : []),
      { "@type": "Country", name: "United States" },
    ],
  })}</script>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: tideTitle(label),
  desc: tideMeta(s.city, todayTides.get(s.slug), `Today's high and low tides for ${label} (NOAA station ${s.id}, ${s.name}) with an interactive tide chart, sunrise/sunset and moon phase, king-tide dates, and a high-tide finder up to a year ahead.`),
  path: `/tides/${s.slug}/`,
  ogImage: `${SITE}/api/og?tpl=tide&amp;label=${encodeURIComponent(label)}&amp;pat=${tc.pat}`,
})}
${appLd({ name: `${label} Tide Chart`, url: `${SITE}/tides/${s.slug}/`, description: `NOAA tide predictions for ${label}: chart, high/low times, and king tides.` })}
${faqLd(stationFaq)}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Tide Charts", url: "/tides/" }, { name: label, url: `/tides/${s.slug}/` }])}</script>
${placeJsonLd}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "tides", url: "/tides/" }, page: { label, url: `/tides/${s.slug}/` } })}
  <h1>${esc(label)} Tide Chart</h1>
  <p class="sub">Today's high and low tide times for ${esc(label)} — see the next high and low tide, water heights, and a live tide chart, straight from NOAA.</p>
${tideAnswer(s.city, todayTides.get(s.slug))}${localTimeLine(`${s.city}, ${s.st}`, s.tz)}${bakedData(s)}${STATION_TOOL({ stateLink: adminStateLink, ssrChart: ssrChartFor(s), note: BETA_NOTE, bakedTable: tidesTable(todayTides.get(s.slug), s), sunCard: sunCardFor(s) })}
  ${character}
  ${about}
${placeQuestionsCard(["what-causes-tides", "why-does-the-moon-change-shape"], "/tides/")}  ${nearby}
  <div class="card cd-answer">
    ${stationFaq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ")}
  </div>
${TIDE_FOOTER}
</div>
${scripts({ id: s.id, label, lat: s.lat, lng: s.lng, slug: s.slug, tz: s.tz })}
</body>
</html>
`;
  mkdirSync(join(root, "tides", s.slug), { recursive: true });
  writeFileSync(join(root, "tides", s.slug, "index.html"), html);
}

/* ---- tide DESTINATION pages: /tides/<slug>/ for recognizable coastal places
 * that people search for but that have no NOAA station of their own (Cannon
 * Beach, Seaside, …). Each maps to its nearest source station: the page shows
 * that station's predictions, states the distance honestly, and cross-links
 * the source station + nearby destinations. Reuses every station-page helper;
 * the tool + baked table are keyed to the SOURCE station's id, while sun times
 * and "nearest" use the destination's own coordinates. (DESTINATIONS is loaded
 * near the top of this file so the near-me page can share it.) ---- */
for (const d of DESTINATIONS) {
  const src = stationBySlug.get(d.source);
  /* THROW, don't skip. A warning meant the page was silently not written while
     build-sitemap and the near-me index went on listing it — a sitemap URL
     pointing at a 404, with no gate catching it, from a one-line typo in
     tide-destinations.json. */
  if (!src) throw new Error(`tide destination ${d.slug}: unknown source station "${d.source}" — add the station or fix the slug in seo/_data/tide-destinations.json`);
  const label = `${d.name}, ${d.st}`;
  const dist = miles(d, src);
  const tc = tidalCharacter(d);
  const stName = TIDE_STATE_NAMES[d.st] || d.st;
  /* the state's hub URL, or the main /tides/ index for single-station states
   * that have no hub (e.g. DE) — used by the breadcrumb, state link, and the
   * "All <state> tides →" chip so none of them 404. */
  const stateUrl = STATE_HUB.get(d.st) ? `/tides/${STATE_HUB.get(d.st)}/` : "/tides/";
  const nearby = DESTINATIONS.filter((x) => x.slug !== d.slug && x.st === d.st)
    .map((x) => ({ x, mi: miles(d, x) })).sort((a, b) => a.mi - b.mi).slice(0, 5);
  const sourceCard = `<div class="card">
    <h2>Which tide station covers ${esc(d.name)}?</h2>
    <p>${esc(d.name)} has no NOAA tide station of its own, so the predictions on this page come from the nearest one: <a href="/tides/${src.slug}/"><strong>${esc(src.name)}</strong> (${esc(src.city)}, ${esc(src.st)})</a>, about <strong>${dist} miles</strong> away. Along an open coast the high and low tides shift only slightly over that distance, so these times are a close guide for ${esc(d.name)} — but treat them as approximate, and for anything safety-related use NOAA directly.</p>
    <p><a class="btn secondary" style="width:auto;display:inline-flex;margin:4px 8px 0 0" href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${esc(src.id)}" rel="noopener" target="_blank">NOAA predictions for ${esc(src.name)} →</a><a class="btn secondary" style="width:auto;display:inline-flex;margin:4px 0 0" href="/tides/${src.slug}/">${esc(src.city)} tide station page →</a></p>
  </div>`;
  const character = `<div class="card">
    <h2>What the tides are like at ${esc(d.name)}</h2>
    <p>${esc(d.name)} sits on the ${esc(REGION[d.st] || "U.S. coast")}, where tides run <strong>${tc.pat}</strong> — ${tc.type.count} most days, cycling ${tc.type.each}. The tidal range along this stretch is ${tc.rangeText}. For the exact predicted heights and times, read the table and chart above (from the ${esc(src.name)} station).</p>
    <figure class="tide-figure">${tideCurve(tc.pat)}<figcaption>Typical ${esc(tc.pat)} daily pattern — a schematic of the shape, not today's exact heights.</figcaption></figure>
  </div>`;
  const allTidesChip = STATE_HUB.get(d.st)
    ? `<a class="chip" href="${stateUrl}">All ${esc(stName)} tides →</a>`
    : `<a class="chip" href="/tides/">All tide charts →</a>`;
  const nearbyCard = `<div class="card"><h2>Nearby ${esc(stName)} tide spots</h2><div class="timer-presets" style="margin-top:6px">${nearby.map((n) => `<a class="chip" href="/tides/${n.x.slug}/">${esc(n.x.name)} (${n.mi} mi)</a>`).join("")}${allTidesChip}</div></div>`;
  const destFaq = [
    [`Where do the ${label} tide times come from?`, `${d.name} has no NOAA station of its own, so these predictions come from the nearest one, ${src.name} (${src.city}), about ${dist} miles away. Tides shift only slightly along an open coast, so they're a close guide — confirm with NOAA for anything safety-critical.`],
    [`How many tides a day does ${d.name} get?`, `${d.name} typically gets ${tc.type.count} each day — a ${tc.pat} pattern. Exact times for today are in the table above.`],
    ...FAQ(label),
  ];
  const bakedTable = tidesTable(todayTides.get(src.slug), { city: d.name, id: src.id }, { name: src.name, dist });
  /* prominent estimate + safety notice, shown above the tool on destination
   * pages (replaces the generic BETA_NOTE) — makes clear up front that these
   * are estimated from a nearby station, not the place's own measured data. */
  const DEST_NOTE = `  <div class="notice notice-warn td-beta"><strong>⚠ Estimated tides:</strong> ${esc(d.name)} has no NOAA tide station of its own, so these times are <strong>estimated from the nearest station</strong>, ${esc(src.name)} (${dist} mi away), and can differ by a few minutes. NOAA astronomical predictions only — <strong>not for navigation or safety decisions.</strong> For those, check NOAA and the U.S. Coast Guard. <a href="/terms#tides-data">Terms</a>.</div>`;
  const ogImage = `${SITE}/api/og?tpl=tide&amp;label=${encodeURIComponent(label)}&amp;pat=${tc.pat}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: tideTitle(label),
  desc: tideMeta(d.name, todayTides.get(src.slug), `Today's high and low tides for ${label}, from the nearest NOAA station (${src.name}, ${dist} mi). Tide chart, times and heights, sunrise/sunset, and a high-tide finder up to a year ahead.`, true),
  path: `/tides/${d.slug}/`,
  ogImage,
})}
${appLd({ name: `${label} Tide Chart`, url: `${SITE}/tides/${d.slug}/`, description: `Tide predictions for ${label} from the nearest NOAA station (${src.name}).` })}
${faqLd(destFaq)}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Tide Charts", url: "/tides/" }, { name: stName, url: stateUrl }, { name: label, url: `/tides/${d.slug}/` }]).replace(/</g, "\\u003c")}</script>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Place", name: `${d.name} (tides via NOAA ${src.id})`, geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng }, address: { "@type": "PostalAddress", addressLocality: d.name, addressRegion: d.st, addressCountry: "US" } }).replace(/</g, "\\u003c")}</script>
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "tides", url: "/tides/" }, page: { label, url: `/tides/${d.slug}/` } })}
  <h1>${esc(label)} Tide Chart</h1>
  <p class="sub">Today's high and low tide times for ${esc(d.name)} — see the next high and low tide, water heights, and a live tide chart from the nearest NOAA station (${esc(src.name)}, ${dist} mi).</p>
${tideAnswer(d.name, todayTides.get(src.slug), { name: src.name, dist })}${localTimeLine(d.st ? `${d.name}, ${d.st}` : d.name, d.tz)}${bakedData(src)}${STATION_TOOL({ stateLink: `<a href="${stateUrl}">${esc(stName)} tide charts →</a>`, ssrChart: ssrChartFor(src), note: DEST_NOTE, bakedTable })}
  ${/* which station serves this beach + what its tides are like: two halves
       of "where do these numbers come from", paired on a wide screen */""}
  <div class="duo">
  ${sourceCard}
  ${character}
  </div>
  ${nearbyCard}
  <div class="card cd-answer">
    ${destFaq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ")}
  </div>
${TIDE_FOOTER}
</div>
${scripts({ id: src.id, label, lat: d.lat, lng: d.lng, slug: d.slug, tz: d.tz })}
</body>
</html>
`;
  mkdirSync(join(root, "tides", d.slug), { recursive: true });
  writeFileSync(join(root, "tides", d.slug, "index.html"), html);
}
console.log(`Generated ${DESTINATIONS.length} tide destination pages.`);

/* ---- per-state hub pages: /tides/<state>/ — every station in the state,
 * grouped by county (alphabetical), with a jump-to-county dropdown. High-SEO
 * landing pages; only states with 2+ stations get one. ---- */
/* tracking-station glyph (radio tower): marks locations with an actual NOAA
 * observing/reference station — on the curated rows below and, client-side,
 * on type "R" rows from the full directory. */
const STA_ICON = `<svg class="td-staico" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="#7dd3fc" stroke-width="1.8" stroke-linecap="round"><path d="M7.8 9.2a5 5 0 0 1 8.4 0M5.3 6.8a8.4 8.4 0 0 1 13.4 0"/><circle cx="12" cy="12.6" r="1.7" fill="#7dd3fc" stroke="none"/><path d="M12 14.3L8.6 21M12 14.3L15.4 21M10 18.3h4"/></svg>`;

/* Anchor place names for a state's title/description. A state hub lists FAR
 * more than its curated tracking stations — every location in NOAA's
 * tide-prediction directory for that state is filed into the county sections,
 * plus the curated beach towns — so counting stations in the meta ("3 coastal
 * stations" for Oregon) badly undersells the page and tells a searcher nothing.
 * Instead we name real places spread along the state's shoreline: sort every
 * known location on whichever axis the coast actually runs (north–south for the
 * Pacific/Atlantic, east–west for the Gulf) and take the two ends plus the
 * middle, so the copy reads as whole-coast coverage. Beach/town destinations
 * are included — those are the names people search. */
function anchorPlaces(sp) {
  const pts = sp.stations.map((s) => ({ name: plainPlace(s.city), lat: s.lat, lng: s.lng }))
    .concat(DESTINATIONS.filter((d) => d.st === sp.st).map((d) => ({ name: plainPlace(d.name), lat: d.lat, lng: d.lng })));
  if (pts.length < 3) return [...new Set(pts.map((p) => p.name))];
  const spread = (f) => Math.max(...pts.map(f)) - Math.min(...pts.map(f));
  /* scale longitude by cos(lat) so the comparison is in real miles, not degrees */
  const nsCoast = spread((p) => p.lat) >= spread((p) => p.lng) * Math.cos((pts[0].lat * Math.PI) / 180);
  const along = nsCoast ? (p) => -p.lat : (p) => p.lng;   // north→south, or west→east
  const sorted = pts.slice().sort((a, b) => along(a) - along(b));
  return [...new Set([sorted[0], sorted[Math.floor((sorted.length - 1) / 2)], sorted[sorted.length - 1]].map((p) => p.name))];
}
/* Description candidates, most specific first; the first one that fits a normal
 * SERP snippet (~160 chars) wins, so long state/place names degrade gracefully
 * instead of being truncated mid-sentence. */
function stateDesc(sp) {
  const p = anchorPlaces(sp);
  /* names are comma-joined (no "and" before the last) so the sentence runs
   * straight into "and every other NOAA tide location" whatever the count */
  const line = (names, today, county) =>
    `${sp.name} tide times by location: ${today ? "today's " : ""}high and low tides for ` +
    `${names.join(", ")} and every other NOAA tide location on the coast${county ? ", county by county" : ""}.`;
  const ends = p.length >= 3 ? [p[0], p[p.length - 1]] : p;
  const cands = [
    p.length >= 2 && line(p, true, true),
    p.length >= 2 && line(p, false, true),
    p.length >= 2 && line(p, false, false),
    p.length >= 3 && line(ends, false, true),
    p.length >= 3 && line(ends, false, false),
    `Find today's high and low tide times for any beach, bay or harbor on the ${sp.name} coast — every NOAA tide-prediction location, listed county by county.`,
  ].filter(Boolean);
  return cands.find((c) => c.length <= 160) || cands[cands.length - 1];
}

for (const sp of STATE_PAGES) {
  const bySlug = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/ +/g, "-");
  const counties = {};
  for (const st of sp.stations) (counties[st.county] = counties[st.county] || []).push(st);
  const countyNames = Object.keys(counties).sort((a, b) => a.localeCompare(b));
  countyNames.forEach((c) => counties[c].sort((a, b) => a.city.localeCompare(b.city)));
  /* ONE CARD PER COUNTY, TWO ABREAST. All the counties used to share a single
   * card, so a state with a long coast was one 1400px-wide column of headings
   * and rows that scrolled for pages, with no edge anywhere saying where one
   * county stopped and the next began. A card per county gives each list its
   * own frame, and half the row is a comfortable measure for a two-line row
   * (.td-strows is capped at 560px anyway, so full width bought nothing).
   * The county h2 keeps its id and stays the IMMEDIATE previous sibling of its
   * .td-strows — the jump-to-county control and the NOAA directory fetch below
   * both find a list that way. Grid: .td-counties in 21-tides.css.
   * One row per station: City + station name (or NOAA number when the name
   * just repeats the city) + the tracking-station icon on the right. */
  const sections = `<div class="td-counties">${countyNames.map((c) => `<div class="card td-county-card">
      <h2 class="td-county" id="c-${bySlug(c)}">${esc(c)}, ${sp.st}</h2>
      <div class="td-strows">${counties[c].map((st) => {
        const sub = st.name && st.name.toLowerCase() !== st.city.toLowerCase() ? st.name : `NOAA #${st.id}`;
        return `<a class="td-strow" href="/tides/${st.slug}/"><b>${esc(st.city)}</b><span class="td-stname">${esc(sub)}</span>${STA_ICON}</a>`;
      }).join("")}</div>
    </div>`).join("\n    ")}</div>`;
  /* every OTHER NOAA tide-prediction location in the state, loaded live from
   * the same full directory the search uses (~3,300 locations nationwide) and
   * FILED INTO THE COUNTY SECTIONS ABOVE — NOAA's directory has no county
   * field, so each location joins the county of its nearest curated station.
   * Reference ("R") stations get the tracking icon; subordinate locations are
   * plain links. Each opens /tides/?station=<id>, which loads its live chart. */
  const moreSection = `
    <script>
    (function(){
      var HAVE=${JSON.stringify(Object.fromEntries(sp.stations.map((s) => [String(s.id), 1])))},ST="${sp.st}",FULL=${JSON.stringify(sp.name)};
      var CTY=${JSON.stringify(sp.stations.map((s) => [`c-${bySlug(s.county)}`, Math.round(s.lat * 1000) / 1000, Math.round(s.lng * 1000) / 1000]))};
      var ICO='${STA_ICON.replace(/'/g, "\\'")}';
      function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
      fetch("https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions")
        .then(function(r){return r.json();})
        .then(function(d){
          var rows=(d.stations||[]).filter(function(s){var st=(s.state||"").trim();return (st===ST||st===FULL)&&!HAVE[String(s.id)];});
          rows.sort(function(a,b){return a.name<b.name?-1:a.name>b.name?1:0;});
          var byC={};
          rows.forEach(function(s){
            if(s.lat==null||s.lng==null)return;
            var best=null,bd=1e9,i;
            for(i=0;i<CTY.length;i++){var dx=CTY[i][1]-s.lat,dy=CTY[i][2]-s.lng,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=CTY[i][0];}}
            if(best)(byC[best]=byC[best]||[]).push(s);
          });
          for(var id in byC){
            var h=document.getElementById(id); if(!h) continue;
            var div=h.nextElementSibling; if(!div||!div.classList.contains("td-strows")) continue;
            div.insertAdjacentHTML("beforeend", byC[id].map(function(s){
              return '<a class="td-strow" href="/tides/?station='+encodeURIComponent(s.id)+'"><b>'+esc(s.name)+'</b><span class="td-stname">NOAA #'+esc(s.id)+'</span>'+((s.type==="R")?ICO:'')+'</a>';
            }).join(""));
          }
        })["catch"](function(){});
    })();
    </script>`;
  const jump = `<label class="td-jump">Jump to county
      <select id="td-county"><option value="">Choose a county…</option>${countyNames.map((c) => `<option value="c-${bySlug(c)}">${esc(c)}</option>`).join("")}</select></label>
    <script>document.getElementById("td-county").addEventListener("change",function(){var el=document.getElementById(this.value);if(el){el.scrollIntoView({behavior:"smooth"});el.focus&&el.setAttribute("tabindex","-1");}});</script>`;
  const listLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "ItemList",
    name: `${sp.name} Tide Charts`,
    itemListElement: sp.stations.map((st, i) => ({ "@type": "ListItem", position: i + 1, name: `${st.city}, ${st.st} tide chart`, url: `${SITE}/tides/${st.slug}/` })),
  })}</script>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: `${sp.name} Tide Charts — High & Low Tide Times by Location`,
  desc: stateDesc(sp),
  path: `/tides/${sp.slug}/`,
})}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Tide Charts", url: "/tides/" }, { name: sp.name, url: `/tides/${sp.slug}/` }])}</script>
${listLd}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "tides", url: "/tides/" }, page: { label: sp.name, url: `/tides/${sp.slug}/` } })}
  <h1>${esc(sp.name)} Tide Charts</h1>
  ${/* The page used to claim outright that it "lists every location in NOAA's
       directory". Only the curated stations and destinations below are actually
       IN this page; the rest of the state's NOAA locations are fetched from
       NOAA when the page loads (moreSection) and filed into the same county
       sections. The sentence now says which is which, so what a reader — or a
       crawler that never runs the fetch — is promised matches what is here. */""
  }<p class="sub">Find the high and low tides for your spot on the ${esc(sp.name)} coast. Every ${esc(sp.name)} tide-chart page is listed below, grouped by county so you can jump straight to your stretch of coast — ${sp.stations.length} NOAA tracking station${sp.stations.length === 1 ? "" : "s"} plus the beaches and towns that use the nearest one. Each opens a live tide chart with today's high &amp; low tide times, heights and king-tide dates. The rest of NOAA's prediction locations for the state — bays, harbors, inlets and river mouths — are added to the county lists from NOAA's directory as the page loads.</p>
${BETA_NOTE}${(() => {
    /* recognizable destinations in this state (beaches/towns without their own
       NOAA station) — high-demand searches, surfaced above the station directory */
    const sd = DESTINATIONS.filter((d) => d.st === sp.st);
    return sd.length ? `
  <div class="card">
    <h2>Popular ${esc(sp.name)} beaches &amp; towns</h2>
    <p class="hint" style="margin:0 0 8px">Well-known spots that use a nearby NOAA station for their tide predictions:</p>
    <div class="timer-presets">${sd.map((d) => `<a class="chip" href="/tides/${d.slug}/">${esc(d.name)}</a>`).join("")}</div>
  </div>` : "";
  })()}
  ${/* the jump control and the legend/links sit in their own full-width cards
       either side of the county grid — they are about the whole page, not about
       any one county, and inside a half-width county card they would read as
       belonging to that county */""}
  <div class="card td-jumpcard">
    ${jump}
    <p class="hint td-staico-note" style="margin:8px 0 0">${STA_ICON} NOAA tracking station</p>
  </div>
    ${sections}
    ${moreSection}
  <div class="card">
    <p class="hint" style="margin:0"><a href="/tides/">← All tide charts</a> · <a href="/tides/biggest-tides/">The biggest tides on Earth</a></p>
  </div>
  <div class="card">
    <h2>More for ${esc(sp.name)}</h2>
    <p class="timer-presets"><a class="chip" data-xlink="sun" href="/sun/state/${esc(sp.slug)}/">Sunrise &amp; sunset across ${esc(sp.name)}</a></p>
    <p class="hint">The tide is the moon and the sun pulling on that water — the same coordinates, a different question.</p>
  </div>
${TIDE_FOOTER}
</div>
</body>
</html>
`;
  mkdirSync(join(root, "tides", sp.slug), { recursive: true });
  writeFileSync(join(root, "tides", sp.slug, "index.html"), html);
}

/* ---- /tides/biggest-tides/ — editorial page: the largest tides on Earth.
 * Static, well-established figures; every U.S. entry links to its live chart. */
const BIG_ROWS = [
  ["Bay of Fundy — Burntcoat Head, Nova Scotia, Canada", "up to ~52 ft (16 m)", "The world record. The bay's length makes it resonate almost perfectly with the 12.4-hour tidal rhythm, so each tide amplifies the last — 100+ billion tons of water move in and out twice a day."],
  ["Ungava Bay, Quebec, Canada", "~50 ft (15+ m)", "Fundy's near-twin in the Canadian Arctic and, by some surveys, its equal."],
  ["Severn Estuary / Bristol Channel, UK", "~48 ft (14–15 m)", "Europe's biggest — the funnel shape squeezes the Atlantic tide into a famous river bore surfers ride upstream."],
  ["Bay of Mont-Saint-Michel, France", "~46 ft (14 m)", "The tide crosses miles of flats — legend says it returns 'at the speed of a galloping horse.'"],
  ["Río Gallegos, Argentina", "~43 ft (13 m)", "South America's largest, at Patagonia's Atlantic edge."],
  ["Turnagain Arm, Cook Inlet, Alaska — U.S. #1", "~40 ft (12 m)", "America's giant, with a rideable bore tide. See it live at the nearby stations below."],
];
const bigHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: "The Biggest Tides in the World (and the U.S.)",
  desc: "Where are Earth's largest tides? Bay of Fundy's 52-foot world record, the giants of the UK, France and Argentina — and America's biggest at Cook Inlet, Alaska, with live NOAA tide charts for every U.S. entry.",
  path: "/tides/biggest-tides/",
})}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Tide Charts", url: "/tides/" }, { name: "Biggest Tides", url: "/tides/biggest-tides/" }])}</script>
${faqLd([
  ["Where are the biggest tides in the world?", "The Bay of Fundy between Nova Scotia and New Brunswick, Canada, where the range between low and high water reaches about 52 feet (16 meters) at Burntcoat Head — the largest tidal range on Earth."],
  ["Where are the biggest tides in the United States?", "Alaska's Cook Inlet. Turnagain Arm near Anchorage sees ranges around 33–40 feet, and Anchorage itself swings 26–30 feet between low and high tide. Outside Alaska, the U.S. champion is Eastport, Maine at roughly 18–20 feet."],
  ["Why are tides so much bigger in some places?", "Three ingredients: a coastline shaped like a funnel that concentrates the water, a shallowing seabed that stacks it higher, and — the secret sauce — resonance, when the natural sloshing period of the bay matches the 12.4-hour tidal rhythm so every tide reinforces the last."],
])}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "tides", url: "/tides/" }, page: { label: "Biggest Tides", url: "/tides/biggest-tides/" } })}
  <h1>The Biggest Tides in the World</h1>
  <p class="sub">From Canada's 52-foot monster to Alaska's rideable bore tide — where the ocean swings hardest, why it happens there, and live charts for every U.S. giant.</p>
${BETA_NOTE}
  <div class="card">
    <h2>The world leaderboard</h2>
    ${BIG_ROWS.map(([where, range, why]) => `<h3 class="td-big-h">${esc(where)}</h3><p><strong>${esc(range)}.</strong> ${esc(why)}</p>`).join("\n    ")}
    <p class="hint">Ranges are approximate spring-tide maxima from published oceanographic surveys; exact figures vary by measurement point and year.</p>
  </div>
  <div class="card">
    <h2>Watch America's giants live</h2>
    <p>Every U.S. entry has a live NOAA chart here: <a href="/tides/anchorage-ak/">Anchorage, AK</a> (26–30 ft, the closest station to Turnagain Arm) and <a href="/tides/nikiski-ak/">Nikiski, AK</a> in Cook Inlet; Southeast Alaska's <a href="/tides/skagway-ak/">Skagway, AK</a>, <a href="/tides/juneau-ak/">Juneau, AK</a> and <a href="/tides/ketchikan-ak/">Ketchikan, AK</a> (15–20+ ft); and the East Coast champion <a href="/tides/eastport-me/">Eastport, ME</a> (~18–20 ft), just across the border from the Bay of Fundy itself. For the opposite extreme, compare the Gulf's tiny tides at <a href="/tides/galveston-tx/">Galveston, TX</a> or <a href="/tides/pensacola-fl/">Pensacola, FL</a> — often barely a foot.</p>
  </div>
  <div class="card">
    <h2>Why these places?</h2>
    <p>Open-ocean tides are only about 2 feet. The giants happen where geography amplifies them: a <strong>funnel-shaped bay</strong> concentrates the incoming water, a <strong>shallowing bottom</strong> forces it upward, and <strong>resonance</strong> — a bay whose natural slosh matches the 12.4-hour lunar rhythm — makes each tide push the next like a hand timing shoves on a playground swing. The Bay of Fundy nails all three.</p>
  </div>
  <p><a class="btn secondary" style="width:auto;display:inline-flex" href="/tides/">← All tide charts</a></p>
${TIDE_FOOTER}
</div>
</body>
</html>
`;
mkdirSync(join(root, "tides", "biggest-tides"), { recursive: true });
writeFileSync(join(root, "tides", "biggest-tides", "index.html"), bigHtml);

console.log(`Generated /tides/ hub + ${TIDE_STATIONS.length} station pages + ${STATE_PAGES.length} state pages.`);
