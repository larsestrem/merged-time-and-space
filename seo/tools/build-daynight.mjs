#!/usr/bin/env node
/* build-daynight.mjs — /day-night-map/, the page behind the home page's
 * day-and-night card.
 *
 * WHY IT EXISTS. The card on the front page answers one question — who is in
 * daylight right now — and raises three it has no room for: why the line is
 * curved, why it leans, and where it will be tonight. This page is the same
 * picture with time attached: a slider across one 27.3-day orbit of the Moon, a Play
 * button, and the explanation underneath.
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
import { SYS_PATH, SIDEREAL } from "./build-simulator.mjs";
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
const NOW = Date.now();

/* ONE SIDEREAL MONTH. The moon marker on this map is the point the moon stands
   overhead, and that point takes 27.3 days to go once around the Earth — one
   real orbit, the same SIDEREAL the rest of the site uses, not the 29.53-day
   cycle of phases. The home card covers a day because that card is "right
   now"; this page has room to show the moon finish a lap. */
const SPAN_DAYS = +SIDEREAL;
const SPAN_MIN = Math.round(SPAN_DAYS * 24 * 60);
const PLAY_RATE = 21600;                          /* six hours of map time per real second */
const PLAY_TURN_S = Math.round(86400 / PLAY_RATE);
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
  if (kind === 'jun') return '<a href="/holiday-countdowns/summer-solstice/">The summer solstice</a> occurs about <strong>' + when + '</strong>. It begins <a href="/concepts/why-do-we-have-seasons/">astronomical summer</a> in the Northern Hemisphere and gives it the year\'s longest period of daylight. The Sun–Earth centre line reaches the <a href="/concepts/what-is-the-tropic-of-cancer/">Tropic of Cancer</a>: the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a> goes no farther north. <a href="/concepts/what-is-a-solstice/">Why a solstice happens →</a>';
  if (kind === 'sep') return '<a href="/holiday-countdowns/fall-equinox/">The fall equinox</a> occurs about <strong>' + when + '</strong>. It begins <a href="/concepts/why-do-we-have-seasons/">astronomical fall</a> in the Northern Hemisphere (spring in the Southern Hemisphere), with nearly equal daylight and darkness. The Sun–Earth centre line meets the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a> on the equator. <a href="/concepts/what-is-an-equinox/">Why an equinox happens →</a>';
  if (kind === 'dec') return '<a href="/holiday-countdowns/winter-solstice/">The winter solstice</a> occurs about <strong>' + when + '</strong>. It begins <a href="/concepts/why-do-we-have-seasons/">astronomical winter</a> in the Northern Hemisphere and gives it the year\'s shortest period of daylight. The Sun–Earth centre line reaches the <a href="/concepts/what-is-the-tropic-of-capricorn/">Tropic of Capricorn</a>: the <a href="/concepts/what-is-the-subsolar-point/">subsolar point</a> goes no farther south. <a href="/concepts/what-is-a-solstice/">Why a solstice happens →</a>';
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
 * compact-view toggle hidden — because without JS none could do anything, and
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
    slider=document.getElementById('dn-slider'), play=document.getElementById('dn-play'),
    locBtns=[].slice.call(document.querySelectorAll('.dn-loc-chip'));
var TILT=${TILT};                 /* solved at build from the same series */
var sideBox=document.getElementById('dn-side'), sideCapEl=document.getElementById('dn-side-cap'),
    sunline=document.getElementById('dn-sunline'),
    orbitNow=document.getElementById('dn-orbit-now');
var SPAN=${SPAN_MIN};             /* minutes: one ${SIDEREAL}-day orbit of the Moon */
var RATE=${PLAY_RATE};            /* six hours of map time per real second */
var T0=${NOW}, AT=${NOW}, PLAY=0, RAF=0, LAST=0, HOME=null, SELECTED='now';
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
  set('dn-o-when',fmt(AT));
  set('dn-o-utc',fmt(AT,'UTC')+' UTC');
  if(sunline) sunline.innerHTML=seasonSun(ss.dec,ss.lon,dnSub(AT+7*86400000).dec);
  /* the side view is the same instant from a different place to stand, so it
     repaints from the same ss and cannot disagree with the map above it */
  if(sideBox) sideBox.innerHTML=dnSide(ss.dec,TILT, HOME&&HOME.lat!=null?HOME.lat:null);
  if(sideCapEl) sideCapEl.innerHTML=sideCap(ss.dec,SELECTED,AT);
  if(slider) slider.value=Math.round((AT-T0)/60000);
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
  play.textContent='Play'; play.setAttribute('aria-pressed','false'); svg.classList.remove('is-playing'); }
