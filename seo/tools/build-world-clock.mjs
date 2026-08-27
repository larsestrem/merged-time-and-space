#!/usr/bin/env node
/* build-world-clock.mjs — the live "World Clock" hub at /world-clock/ PLUS one
 * page per city at /world-clock/<slug>/.
 *
 * The HUB grid is tier 1 from wc-cities.mjs — one city per UTC offset, covering
 * every distinct clock including the half-hour and 45-minute zones. Tier 2 (the
 * demand list: Toronto, Berlin, Singapore…) shares those offsets, so it stays
 * out of the grid and is linked from it instead. The client:
 *   - orders the cards starting two zones west of the visitor, wrapping around
 *   - ticks once a minute (DST-aware), paused via the Page Visibility API while
 *     the tab is hidden; shows day/night + sunrise/sunset (computed from each
 *     city's lat/lon), and the offset vs the visitor
 *
 * The CITY PAGES exist because "current time in <city>" is its own search, and
 * one hub of clock cards cannot rank for a hundred different queries. Each is a
 * real static page: zone name, IANA id, UTC offset, whether daylight saving is
 * in effect, today's sunrise/sunset, and this city's time against six others —
 * all baked, all crawlable. The live clock ticks on top.
 *
 * WHAT IS DELIBERATELY NOT BAKED: the clock time never goes in the title, the
 * description or any sentence. Those are written once and read for months; a
 * minute-stale time in a search snippet is simply a wrong answer. The prose
 * states only what holds all day (zone, offset, DST, date, sun times), and the
 * time itself lives in the display that visibly ticks.
 *
 *   node seo/tools/build-world-clock.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, appLd, faqLd, breadcrumbLD } from "./lib.mjs";
import { CITY_DB, citySlug } from "./cities.mjs";
/* the city list itself lives in wc-cities.mjs — see the note there */
import { WC_CITY_LIST as CITIES } from "./wc-cities.mjs";
import { familyLinks } from "./city-registry.mjs";
import { hubQuestionsCard } from "./concepts.mjs";
import { astroStrip } from "./crosslinks.mjs";
/* the same Place + geo node every other place family emits. World-clock city
   pages were the one family without it — breadcrumbs and an FAQ and nothing
   saying the page is ABOUT a location. */
import { placeLd, resolvePlace } from "./place.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;


/* Which other families have a page for this city, and where — one answer, from
 * city-registry.mjs, instead of each generator working it out again. The chips
 * carry no data-xlink: check-crosslinks governs reciprocity inside the
 * sun/moon/tide triangle, and these are one-way links into it. */
function astroChips(c) {
  const links = familyLinks(citySlug(c.city));
  if (!links) return "";
  const out = [`<a href="${links.sun}">Sun</a>`, `<a href="${links.moon}">Moon</a>`];
  if (links.tide) out.push(`<a href="${links.tide}">Tides</a>`);
  /* the fifth family. Every one of these cities has a simulator page — it is
     the family that is never null — and this row was three chips of the four
     that existed simply because the registry did not know about the fifth. */
  if (links.sim) out.push(`<a href="${links.sim}">Simulator</a>`);
  return `<div class="wc-astro">${out.join("")}</div>`;
}

/* readable zone name (e.g. "Eastern Time", "Central European Time"), computed
 * at build time from ICU data; falls back to the short abbreviation/offset. */
function tzName(tz) {
  try {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName");
    if (p && p.value && !/^GMT/.test(p.value)) return p.value;
  } catch (e) { /* noop */ }
  try {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName");
    if (p) return p.value;
  } catch (e) { /* noop */ }
  return "";
}

/* "City, Region - Country" when a short, commonly-used region/state/
 * province abbreviation exists (US states, Canadian provinces, Australian
 * states, Brazilian states); otherwise just "City, Country" — kept short so
 * it always reads on one line on mobile. */
const locLabel = (c) => c.region ? `${c.city}, ${c.region} - ${c.area}` : `${c.city}, ${c.area}`;

/* ---- build-time snapshot: real times/sun data baked into the initial HTML,
 * so a crawler (or a visitor before JS runs) sees actual content instead of
 * "--:--"/"—" placeholders. Ports the exact same math the client's tick()
 * uses (offMin/sunTimes/hm below mirror the inline JS further down) so the
 * baked snapshot and the live client value agree to the minute at load time.
 * The client overwrites every field within the same tick regardless — this
 * only fixes what a crawler or pre-JS paint sees, not the live behavior. */
