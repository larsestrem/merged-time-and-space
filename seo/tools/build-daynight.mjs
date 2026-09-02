#!/usr/bin/env node
/* build-daynight.mjs — two focused pages from one synchronized model:
 * /day-night-map/ and /earth-tilt-sun-seasons/.
 *
 * WHY IT EXISTS. The card on the front page answers one question — who is in
 * daylight right now — and raises three it has no room for: why the line is
 * curved, why it leans, and where it will be tonight. This page is the same
 * picture with time attached: a slider across one year, a Play button, and
 * three synchronized views of the same instant.
 *
 * THE DRAWING IS daynight.mjs, shared with the home card, so the two cannot
 * draw different maps. This file owns the page: the controls, the read-out,
 * the location marker and the writing.
 *
 * EVERY FIGURE IN THE PROSE IS DERIVED. The tilt, the tropics, the polar
 * circles and the day the sun stands furthest north are all SOLVED from the
 * same solar series that draws the map — scan a year of declinations and read
 * the answer off — so no sentence here can drift from the picture above it.
 * The only typed numbers on the page are two land areas, which no formula can
 * produce; they are marked as such where they are used.
 *
 *   node seo/tools/build-daynight.mjs   (run before build-sitemap + build-inline)
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD, appLd, learningLd } from "./lib.mjs";
import { ico } from "./icons.mjs";
import { WC_CITY_LIST } from "./wc-cities.mjs";
import { hubQuestionsCard } from "./concepts.mjs";
import { SYS_PATH } from "./build-simulator.mjs";
import {
  SIDEREAL, ORBIT_TILT,
  SYS_W, SYS_H, SYS_CX, SYS_CY, SYS_RS, SYS_REO, SYS_RE, SYS_RMO, SYS_RM,
  SYS_AXL, SYS_INC_DRAWN,
} from "./system-orbit.mjs";
import {
  DAYNIGHT_PATH, DN_CORE, DN_W, DN_VIEW_Y, DN_VIEW_H, DN_VIEWBOX,
  DN_TOP, DN_BOT, dnX, dnY, dnF, subsolar, sunAltitude, nightPath, twilightPath, landPath, seasonPoints,
  cityMark, DN_MAP_EXTRA, sideView, seasonSunHtml,
} from "./daynight.mjs";
import { MOON_CORE, sublunar, moonGlyph, moonIllum, moonName } from "./moon.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const PATH = DAYNIGHT_PATH;
const LESSON_PATH = "/earth-tilt-sun-seasons/";
const NOW = Date.now();

/* ONE CALENDAR YEAR. The three drawings now share one clock: the day/night
   map turns daily, the Moon completes about 13.4 real sidereal orbits, and
   Earth completes its annual orbit. A selected year may contain 365 or 366
   days; the browser resets this max when it reads the URL. The playback rate
   keeps a complete year close to the old two-minute lesson length. */
const CURRENT_YEAR = new Date(NOW).getUTCFullYear();
const SPAN_MIN = Math.round((Date.UTC(CURRENT_YEAR + 1, 0, 1) - Date.UTC(CURRENT_YEAR, 0, 1)) / 60000);
const PLAY_RATE = Math.round(365.2422 * 86400000 / 120000); /* one average year in about two minutes */
const PLAY_SPAN_S = SPAN_MIN * 60 / PLAY_RATE;
const playSpanWords = PLAY_SPAN_S < 90
  ? `about ${Math.round(PLAY_SPAN_S)} seconds`
  : `about ${Math.round(PLAY_SPAN_S / 60)} minutes`;

/* ---- what the sun actually does over a year, solved rather than typed -----
 * Walk a year of declinations at one-hour steps and keep the extremes and the
 * crossings. That gives the tilt (the largest declination there is), the two
 * tropics (the same number, as a latitude), the polar circles (90 minus it),
 * and the dates of the solstices and equinoxes — from the series that draws
 * the map, so the page and the picture cannot disagree. */
const YEAR = seasonPoints(NOW);   /* shared with the home page — see daynight.mjs */
const TILT = YEAR.tilt;                         /* 23.4-ish, from the series */
const POLAR = 90 - TILT;
const dayName = (ms) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(ms));
const n1 = (x) => x.toFixed(1);

/* the width stretch an equirectangular map applies at a latitude: a degree of
   longitude is cos(lat) as long on the ground as it is at the equator, and the
   map draws them all the same length. So the stretch is 1/cos(lat), and it is
   the whole reason Greenland looks the way it does. */
const stretch = (lat) => 1 / Math.cos(lat * Math.PI / 180);
const STRETCH_ROWS = [0, 23.5, 45, 60, 71, 78];

/* THE TWO TYPED NUMBERS ON THIS PAGE. No formula produces a continent's area,
   so these are quoted facts (km², standard published figures) and the
   comparison below is computed from them rather than stated. */
const AREA_GREENLAND = 2166086, AREA_AFRICA = 30370000;
const AFRICA_X = Math.round(AREA_AFRICA / AREA_GREENLAND);

/* The location glyph: a pin, drawn rather than borrowed, because the site uses
   no emoji as icons and no icon font. currentColor, so it takes the button's
   own colour in both themes. */
const PIN = `<svg class="dn-pin" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.1 6.1 12.2 6.36 12.5a.85.85 0 0 0 1.28 0C12.9 21.2 19 14.1 19 9a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 14.6 9 2.6 2.6 0 0 1 12 11.6z"/></svg>`;

/* ---- the baked picture --------------------------------------------------- */
const SS = subsolar(NOW);
const MM = sublunar(NOW);
const MN_ILL = moonIllum(NOW);
const MN_R = 10;
const LAND = landPath();
const DOTS = DN_MAP_EXTRA.map((tz) => cityMark(WC_CITY_LIST, tz, 0, esc)).join("");

/* the parallels that mean something: the equator, the two tropics (where the
   sun can stand overhead) and the two polar circles (where it can fail to rise
   or fail to set). Latitudes from TILT, so they move with the series. */
const GRAT = [
  [0, "Equator"], [TILT, "Tropic of Cancer"], [-TILT, "Tropic of Capricorn"],
  [POLAR, "Arctic Circle"], [-POLAR, "Antarctic Circle"],
].filter(([lat]) => lat <= DN_TOP - 1 && lat >= DN_BOT + 4).map(([lat, label]) => {
  const y = dnF(dnY(lat));
  return `<line class="dn-par" x1="0" y1="${y}" x2="${DN_W}" y2="${y}"/>`
    + `<text class="dn-parlab" x="6" y="${dnF(y - 4)}">${esc(label)}</text>`;
}).join("");

/* the four world-clock cities stay on the map as ordinary labelled dots
   (they used to be yellow and a size up, with a clock strip under the map —
   the strip is gone, the sentence under the map now names the yellow sun
   marker instead). */
const MAP_SVG = `<svg id="dn-svg" class="dn-svg" viewBox="${DN_VIEWBOX}" width="100%" role="img" aria-label="A world map with the night side shaded, the twilight band between, the sun overhead, and the moon in its current phase">
        <rect y="${DN_VIEW_Y}" width="${DN_W}" height="${DN_VIEW_H}" fill="#12304f"/>
        <path d="${LAND}" fill="#2f5d3a"/>
        <g class="dn-grat">${GRAT}</g>
        ${/* the band between "sun on the horizon" and "18 degrees below it" —
             one even-odd path, so the two curves make a band rather than two
             overlapping blocks, and dusk on the map is a band rather than a
             hard edge */""
        }<path id="dn-tw" d="${twilightPath(SS.dec, SS.lon, 1)}" fill-rule="evenodd" fill="#050a16" fill-opacity=".34"/>
        <path id="dn-night" d="${nightPath(SS.dec, SS.lon, -18, 1)}" fill="#050a16" fill-opacity=".52"/>
        ${DOTS}
        <g id="dn-moon" transform="translate(${dnF(dnX(MM.lon))} ${dnF(dnY(MM.dec))})">
          <title id="dn-moon-title">${esc(moonName(MN_ILL.phase))}</title>
          <circle r="14" fill="#e8e0c8" fill-opacity=".18"/>
          <g id="dn-moon-g" transform="translate(-${MN_R} -${MN_R})">${moonGlyph(MN_ILL.fraction, MN_ILL.waxing, MN_R, MM.dec < 0, true)}</g>
          <text y="-16" text-anchor="middle" font-size="11.5" font-weight="700" fill="#e8e0c8" paint-order="stroke" stroke="#0b0e1c" stroke-width="3">Moon</text>
        </g>
        <g id="dn-sun" transform="translate(${dnF(dnX(SS.lon))} ${dnF(dnY(SS.dec))})">
          <circle r="13" fill="#fde68a" fill-opacity=".25"/>
          <circle r="6.5" fill="#fde68a" stroke="#b45309" stroke-width="1.5"/>
        </g>
        <g id="dn-me" hidden>
          <circle r="11" fill="#f472b6" fill-opacity=".22"/>
          <circle r="4.5" fill="#f472b6" stroke="#0b0e1c" stroke-width="1.6"/>
          <text id="dn-me-lab" y="-13" text-anchor="middle" font-size="12.5" font-weight="700" fill="#f9a8d4" paint-order="stroke" stroke="#0b0e1c" stroke-width="3">You</text>
        </g>
      </svg>`;

