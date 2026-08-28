/**
 * Shared concept helpers. Side-effect free so sitemap / inline / hub builders
 * can import the slug list without writing pages.
 *
 * Graphics reuse the live drawing modules (daynight, orrery, globe,
 * system-orbit). Do not invent a second illustration language.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc } from "./lib.mjs";
import {
  DN_W, DN_VIEW_Y, DN_VIEW_H, DN_VIEWBOX, DN_TOP, DN_BOT,
  dnX, dnY, dnF, subsolar, nightPath, twilightPath, landPath, seasonPoints,
  sideView,
} from "./daynight.mjs";
import { orrerySvg } from "./orrery.mjs";
import { globeSvg, globeRadius } from "./globe.mjs";
import { sysOrbitWidget } from "./system-orbit.mjs";
import { hourChart } from "./clock-convert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

let cached = null;
export function loadConcepts() {
  if (cached) return cached;
  cached = JSON.parse(readFileSync(join(root, "seo/_data/concepts.json"), "utf8"));
  const bySlug = new Map(cached.map((c) => [c.slug, c]));
  for (const c of cached) {
    for (const rel of c.relatedSlugs) {
      if (!bySlug.has(rel)) throw new Error(`${c.slug} related missing: ${rel}`);
    }
  }
  return cached;
}

export function conceptBySlug() {
  return new Map(loadConcepts().map((c) => [c.slug, c]));
}

/** Dates and the tilt, solved from the same solar series the map uses, so a
 *  concept page cannot type "June 21" on a year it falls on the 20th. */
export function conceptTokens() {
  const Y = seasonPoints(Date.now());
  const day = (ms) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(ms));
  return {
    tilt: Y.tilt.toFixed(1),
    juneSolstice: day(Y.maxMs),
    decSolstice: day(Y.minMs),
    marEquinox: day(Y.up),      /* declination crossing zero on the way up */
    sepEquinox: day(Y.down),    /* and on the way down */
  };
}

export function fillConcept(text) {
  if (!text) return text;
  const t = conceptTokens();
  return text
    .replace(/\{tilt\}/g, t.tilt)
    .replace(/\{juneSolstice\}/g, t.juneSolstice)
    .replace(/\{decSolstice\}/g, t.decSolstice)
    .replace(/\{marEquinox\}/g, t.marEquinox)
    .replace(/\{sepEquinox\}/g, t.sepEquinox);
}

/** Editorial HTML from concepts.json (ledeHtml, or a body sentence with an
 *  <a href>). Plain strings still go through esc(). */
export function conceptHtml(text) {
  const t = fillConcept(text);
  if (!t) return "";
  return /<a\s/i.test(t) ? t : esc(t);
}

export const CONCEPT_SLUGS = () => loadConcepts().map((c) => c.slug);

export function relatedPartial(slugs, bySlug = conceptBySlug()) {
  return slugs
    .map((slug) => {
      const c = bySlug.get(slug);
      if (!c) throw new Error(`related slug missing: ${slug}`);
      return `<p><a href="/concepts/${esc(c.slug)}/">${esc(c.question)}</a> ${esc(fillConcept(c.shortAnswer))}</p>`;
    })
    .join("\n");
}

/** Concepts whose hubUrls point at this hub path (hash ignored). */
export function conceptsForHub(hubPath) {
  const want = hubPath.endsWith("/") ? hubPath : hubPath + "/";
  return loadConcepts().filter((c) =>
    c.hubUrls.some((h) => {
      const path = h.href.split("#")[0];
      const norm = path.endsWith("/") ? path : path + "/";
      return norm === want;
    }),
  );
}

function teaserAnchor(c, hubPath) {
  const h = c.hubUrls.find((x) => x.href.split("#")[0].replace(/\/?$/, "/") === hubPath.replace(/\/?$/, "/"));
  if (h && h.href.includes("#")) return h.href.split("#")[1];
  return c.slug;
}