function offMinBuild(tz, now) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now);
    const v = parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
    const m = v.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0;
    return (m[1] === "-" ? -1 : 1) * ((+m[2]) * 60 + (+(m[3] || 0)));
  } catch (e) { return 0; }
}
function offLabelBuild(tz, now) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now);
    return parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
  } catch (e) { return "GMT"; }
}
/* SunCalc-style sunrise/sunset, identical formula to the client's sunTimes() */
function sunTimesBuild(date, lat, lng) {
  const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const toDays = (d) => d.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const sma = (d) => rad * (357.5291 + 0.98560028 * d);
  const ecl = (M) => { const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)), P = rad * 102.9372; return M + C + P + Math.PI; };
  const dec = (l) => Math.asin(Math.sin(e) * Math.sin(l));
  const approxTransit = (Ht, lw, n) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
  const transitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const fromJ = (j) => (j + 0.5 - J1970) * dayMs;
  const lw = rad * -lng, phi = rad * lat, d = toDays(date), n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = approxTransit(0, lw, n), M = sma(ds), L = ecl(M), dc = dec(L), Jnoon = transitJ(ds, M, L);
  const x = (Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dc)) / (Math.cos(phi) * Math.cos(dc));
  if (x < -1 || x > 1) return null;
  const w = Math.acos(x), Jset = transitJ(approxTransit(w, lw, n), M, L), Jrise = Jnoon - (Jset - Jnoon);
  return { rise: fromJ(Jrise), set: fromJ(Jset) };
}
const hmBuild = (ms, tz) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(ms));
const buildNow = new Date();

function snapshot(c) {
  const timeStr = new Intl.DateTimeFormat("en-US", { timeZone: c.tz, hour: "2-digit", minute: "2-digit", hour12: true }).format(buildNow);
  const dateStr = new Intl.DateTimeFormat("en-US", { timeZone: c.tz, weekday: "short", month: "short", day: "numeric" }).format(buildNow);
  const off = offLabelBuild(c.tz, buildNow);
  const st = sunTimesBuild(buildNow, c.lat, c.lon);
  const isDay = st ? (buildNow.getTime() >= st.rise && buildNow.getTime() <= st.set) : true;
  const sunHtml = st ? `<span class="wc-sun-i">☼↑</span> ${esc(hmBuild(st.rise, c.tz))}   <span class="wc-sun-i">☼↓</span> ${esc(hmBuild(st.set, c.tz))}` : (isDay ? "Midnight sun" : "Polar night");
  /* ISO instant for the machine-readable <time datetime>, at this zone's
   * current offset (e.g. 2026-07-14T05:30:00+01:00) */
  let iso;
  try {
    const offMin = offMinBuild(c.tz, buildNow);
    const sign = offMin < 0 ? "-" : "+", abs = Math.abs(offMin), oh = String(Math.floor(abs / 60)).padStart(2, "0"), om = String(abs % 60).padStart(2, "0");
    const local = new Date(buildNow.getTime() + offMin * 60000);
    iso = `${local.toISOString().slice(0, 19)}${sign}${oh}:${om}`;
  } catch (e) { iso = buildNow.toISOString(); }
  return { timeStr, dateStr, off, isDay, sunHtml, iso };
}

/* the grid is one card per UTC offset — tier 1 only. Tier-2 cities share those
 * offsets, so they'd render as duplicate clocks; they get the link list below
 * (MORE_CITIES) and their own pages instead. */
const cards = CITIES.filter((c) => c.tier !== 2).map((c) => {
  const s = snapshot(c);
  return `    <div class="wc-card" data-tz="${esc(c.tz)}" data-city="${esc(c.city)}" data-area="${esc(c.area)}" data-lat="${c.lat}" data-lon="${c.lon}">
      <span class="wc-icon" aria-hidden="true">${s.isDay ? "☀️" : "🌙"}</span>
      <div class="wc-info"><div class="wc-city"><a class="wc-stretch" href="/world-clock/${citySlug(c.city)}/">${esc(locLabel(c))}</a><span class="wc-tzname">${esc(tzName(c.tz))}</span></div><div class="wc-meta">${esc(s.dateStr)} &middot; ${esc(s.off)}</div><div class="wc-sun">${s.sunHtml}</div>${astroChips(c)}</div>
      <div class="wc-time"><time datetime="${esc(s.iso)}">${esc(s.timeStr)}</time></div>
    </div>`;
}).join("\n");

/* [city, area label, slug] for every city with a page — the hub search's whole
 * universe, so a result can never point at a page that doesn't exist. */
const SEARCH_INDEX = JSON.stringify(CITIES.map((c) => [c.city, locLabel(c).replace(`${c.city}, `, ""), citySlug(c.city)]));