/* The third simulator is the date-driven version of the existing
   /earth-sun-moon-orbit-simulator/ figure. Its 80° is the VIEW of the orbital
   plane, not Earth's axial tilt: the axis remains the real 23.4°. The browser
   builds the bodies inside this empty scene from the same AT used by the map
   and side view, so there is no second animation clock that can drift. */
const SYSTEM_VIEW_DEG = 80;
const SYSTEM_SVG = `<svg id="dn-system-svg" class="sys-fig dn-system-fig" viewBox="0 0 ${SYS_W} ${SYS_H}" role="img" aria-label="Earth orbiting the Sun while the Moon orbits Earth, viewed with the orbital plane tilted ${SYSTEM_VIEW_DEG} degrees; all positions match the date on the day and night map">
  <rect width="${SYS_W}" height="${SYS_H}" rx="16" fill="#0a1020"/>
  <text x="12" y="${SYS_CY - 8}" font-size="11" fill="#94a3b8">June — North leans sunward</text>
  <text x="${SYS_W - 12}" y="${SYS_CY - 8}" text-anchor="end" font-size="11" fill="#94a3b8">December — North leans away</text>
  <text x="${SYS_CX}" y="16" text-anchor="middle" font-size="11" fill="#94a3b8">March equinox</text>
  <text x="${SYS_CX}" y="${SYS_H - 12}" text-anchor="middle" font-size="11" fill="#94a3b8">September equinox</text>
  <g id="dn-system-scene"></g>
</svg>`;

/* ---- what the side view is showing, in words -----------------------------
 * ONE SOURCE FOR TWO RUNTIMES, and this time by stringifying the function
 * itself: it is called here to bake the sentence into the page, and its own
 * source is shipped into PAGE_JS so the browser repaints it from the same
 * three branches. Written in ES5 and taking `tilt` as an argument, so it can
 * be handed straight to the client with nothing captured.
 *
 * It exists because "17.2 degrees north" is a reading, not an answer. What the
 * reader wants to know is what that does to the length of their day. The
 * solstice gets its own branch: "0.0 degrees short of the tropic" is a worse
 * sentence than "right on it", and it is the sentence that matters most. */
function sideCapText(dec, tilt, kind, ms) {
  var date = function (at) {
    try { return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(at)); }
    catch (e) { return new Date(at).toUTCString().replace(/ 00:00:00 GMT$/, ''); }
  };
  var when = ms ? date(ms) : '';
  if (kind === 'mar') return '<a href="/holiday-countdowns/spring-equinox/">The spring equinox</a> occurs about <strong>' + when + '</strong>. It begins <a href="/concepts/why-do-we-have-seasons/">astronomical spring</a> in the Northern Hemisphere (autumn in the Southern Hemisphere), with nearly equal daylight and darkness. The Sun–Earth centre line meets the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a> on the equator. <a href="/concepts/what-is-an-equinox/">Why an equinox happens →</a>';
  if (kind === 'jun') return '<a href="/holiday-countdowns/summer-solstice/">The summer solstice</a> occurs about <strong>' + when + '</strong>. It begins <a href="/concepts/why-do-we-have-seasons/">astronomical summer</a> in the Northern Hemisphere (winter in the Southern Hemisphere): the north gets its longest daylight of the year and the south its shortest. The Sun–Earth centre line reaches the <a href="/concepts/what-is-the-tropic-of-cancer/">Tropic of Cancer</a>: the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a> goes no farther north. <a href="/concepts/what-is-a-solstice/">Why a solstice happens →</a>';
  if (kind === 'sep') return '<a href="/holiday-countdowns/fall-equinox/">The fall equinox</a> occurs about <strong>' + when + '</strong>. It begins <a href="/concepts/why-do-we-have-seasons/">astronomical fall</a> in the Northern Hemisphere (spring in the Southern Hemisphere), with nearly equal daylight and darkness. The Sun–Earth centre line meets the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a> on the equator. <a href="/concepts/what-is-an-equinox/">Why an equinox happens →</a>';
  if (kind === 'dec') return '<a href="/holiday-countdowns/winter-solstice/">The winter solstice</a> occurs about <strong>' + when + '</strong>. It begins <a href="/concepts/why-do-we-have-seasons/">astronomical winter</a> in the Northern Hemisphere (summer in the Southern Hemisphere): the north gets its shortest daylight of the year and the south its longest. The Sun–Earth centre line reaches the <a href="/concepts/what-is-the-tropic-of-capricorn/">Tropic of Capricorn</a>: the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a> goes no farther south. <a href="/concepts/what-is-a-solstice/">Why a solstice happens →</a>';
  var a = Math.abs(dec), n = dec >= 0, x = a.toFixed(1), gap = (tilt - a).toFixed(1);
  var TC = n
    ? '<a href="/concepts/what-is-the-tropic-of-cancer/">Tropic of Cancer</a>'
    : '<a href="/concepts/what-is-the-tropic-of-capricorn/">Tropic of Capricorn</a>';
  if (a < 0.6) return 'The Sun–Earth centre line lands on the equator at the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a>. Earth is still tilted, but its axis leans sideways to the Sun at this moment, so daylight is close to twelve hours worldwide.';
  if (tilt - a < 0.15) return 'The Sun–Earth centre line lands on the ' + TC + ', at <strong>' + x + '° ' + (n ? 'N' : 'S') + '</strong> — the furthest ' + (n ? 'north' : 'south') + ' the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a> reaches. One hemisphere is at its maximum lean toward the Sun.';
  return 'The Sun–Earth centre line lands at <strong>' + x + '° ' + (n ? 'N' : 'S') + '</strong>, ' + gap + '° short of the ' + TC + '. The ' + (n ? 'Northern' : 'Southern') + ' Hemisphere is leaning into the light, so its days are longer than its nights. <a href="/concepts/why-do-we-have-seasons/">See how tilt makes the seasons →</a>';
}

/* ---- the page's own script ----------------------------------------------
 * Controls ship INERT — the slider and season buttons disabled, Play and the
 * view select disabled — because without JS none could do anything, and
 * a dead control on a classroom page is worse than no control. The script's
 * first act is to enable them.
 *
 * NOTHING TRANSLATES. Every repaint rewrites the two path `d` attributes from
 * the absolute solver in daynight.mjs, so the shading never slides out of the
 * frame and there is nothing to wrap when the subsolar point crosses the date
 * line. That is the whole answer to "make it play without the map jumping".
 * The sun marker still leaves one edge and returns at the other, because it is
 * a point on a cylinder that has been cut open — and the page says so. */