/**
 * Hub teaser stack: the question is the link, one sentence after.
 * Hash ids from hubUrls stay so old inbound links still land.
 */
export function hubQuestionsCard(hubPath, heading = "Questions this page answers", { id } = {}) {
  const rows = conceptsForHub(hubPath);
  if (!rows.length) return "";
  const used = new Set();
  const items = rows.map((c) => teaserLi(c, hubPath, used)).join("\n    ");
  const idAttr = id ? ` id="${esc(id)}"` : "";
  return `  <div class="card hub-teasers"${idAttr}>
    <h2>${esc(heading)}</h2>
    <p class="sub">The question is the link. A short answer sits here; tap through for the drawing and the deeper pass.</p>
    <ul class="hub-qs">
    ${items}
    </ul>
  </div>
`;
}

/** Compact list with no card chrome — sits under a picture, as on the home page.
 *  hubPath ("/", "/earth/", …) picks a one-line framing so the same question
 *  does not repeat its paragraph on every hub. */
export function hubQs(slugs, hubPath = "") {
  const by = conceptBySlug();
  const used = new Set();
  const items = slugs.map((slug) => {
    const c = by.get(slug);
    if (!c) throw new Error(`hubQs missing: ${slug}`);
    return teaserLi(c, hubPath || c.hubUrls[0]?.href?.split("#")[0] || "", used);
  }).join("\n");
  return `<ul class="hub-qs">\n${items}\n</ul>`;
}

/**
 * A compact question card for the PER-PLACE pages (sun, moon, tide, clock
 * cities). The hubs carry the full teaser stack; a city page gets the two or
 * three questions its numbers keep raising, so ~2,600 pages that used to
 * dead-end now route into the concept pages — the URLs this site wants to
 * rank. Slugs are named by the caller: the mapping is editorial, not derived,
 * because "which question does a sunrise table raise" is a judgement. */
export function placeQuestionsCard(slugs, hubPath) {
  return `  <div class="card hub-teasers">
    <h2>Questions this page answers</h2>
    ${hubQs(slugs, hubPath)}
  </div>
`;
}

export function firstSentence(s) {
  const m = String(s).match(/^.+?[.](?=\s|$)/);
  return m ? m[0] : s;
}

function teaserFor(c, hubPath) {
  const norm = hubPath ? (hubPath.endsWith("/") ? hubPath : hubPath + "/") : "";
  const map = c.teasers || {};
  if (norm && map[norm]) return fillConcept(map[norm]);
  if (c.teaser) return fillConcept(c.teaser);
  const full = fillConcept(c.shortAnswer) || "";
  const first = firstSentence(full);
  return first.length >= 24 ? first : full;
}

function teaserLi(c, hubPath, used) {
  let hid = teaserAnchor(c, hubPath);
  if (used.has(hid)) hid = c.slug;
  used.add(hid);
  return `<li id="${esc(hid)}"><p><a href="/concepts/${esc(c.slug)}/">${esc(c.question)}</a> ${esc(teaserFor(c, hubPath))}</p></li>`;
}