const JS = `
(function(){
  var grid=document.getElementById('wc-grid'); if(!grid) return;
  var cards=[].slice.call(grid.querySelectorAll('.wc-card'));
  var youTz='UTC'; try{ youTz=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'; }catch(e){}
  var h12=true;

  function offLabel(tz){ try{ var p=new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'shortOffset'}).formatToParts(new Date()); for(var i=0;i<p.length;i++){ if(p[i].type==='timeZoneName') return p[i].value; } }catch(e){} return 'GMT'; }
  function offMin(tz){ var v=offLabel(tz); var m=v.match(/GMT([+-])(\\d{1,2})(?::(\\d{2}))?/); if(!m) return 0; return (m[1]==='-'?-1:1)*((+m[2])*60+(+(m[3]||0))); }
  function ymd(tz,now){ return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }

  /* sunrise / sunset (SunCalc algorithm), returns {rise,set} in UTC ms */
  function sunTimes(date,lat,lng){
    var rad=Math.PI/180, dayMs=86400000, J1970=2440588, J2000=2451545, e=rad*23.4397;
    function toDays(d){ return d.valueOf()/dayMs - 0.5 + J1970 - J2000; }
    function sma(d){ return rad*(357.5291+0.98560028*d); }
    function ecl(M){ var C=rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M)), P=rad*102.9372; return M+C+P+Math.PI; }
    function dec(l){ return Math.asin(Math.sin(e)*Math.sin(l)); }
    function approxTransit(Ht,lw,n){ return 0.0009 + (Ht+lw)/(2*Math.PI) + n; }
    function transitJ(ds,M,L){ return J2000 + ds + 0.0053*Math.sin(M) - 0.0069*Math.sin(2*L); }
    function fromJ(j){ return (j + 0.5 - J1970)*dayMs; }
    var lw=rad*-lng, phi=rad*lat, d=toDays(date), n=Math.round(d-0.0009-lw/(2*Math.PI));
    var ds=approxTransit(0,lw,n), M=sma(ds), L=ecl(M), dc=dec(L), Jnoon=transitJ(ds,M,L);
    var x=(Math.sin(-0.833*rad)-Math.sin(phi)*Math.sin(dc))/(Math.cos(phi)*Math.cos(dc));
    if(x< -1 || x> 1) return null;
    var w=Math.acos(x), Jset=transitJ(approxTransit(w,lw,n),M,L), Jrise=Jnoon-(Jset-Jnoon);
    return { rise:fromJ(Jrise), set:fromJ(Jset) };
  }
  function hm(ms,tz){ return new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:h12}).format(new Date(ms)); }

  var youOff=offMin(youTz); if(isNaN(youOff)) youOff=-new Date().getTimezoneOffset();
  /* order: sort by current offset, then start two zones west of the visitor */
  var arr=cards.map(function(el){ return {el:el, off:offMin(el.getAttribute('data-tz'))}; });
  arr.sort(function(a,b){ return a.off-b.off || (a.el.getAttribute('data-city')<b.el.getAttribute('data-city')?-1:1); });
  var n=arr.length, vi=n-1; for(var i=0;i<n;i++){ if(arr[i].off>=youOff){ vi=i; break; } }
  var start=((vi-2)%n+n)%n;
  for(var k=0;k<n;k++){ grid.appendChild(arr[(start+k)%n].el); }

  function tick(){
    var now=new Date(), youDay=ymd(youTz,now);
    cards.forEach(function(el){
      var tz=el.getAttribute('data-tz'), lat=+el.getAttribute('data-lat'), lon=+el.getAttribute('data-lon');
      el.querySelector('.wc-time').textContent=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:h12}).format(now);
      var st=sunTimes(now,lat,lon);
      var isDay = st ? (now.getTime()>=st.rise && now.getTime()<=st.set) : (function(){ var hr=parseInt(new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',hourCycle:'h23'}).format(now),10); return hr>=6&&hr<19; })();
      el.querySelector('.wc-icon').textContent=isDay?'☀️':'🌙';
      el.classList.toggle('wc-night',!isDay);
      var date=new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short',month:'short',day:'numeric'}).format(now);
      var dl=''; var d=ymd(tz,now); if(d>youDay) dl=' · Tomorrow'; else if(d<youDay) dl=' · Yesterday';
      var off=offMin(tz), tag;
      if(off===youOff){ el.classList.add('wc-you'); tag='Your time'; } else { var diff=(off-youOff)/60; tag=(diff>0?'+':'')+(Math.round(diff*10)/10)+'h'; }
      el.querySelector('.wc-meta').textContent=date+dl+' · '+offLabel(tz)+' · '+tag;
      el.querySelector('.wc-sun').innerHTML= st ? ('<span class="wc-sun-i">☼↑</span> '+hm(st.rise,tz)+'   <span class="wc-sun-i">☼↓</span> '+hm(st.set,tz)) : (isDay?'Midnight sun':'Polar night');
    });
  }
  /* ---- search: find the time in any city we have a page for -------------
   * This replaced an "add a city" box that pinned a card to the grid and kept
   * it in localStorage. That box answered "what time is it there" with a card
   * that only existed on this device and had no URL; the same question now
   * lands on a real page — one that also has the zone, the offset, the DST
   * state and the sun and moon for that city, and that can be linked or shared.
   * The index is baked below: every city with a /world-clock/ page, and only
   * those, so a result never leads anywhere that doesn't exist. */
  var IDX=${SEARCH_INDEX};
  var q=document.getElementById('wc-q'), res=document.getElementById('wc-res'), go=document.getElementById('wc-go'), active=-1;
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function closeRes(){ if(res){ res.hidden=true; res.innerHTML=''; } active=-1; }
  function render(){
    if(!q||!res) return;
    var v=q.value.trim().toLowerCase();
    if(!v){ closeRes(); return; }
    var out=[],i;
    /* name-start first, then anywhere in "city, area" — so typing "san" leads
       with San Francisco/San Diego rather than a mid-word match elsewhere */
    for(i=0;i<IDX.length&&out.length<8;i++) if(IDX[i][0].toLowerCase().indexOf(v)===0) out.push(IDX[i]);
    for(i=0;i<IDX.length&&out.length<8;i++){ var hay=(IDX[i][0]+', '+IDX[i][1]).toLowerCase();
      if(hay.indexOf(v)>-1&&out.indexOf(IDX[i])<0) out.push(IDX[i]); }
    res.innerHTML=''; active=-1;
    if(!out.length){
      var li=document.createElement('li'); li.className='wc-res-empty';
      li.textContent='No city page for that yet — the grid above covers every major UTC offset.';
      res.appendChild(li); res.hidden=false; return;
    }
    out.forEach(function(c){
      var li=document.createElement('li'), a=document.createElement('a');
      a.href='/world-clock/'+c[2]+'/'; a.innerHTML=esc(c[0])+' <span class="wc-res-area">'+esc(c[1])+'</span>';
      li.appendChild(a); res.appendChild(li);
    });
    res.hidden=false;
  }
  function move(d){ var links=res?res.querySelectorAll('a'):[]; if(!links.length) return;
    active=(active+d+links.length)%links.length;
    [].forEach.call(links,function(a,i){ a.classList.toggle('active',i===active); }); }
  function jump(){ var links=res?res.querySelectorAll('a'):[]; var t=active>-1?links[active]:links[0];
    if(t) window.location.href=t.href; }
  if(q){
    q.addEventListener('input',render);
    q.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'){ e.preventDefault(); move(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); move(-1); }
      else if(e.key==='Enter'){ e.preventDefault(); jump(); }
      else if(e.key==='Escape'){ closeRes(); }
    });
  }
  if(go) go.addEventListener('click',function(){ if(!q.value.trim()){ q.focus(); return; } render(); jump(); });
  document.addEventListener('click',function(e){ if(!e.target.closest('.wc-search')) closeRes(); });

  /* Once a minute, aligned to the next minute boundary (not a flat 60s
   * interval from load, which would drift the on-screen update away from the
   * actual minute tick). Paused entirely while the tab is hidden — a
   * background tab has no need to keep ticking — and caught up immediately
   * on return so the display is never stale for up to a minute after the
   * visitor comes back. */
  var wcTimer=null;
  function scheduleTick(){
    if(wcTimer){ clearTimeout(wcTimer); wcTimer=null; }
    if(document.hidden) return;
    var now=new Date(), delay=60000-(now.getSeconds()*1000+now.getMilliseconds());
    wcTimer=setTimeout(function(){ tick(); scheduleTick(); },delay);
  }
  tick(); scheduleTick();
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){ if(wcTimer){ clearTimeout(wcTimer); wcTimer=null; } }
    else { tick(); scheduleTick(); }
  });

  var fb=document.getElementById('wc-fmt');
  if(fb) fb.addEventListener('click',function(){ h12=!h12; fb.textContent=h12?'24-hour':'12-hour'; tick(); });
})();`;