function frame(ts){
  if(!PLAY) return;
  if(!LAST) LAST=ts;
  AT+=(ts-LAST)*RATE; LAST=ts;
  if(AT>T0+SPAN*60000) AT=T0;      /* round again from the start of the orbit */
  paint(); RAF=requestAnimationFrame(frame);
}
function start(){ PLAY=1; LAST=0; play.textContent='Pause'; play.setAttribute('aria-pressed','true');
  SELECTED=''; writeSeasonUrl(''); syncJumpState();
  svg.classList.add('is-playing'); RAF=requestAnimationFrame(frame); }

if(play){ play.hidden=false; play.addEventListener('click',function(){ PLAY?stop():start(); }); }
if(slider){
  slider.disabled=false;
  slider.addEventListener('input',function(){ stop(); SELECTED=''; writeSeasonUrl(''); syncJumpState(); AT=T0+(+slider.value)*60000; paint(); });
}
/* the label above the slider: which stretch of days it is showing */
function spanLab(){
  var a=new Date(T0), b=new Date(T0+SPAN*60000);
  var f=function(d){ try{ return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(d); }catch(e){ return ''; } };
  set('dn-span',f(a)+' \\u2013 '+f(b));
}

/* ---- jumping to a solstice or an equinox --------------------------------
 * SOLVED, not tabulated. Walk forward a year an hour at a time and read the
 * answer off the declination: its highest point is the June solstice, its
 * lowest the December one, and the two crossings of zero are the equinoxes.
 * A table would have to be maintained; this cannot go stale. */