/* ---- graphics: the live-site drawings, baked at the current instant ------ */
function miniMap() {
  const NOW = Date.now();
  const YEAR = seasonPoints(NOW);
  const SS = subsolar(NOW);
  const TILT = YEAR.tilt;
  const POLAR = 90 - TILT;
  const LAND = landPath();
  const GRAT = [
    [0, "Equator"], [TILT, "Tropic of Cancer"], [-TILT, "Tropic of Capricorn"],
    [POLAR, "Arctic Circle"],
  ].filter(([lat]) => lat <= DN_TOP - 1 && lat >= DN_BOT + 4).map(([lat, label]) => {
    const y = dnF(dnY(lat));
    return `<line class="dn-par" x1="0" y1="${y}" x2="${DN_W}" y2="${y}"/>`
      + `<text class="dn-parlab" x="6" y="${dnF(y - 4)}">${esc(label)}</text>`;
  }).join("");
  return `<svg class="dn-svg" viewBox="${DN_VIEWBOX}" width="100%" role="img" aria-label="A world map with the night side shaded and the sun's overhead point marked">
    <rect y="${DN_VIEW_Y}" width="${DN_W}" height="${DN_VIEW_H}" fill="#12304f"/>
    <path d="${LAND}" fill="#2f5d3a"/>
    <g class="dn-grat">${GRAT}</g>
    <path d="${twilightPath(SS.dec, SS.lon, 1)}" fill-rule="evenodd" fill="#050a16" fill-opacity=".34"/>
    <path d="${nightPath(SS.dec, SS.lon, -18, 1)}" fill="#050a16" fill-opacity=".52"/>
    <g transform="translate(${dnF(dnX(SS.lon))} ${dnF(dnY(SS.dec))})">
      <circle r="13" fill="#fde68a" fill-opacity=".25"/>
      <circle r="6.5" fill="#fde68a" stroke="#b45309" stroke-width="1.5"/>
    </g>
  </svg>`;
}

function orbitDiagram() {
  /* Sun at the CENTRE of the path. The old drawing parked the Sun off to the
     left of an ellipse that went around empty space, so the picture taught
     the opposite of the sentence above it. Circle, two arrows, dashed miss. */
  const CX = 350, CY = 168, R = 118, px = CX + R, py = CY;
  return `<svg class="dns-svg" viewBox="0 0 700 336" width="100%" role="img" aria-label="A planet on a circle around the Sun, with a sideways velocity arrow and a gravity arrow pointing at the Sun">
    <defs>
      <marker id="ol-st-v" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="#4ade80"/></marker>
      <marker id="ol-st-g" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="#fbbf24"/></marker>
    </defs>
    <circle class="dns-glow" cx="${CX}" cy="${CY}" r="40"/>
    <circle class="dns-sun" cx="${CX}" cy="${CY}" r="22"/>
    <ellipse cx="${CX}" cy="${CY}" rx="${R}" ry="${R}" fill="none" stroke="rgba(125,211,252,.7)" stroke-width="2"/>
    <line x1="${px}" y1="${py}" x2="${px}" y2="${py - 108}" stroke="rgba(248,250,252,.35)" stroke-width="1.4" stroke-dasharray="6 5"/>
    <line x1="${px}" y1="${py}" x2="${px}" y2="${py - 56}" stroke="#4ade80" stroke-width="3" marker-end="url(#ol-st-v)"/>
    <line x1="${px}" y1="${py}" x2="${px - 52}" y2="${py}" stroke="#fbbf24" stroke-width="3" marker-end="url(#ol-st-g)"/>
    <circle cx="${px}" cy="${py}" r="9" fill="#60a5fa" stroke="#dbeafe" stroke-width="1.6"/>
    <text class="dns-lab" x="${CX}" y="${CY + 40}" text-anchor="middle">Sun</text>
    <text class="dns-lab" x="${px + 10}" y="${py - 62}" fill="#4ade80">velocity</text>
    <text class="dns-lab" x="${px - 58}" y="${py - 10}" text-anchor="end" fill="#fbbf24">gravity</text>
    <text class="dns-lab" x="${px + 8}" y="${py - 100}">no gravity — a straight line</text>
    <text class="dns-lab" x="${px + 12}" y="${py + 4}">planet</text>
  </svg>`;
}

/* One ES5 source, two runtimes. Node bakes the opening frame so a no-JS
 * reader still sees a Sun-centred orbit; the browser runs the identical
 * functions to move the planet.
 *
 * Vis-viva is the same pair of lines the home "slow it down" card and
 * /orbital-velocity-simulator/ use: a = r/(2-k^2), e = |k^2-1|, with
 * k = v / v_circular. Scale is FIXED, like the home card: the Sun stays
 * put, the right-hand point stays put, the OTHER side of the path is
 * what moves. Auto-zoom was hiding that, which made Slow down look like
 * nothing happened.
 *
 * Velocity is screen-counterclockwise (up at the right-hand point), the
 * same way the planet actually travels. An earlier draft pointed the
 * green arrow the opposite way of the dashed "no gravity" line. */