/* alphabetical, so a reader scans for a name rather than guessing our ordering */
const MORE_CITIES = CITIES.filter((c) => c.tier === 2)
  .slice().sort((a, b) => a.city.localeCompare(b.city))
  .map((c) => `<a class="chip" href="/world-clock/${citySlug(c.city)}/">${esc(c.city)}</a>`).join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>World Clock — Current Time in Cities Worldwide</title>
<meta name="description" content="Compare live local times, dates, UTC offsets, time differences, and today's sunrise and sunset across cities and time zones worldwide.">
<link rel="canonical" href="${SITE}/world-clock/">
<meta property="og:title" content="World Clock">
<meta property="og:description" content="Live world times with sunrise and sunset for each city.">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "World Clock", url: "/world-clock/" }])}</script>
${appLd({ name: "World Clock", url: `${SITE}/world-clock/`, description: "Live current times around the world with sunrise and sunset for each city." })}
${faqLd([
  ["Is the world clock free?", "Yes — free, with no sign-up. It shows live times worldwide right in your browser."],
  ["Does it show my time zone?", "Yes. The list starts just west of your own zone and wraps around the globe, with your zone highlighted."],
  ["Can I switch between 12- and 24-hour time?", "Yes — tap the 24-hour / 12-hour button to switch the whole list."],
])}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "world-clock", url: "/world-clock/" } })}
  <h1>World Clock</h1>
  <p class="sub">Live times around the world, with sunrise &amp; sunset for each city. The list starts just west of your own zone and wraps around the globe — your zone is highlighted. To see the same thing as a picture, open the <a href="/day-night-map/">day/night map</a>: which half of the planet is in sunlight, right now.</p>
  <div class="wc-search">
    <label class="wc-search-lab" for="wc-q">Find the time in any city</label>
    <div class="wc-search-row">
      <input type="search" id="wc-q" autocomplete="off" placeholder="Try &quot;Tokyo&quot;, &quot;Berlin&quot; or &quot;Denver&quot;…">
      <button type="button" class="btn" id="wc-go">Search</button>
    </div>
    <ul class="wc-results" id="wc-res" hidden></ul>
  </div>
  <div class="wc-toolbar">
    <button type="button" class="btn small secondary" id="wc-fmt">24-hour</button>
  </div>
  <div class="wc-grid" id="wc-grid">