function seasonMs(kind){
  var t=Date.now(), best=null, bestV=null, prev=null, ms, d;
  for(ms=t; ms<t+367*86400000; ms+=3600000){
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
function writeSeasonUrl(kind){
  if(!history.replaceState) return;
  try{
    var u=new URL(location.href), value=SEASON_PARAM[kind];
    if(value) u.searchParams.set('season',value); else u.searchParams.delete('season');
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
  }catch(e){}
}
function showSeason(kind,writeUrl){
  stop();
  SELECTED=kind;
  if(kind==='now'){ T0=Date.now(); AT=T0; }
  else{
    var m=seasonMs(kind), day=new Date(m);
    T0=Date.UTC(day.getUTCFullYear(),day.getUTCMonth(),day.getUTCDate())-3*86400000;
    AT=m;
  }
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

/* A compact classroom view keeps the two synchronized diagrams and one season
   row on screen together. The query string makes that view shareable without
   creating a second indexable page. */
var wrap=document.querySelector('.wrap'), viewBtn=document.getElementById('dn-sim-view');
function setSimOnly(on,writeUrl){
  if(!wrap||!viewBtn) return;
  wrap.classList.toggle('dn-only',on);
  viewBtn.setAttribute('aria-pressed',on?'true':'false');
  viewBtn.textContent=on?'Full lesson':'Simulators only';
  var navLinks=document.querySelectorAll('.dn-tabs a');
  for(var n=0;n<navLinks.length;n++) navLinks[n].classList.remove('is-here');
  if(!on&&navLinks.length) navLinks[0].classList.add('is-here');
  if(writeUrl&&history.replaceState){
    var u=new URL(location.href);
    if(on) u.searchParams.set('view','simulators'); else u.searchParams.delete('view');
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
  }
}
if(viewBtn){
  viewBtn.hidden=false;
  viewBtn.addEventListener('click',function(){ setSimOnly(!wrap.classList.contains('dn-only'),1); });
  var lessonLinks=document.querySelectorAll('.dn-tabs a');
  for(var q=0;q<lessonLinks.length;q++) lessonLinks[q].addEventListener('click',function(){
    setSimOnly(0,1);
    for(var x=0;x<lessonLinks.length;x++) lessonLinks[x].classList.remove('is-here');
    this.classList.add('is-here');
  });
  try{ setSimOnly(new URL(location.href).searchParams.get('view')==='simulators',0); }catch(e){}
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

/* A season is a shareable simulator state, not a separate page. Canonical
   strings are readable in a copied URL; short and British-English aliases are
   accepted so a hand-written classroom link still lands on the intended view. */
var initialSeason='now';
try{
  var initialUrl=new URL(location.href), rawSeason=(initialUrl.searchParams.get('season')||'').toLowerCase();
  initialSeason=SEASON_ALIAS[rawSeason]||'now';
  if(rawSeason&&(initialSeason==='now'||rawSeason!==SEASON_PARAM[initialSeason])) writeSeasonUrl(initialSeason);
}catch(e){}
showSeason(initialSeason,0);
setInterval(function(){ if(!PLAY&&Math.abs(AT-Date.now())<90000){ AT=Date.now(); paint(); } },60000);
})();</script>`;

/* THE FOUR CORNERS OF THE YEAR, AS A CONTROL. The full lesson keeps a row with
   each diagram so a student never has to scroll away from the thing it changes.
   The compact simulator view hides both and reveals one shared row instead. */
const locChip = `<button type="button" class="chip dn-loc-chip" aria-label="Put my location on the map" title="Put my location on the map" hidden disabled>${PIN}</button>`;
const jumpRow = (cls, withLoc) => `    <p class="${cls}">
      <button type="button" class="chip" data-dn-jump="now" disabled>Now</button>
      ${withLoc ? locChip + "\n      " : ""}<button type="button" class="chip" data-dn-jump="mar" disabled>Spring equinox</button>
      <button type="button" class="chip" data-dn-jump="jun" disabled>Summer solstice</button>
      <button type="button" class="chip" data-dn-jump="sep" disabled>Fall equinox</button>
      <button type="button" class="chip" data-dn-jump="dec" disabled>Winter solstice</button>
    </p>`;
const jumpBtn = (k, t) => `<button type="button" class="chip" data-dn-jump="${k}" disabled>${esc(t)}</button>`;

/* ---- the simulator card -------------------------------------------------- */
const simCard = `  <div class="card dn-card" id="day-night-map">
    <div class="dn-figwrap">
      ${MAP_SVG}
    </div>
    <div class="dn-slider-row">
      <div class="dn-slider-mid">
        <label class="sim-flab" for="dn-slider">Time — ${SIDEREAL} days, one orbit of the Moon <span class="dn-span" id="dn-span"></span></label>
        <input type="range" class="orr-slider" id="dn-slider" min="0" max="${SPAN_MIN}" step="10" value="0" disabled aria-label="Move through one ${SIDEREAL}-day orbit of the Moon">
      </div>
      <button type="button" class="chip dn-obtn dn-play" id="dn-play" aria-pressed="false" hidden>Play</button>
    </div>
    <p class="dn-when"><b id="dn-o-when">&nbsp;</b><span id="dn-o-utc">&nbsp;</span></p>
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
    <p>This is a live map of day and night on Earth, solved for this moment. Half the planet is in sunlight at every instant. The bright half is where the sun is above the horizon, the dark half is below, and the <strong>soft band</strong> is twilight — the sun has set but the sky is still lit, out to 18° down.</p>
    <p>The <strong>yellow marker</strong> is the one place the sun stands <a href="/concepts/what-is-the-subsolar-point/">straight overhead</a>. The <strong>moon marker</strong> is where the moon stands overhead at the time on the slider, drawn in its current phase. It can sit in daylight or in night; that is <a href="/concepts/why-can-the-moon-be-up-in-the-daytime/">a daytime moon</a>. Drag the slider end to end and that marker completes one ${SIDEREAL}-day orbit of the Moon around Earth. The <strong>dashed gold lines</strong> are the tropics. The <strong>curve</strong> is the <a href="/concepts/what-is-the-terminator/">terminator</a>. <strong>Play</strong> watches both markers sweep west. Jump to a season start to see the shadow lean.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Yellow marker</span><b>Subsolar point — a flagpole there casts no shadow.</b></div>
      <div class="wc-frow"><span>Moon marker</span><b>Overhead, in the phase of that moment. One orbit around Earth takes ${SIDEREAL} days.</b></div>
      <div class="wc-frow"><span>Soft band</span><b>Twilight, widest toward the poles.</b></div>
      <div class="wc-frow"><span>Dark half</span><b>Night, solved per meridian, not stamped on.</b></div>
    </div>
    </div>
  </details>
`;

/* ---- the side view: original drawing, short caption, jump controls -------- */
const sideCard = `  <div class="card dn-side-card" id="sun-angle">
    <h2>${ico("globe")} Angle of the Sun based on the time of the year</h2>
    <p class="dn-side-intro">The map above looks down at the ground. This is the same instant from beside <a href="${SYS_PATH}">Earth’s orbit</a> — parallel sunlight, and the one yellow line from the centre of the sun to the centre of the Earth. It meets the surface at the yellow marker.</p>
    <div class="dns-wrap" id="dn-side">${sideView(SS.dec, TILT)}</div>
${jumpRow("dn-tools dn-tools-side")}
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
    <h2>${ico("classroom")} Things to try</h2>
    <ul class="facts">
      <li><strong>Find your own bedtime.</strong> The map marks where you are as soon as your browser shares it — if it did not, there is a pin in the season-button row. Then drag the slider to tonight and watch the shading arrive over your dot: that is your sunset, to the minute the sun goes down where you are standing.</li>
      <li><strong>Watch the moon go round.</strong> Drag the slider from one end to the other. That is ${SIDEREAL} days — one real orbit of the Moon around Earth — and the moon marker comes back to nearly the same place it started. The phase will not match: a <a href="/concepts/what-is-a-synodic-month/">full cycle of phases</a> takes two days longer.</li>
      <li><strong>Who is asleep right now?</strong> Press <strong>Now</strong> and look at which continents sit in the dark half. Then pick a country the class has a connection to and check whether anyone there would answer the phone.</li>
      <li><strong>Race the line.</strong> Press <strong>Play</strong> and follow the terminator west. It crosses the whole map in 24 hours, which at the equator is about 1,670 km/h — faster than an airliner. Ask which way you would have to fly to keep the sun from setting.</li>
      <li><strong>Break the tilt.</strong> Jump to the <strong>summer solstice</strong>, then to the <strong>winter solstice</strong>, and watch the top of the map swap from all-light to all-dark. Ask what would happen to seasons if the tilt were zero — the answer is on the map, because the line would simply stand up straight.</li>
      <li><strong>Catch the equinox.</strong> Jump to the <strong>spring equinox</strong> or the <strong>fall equinox</strong> and check the line: nearly vertical, and every place on Earth getting about twelve hours of each. It is the only date the map is symmetric.</li>
      <li><strong>Argue with the map.</strong> Compare Greenland with Africa, then look up their real areas. This is the cheapest possible lesson in why the projection matters, and it lands harder when the map is one they have just been using and trusting.</li>
    </ul>
    <p class="hint">Taught one of these, or something better? <a href="/classroom/">Help us turn it into a lesson plan</a> — we build them with teachers and publish them free, credited to you.</p>
  </div>
`;

const FAQ = [
  ["Is the map showing real time?",
    `Yes. It opens at the current moment and repaints every minute while it is left alone. The slider moves it forward through one ${SIDEREAL}-day orbit of the Moon, and Now brings it back. Everything is computed in your browser from the sun's position — nothing is fetched from a server, and there is nothing to sign up for.`],
  ["Where can I see the exact sunrise and sunset time for my town?",
    "On the sun pages: they give sunrise, sunset, day length, twilight and a seven-day outlook for more than a thousand cities, or for any location you name. This map is the shape of the thing; those pages are the numbers."],
  ["What do Play, Now and the season buttons do?",
    `Play runs about six hours a second so one turn of the Earth takes ${PLAY_TURN_S} seconds, and one ${SIDEREAL}-day orbit of the Moon ${playSpanWords}. Now jumps back to this moment. The four season buttons — spring equinox, summer solstice, fall equinox, winter solstice — jump to the start of each season so you can see the slow lean of the year.`],
];

const pageTabs = `  <nav class="home-tabs sec-switch dn-tabs" aria-label="Explore this page">
    <a class="chip home-tab is-here" href="#day-night-map">Day/Night Map</a>
    <a class="chip home-tab" href="#sun-angle">Angle of the Sun</a>
    <a class="chip home-tab" href="#things-to-try">Things to Try</a>
    <a class="chip home-tab" href="#questions-answered">Questions Answered</a>
    <button type="button" class="chip home-tab dn-view-toggle" id="dn-sim-view" aria-pressed="false" hidden>Simulators only</button>
  </nav>`;

const simulatorPair = `  <div class="dn-sim-pair">
${simCard}${sideCard}${jumpRow("dn-tools dn-tools-only")}
  </div>
`;

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Day and Night Map — Where It's Light on Earth Right Now</title>
<meta name="description" content="A live world map of day and night: where the sun is up right now, where it is dark, and the twilight band between. Play one ${SIDEREAL}-day orbit of the Moon, jump to a solstice, and see why the line leans.">
<link rel="canonical" href="${SITE}${PATH}">
<meta property="og:title" content="Day and Night Map — Where It's Light on Earth Right Now">
<meta property="og:description" content="A live world map of day and night, with a ${SIDEREAL}-day slider, a Play button and the explanation underneath.">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
${appLd({ name: "Day and Night Map", url: `${SITE}${PATH}`, description: `A live world map showing which half of the Earth is in daylight, the twilight band, and the point the sun is directly overhead, with a ${SIDEREAL}-day time slider.` })}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Day/night map", url: PATH }])}</script>
${learningLd({ name: "Day and Night Map", url: `${SITE}${PATH}`, description: "How the day/night line works: the terminator, the subsolar point, twilight, the effect of the Earth's axial tilt, and what a flat equirectangular map does to the size of the continents." })}
${faqLd(FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap wrap-wide">
  ${brand()}
  <h1>Day and Night Map</h1>
  <p class="sub dn-page-intro">Where it is light on Earth right now, where it is dark, and the twilight in between. Drag the slider to move through one ${SIDEREAL}-day orbit of the Moon, or press play and watch the line sweep round. The same picture as the <a href="/world-clock/">world clock</a>'s map, with time attached.</p>
${pageTabs}

${simulatorPair}  <div class="dn-lesson-sections">
${howCard}${tryCard}${hubQuestionsCard(PATH, "Questions this page answers", { id: "questions-answered" })}  <div class="card">
    <h2>Keep going</h2>
    <p>This map answers "where", to the nearest few hundred kilometres. For "when", to the minute, in your own town:</p>
    <p class="timer-presets">
      <a class="chip" href="/concepts/why-do-we-have-seasons/">Why do we have seasons?</a>
      <a class="chip" href="${SYS_PATH}">Earth’s orbit with the tilt</a>
      <a class="chip" href="/concepts/why-is-this-map-flat/">Why is this map flat?</a>
      <a class="chip" href="/concepts/what-is-a-synodic-month/">Why a month is longer than an orbit</a>
      <a class="chip" href="/glossary/">Glossary</a>
      <a class="chip" href="/sun/">Sunrise &amp; sunset for your city</a>
      <a class="chip" href="/moon/">Tonight's moon phase</a>
      <a class="chip" href="/world-clock/">What time is it there?</a>
      <a class="chip" href="/sun-moon-earth-movement-simulator/">The same line, on a globe</a>
      <a class="chip" href="/methodology/sunrise-sunset/">How sunrise is worked out</a>
      <a class="chip" href="/classroom/">Using these in a lesson</a>
    </p>
  </div>
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${PAGE_JS}
</body>
</html>
`;

mkdirSync(join(root, PATH.slice(1, -1)), { recursive: true });
writeFileSync(join(root, PATH.slice(1) + "index.html"), page);
console.log(`daynight: wrote ${PATH} (tilt ${n1(TILT)}deg, solstice ${dayName(YEAR.maxMs)})`);