const OL_CORE = `
var OL_W=700, OL_H=420, OL_CX=350, OL_CY=210, OL_R=128, OL_SUN=20;
function olGeom(k){
  var kk=k*k;
  if(kk>=1.98) return {escape:true, k:k};
  var a=OL_R/(2-kk), e=Math.abs(kk-1);
  var q=a*(1-e), Q=a*(1+e);
  return {escape:false, k:k, a:a, e:e, q:q, Q:Q, hits:q<=OL_SUN+2};
}
function olR(g,th){
  if(g.escape) return OL_R;
  var sign=g.k<1?-1:1;
  return g.a*(1-g.e*g.e)/(1+sign*g.e*Math.cos(th));
}
function olPos(g,th){
  if(g.escape) return { x:OL_CX+OL_R, y:OL_CY-OL_R*th*1.7, r:OL_R };
  var r=olR(g,th);
  return { x:OL_CX+r*Math.cos(th), y:OL_CY-r*Math.sin(th), r:r };
}
function olPath(g){
  var i, th, p, d='';
  if(g.escape){
    return 'M'+(OL_CX+OL_R)+' '+OL_CY+' L'+(OL_CX+OL_R)+' 8';
  }
  for(i=0;i<=180;i++){
    th=i/180*Math.PI*2;
    p=olPos(g,th);
    d+=(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1);
  }
  return d+'Z';
}
function olClamp(n,a,b){ return n<a?a:n>b?b:n; }
function olScene(k,th){
  var g=olGeom(k), p=olPos(g,th), s='', sx=p.x, sy=p.y;
  var col=g.escape||g.hits?'#f87171':'#7dd3fc';
  s+='<rect width="'+OL_W+'" height="'+OL_H+'" rx="16" fill="#080d1a"/>';
  if(!g.escape && Math.abs(k-1)>0.02){
    s+='<circle cx="'+OL_CX+'" cy="'+OL_CY+'" r="'+OL_R+'" fill="none" stroke="rgba(125,211,252,.28)" stroke-width="1.4" stroke-dasharray="5 6"/>';
  }
  s+='<path d="'+olPath(g)+'" fill="none" stroke="'+col+'" stroke-opacity=".9" stroke-width="2.2"'+(g.escape?' stroke-dasharray="7 6"':'')+'/>';
  s+='<circle cx="'+OL_CX+'" cy="'+OL_CY+'" r="34" fill="#fcd34d" fill-opacity=".16"/>';
  s+='<circle cx="'+OL_CX+'" cy="'+OL_CY+'" r="'+OL_SUN+'" fill="#fcd34d"/>';
  s+='<text x="'+OL_CX+'" y="'+(OL_CY+OL_SUN+18)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#fcd34d">Sun</text>';
  if(!g.escape && g.e>0.05){
    var far=olPos(g, Math.PI);
    if(far.x>28 && far.x<OL_W-28 && far.y>22 && far.y<OL_H-18){
      s+='<text x="'+far.x.toFixed(1)+'" y="'+(far.y+(g.k<1?18:-14)).toFixed(1)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#94a3b8">'+(g.k<1?'closer':'farther')+'</text>';
    }
  }
  var rx=sx-OL_CX, ry=sy-OL_CY, len=Math.sqrt(rx*rx+ry*ry)||1;
  var ux=rx/len, uy=ry/len;
  /* screen-CCW tangent: (uy, -ux). At the right-hand point this is UP, which
     is the way the planet travels and the way the dashed miss is drawn. */
  var tx=uy, ty=-ux;
  var vlen=56, glen=Math.max(28, Math.min(72, 38*(OL_R/Math.max(24,p.r))));
  var vx=sx+tx*vlen, vy=sy+ty*vlen;
  var gx=sx-ux*glen, gy=sy-uy*glen;
  var showHint=!g.escape && Math.abs(k-1)<0.02 && (th<0.22 || th>Math.PI*2-0.22);
  if(showHint){
    s+='<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+(sx+tx*118).toFixed(1)+'" y2="'+(sy+ty*118).toFixed(1)+'" stroke="rgba(248,250,252,.35)" stroke-width="1.4" stroke-dasharray="6 5"/>';
    s+='<text x="'+(sx+tx*122+8).toFixed(1)+'" y="'+(sy+ty*122).toFixed(1)+'" font-size="12" fill="#94a3b8">no gravity \\u2014 a straight line</text>';
  }
  s+='<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+vx.toFixed(1)+'" y2="'+vy.toFixed(1)+'" stroke="#4ade80" stroke-width="3" marker-end="url(#ol-av)"/>';
  s+='<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+gx.toFixed(1)+'" y2="'+gy.toFixed(1)+'" stroke="#fbbf24" stroke-width="3" marker-end="url(#ol-ag)"/>';
  s+='<circle cx="'+sx.toFixed(1)+'" cy="'+sy.toFixed(1)+'" r="8" fill="#60a5fa" stroke="#dbeafe" stroke-width="1.6"/>';
  s+='<text x="'+olClamp(vx+tx*10+8,16,684).toFixed(1)+'" y="'+olClamp(vy+ty*10,16,406).toFixed(1)+'" font-size="12" font-weight="700" fill="#4ade80">velocity</text>';
  s+='<text x="'+olClamp(gx-ux*8,16,684).toFixed(1)+'" y="'+olClamp(gy-uy*8-6,16,406).toFixed(1)+'" text-anchor="end" font-size="12" font-weight="700" fill="#fbbf24">gravity</text>';
  return s;
}
`;