const PAGE_JS = `<script>(function(){
${DN_CORE}
${MOON_CORE}
var svg=document.getElementById('dn-svg'); if(!svg) return;
var night=document.getElementById('dn-night'), twi=document.getElementById('dn-tw'),
    sunG=document.getElementById('dn-sun'), moonG=document.getElementById('dn-moon'),
    meG=document.getElementById('dn-me'),
    sliders=[].slice.call(document.querySelectorAll('[data-dn-slider]')),
    playBtns=[].slice.call(document.querySelectorAll('[data-dn-play]')),
    stepBtns=[].slice.call(document.querySelectorAll('[data-dn-step-dir]')),
    locBtns=[].slice.call(document.querySelectorAll('.dn-loc-chip'));
var TILT=${TILT};                 /* solved at build from the same series */
var sideBox=document.getElementById('dn-side'), sideCapEl=document.getElementById('dn-side-cap'),
    sunline=document.getElementById('dn-sunline'),
    orbitNow=document.getElementById('dn-orbit-now');
var SPAN=${SPAN_MIN};             /* minutes: replaced by the selected calendar year below */
var RATE=${PLAY_RATE};            /* one average year in about two real minutes */
var T0=${NOW}, AT=${NOW}, PLAY=0, RAF=0, LAST=0, HOME=null, SELECTED='now', TRACK_NOW=1;
var SEASON_PARAM={mar:'spring-equinox',jun:'summer-solstice',sep:'fall-equinox',dec:'winter-solstice'};
var SEASON_ALIAS={
  now:'now',spring:'mar','spring-equinox':'mar',mar:'mar',
  summer:'jun','summer-solstice':'jun',jun:'jun',
  fall:'sep',autumn:'sep','fall-equinox':'sep','autumn-equinox':'sep',sep:'sep',
  winter:'dec','winter-solstice':'dec',dec:'dec'
};

function $(id){return document.getElementById(id)}
function set(id,txt){var e=$(id); if(e) e.textContent=txt}
function fmt(ms,tz){
  try{ return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true,timeZone:tz}).format(new Date(ms)); }
  catch(e){ return new Date(ms).toUTCString(); }
}
function ordinal(n){
  var m=n%100;if(m>=11&&m<=13)return n+'th';
  return n+(n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th');
}
function rangeDate(ms){
  var d=new Date(ms),months=['Jan.','Feb.','March','April','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
  return months[d.getUTCMonth()]+' '+ordinal(d.getUTCDate());
}
function showingDate(ms){
  var d=new Date(ms),months=['Jan.','Feb.','March','April','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
  var h=d.getUTCHours(),minute=d.getUTCMinutes(),ap=h>=12?'PM':'AM',clock=(h%12||12)+':'+String(minute).padStart(2,'0')+' '+ap;
  return months[d.getUTCMonth()]+' '+ordinal(d.getUTCDate())+', '+d.getUTCFullYear()+' at '+clock+' UTC';
}
function syncTimelineLabels(){
  var ends=document.querySelectorAll('[data-dn-range]'),shown=document.querySelectorAll('[data-dn-showing]');
  var end=T0+SPAN*60000-60000,range=rangeDate(T0)+' to '+rangeDate(end);
  for(var i=0;i<ends.length;i++) ends[i].textContent=range;
  for(var j=0;j<shown.length;j++) shown[j].textContent=showingDate(AT);
}

/* the caption under the side view — ONE source, shipped as its own text. See
   sideCapText() above the script: the same function bakes the sentence into
   the page and repaints it in the browser. */
var sideCap=function(dec,kind,ms){ return (${sideCapText.toString()})(dec,TILT,kind,ms); };
/* the sentence under the map: overhead coordinates + which way the year is
   leaning. Same function that baked the first paint; laterDec is a week on. */
var seasonSun=function(dec,lon,laterDec){ return (${seasonSunHtml.toString()})(dec,lon,laterDec,TILT); };

/* the state of one place at the instant on show */
function state(alt){
  if(alt>0) return {k:'day', t:'daylight'};
  if(alt>-6) return {k:'civil', t:'civil twilight'};
  if(alt>-18) return {k:'twi', t:'twilight'};
  return {k:'night', t:'night'};
}

/* ---- the whole system, driven by this page's date -----------------------
   This is the same projected geometry as /earth-sun-moon-orbit-simulator/,
   but it has no requestAnimationFrame of its own. paint() hands it AT, so the
   three diagrams cannot disagree about the moment on screen. The orbital
   plane is viewed at 80 degrees. Earth's axial lean is TILT, solved at build. */
function makeSystemRenderer(scene){
  if(!scene) return null;
  var CX=${SYS_CX},CY=${SYS_CY},REO=${SYS_REO},RMO=${SYS_RMO},RS=${SYS_RS},RE=${SYS_RE},RM=${SYS_RM},AXL=${SYS_AXL},
      DRAW_INC=${SYS_INC_DRAWN}*Math.PI/180,REAL_INC=${ORBIT_TILT}*Math.PI/180,AX=TILT*Math.PI/180,
      V=${SYSTEM_VIEW_DEG}*Math.PI/180,cv=Math.cos(V),sv=Math.sin(V),SC=1+0.42*Math.sin(V),
      NS='http://www.w3.org/2000/svg',R=Math.PI/180;
  function el(t,a){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);return e;}
  function clamp(x){return Math.max(-1,Math.min(1,x));}
  function half(r){return 'M0,'+(-r)+'A'+r+','+r+' 0 0 1 0,'+r+'Z';}
  function phasePath(r,f){
    var rx=(r*Math.abs(1-2*f)).toFixed(2),s2=f<0.5?0:1;
    return 'M0 '+(-r)+'A'+r+' '+r+' 0 0 0 0 '+r+'A'+rx+' '+r+' 0 0 '+s2+' 0 '+(-r)+'Z';
  }
  function moonEcl(ms){
    var p=mnMoonPos(mnDays(ms)),ce=Math.cos(MN_OBL),se=Math.sin(MN_OBL);
    return {
      lon:Math.atan2(Math.sin(p.ra)*ce+Math.tan(p.dec)*se,Math.cos(p.ra)),
      lat:Math.asin(clamp(Math.sin(p.dec)*ce-Math.cos(p.dec)*se*Math.sin(p.ra)))
    };
  }
  function px(p){return CX+p[0]*SC;}
  function py(p){return CY-(p[1]*cv+p[2]*sv)*SC;}
  function close(p){return -p[1]*sv+p[2]*cv;}
  function place(g,p,kmin){
    var k=1+0.18*(close(p)/REO);if(k<kmin)k=kmin;
    g.setAttribute('transform','translate('+px(p).toFixed(1)+' '+py(p).toFixed(1)+') scale('+(k*SC).toFixed(3)+')');
  }
  function shade(node,B,r){
    var lx=-B[0],ly=-B[1],lz=-B[2],L=Math.sqrt(lx*lx+ly*ly+lz*lz)||1;
    var f=(1+(ly*(-sv)+lz*cv)/L)/2;
    var ang=Math.atan2(-(ly*cv+lz*sv),lx)*180/Math.PI;
    node.setAttribute('d',phasePath(r,f));node.setAttribute('transform','rotate('+ang.toFixed(1)+')');
  }
  while(scene.firstChild) scene.removeChild(scene.firstChild);
  var ering=el('ellipse',{cx:CX,cy:CY,rx:REO*SC,ry:Math.max(REO*cv*SC,0.75),fill:'none',stroke:'#94a3b8','stroke-opacity':'.28','stroke-width':'1','stroke-dasharray':'3 5'});
  var mring=el('path',{fill:'none',stroke:'#cbd5e1','stroke-opacity':'.34','stroke-width':'1','stroke-dasharray':'2 4'});
  var gS=el('g'),gE=el('g'),gM=el('g');
  gS.appendChild(el('circle',{r:RS+14,fill:'#fcd34d','fill-opacity':'.16'}));
  gS.appendChild(el('circle',{r:RS,fill:'#fcd34d'}));
  var tS=el('text',{y:RS+18,'text-anchor':'middle','font-size':'13',fill:'#fcd34d'});tS.textContent='Sun';gS.appendChild(tS);
  gE.appendChild(el('circle',{r:RE,fill:'#2f74ad'}));
  var eDark=el('path',{d:half(RE),fill:'#050a16','fill-opacity':'.84'});gE.appendChild(eDark);
  gE.appendChild(el('circle',{r:RE,fill:'none',stroke:'#9dc2e0','stroke-opacity':'.55'}));
  var eAxis=el('line',{stroke:'#e2e8f0','stroke-opacity':'.85','stroke-width':'1.5'});gE.appendChild(eAxis);
  var eN=el('text',{'text-anchor':'middle','font-size':'10',fill:'#e2e8f0'});eN.textContent='N';gE.appendChild(eN);
  var tE=el('text',{y:RE+30,'text-anchor':'middle','font-size':'12',fill:'#e2e8f0'});tE.textContent='Earth';gE.appendChild(tE);
  gM.appendChild(el('circle',{r:RM,fill:'#d8dee9'}));
  var mDark=el('path',{d:half(RM),fill:'#050a16','fill-opacity':'.84'});gM.appendChild(mDark);
  var mPatch=el('circle',{r:(RM*0.38).toFixed(2),fill:'#8a93a5'});gM.appendChild(mPatch);
  scene.appendChild(ering);scene.appendChild(mring);scene.appendChild(gS);scene.appendChild(gE);scene.appendChild(gM);

  return function(ms){
    var L=dnEcl(ms)*R,m=moonEcl(ms),E=[-REO*Math.sin(L),REO*Math.cos(L),0];
    /* Solve the current lunar node from the real latitude, then redraw that
       same plane at 18 degrees so its five-degree miss is visible. At an
       eclipse the real latitude approaches zero, so the exaggerated drawing
       still crosses the exact Sun-Earth line instead of inventing a miss. */
    var node=m.lon-Math.asin(clamp(Math.sin(m.lat)/Math.sin(REAL_INC)));
    function moonPoint(a){
      var z=RMO*Math.sin(DRAW_INC)*Math.sin(a-node),h=Math.sqrt(Math.max(0,RMO*RMO-z*z));
      return [E[0]+h*Math.sin(a),E[1]-h*Math.cos(a),z];
    }
    var M=moonPoint(m.lon),d='',i,a,q;
    for(i=0;i<=48;i++){a=i/48*2*Math.PI;q=moonPoint(a);d+=(i?'L':'M')+px(q).toFixed(1)+' '+py(q).toFixed(1);}
    mring.setAttribute('d',d+'Z');
    place(gS,[0,0,0],1);place(gE,E,0.7);place(gM,M,0.7);
    shade(eDark,E,RE);shade(mDark,M,RM);
    var dx=px(E)-px(M),dy=py(E)-py(M),dl=Math.sqrt(dx*dx+dy*dy)||1;
    mPatch.setAttribute('cx',(dx/dl*RM*0.45).toFixed(2));mPatch.setAttribute('cy',(dy/dl*RM*0.45).toFixed(2));
    var adx=Math.sin(AX)*AXL,ady=-(Math.cos(AX)*sv)*AXL;
    eAxis.setAttribute('x1',(-adx).toFixed(1));eAxis.setAttribute('y1',(-ady).toFixed(1));
    eAxis.setAttribute('x2',adx.toFixed(1));eAxis.setAttribute('y2',ady.toFixed(1));
    eN.setAttribute('x',(adx*1.4).toFixed(1));eN.setAttribute('y',(ady*1.4-3).toFixed(1));
    var order=[[close([0,0,0]),gS],[close(E),gE],[close(M),gM]].sort(function(x,y){return x[0]-y[0];});
    for(i=0;i<3;i++) scene.appendChild(order[i][1]);
  };
}
var systemRender=makeSystemRenderer(document.getElementById('dn-system-scene'));

function paint(){
  var ss=dnSub(AT);
  night.setAttribute('d',dnPath(ss.dec,ss.lon,-18,1));
  twi.setAttribute('d',dnTwiPath(ss.dec,ss.lon,1));
  sunG.setAttribute('transform','translate('+dnF(dnX(ss.lon))+' '+dnF(dnY(ss.dec))+')');
  if(moonG){
    var mm=mnSub(AT);
    moonG.setAttribute('transform','translate('+dnF(dnX(mm.lon))+' '+dnF(dnY(mm.dec))+')');
    var il=mnIllum(AT);
    var hold=document.getElementById('dn-moon-g');
    if(hold) hold.innerHTML=mnGlyph(il.fraction,il.waxing,10,mm.dec<0,1);
    var ttl=document.getElementById('dn-moon-title');
    if(ttl) ttl.textContent=mnName(il.phase);
  }
  if(orbitNow){
    var op=soXY(dnEcl(AT));
    orbitNow.setAttribute('transform','translate('+op.x+' '+op.y+')');
  }
  syncTimelineLabels();
  if(sunline) sunline.innerHTML=seasonSun(ss.dec,ss.lon,dnSub(AT+7*86400000).dec);
  /* the side view is the same instant from a different place to stand, so it
     repaints from the same ss and cannot disagree with the map above it */
  if(sideBox) sideBox.innerHTML=dnSide(ss.dec,TILT, HOME&&HOME.lat!=null?HOME.lat:null);
  if(sideCapEl) sideCapEl.innerHTML=sideCap(ss.dec,SELECTED,AT);
  if(systemRender) systemRender(AT);
  for(var i=0;i<sliders.length;i++) sliders[i].value=Math.round((AT-T0)/60000);
  if(HOME){
    var a=dnAlt(HOME.lat,HOME.lon,ss.dec,ss.lon), s2=state(a);
    meG.removeAttribute('hidden');
    meG.setAttribute('transform','translate('+dnF(dnX(HOME.lon))+' '+dnF(dnY(HOME.lat))+')');
    set('dn-o-me',(s2.k==='day'?'Daylight where you are':s2.k==='night'?'Night where you are':'Twilight where you are')
      +' \\u2014 the sun is '+Math.abs(a).toFixed(0)+'\\u00B0 '+(a>=0?'above':'below')+' your horizon.');
    var lk=$('dn-me-sun');
    if(lk) lk.href='/sun/anywhere/?lat='+HOME.lat.toFixed(4)+'&lon='+HOME.lon.toFixed(4);
  }
}

/* ---- the controls ---- */
function stop(){ PLAY=0; if(RAF) cancelAnimationFrame(RAF); RAF=0;
  for(var i=0;i<playBtns.length;i++){playBtns[i].textContent='Play';playBtns[i].setAttribute('aria-pressed','false');}
  svg.classList.remove('is-playing'); }
function replaceUrl(change){
  if(!history.replaceState) return;
  try{
    var u=new URL(location.href);change(u);
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
  }catch(e){}
}
function pad2(n){return String(n).padStart(2,'0')}
function yearOf(ms){return new Date(ms).getUTCFullYear()}
function validYear(raw){
  var y=/^\\d{4}$/.test(raw||'')?+raw:0;
  return y>=1800&&y<=2200?y:null;
}
function setYearRange(year,at){
  var end=Date.UTC(year+1,0,1);
  T0=Date.UTC(year,0,1);SPAN=Math.round((end-T0)/60000);
  for(var i=0;i<sliders.length;i++) sliders[i].max=SPAN;
  AT=Math.max(T0,Math.min(end-60000,at==null?T0:at));
  syncTimelineLabels();
}
function parseDateState(u){
  var raw=u.searchParams.get('date')||'',time=u.searchParams.get('time')||'',m,ms;
  if(!raw) return null;
  m=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(raw);
  if(m){
    if(time&&!/^\\d{2}:\\d{2}$/.test(time)) return null;
    var hm=(time||'12:00').split(':');
    ms=Date.UTC(+m[1],+m[2]-1,+m[3],+hm[0],+hm[1]);
    var d=new Date(ms);
    if(d.getUTCFullYear()!==+m[1]||d.getUTCMonth()!==+m[2]-1||d.getUTCDate()!==+m[3]||+hm[0]>23||+hm[1]>59) return null;
    return ms;
  }
  ms=Date.parse(raw);
  return isFinite(ms)?ms:null;
}
function writeMovingUrl(){
  replaceUrl(function(u){u.searchParams.set('year',String(yearOf(T0)));u.searchParams.delete('date');u.searchParams.delete('time');u.searchParams.delete('season');});
}
function writeExactUrl(ms){
  var d=new Date(ms),ymd=d.getUTCFullYear()+'-'+pad2(d.getUTCMonth()+1)+'-'+pad2(d.getUTCDate()),hm=pad2(d.getUTCHours())+':'+pad2(d.getUTCMinutes());
  replaceUrl(function(u){u.searchParams.set('year',String(d.getUTCFullYear()));u.searchParams.set('date',ymd);u.searchParams.set('time',hm);u.searchParams.delete('season');});
}
function writeSeasonUrl(kind){
  replaceUrl(function(u){
    var value=SEASON_PARAM[kind];
    if(value){u.searchParams.set('season',value);u.searchParams.set('year',String(yearOf(T0)));}
    else if(kind==='now'){u.searchParams.delete('season');u.searchParams.delete('year');}
    else u.searchParams.delete('season');
    u.searchParams.delete('date');u.searchParams.delete('time');
  });
}
function frame(ts){
  if(!PLAY) return;
  if(!LAST) LAST=ts;
  AT+=(ts-LAST)*RATE; LAST=ts;
  if(AT>T0+SPAN*60000) AT=T0;      /* round again from the start of the year */
  paint(); RAF=requestAnimationFrame(frame);
}
function start(){ PLAY=1; LAST=0;
  for(var i=0;i<playBtns.length;i++){playBtns[i].textContent='Pause';playBtns[i].setAttribute('aria-pressed','true');}
  SELECTED=''; TRACK_NOW=0; writeMovingUrl(); syncJumpState();
  svg.classList.add('is-playing'); RAF=requestAnimationFrame(frame); }

for(var pb=0;pb<playBtns.length;pb++){
  playBtns[pb].hidden=false;
  playBtns[pb].addEventListener('click',function(){if(PLAY){stop();writeExactUrl(AT)}else start();});
}
for(var sl=0;sl<sliders.length;sl++){
  sliders[sl].disabled=false;
  sliders[sl].addEventListener('input',function(){stop();SELECTED='';TRACK_NOW=0;syncJumpState();AT=T0+(+this.value)*60000;writeExactUrl(AT);paint();});
}
function stepWords(min){
  if(min===60)return '1 hour';if(min===120)return '2 hours';if(min===240)return '4 hours';
  if(min===480)return '8 hours';if(min===720)return '12 hours';if(min===1440)return '24 hours';return '1 week';
}
function stepMinutes(btn){
  var box=btn.closest('[data-dn-timeline]'),select=box&&box.querySelector('[data-dn-scale]');
  return select?+select.value:+(box&&box.getAttribute('data-dn-step-min')||10080);
}
function labelStepButtons(box){
  if(!box)return;var select=box.querySelector('[data-dn-scale]'),min=select?+select.value:+box.getAttribute('data-dn-step-min')||10080;
  var buttons=box.querySelectorAll('[data-dn-step-dir]');
  for(var i=0;i<buttons.length;i++){var back=buttons[i].getAttribute('data-dn-step-dir')==='-1';buttons[i].setAttribute('aria-label',(back?'Move back ':'Move forward ')+stepWords(min));buttons[i].title=(back?'Move back ':'Move forward ')+stepWords(min);}
}
for(var sb=0;sb<stepBtns.length;sb++){
  stepBtns[sb].disabled=false;labelStepButtons(stepBtns[sb].closest('[data-dn-timeline]'));
  stepBtns[sb].addEventListener('click',function(){
    stop();SELECTED='';TRACK_NOW=0;syncJumpState();
    var dir=+this.getAttribute('data-dn-step-dir'),end=T0+SPAN*60000-60000;
    AT=Math.max(T0,Math.min(end,AT+dir*stepMinutes(this)*60000));writeExactUrl(AT);paint();
  });
}
var scales=document.querySelectorAll('[data-dn-scale]');
for(var sc=0;sc<scales.length;sc++) scales[sc].addEventListener('change',function(){labelStepButtons(this.closest('[data-dn-timeline]'));});
/* kept as a named operation because season and current-time updates call it */
function spanLab(){syncTimelineLabels();}

/* ---- jumping to a solstice or an equinox --------------------------------
 * SOLVED, not tabulated. Walk forward a year an hour at a time and read the
 * answer off the declination: its highest point is the June solstice, its
 * lowest the December one, and the two crossings of zero are the equinoxes.
 * A table would have to be maintained; this cannot go stale. */
function seasonMs(kind,year){
  var t=Date.UTC(year,0,1),end=Date.UTC(year+1,0,1),best=null,bestV=null,prev=null,ms,d;
  for(ms=t; ms<end; ms+=3600000){
    d=dnSub(ms).dec;
    if(kind==='jun'&&(bestV===null||d>bestV)){bestV=d;best=ms}
    if(kind==='dec'&&(bestV===null||d<bestV)){bestV=d;best=ms}
    if(prev!==null){
      if(kind==='mar'&&prev<0&&d>=0&&best===null) best=ms;
      if(kind==='sep'&&prev>0&&d<=0&&best===null) best=ms;
    }
    prev=d;
  }
  return best||t;
}
var jumps=document.querySelectorAll('[data-dn-jump]');
function syncJumpState(){
  for(var i=0;i<jumps.length;i++) jumps[i].setAttribute('aria-pressed',jumps[i].getAttribute('data-dn-jump')===SELECTED?'true':'false');
}
function showSeason(kind,writeUrl){
  stop();
  SELECTED=kind;
  if(kind==='now'){ TRACK_NOW=1;setYearRange(new Date().getUTCFullYear(),Date.now()); }
  else{ TRACK_NOW=0;AT=seasonMs(kind,yearOf(T0)); }
  if(writeUrl) writeSeasonUrl(kind);
  syncJumpState(); spanLab(); paint();
}
for(var j=0;j<jumps.length;j++){
  jumps[j].disabled=false;
  jumps[j].addEventListener('click',function(){
    var k=this.getAttribute('data-dn-jump');
    showSeason(k,1);
  });
}

/* THREE WAYS TO READ THE SAME PAGE. Compact is the three simulators alone,
   driven by the one slider and the five season buttons under the map, so all
   three fit on one screen and the relationship between them is the thing on
   show. Normal gives each simulator its own slider and season row and keeps
   Things to Try and the questions. Full details is everything. The choice is
   a <select> under the map (and, outside compact, under the other two views
   and in the tab row), and every copy shows the same value. It lives in the
   URL as ?view=normal|full — compact is the default and writes nothing — so a
   teacher can share the page in the shape they want it opened in. */
/* Pack the three simulator cards the same way the section-page boards pack
   uneven cards: tiny grid rows let the third card rise directly under the
   shorter card instead of waiting for the taller card beside it. */
var simGrid=document.querySelector('.dn-sim-pair'),simPackMq=window.matchMedia&&window.matchMedia('(min-width:901px)'),simPackQueued=false;
function clearSimPack(){
  if(!simGrid)return;
  simGrid.classList.remove('dn-mas');
  for(var i=0;i<simGrid.children.length;i++)simGrid.children[i].style.gridRowEnd='';
}
function packSimGrid(){
  simPackQueued=false;
  if(!simGrid||!simPackMq||!simPackMq.matches){clearSimPack();return;}
  simGrid.classList.add('dn-mas');
  var cs=getComputedStyle(simGrid),rowH=parseFloat(cs.gridAutoRows),gap=parseFloat(cs.columnGap)||14;
  if(!rowH){clearSimPack();return;}
  var kids=[].slice.call(simGrid.children),heights=[],i;
  for(i=0;i<kids.length;i++)heights[i]=kids[i].getBoundingClientRect().height;
  for(i=0;i<kids.length;i++)kids[i].style.gridRowEnd='span '+Math.max(1,Math.ceil((heights[i]+gap)/rowH));
}
function queueSimPack(){if(!simPackQueued){simPackQueued=true;requestAnimationFrame(packSimGrid);}}
if(simGrid&&simPackMq){
  window.addEventListener('resize',queueSimPack);
  if(simPackMq.addEventListener)simPackMq.addEventListener('change',queueSimPack);
  if(window.ResizeObserver){var simRo=new ResizeObserver(queueSimPack);for(var sr=0;sr<simGrid.children.length;sr++)simRo.observe(simGrid.children[sr]);}
  packSimGrid();
}

var wrap=document.querySelector('.wrap'),viewSels=[].slice.call(document.querySelectorAll('[data-dn-view]')),VIEWS=['compact','normal','full'];
function setView(mode,writeUrl){
  if(!wrap||!viewSels.length) return;
  if(VIEWS.indexOf(mode)<0) mode='compact';
  for(var v=0;v<VIEWS.length;v++) wrap.classList.toggle('dn-view-'+VIEWS[v],VIEWS[v]===mode);
  wrap.classList.toggle('dn-lite',mode!=='full');
  for(var n=0;n<viewSels.length;n++) viewSels[n].value=mode;
  if(writeUrl) replaceUrl(function(u){ if(mode==='compact') u.searchParams.delete('view'); else u.searchParams.set('view',mode); });
  queueSimPack();
}
if(viewSels.length){
  for(var vs=0;vs<viewSels.length;vs++){viewSels[vs].disabled=false;viewSels[vs].addEventListener('change',function(){setView(this.value,1);});}
  var lessonLinks=document.querySelectorAll('.dn-tabs a');
  for(var q=0;q<lessonLinks.length;q++) lessonLinks[q].addEventListener('click',function(){
    for(var x=0;x<lessonLinks.length;x++) lessonLinks[x].classList.remove('is-here');
    this.classList.add('is-here');
  });
  /* A link into the details opens the view that can show them: a deep hash
     (the instructions, the FAQ, a concept anchor) needs full, Things to Try
     or the questions need at least normal, and ?view=details — the old
     two-state URL — still means full. Then scroll, because the browser's own
     jump happened while the target was display:none. */
  try{
    var viewUrl=new URL(location.href),want=(viewUrl.searchParams.get('view')||'').toLowerCase(),
        hashTarget=viewUrl.hash?document.getElementById(viewUrl.hash.slice(1)):null;
    if(want==='details') want='full';
    if(hashTarget&&hashTarget.closest('.dn-lesson-sections')){
      if(!hashTarget.closest('.dn-compact-sections')) want='full'; else if(want!=='full') want='normal';
    }
    setView(want,0);
    if(hashTarget&&want!=='compact') hashTarget.scrollIntoView();
  }catch(e){setView('compact',0);}
}

/* ---- my location --------------------------------------------------------
 * ASKED FOR ON LOAD, and the button is only what is left when that does not
 * work. Three outcomes, three states:
 *   - the device has no geolocation at all -> the button is REMOVED, because
 *     an control that cannot ever do anything is worse than no control;
 *   - the browser answers -> the dot appears and the button stays hidden,
 *     since it would now do nothing but repeat what already happened;
 *   - the browser refuses, times out, or the visitor dismisses the prompt ->
 *     the button appears beside Now, so it can be asked for again deliberately.
 * A location already granted on a previous visit resolves without a prompt, so
 * the common case is silent. Nothing is sent anywhere: the coordinates are used
 * for a dot on the map and the sentence beside it, and kept on this device. */
try{ var saved=localStorage.getItem('dn_home'); if(saved){ HOME=JSON.parse(saved); } }catch(e){}

function locFound(p){
  HOME={lat:p.coords.latitude,lon:p.coords.longitude};
  try{ localStorage.setItem('dn_home',JSON.stringify(HOME)); }catch(e){}
  set('dn-loc-msg','');
  locBtns.forEach(function(b){ b.hidden=true; });
  var w=$('dn-mewrap'); if(w) w.hidden=false;
  paint();
}
function locAsk(manual){
  if(!navigator.geolocation) return;
  if(manual) set('dn-loc-msg','Asking your browser\u2026');
  navigator.geolocation.getCurrentPosition(locFound,function(){
    locBtns.forEach(function(b){ b.hidden=false; });
    set('dn-loc-msg',manual?'Your browser did not share a location. You can still read the map \u2014 find your part of the world and check the shading.':'');
  },{timeout:10000,maximumAge:600000});
}
if(locBtns.length){
  if(!navigator.geolocation){
    locBtns.forEach(function(b){ if(b.parentNode) b.parentNode.removeChild(b); });
    locBtns=[];
  } else {
    locBtns.forEach(function(b){
      b.disabled=false;
      b.addEventListener('click',function(){ locAsk(1); });
    });
  }
}
if(navigator.geolocation) locAsk(0);

if(HOME){ var w0=$('dn-mewrap'); if(w0) w0.hidden=false; }

/* The year owns the slider range. A date (and optional UTC time) owns the exact
   opening instant. Season aliases remain convenient shareable shortcuts inside
   that selected year. Date wins if a copied URL contains both. */
var initialSeason='now',rawSeason='',rawDate='',pickedDate=null,pickedYear=null;
try{
  var initialUrl=new URL(location.href);
  rawSeason=(initialUrl.searchParams.get('season')||'').toLowerCase();
  rawDate=initialUrl.searchParams.get('date')||'';
  pickedDate=parseDateState(initialUrl);
  pickedYear=validYear(initialUrl.searchParams.get('year')||'');
  initialSeason=SEASON_ALIAS[rawSeason]||'now';
}catch(e){}
var openingYear=pickedDate!==null?yearOf(pickedDate):(pickedYear||new Date().getUTCFullYear());
setYearRange(openingYear,pickedDate!==null?pickedDate:(pickedYear?Date.UTC(pickedYear,0,1):Date.now()));
if(pickedDate!==null){
  SELECTED='';TRACK_NOW=0;syncJumpState();spanLab();paint();writeExactUrl(AT);
}else if(initialSeason!=='now'){
  showSeason(initialSeason,0);
  if(rawSeason!==SEASON_PARAM[initialSeason]||!pickedYear) writeSeasonUrl(initialSeason);
}else{
  SELECTED=pickedYear?'':'now';TRACK_NOW=!pickedYear;syncJumpState();spanLab();paint();
  if(rawDate||rawSeason){if(pickedYear) writeMovingUrl();else writeSeasonUrl('now');}
}
setInterval(function(){
  if(!PLAY&&TRACK_NOW){
    var now=Date.now(),y=yearOf(now);if(y!==yearOf(T0)) setYearRange(y,now);else AT=now;
    spanLab();paint();
  }
},60000);
})();</script>`;