${cards}
  </div>
  <div class="card">
    <h2>Current time in other cities</h2>
    <p class="hint" style="margin:0 0 8px">The grid above shows one city per UTC offset. These share those offsets, and each has its own page with the local time, time zone, daylight-saving state and sunrise and sunset:</p>
    <div class="timer-presets">${MORE_CITIES}</div>
  </div>
  <div class="card tool-about">
    <h2>About this clock</h2>
    <p>Each card shows the live local time, the day, the UTC offset, how far it is from <strong>your</strong> time, and today's <strong>sunrise ↑ and sunset ↓</strong>. A ☀️ or 🌙 shows whether the sun is up there right now. Everything updates once a minute and follows each region's daylight-saving rules automatically.</p>
    <p>Counting down to a moment across zones? Make a <a href="/countdown/">countdown</a> — it ends at the same instant for everyone. Or set a quick <a href="/timer/">timer</a>. Need the gap between two clock times instead — "how many hours between 9 AM and 5:30 PM"? Try the <a href="/time-difference-calculator/">time difference calculator</a>. Reading a timetable or a boarding pass that says 18:40? The <a href="/24-hour-clock-converter/">12/24-hour clock converter</a> turns it into AM/PM and back.</p>
    <p>This site never stores a fixed time difference for any city. Each zone is worked out by your own device, from the standard world time-zone database it keeps up to date — so when a country changes its clock rules, this page follows automatically. <a href="/methodology/time-zones/">How time zones and daylight saving are handled</a>.</p>
  </div>

  <div class="card tool-about">
    <h2>World clock FAQ</h2>
    <p><strong>Is the world clock free?</strong> Yes — free, with no sign-up. It shows live times worldwide right in your browser.</p>
    <p><strong>Does it show my time zone?</strong> Yes — the list starts just west of your own zone and wraps around the globe, with your zone highlighted.</p>
    <p><strong>Can I switch between 12- and 24-hour time?</strong> Yes — tap the 24-hour / 12-hour button to switch the whole list.</p>
  </div>