const OL = new Function(OL_CORE + "; return { olScene: olScene };")();

export const ORBIT_LESSON_JS = `(function(){
${OL_CORE}
var fig=document.getElementById('ol-scene'); if(!fig) return;
var play=document.getElementById('ol-play');
var st=document.getElementById('ol-status');
var note=document.getElementById('ol-note');
var k=1, th=0, running=false, iv=0;
var VC=29.8;
function say(){
  var g=olGeom(k);
  var v=(k*VC).toFixed(1);
  if(g.escape){
    st.textContent='Escapes the Sun \\u00b7 '+v+' km/s';
    st.className='ol-status is-warn';
    note.textContent='Past escape speed \\u2014 about 1.41 times circular, or 42 km/s at Earth\\u2019s distance. Gravity still pulls, but the path never closes.';
  } else if(g.hits){
    st.textContent='Hits the Sun \\u00b7 '+v+' km/s';
    st.className='ol-status is-bad';
    note.textContent='Almost all of the sideways speed is gone. The near end of this ellipse reaches the Sun. Nature almost never does that to a planet.';
  } else if(Math.abs(k-1)<0.02){
    st.textContent='A circle around the Sun \\u00b7 '+v+' km/s';
    st.className='ol-status is-good';
    note.textContent='Earth\\u2019s distance. Green is the way the planet is already going. Gold is the pull, always straight at the Sun. They stay at right angles, so the pull turns the planet instead of speeding it up. Press Slow down \\u2014 the other side of the path is what moves.';
  } else if(k<1){
    st.textContent='Slower \\u2014 the far side fell in \\u00b7 '+v+' km/s';
    st.className='ol-status is-good';
    note.textContent='You took speed away at the right-hand point, so that point is now the farthest from the Sun. The other side dropped closer. The planet speeds up as it falls in, then comes back through here. It does not spiral.';
  } else {
    var off=g.Q>OL_CX-24;
    st.textContent=(off?'Faster \\u2014 the far side climbed off the page':'Faster \\u2014 the far side climbed out')+' \\u00b7 '+v+' km/s';
    st.className='ol-status is-good';
    note.textContent='You added speed at the right-hand point, so that point is now the closest to the Sun. The other side climbed away'+(off?', off the page':'')+'. The planet slows as it climbs, then comes back through here.';
  }
}
function paint(){ fig.innerHTML=olScene(k,th); say(); }
function step(){
  if(!running) return;
  var g=olGeom(k);
  if(g.escape){ th+=0.012; if(th>1.1) th=1.1; }
  else {
    var r=olR(g,th);
    th+=0.028*Math.pow(OL_R/Math.max(24,r),2);
    if(th>Math.PI*2) th-=Math.PI*2;
  }
  fig.innerHTML=olScene(k,th);
}
function setK(nk){
  k=Math.max(0.42, Math.min(1.45, nk));
  th=0;
  paint();
}
function run(on){
  running=on;
  play.textContent=on?'Pause':'Play';
  play.setAttribute('aria-pressed', on?'true':'false');
  if(iv){ clearInterval(iv); iv=0; }
  if(on) iv=setInterval(step, 40);
}
play.addEventListener('click', function(){ run(!running); });
document.getElementById('ol-circ').addEventListener('click', function(){ setK(1); });
document.getElementById('ol-slow').addEventListener('click', function(){ setK(k-0.12); });
document.getElementById('ol-fast').addEventListener('click', function(){ setK(k+0.12); });
paint();
document.addEventListener('visibilitychange', function(){ if(document.hidden){ if(iv){ clearInterval(iv); iv=0; } } else if(running) run(true); });
})();
`;