/* THE FOUR CORNERS OF THE YEAR, AS A CONTROL. The full lesson keeps a row with
   each diagram so a student never has to scroll away from the thing it changes.
   Compact keeps only the row under the map, which drives all three. */
const locChip = `<button type="button" class="chip dn-loc-chip" aria-label="Put my location on the map" title="Put my location on the map" hidden disabled>${PIN}</button>`;
const jumpRow = (cls, withLoc) => `    <p class="${cls}">
      <button type="button" class="chip" data-dn-jump="now" disabled>Now</button>
      ${withLoc ? locChip + "\n      " : ""}<button type="button" class="chip" data-dn-jump="mar" disabled>Spring equinox</button>
      <button type="button" class="chip" data-dn-jump="jun" disabled>Summer solstice</button>
      <button type="button" class="chip" data-dn-jump="sep" disabled>Fall equinox</button>
      <button type="button" class="chip" data-dn-jump="dec" disabled>Winter solstice</button>
    </p>`;

/* HOW MUCH OF THE PAGE TO SHOW. One <select>, on the arrow-step line of each
   timeline and in the tab row, so the choice is never a scroll away; the
   script keeps every copy on the same value. Compact shows only the map's
   timeline, so the page it describes shows the select exactly once. The
   option labels carry the explanation — a key paragraph under it was tried
   and was the tallest thing under the map. It ships disabled: without JS it
   could change nothing. */