${hubQuestionsCard("/world-clock/")}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>${JS}</script>
</body>
</html>
`;

/* IMPORTING THIS FILE MUST NOT WRITE PAGES. build-sitemap and build-inline both
 * import it for WC_CITIES, so without this guard every build wrote these ~110
 * pages three times — and, worse, running build-sitemap on its own silently
 * rewrote them WITHOUT the inline pass, leaving render-blocking stylesheet
 * links on disk ready to be committed. Same guard build-sun and build-moon have. */
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  mkdirSync(join(root, "world-clock"), { recursive: true });
  writeFileSync(join(root, "world-clock/index.html"), html);
  console.log(`Generated /world-clock/ (${CITIES.filter((c) => c.tier !== 2).length} zones in the grid, ${CITIES.filter((c) => c.tier === 2).length} more cities linked).`);
}

/* ---- per-city pages: /world-clock/<slug>/ -------------------------------
 * One page per hub city. Everything here is computed at build time from the
 * same helpers the hub uses (offLabelBuild / offMinBuild / sunTimesBuild), so
 * a card and its page can never disagree. */

/* Zones that shift during the year have more than one offset across it;
 * daylight saving is, by definition, the larger of them. Comparing today
 * against the whole set tells us whether it is in effect right now — without a
 * table of per-country rules, and correct for the southern hemisphere too.
 *
 * SAMPLE ALL TWELVE MONTHS, not just January and July. Africa/Casablanca is
 * +1 on both of those dates and drops to +0 for about five weeks around
 * Ramadan every year, so a two-sample test declared its offset "holds all year"
 * in the facts table, the About copy and the FAQ JSON-LD — factually wrong for
 * several weeks annually, and wrong on a page whose entire job is that number.
 * Twelve samples still miss a shift shorter than a month, which is why the
 * copy says what the offsets ARE rather than promising when they change. */
function dstState(tz, now) {
  const y = now.getUTCFullYear();
  const offs = [];
  for (let m = 0; m < 12; m++) offs.push(offMinBuild(tz, new Date(Date.UTC(y, m, 15))));
  const uniq = [...new Set(offs)];
  if (uniq.length === 1) return { observes: false, active: false, offsets: uniq };
  return { observes: true, active: offMinBuild(tz, now) === Math.max(...uniq), offsets: uniq.sort((a, b) => a - b) };
}
/* "UTC−4", "UTC+5:30" — a real minus sign, since this is prose, and no
 * "+0" oddity at Greenwich. */
function utcOffsetLabel(tz, now) {
  const m = offMinBuild(tz, now);
  if (m === 0) return "UTC";
  const sign = m < 0 ? "−" : "+", abs = Math.abs(m);
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, "0")}` : ""}`;
}

export const WC_CITIES = CITIES.map((c) => ({ ...c, slug: citySlug(c.city) }));
{
  const dupes = WC_CITIES.map((c) => c.slug).filter((s, i, a) => a.indexOf(s) !== i);
  if (dupes.length) throw new Error(`world-clock city slugs collide: ${dupes.join(", ")}`);
}

/* The comparison table's reference cities: six widely-known clocks spread right
 * around the globe, so any visitor finds one they think in. A city never
 * compares against itself — it takes the next one down the list instead. */
const REF_ORDER = ["Los Angeles", "New York", "London", "Dubai", "Shanghai", "Tokyo", "Sydney", "Chicago"];
const refsFor = (c) => REF_ORDER.filter((n) => n !== c.city).slice(0, 6)
  .map((n) => WC_CITIES.find((x) => x.city === n)).filter(Boolean);

/* The hub's locLabel ("New York, NY - USA") is a card label, tuned to fit one
 * line next to a clock. In a heading or a sentence it reads like a database
 * row, so the pages use the way people actually name the place: state for US
 * cities (New York, NY), country everywhere else (London, UK). */
const placeLabel = (c) => (c.area === "USA" && c.region ? `${c.city}, ${c.region}` : `${c.city}, ${c.area}`);
const cityDate = (tz, now) => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now);
const cityTime = (tz, now) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(now);
/* whole-hour differences read better as "3 hours ahead"; the half-hour zones
 * (Kolkata, Kathmandu, Adelaide) keep their fraction */
function diffWords(fromMin, toMin) {
  const d = (toMin - fromMin) / 60;
  if (d === 0) return "same time";
  const n = Math.abs(d) % 1 === 0 ? String(Math.abs(d)) : String(Math.round(Math.abs(d) * 100) / 100);
  return `${n} hour${Math.abs(d) === 1 ? "" : "s"} ${d > 0 ? "ahead" : "behind"}`;
}

const CITY_JS = `
(function(){
  var el=document.getElementById('wcp'); if(!el) return;
  var TZ=el.getAttribute('data-tz'), h12=true;
  function fmt(tz,o){ try{ return new Intl.DateTimeFormat('en-US',Object.assign({timeZone:tz},o)).format(new Date()); }catch(e){ return ''; } }
  function offMin(tz){ try{ var p=new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'shortOffset'}).formatToParts(new Date());
    for(var i=0;i<p.length;i++){ if(p[i].type==='timeZoneName'){ var m=p[i].value.match(/GMT([+-])(\\d{1,2})(?::(\\d{2}))?/); return m?((m[1]==='-'?-1:1)*((+m[2])*60+(+(m[3]||0)))):0; } } }catch(e){} return 0; }
  function put(id,txt){ var n=document.getElementById(id); if(n) n.textContent=txt; }
  function words(d){ if(d===0) return 'the same time as you'; var a=Math.abs(d)/60, n=(a%1===0)?a:Math.round(a*100)/100;
    return n+' hour'+(a===1?'':'s')+' '+(d>0?'ahead of':'behind')+' you'; }
  function tick(){
    var o={hour:h12?'numeric':'2-digit',minute:'2-digit',hour12:h12};
    put('wc-big',fmt(TZ,o));
    put('wc-bigdate',fmt(TZ,{weekday:'long',month:'long',day:'numeric',year:'numeric'}));
    [].slice.call(document.querySelectorAll('.wc-ptime[data-tz]')).forEach(function(n){ n.textContent=fmt(n.getAttribute('data-tz'),o); });
    /* the difference column moves with either city's clocks, so recompute it
       here rather than trusting the value baked at build time */
    var mine=offMin(TZ);
    [].slice.call(document.querySelectorAll('.wc-pdiff[data-tz]')).forEach(function(n){
      var d=(offMin(n.getAttribute('data-tz'))-mine)/60;
      if(d===0){ n.textContent='Same time'; return; }
      var a=Math.abs(d), num=(a%1===0)?a:Math.round(a*100)/100;
      n.textContent=num+' hour'+(a===1?'':'s')+' '+(d>0?'ahead':'behind');
    });
    var you='UTC'; try{ you=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'; }catch(e){}
    var d=offMin(TZ)-offMin(you);
    var dEl=document.getElementById('wc-diff');
    if(dEl) dEl.textContent=(you===TZ)?'This is your own time zone.':(el.getAttribute('data-city')+' is '+words(d)+' — your local time is '+fmt(you,o)+'.');
  }
  /* aligned to the minute boundary, paused while the tab is hidden — same
     rule as the hub, so the two pages tick together */
  var t=null;
  function schedule(){ if(t){clearTimeout(t);t=null;} if(document.hidden) return;
    var n=new Date(); t=setTimeout(function(){ tick(); schedule(); },60000-(n.getSeconds()*1000+n.getMilliseconds())); }
  tick(); schedule();
  document.addEventListener('visibilitychange',function(){ if(document.hidden){ if(t){clearTimeout(t);t=null;} } else { tick(); schedule(); } });
  var fb=document.getElementById('wc-fmt');
  if(fb) fb.addEventListener('click',function(){ h12=!h12; fb.textContent=h12?'24-hour':'12-hour'; tick(); });
})();`;

if (isMain) for (const c of WC_CITIES) {
  const label = placeLabel(c);
  const zone = tzName(c.tz);
  const off = utcOffsetLabel(c.tz, buildNow);
  const dst = dstState(c.tz, buildNow);
  const st = sunTimesBuild(buildNow, c.lat, c.lon);
  const path = `/world-clock/${c.slug}/`;
  const myOff = offMinBuild(c.tz, buildNow);
  /* Worded from the offsets the zone ACTUALLY takes during the year rather than
     from a "does it do DST" boolean. Casablanca's shift is a Ramadan pause, not
     daylight saving, and calling it "standard time ... the clocks move for
     daylight saving later in the year" would be wrong about both. */
  const offWord = (min) => { if (min === 0) return "UTC"; const sg = min < 0 ? "−" : "+", a = Math.abs(min); return `UTC${sg}${Math.floor(a / 60)}${a % 60 ? ":" + String(a % 60).padStart(2, "0") : ""}`; };
  const dstLine = !dst.observes
    ? `${c.city} keeps the same offset all year — the clocks there do not change.`
    : `${c.city}'s clocks shift during the year, between ${dst.offsets.map(offWord).join(" and ")}. Right now it is on ${offWord(myOff)}${dst.active ? ", the later of the two" : ""}.`;
  /* The SAME sentence used to appear in the intro, the About paragraph and two
     FAQ answers — four times on one screen, five counting the facts table.
     The intro keeps the full version (it is the answer people came for); the
     others get a short variant that says the same thing in passing. */
  const dstShort = !dst.observes
    ? `The clocks there do not change during the year.`
    : dst.active
      ? `Clocks there are currently on the later of its two seasonal offsets.`
      : `Clocks there are currently on the earlier of its two seasonal offsets.`;
  const sunLine = st
    ? `The sun rises there at ${esc(cityTime(c.tz, st.rise))} and sets at ${esc(cityTime(c.tz, st.set))} today.`
    : `The sun neither rises nor sets there today — at this latitude it is midnight sun or polar night.`;

  const rows = [
    ["Time zone", zone || "—"],
    ["Time zone ID", c.tz],
    ["UTC offset", off],
    ["Clock changes", !dst.observes ? "None — same offset all year" : dst.active ? "On the later offset now" : "On the earlier offset now"],
    ...(st ? [["Sunrise today", cityTime(c.tz, st.rise)], ["Sunset today", cityTime(c.tz, st.set)]] : []),
  ];

  const refs = refsFor(c);
  const refRows = refs.map((r) => {
    const ro = offMinBuild(r.tz, buildNow);
    return `<tr><td><a href="/world-clock/${r.slug}/">${esc(placeLabel(r))}</a></td>` +
      `<td class="wc-ptime" data-tz="${esc(r.tz)}">${esc(cityTime(r.tz, buildNow))}</td>` +
      /* data-tz on the difference cell too: the hint says these follow each
         region's daylight-saving rules, but the client only ever refreshed the
         TIME column, so between a clock change and the next rebuild the table
         showed live times beside a stale difference. */
      `<td class="wc-pdiff" data-tz="${esc(r.tz)}">${esc(diffWords(myOff, ro))}</td></tr>`;
  }).join("");

  /* The full "related astronomical information" strip — the SAME component the
     sun, moon and tide pages carry (crosslinks.mjs), so a reader crossing from
     a clock page into that family meets the wording and the framing they
     already know, and the tide tile appears only for a genuinely coastal city.
     Only for cities that have those pages; the rest keep a clock-only page
     rather than a strip full of dead links. */
  const astroCard = familyLinks(c.slug)
    ? astroStrip({ from: "clock", slug: c.slug, city: c.city, lat: c.lat, lon: c.lon, tz: c.tz, now: buildNow })
    : "";

  const faq = [
    [`What time is it in ${label} right now?`,
      `The clock at the top of this page shows ${c.city}'s current local time and updates every minute. ${c.city} is on ${zone || c.tz} (${off.replace("−", "-")}). ${dstShort}`],
    [`What time zone is ${c.city} in?`,
      `${c.city} uses the ${c.tz} time zone${zone ? `, known as ${zone}` : ""}, currently ${off.replace("−", "-")}. ${dstShort}`],
    [`How far ahead or behind is ${c.city}?`,
      `The table on this page compares ${c.city} with six major cities, and the line under the clock works out the difference from your own time zone as soon as the page loads.`],
  ];

  const cityHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Current Time in ${esc(c.city)} — Time Zone &amp; UTC Offset</title>