function orbitLessonHtml(c) {
  const scene = OL.olScene(1, 0);
  return `<div class="ol-lesson">
    <svg class="ol-fig" viewBox="0 0 700 420" width="100%" role="img" aria-label="${esc(c.graphicAlt)}">
      <defs>
        <marker id="ol-av" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="#4ade80"/></marker>
        <marker id="ol-ag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="#fbbf24"/></marker>
      </defs>
      <g id="ol-scene">${scene}</g>
    </svg>
    <p class="ol-key"><span class="ol-k ol-k-v">Green: the way it is moving</span><span class="ol-k ol-k-g">Gold: the Sun\u2019s pull, always inward</span></p>
    <p class="ol-btns">
      <button type="button" class="chip chip-alt" id="ol-play" aria-pressed="false">Play</button>
      <button type="button" class="chip" id="ol-circ">Circle</button>
      <button type="button" class="chip" id="ol-slow">Slow down</button>
      <button type="button" class="chip" id="ol-fast">Speed up</button>
    </p>
    <p class="ol-status is-good" id="ol-status">A circle around the Sun · 29.8 km/s</p>
    <p class="ol-note" id="ol-note">Earth\u2019s distance. Green is the way the planet is already going. Gold is the pull, always straight at the Sun. They stay at right angles, so the pull turns the planet instead of speeding it up. Press Slow down \u2014 the other side of the path is what moves.</p>
  </div>`;
}

function tidesDiagram() {
  return `<svg class="dns-svg" viewBox="0 0 700 276" width="100%" role="img" aria-label="Earth with two opposite ocean bulges and the Moon to one side">
    <circle cx="300" cy="138" r="78" fill="#2a3d63"/>
    <ellipse cx="300" cy="138" rx="118" ry="70" fill="#3a6a8a" opacity=".85"/>
    <circle cx="300" cy="138" r="70" fill="#2f5d3a"/>
    <circle class="dns-glow" cx="560" cy="138" r="28"/><circle cx="560" cy="138" r="18" fill="#e8e0c8"/>
    <text class="dns-lab" x="270" y="36">two bulges</text>
    <text class="dns-lab" x="540" y="100">Moon</text>
  </svg>`;
}