const VIEW_OPTIONS = [
  ["compact", "Compact — only simulators"],
  ["normal", "Normal — simulators with limited info"],
  ["full", "Full details — everything"],
];
const viewSelect = (id) => `<label class="dn-view-pick" for="${id}">View <select id="${id}" data-dn-view disabled>${VIEW_OPTIONS.map(([v, t]) => `<option value="${v}"${v === "compact" ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;

const jumpBtn = (k, t) => `<button type="button" class="chip" data-dn-jump="${k}" disabled>${esc(t)}</button>`;

const timelineControl = (id, mapScale = false, viewId = null) => `    <div class="dn-timeline" data-dn-timeline="${id}"${mapScale ? "" : ` data-dn-step-min="10080"`}>
      <label class="sim-flab" for="${id}-slider"><span data-dn-range>Jan. 1st to Dec. 31st</span> — One orbit of Earth — Showing <span data-dn-showing>${dayName(NOW)}, ${CURRENT_YEAR}</span></label>
      <div class="dn-step-row">
      ${mapScale ? `<label class="dn-scale-label" for="${id}-scale">Arrow step
        <select id="${id}-scale" data-dn-scale>
          <option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option>
          <option value="480">8 hours</option><option value="720">12 hours</option><option value="1440" selected>24 hours</option>
          <option value="10080">1 week</option>
        </select>
      </label>` : `<span class="dn-fixed-step">Arrow step: 1 week</span>`}${viewId ? "\n      " + viewSelect(viewId) : ""}
      </div>
      <div class="dn-slider-row">
        <button type="button" class="chip dn-step" data-dn-step-dir="-1" disabled aria-label="Move back">&lt;</button>
        <input type="range" class="orr-slider" id="${id}-slider" data-dn-slider min="0" max="${SPAN_MIN}" step="1" value="0" disabled aria-label="Move through one calendar year">
        <button type="button" class="chip dn-step" data-dn-step-dir="1" disabled aria-label="Move forward">&gt;</button>
        <button type="button" class="chip dn-obtn dn-play" data-dn-play aria-pressed="false" hidden>Play</button>
      </div>
    </div>`;

/* ---- the simulator card -------------------------------------------------- */
const simCard = ({ heading = false, view = false } = {}) => `  <div class="card dn-card" id="day-night-map">
${heading ? `    <h2>${ico("globe")} Day &amp; Night Map</h2>
` : ""}    <span class="dn-anchor-target" id="subsolar"></span><span class="dn-anchor-target" id="terminator"></span><span class="dn-anchor-target" id="twilight"></span><span class="dn-anchor-target" id="projection"></span><span class="dn-anchor-target" id="daytime-moon"></span>
    <div class="dn-figwrap">
      ${MAP_SVG}
    </div>
${timelineControl("dn-map", true, view ? "dn-view-map" : null)}
${jumpRow("dn-tools dn-tools-main", true)}
    <p class="dn-sunline" id="dn-sunline">${seasonSunHtml(SS.dec, SS.lon, subsolar(NOW + 7 * 86400000).dec, TILT)}</p>
    <p class="hint" id="dn-loc-msg"></p>
    <p class="dn-me-line" id="dn-mewrap" hidden><b id="dn-o-me">&nbsp;</b> <a id="dn-me-sun" href="/sun/near-me/?geo=1">Your sunrise and sunset →</a></p>
    <p class="hint dn-map-note"><strong>Map limitation:</strong> Earth is a globe flattened into a rectangle, so shapes and distances — especially near the poles — are distorted. The Sun and Moon markers are enlarged so you can see them. <a href="/concepts/why-is-this-map-flat/">Why this map is flat →</a></p>
  </div>
`;

/* ---- the explanation (thinned: essays live on /concepts/) ---------------- */
const howCard = `  <details class="card dn-instructions" id="instructions">
    <summary>Day &amp; Night Map Instructions</summary>
    <div class="dn-instructions-body">
    <p>This map solves which half of Earth faces the Sun at the instant shown above the slider. Bright areas have the Sun above the horizon, dark areas have it below, and the <strong>soft band</strong> is <a href="/concepts/what-is-twilight/">twilight</a>.</p>
    <p>Drag the slider to choose any instant in the year. Use the arrow-step menu to decide whether the arrow buttons move one hour, one day, or one week. <strong>Play</strong> runs through the year, <strong>Now</strong> returns to the current moment, and the seasonal buttons reveal how the day/night boundary changes across the year.</p>
    <p>The <strong>yellow marker</strong> is the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a>, where the Sun is straight overhead. The <strong>moon marker</strong> is where the Moon stands overhead, drawn in its phase at that moment—it can be a <a href="/concepts/why-can-the-moon-be-up-in-the-daytime/">daytime Moon</a>. The <strong>dashed gold lines</strong> are the tropics, and the curved boundary is the <a href="/concepts/what-is-the-terminator/">terminator</a>. Its daily sweep also shows why longitude matters to <a href="/concepts/what-is-a-time-zone/">time zones</a>.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Yellow marker</span><b>Subsolar point — a flagpole there casts no shadow.</b></div>
      <div class="wc-frow"><span>Moon marker</span><b>Overhead, in the phase of that moment. One orbit around Earth takes ${SIDEREAL} days.</b></div>
      <div class="wc-frow"><span>Soft band</span><b>Twilight, widest toward the poles.</b></div>
      <div class="wc-frow"><span>Dark half</span><b>Night, solved per meridian, not stamped on.</b></div>
    </div>
    </div>
  </details>
`;

const lessonHowCard = `  <details class="card dn-instructions" id="instructions">
    <summary>Earth’s Tilt, the Sun &amp; Seasons Instructions</summary>
    <div class="dn-instructions-body">
      <p>These are three views of one instant, not three separate models. Move any slider, press any seasonal button, or press Play under any view and all three update together.</p>
      <div class="wc-facts">
        <div class="wc-frow"><span>Day &amp; Night Map</span><b>Shows the result: which places receive daylight, twilight, or night.</b></div>
        <div class="wc-frow"><span>Angle of the Sun</span><b>Shows the mechanism: the overhead Sun moves between the tropics as Earth’s tilted axis changes its lean toward the Sun.</b></div>
        <div class="wc-frow"><span>Earth, Sun &amp; Moon</span><b>Shows the full year: Earth carries the same tilted axis around the Sun while the Moon orbits Earth.</b></div>
      </div>
      <p>Start with the two solstices and compare all three views. Then choose either equinox. Ask what changed, what stayed fixed, and which hemisphere receives the longer daily path through sunlight.</p>
    </div>
  </details>
`;

/* ---- the side view: original drawing, short caption, jump controls -------- */
const sideCard = `  <div class="card dn-side-card" id="sun-angle">
    <h2>${ico("globe")} Angle of the Sun Based on the Time of the Year</h2>
    <p class="dn-side-intro">This view turns Earth sideways so the cause of the seasons is easier to see. Earth’s axis keeps its ${n1(TILT)}° tilt while the direction toward the Sun changes through the orbit. The yellow centre line lands at the subsolar point, moving between the two tropics as the year passes.</p>
    <div class="dns-wrap" id="dn-side">${sideView(SS.dec, TILT)}</div>
${timelineControl("dn-angle", false, "dn-view-side")}
${jumpRow("dn-tools dn-tools-side", false)}
    <p class="dns-cap" id="dn-side-cap">${sideCapText(SS.dec, TILT, "now", NOW)}</p>
    <div class="dn-side-support">
    <p>The two dashed chords are the tropics, at ±${n1(TILT)}°. They are the tilt written on the surface. Jump the map to a solstice and watch the yellow line stop there.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Tropic of Cancer, ${n1(TILT)}°N</span><b>Furthest north the sun can stand overhead. ${jumpBtn("jun", "Show me")}</b></div>
      <div class="wc-frow"><span>Tropic of Capricorn, ${n1(TILT)}°S</span><b>The same limit going south. ${jumpBtn("dec", "Show me")}</b></div>
    </div>
    </div>
  </div>
`;

/* The annual view completes the seasons lesson: it shows the fixed axial lean
   carried around the Sun, with the Moon included so a shared eclipse date can
   reveal all three bodies in the same model. */
const systemCard = `  <div class="card dn-year-card" id="earth-sun-moon-year">
    <h2>${ico("earthmoon")} Earth, the Sun &amp; the Moon Through One Year</h2>
    <div class="sys-figwrap dn-system-wrap">${SYSTEM_SVG}</div>
${timelineControl("dn-year", false, "dn-view-year")}
${jumpRow("dn-tools dn-tools-year", false)}
    <p class="dn-system-meta"><span>The orbital plane is viewed at ${SYSTEM_VIEW_DEG}°. Earth’s axial tilt remains ${n1(TILT)}°.</span></p>
    <p class="hint dn-system-note">This wider view answers the missing question: where is Earth in its orbit while the daylight pattern changes? The same instant drives all three simulators. Sizes and distances are compressed to fit. The Moon’s real ${ORBIT_TILT}° orbital tilt is drawn at ${SYS_INC_DRAWN}° so a near miss — or an eclipse alignment — is easier to see. <a href="${SYS_PATH}">Open the full Earth–Sun–Moon simulator →</a></p>
  </div>
`;

const tiltCard = `  <div class="card">
    <h2>How the shadow changes through the year</h2>
    <p>Half the Earth is lit at every moment. Winter is not more shadow. The tilt (${n1(TILT)}°) changes <em>where</em> the line falls, so one hemisphere sits in the lit half longer — that is <a href="/concepts/why-do-we-have-seasons/">why we have seasons</a>. Jump to a solstice to see the Arctic swap from all-light to all-dark. The same lean is drawn on <a href="${SYS_PATH}">Earth’s orbit around the sun</a>.</p>
${jumpRow("dn-tools")}
    <div class="wc-facts">
      <div class="wc-frow"><span>March and September equinox</span><b>The line runs nearly pole to pole. ${jumpBtn("mar", "March")} ${jumpBtn("sep", "September")}</b></div>
      <div class="wc-frow"><span>June solstice</span><b>Sun over the Tropic of Cancer. ${jumpBtn("jun", "Show it")}</b></div>
      <div class="wc-frow"><span>December solstice</span><b>Sun over the Tropic of Capricorn. ${jumpBtn("dec", "Show it")}</b></div>
    </div>
  </div>
`;

const flatCard = `  <div class="card">
    <h2>Why this map is flat</h2>
    <p>Longitude is drawn evenly across so an hour of Earth’s turn is the same width everywhere, and the terminator can be solved honestly. Continents near the poles are stretched. Greenland is the famous victim; Africa, on the equator, is the one drawn nearly right — about ${AFRICA_X} times larger in real area.</p>
    <div class="wc-facts">
${STRETCH_ROWS.map((lat) => `      <div class="wc-frow"><span>${lat === 0 ? "At the equator" : `At ${n1(lat)}°`}${lat === 23.5 ? " (the tropics)" : lat === 71 ? " (northern Norway)" : lat === 78 ? " (Svalbard)" : ""}</span><b>drawn ${stretch(lat).toFixed(2)}× too wide${lat === 0 ? " — correct" : ""}</b></div>`).join("\n")}
    </div>
  </div>
`;

const tryCard = `  <div class="card" id="things-to-try">
    <h2>${ico("classroom")} Things to Try</h2>
    <ul class="facts">
      <li><strong>Read one date three ways.</strong> Choose the summer solstice. The map shows longer northern daylight, the side view puts the overhead Sun at the Tropic of Cancer, and the orbit view shows the north end of Earth leaning toward the Sun. Those are three consequences of the same geometry.</li>
      <li><strong>Swap the hemispheres.</strong> Move from the summer solstice to the winter solstice. Watch what reverses and what does not. Earth’s axial tilt keeps the same size and direction; which hemisphere leans into the sunlight changes.</li>
      <li><strong>Find the balance points.</strong> Compare the spring and fall equinoxes. The day/night boundary runs through both poles and the overhead Sun crosses the equator, yet Earth is on opposite sides of its orbit.</li>
      <li><strong>Test the distance myth.</strong> In the orbit view, compare where Earth is in June and in December with the season in each hemisphere. The whole planet is at one distance from the Sun on any given day, yet the two hemispheres have opposite seasons, so distance cannot be the switch. Earth is in fact slightly closer to the Sun in early January, a small effect that the tilt swamps.</li>
      <li><strong>Follow the overhead Sun.</strong> Press Play and watch the yellow point move between the tropics. It never crosses them because their latitude is Earth’s ${n1(TILT)}° axial tilt written onto the globe.</li>
      <li><strong>Look for an eclipse alignment.</strong> Open a known eclipse date with the year, date, and time URL variables. The Moon can line up with the Sun and Earth, but it does not change Earth’s seasons—the axial tilt and annual orbit do.</li>
    </ul>
    <p class="hint">Taught one of these, or something better? <a href="/classroom/">Help us turn it into a lesson plan</a> — we build them with teachers and publish them free, credited to you.</p>
  </div>
`;

const LESSON_FAQ = [
  ["Why do the three views move together?", "They are one model of one instant, not three separate animations. The map shows where that instant’s sunlight lands, the side view shows the angle it arrives at, and the orbit view shows where Earth is when it happens. Move any control and all three redraw from the same clock, so they cannot disagree about the moment on screen."],
  ["Why is the Moon included in a seasons simulator?", "The Moon does not cause the seasons. It is included so the three-body positions stay visible on exact dates, including eclipse dates, and so students can distinguish the Moon’s monthly orbit from Earth’s yearly seasonal cycle."],
  ["Can I share a particular year, date, season, or view?", "Yes. The page reads year, date, time, season and view from the URL. For example, year=2024, date=2024-04-08 and time=18:18 opens that precise UTC minute in all three views, and view=full opens the page with every explanation showing."],
];

const faqCard = `  <div class="card" id="season-questions">
    <h2>Questions About Earth’s Tilt and Seasons</h2>
    ${LESSON_FAQ.map(([q, a]) => `<details class="dn-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n    ")}
  </div>