<meta name="description" content="The current local time in ${esc(label)}, with the date, time zone${zone ? ` (${esc(zone)})` : ""}, ${esc(off.replace("−", "-"))} offset, daylight saving status, sunrise and sunset, and the difference from other cities.">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="Current Time in ${esc(c.city)}">
<meta property="og:description" content="Live local time in ${esc(label)}, with its time zone, UTC offset, daylight saving status and sunrise and sunset.">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "World Clock", url: "/world-clock/" }, { name: c.city, url: path }])}</script>
${placeLd({ ...resolvePlace(c), elevKey: c.slug, url: `${SITE}${path}` })}
${faqLd(faq)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "world-clock", url: "/world-clock/" }, page: { label: c.city, url: path } })}
  <h1>Current Time in ${esc(label)}</h1>
  <p class="sub">${esc(c.city)} is on ${esc(zone || c.tz)}, ${esc(off)}. ${esc(dstLine)} ${sunLine}</p>
  <div class="card wc-nowcard" id="wcp" data-tz="${esc(c.tz)}" data-city="${esc(c.city)}">
    <div class="wc-bigtime" id="wc-big">${esc(cityTime(c.tz, buildNow))}</div>
    <div class="wc-bigdate" id="wc-bigdate">${esc(cityDate(c.tz, buildNow))}</div>
    <p class="wc-diff" id="wc-diff">The difference from your own time zone appears here when the page loads.</p>
    <button type="button" class="btn small secondary" id="wc-fmt">24-hour</button>
  </div>
  <div class="card">
    <h2>${esc(c.city)} time zone</h2>
    <div class="wc-facts">${rows.map(([k, v]) => `<div class="wc-frow"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>
    <p class="hint">Sunrise and sunset are calculated for ${esc(c.city)}'s coordinates and refresh on each rebuild; the clock above is live.</p>
  </div>
  <div class="card">
    <h2>${esc(c.city)} time compared with other cities</h2>
    <div class="td-tablewrap"><table class="wc-ptable"><thead><tr><th>City</th><th>Local time</th><th>Difference from ${esc(c.city)}</th></tr></thead><tbody>${refRows}</tbody></table></div>
    <p class="hint">Differences follow each region's daylight-saving rules, so they change when either city's clocks move.</p>
  </div>
${astroCard}  <div class="card tool-about">
    <h2>About ${esc(c.city)} time</h2>
    <p>This page shows the local time in ${esc(label)} — the same clock people there are reading. ${esc(dstShort)}</p>
    <p>Comparing several places at once? The <a href="/world-clock/">world clock</a> lists every major UTC offset side by side and marks your own. Waiting for a moment that lands at the same instant everywhere, whatever the zone? Follow a <a href="/countdown/">countdown</a>, or set a <a href="/timer/">timer</a> or an <a href="/alarm-clock/">alarm</a>. <a href="/methodology/time-zones/">How this page knows the offset and the daylight-saving state</a>.</p>
  </div>
  <div class="card tool-about">
    <h2>${esc(c.city)} time FAQ</h2>
    ${faq.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>${CITY_JS}</script>
</body>
</html>
`;
  mkdirSync(join(root, "world-clock", c.slug), { recursive: true });
  writeFileSync(join(root, "world-clock", c.slug, "index.html"), cityHtml);
}
if (isMain) console.log(`Generated ${WC_CITIES.length} world-clock city pages.`);