function olbersDiagram() {
  const shells = [40, 70, 100, 130].map((r, i) => {
    const n = 6 + i * 4;
    let s = `<circle cx="350" cy="138" r="${r}" fill="none" stroke="rgba(248,250,252,.18)"/>`;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + i * 0.2;
      s += `<circle cx="${(350 + r * Math.cos(a)).toFixed(1)}" cy="${(138 + r * Math.sin(a) * 0.55).toFixed(1)}" r="2.2" fill="#fde68a"/>`;
    }
    return s;
  }).join("");
  return `<svg class="dns-svg" viewBox="0 0 700 276" width="100%" role="img" aria-label="Concentric shells of stars around an observer">
    ${shells}
    <circle cx="350" cy="138" r="6" fill="#f8fafc"/>
    <text class="dns-lab" x="362" y="142">you</text>
  </svg>`;
}

export function graphicHtml(c) {
  const NOW = Date.now();
  const YEAR = seasonPoints(NOW);
  const SS = subsolar(NOW);
  let inner = "";
  switch (c.graphicId) {
    case "sun-earth-line": {
      /* Tropic pages must show the solstice they are about — today's
         declination (August ~10° N) leaves the yellow line short of the
         tropic, which is the opposite of the sentence above the picture. */
      let dec = SS.dec;
      if (c.slug === "what-is-the-tropic-of-cancer") dec = YEAR.tilt;
      else if (c.slug === "what-is-the-tropic-of-capricorn") dec = -YEAR.tilt;
      /* the solstice page must show a solstice and the equinox page an
         equinox, for the same reason the tropic pages force theirs: today's
         declination would contradict the sentence above the picture */
      else if (c.slug === "what-is-a-solstice") dec = YEAR.tilt;
      else if (c.slug === "what-is-an-equinox") dec = 0;
      inner = `<div class="dns-wrap">${sideView(dec, YEAR.tilt).replace(/aria-label="[^"]*"/, `aria-label="${esc(c.graphicAlt)}"`)}</div>`;
      break;
    }
    case "day-night-map":
      inner = miniMap();
      break;
    case "orbit":
      inner = orbitDiagram();
      break;
    case "orbit-live":
      inner = orbitLessonHtml(c);
      break;
    case "moon-phase":
      inner = `<div class="orr-fig">${orrerySvg(NOW, 40.7, -74.0, "New York")}</div>`;
      break;
    case "tides":
      inner = tidesDiagram();
      break;
    case "jupiter": {
      const nm = "Jupiter";
      inner = `<svg viewBox="0 0 400 400" width="100%" role="img" aria-label="${esc(c.graphicAlt)}"><rect width="400" height="400" rx="16" fill="#080d1a"/>${globeSvg(nm, NOW, 200, 200, globeRadius(nm, 192), 24, 0.9)}</svg>`;
      break;
    }
    case "globe": {
      const nm = c.graphicPlanet || "Earth";
      inner = `<svg viewBox="0 0 400 400" width="100%" role="img" aria-label="${esc(c.graphicAlt)}"><rect width="400" height="400" rx="16" fill="#080d1a"/>${globeSvg(nm, NOW, 200, 200, globeRadius(nm, 192), 24, 0.9)}</svg>`;
      break;
    }
    case "olbers":
      inner = olbersDiagram();
      break;
    case "system-orbit":
      inner = sysOrbitWidget();
      break;
    case "hour-chart":
      /* the converter's own 24-hour chart (clock-convert.mjs, no side
         effects) — the military-time page's best possible graphic is the
         complete answer table, and importing it means the two can't drift */
      inner = hourChart();
      break;
    case "none":
      return "";
    default:
      inner = `<p>${esc(c.graphicAlt)}</p>`;
  }
  return `<figure class="graphic-block dn">
  ${inner}
  <figcaption>${esc(fillConcept(c.graphicCaption))}</figcaption>
</figure>`;
}