`;

const pageTabs = `  <nav class="home-tabs sec-switch dn-tabs" aria-label="Explore this page">
    <a class="chip home-tab is-here" href="#day-night-map">Day/Night Map</a>
    <a class="chip home-tab" href="#sun-angle">Angle of the Sun</a>
    <a class="chip home-tab" href="#earth-sun-moon-year">Earth, Sun &amp; Moon</a>
    <a class="chip home-tab" href="#things-to-try">Things to Try</a>
    <a class="chip home-tab" href="#questions-answered">Questions Answered</a>
    <span class="dn-view-toggle">${viewSelect("dn-view-tabs")}</span>
  </nav>`;

const simulatorPair = `  <div class="dn-sim-pair">
${simCard({ heading: true, view: true })}${sideCard}${systemCard}
  </div>
`;

const mapPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Day and Night Map — Where It's Light on Earth Right Now</title>
<meta name="description" content="See where it is day, night, and twilight on Earth. Move through any date and time, locate the overhead Sun and Moon, or watch the terminator cross the map.">
<link rel="canonical" href="${SITE}${PATH}">
<meta property="og:title" content="Day and Night Map — Where It's Light on Earth Right Now">
<meta property="og:description" content="A live, interactive world map of daylight, twilight, night, and the overhead Sun and Moon.">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
${appLd({ name: "Day and Night Map", url: `${SITE}${PATH}`, description: "An interactive world map showing daylight, twilight, night, the subsolar point, and the Moon for any instant." })}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Day/night map", url: PATH }])}</script>
${learningLd({ name: "Day and Night Map", url: `${SITE}${PATH}`, description: "Use an interactive map to explore the terminator, subsolar point, twilight, and the limits of flattening a globe into a rectangle." })}
${GA_SNIPPET}
</head>
<body>
<div class="wrap wrap-wide dn-map-page">
  ${brand()}
  <h1>Day and Night Map</h1>
  <p class="sub">See where sunlight reaches Earth at this moment—or choose any date and time. The bright half is day, the dark half is night, and the soft boundary is twilight.</p>
${simCard()}${howCard}  <p class="dn-more-lesson"><a href="${LESSON_PATH}">Explore how Earth’s tilt creates the seasons in three synchronized simulators →</a></p>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${PAGE_JS}
</body>
</html>
`;

const lessonPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Earth’s Tilt, the Sun &amp; Seasons — Interactive Simulators</title>
<meta name="description" content="Explore how Earth’s ${n1(TILT)}° axial tilt creates the seasons with three synchronized simulators for daylight, the Sun’s angle, and Earth’s yearly orbit.">
<link rel="canonical" href="${SITE}${LESSON_PATH}">
<meta property="og:title" content="Earth’s Tilt, the Sun &amp; Seasons — Interactive Simulators">
<meta property="og:description" content="Run three synchronized views through a year and see how axial tilt changes sunlight, day length, solstices, and equinoxes.">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
${appLd({ name: "Earth’s Tilt, the Sun & Seasons", url: `${SITE}${LESSON_PATH}`, description: "Three synchronized interactive simulators showing how Earth’s axial tilt changes sunlight and creates the seasons." })}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Earth’s tilt, the Sun & seasons", url: LESSON_PATH }])}</script>
${learningLd({ name: "Earth’s Tilt, the Sun & Seasons", url: `${SITE}${LESSON_PATH}`, description: "Connect Earth’s axial tilt and yearly orbit to the changing angle of sunlight, day length, solstices, equinoxes, and opposite seasons in the two hemispheres." })}
${faqLd(LESSON_FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap wrap-wide dn-lesson-page dn-view-compact dn-lite">
  ${brand()}
  <h1>Earth’s Tilt, the Sun &amp; Seasons</h1>
  <p class="sub dn-page-intro">Earth’s ${n1(TILT)}° axial tilt changes both the angle of sunlight and how long the Sun stays above the horizon. These three synchronized views connect that tilt to daylight, solstices, equinoxes, and the opposite seasons in the Northern and Southern Hemispheres.</p>
${pageTabs}

${simulatorPair}  <div class="dn-lesson-sections" id="dn-lesson-details">
${lessonHowCard}    <div class="dn-compact-sections">
${tryCard}${hubQuestionsCard(LESSON_PATH, "Questions This Page Answers", { id: "questions-answered" })}    </div>
${faqCard}  <div class="card">
    <h2>Keep Exploring the Seasons</h2>
    <p>Use the simulators here to see the relationship, then open a focused page when you want the deeper explanation or the numbers for your own location.</p>
    <p class="timer-presets">
      <a class="chip" href="/concepts/why-do-we-have-seasons/">Why do we have seasons?</a>
      <a class="chip" href="/concepts/what-is-earths-axial-tilt/">What is axial tilt?</a>
      <a class="chip" href="/concepts/what-is-a-solstice/">What is a solstice?</a>
      <a class="chip" href="/concepts/what-is-an-equinox/">What is an equinox?</a>
      <a class="chip" href="${PATH}">Focused day &amp; night map</a>
      <a class="chip" href="${SYS_PATH}">Full Earth–Sun–Moon simulator</a>
      <a class="chip" href="/sun/near-me/">Your daylight and seasons</a>
      <a class="chip" href="/classroom/">Use these in a lesson</a>
    </p>
  </div>
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${PAGE_JS}
</body>
</html>
`;

for (const [path, html] of [[PATH, mapPage], [LESSON_PATH, lessonPage]]) {
  mkdirSync(join(root, path.slice(1, -1)), { recursive: true });
  writeFileSync(join(root, path.slice(1) + "index.html"), html);
}
console.log(`daynight: wrote ${PATH} and ${LESSON_PATH} (tilt ${n1(TILT)}deg, solstice ${dayName(YEAR.maxMs)})`);
