#!/usr/bin/env node
/* build-orbital.mjs — /orbital-velocity-simulator/ and its explainer child,
 * /orbital-velocity-simulator/why-planets-dont-fall-into-the-sun/.
 *
 * THE QUESTION THIS PAGE EXISTS FOR, in the owner's words: the sun's pull on
 * each kilogram at Mercury is far greater than at Earth or Jupiter — so why is
 * Mercury not dragged in? Answer: it is falling, constantly, and moving sideways
 * fast enough to keep missing. Stronger pull at that distance demands a faster
 * sideways speed, and that is exactly what Mercury has.
 *
 * EVERY NUMBER ON BOTH PAGES IS DERIVED, never typed — the same rule the solar
 * pages follow. Two inputs only: the sun's GM (transfer.mjs, shared with the
 * launch-window solver) and each planet's semi-major axis (planets.mjs, the
 * table check-planets.mjs proves). Speeds come from vis-viva, pulls from
 * GM/r², periods from Kepler's third law. So no figure here can drift from the
 * simulator beside it, and none can drift from the rest of the site.
 *
 * ON THE PUBLISHED "MEAN ORBITAL SPEED" FIGURES: a search for Mercury's speed
 * returns 47.36 km/s, and this page's circular-speed column says 47.87. Both
 * are right and they are different quantities — 47.87 is the speed a CIRCLE at
 * Mercury's semi-major axis needs, 47.36 is the average speed around its real
 * ellipse (e = 0.206, so it runs 58.98 at perihelion and 38.86 at aphelion).
 * The table carries all of them and says which is which, because a page that
 * quietly disagreed with the first search result would read as wrong.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD, appLd, learningLd } from "./lib.mjs";
import { PL_EL, PL_AU, PL_DIA } from "./planets.mjs";
import { TR_GM_SUN } from "./transfer.mjs";
import { ico } from "./icons.mjs";
/* speeds are emitted metric and converted in the browser — see units.mjs */
import { kmPerS } from "./units.mjs";
/* the planet family's URLs, from the registry rather than typed here: these
   links used to point at /solar-system-simulator/mercury/ and /rocket-launches/,
   both of which have been redirects since those pages moved. */
import { PLANETS_PATH, LAUNCH_PATH as ROCKET_PATH, ORBITAL_PATH, planetPath } from "./solar-pages.mjs";
import { hubQuestionsCard } from "./concepts.mjs";
import { CLASSROOM_PAUSED } from "./site-flags.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

export const OV_PATH = ORBITAL_PATH;
export const OV_WHY = `${OV_PATH}why-planets-dont-fall-into-the-sun/`;

const MU = TR_GM_SUN;              /* km^3/s^2 — the sun's GM */
const R_SUN = PL_DIA.Sun / 2;      /* km, from the same diameter table the drawings use */
const G_EARTH_SURF = 9.80665;      /* m/s^2, for the "compared with your own weight" line */

/* ---- the derived per-planet table ---------------------------------------
 * vis-viva at three points of the real ellipse, the pull per kilogram, and
 * the period. `mean` is the average speed round the ellipse — the figure
 * reference books print — via the standard series in the eccentricity. */
const AU_KM = PL_AU;
const vCirc = (rKm) => Math.sqrt(MU / rKm);
const vAt = (rKm, aKm) => Math.sqrt(MU * (2 / rKm - 1 / aKm));
const pull = (rKm) => MU / (rKm * rKm) * 1000;          /* m/s^2 = newtons per kg */
const G_1AU = pull(AU_KM);

const PLANETS = PL_EL.slice(0, 8).map((el) => {
  const name = el[0], a = el[1], e = el[2], aKm = a * AU_KM;
  const q = aKm * (1 - e), Q = aKm * (1 + e);
  return {
    name, a, e,
    vc: vCirc(aKm),                                     /* circular speed at a  */
    vPeri: vAt(q, aKm), vApo: vAt(Q, aKm),
    /* mean speed round the ellipse: v_circ * (1 - e²/4 - 3e⁴/64 - …) */
    vMean: vCirc(aKm) * (1 - e * e / 4 - 3 * Math.pow(e, 4) / 64),
    g: pull(aKm),
    gRel: pull(aKm) / G_1AU,
    years: Math.pow(a, 1.5),
  };
});
const P_OF = (n) => PLANETS.find((p) => p.name === n);
const MERCURY = P_OF("Mercury"), EARTH = P_OF("Earth"), JUPITER = P_OF("Jupiter"), NEPTUNE = P_OF("Neptune");

const n1 = (x) => x.toFixed(1);
const n2 = (x) => x.toFixed(2);
/* how many times weaker/stronger, phrased so the reader never has to invert it */
const times = (x) => (x >= 1 ? `${x < 10 ? n1(x) : Math.round(x)}× stronger` : `${(1 / x) < 10 ? n1(1 / x) : Math.round(1 / x)}× weaker`);

/* the speed that, launched sideways from 1 AU, would actually reach the sun's
   surface — the number that kills the "slow down a bit and you fall in" idea */
const HIT_SUN_1AU = vAt(AU_KM, (AU_KM + R_SUN) / 2);
const V_ESC_1AU = Math.sqrt(2 * MU / AU_KM);
const SUN_PULL_RATIO = Math.round(G_EARTH_SURF / G_1AU);

/* =========================================================================
 * THE SIMULATOR — one ES5 source, two runtimes (the moon.mjs/planets.mjs
 * pattern). Node instantiates it below to BAKE the opening frame into the
 * HTML, so a crawler and a no-JS reader get a real orbit rather than an empty
 * box; the browser runs the identical functions to redraw. There is no Node
 * twin that could drift.
 * ====================================================================== */
const OV_CORE = `
var OV_MU=${MU}, OV_AU=${AU_KM}, OV_RSUN=${R_SUN};
var OV_W=640, OV_CXY=320, OV_MAXR=286;   /* frame, centre, biggest drawn radius */

function ovCirc(rAU){ return Math.sqrt(OV_MU/(rAU*OV_AU)); }
function ovPull(rAU){ var r=rAU*OV_AU; return OV_MU/(r*r)*1000; }   /* m/s^2 per kg */

/* Everything about the orbit that follows from launching sideways at speed v
   from distance r. Perpendicular launch means r is an apse: periapsis if you
   are going faster than circular, apoapsis if slower. */
function ovOrbit(rAU,v){
  var r=rAU*OV_AU, vc=Math.sqrt(OV_MU/r), eps=v*v/2-OV_MU/r, h=r*v;
  var o={ rAU:rAU, r:r, v:v, vc:vc, ratio:v/vc, eps:eps, escape:false, hits:false };
  if(eps>=-1e-9){ o.escape=true; o.e=1; return o; }
  o.a=-OV_MU/(2*eps);
  o.e=Math.sqrt(Math.max(0,1+2*eps*h*h/(OV_MU*OV_MU)));
  o.q=o.a*(1-o.e); o.Q=o.a*(1+o.e);
  o.peri=v>vc;                                  /* did we start at periapsis? */
  o.period=2*Math.PI*Math.sqrt(o.a*o.a*o.a/OV_MU);        /* seconds */
  o.hits=o.q<=OV_RSUN;
  return o;
}
function ovKepler(M,e){
  var E=M+e*Math.sin(M),i,d;
  for(i=0;i<12;i++){ d=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E)); E-=d; if(Math.abs(d)<1e-13) break; }
  return E;
}
/* position on the conic at time t (seconds) after the start, in km.
   The frame is rotated so the START always sits at screen right. */
function ovPos(o,t){
  var n=Math.sqrt(OV_MU/(o.a*o.a*o.a)), M=n*t+(o.peri?0:Math.PI);
  var E=ovKepler(M,o.e);
  var x=o.a*(Math.cos(E)-o.e), y=o.a*Math.sqrt(1-o.e*o.e)*Math.sin(E);
  if(!o.peri){ x=-x; y=-y; }                    /* rotate the apsis to the right */
  return { x:x, y:y, r:Math.sqrt(x*x+y*y) };
}
/* the escape case is integrated rather than solved: velocity Verlet, which is
   symplectic, so the track cannot gain energy and fake an escape */
function ovFly(rAU,v,steps,dt){
  var p={x:rAU*OV_AU,y:0}, vel={x:0,y:v}, out=[[p.x,p.y]], i,r3,ax,ay,nx,ny;
  for(i=0;i<steps;i++){
    r3=Math.pow(Math.sqrt(p.x*p.x+p.y*p.y),3);
    ax=-OV_MU*p.x/r3; ay=-OV_MU*p.y/r3;
    nx=p.x+vel.x*dt+0.5*ax*dt*dt; ny=p.y+vel.y*dt+0.5*ay*dt*dt;
    r3=Math.pow(Math.sqrt(nx*nx+ny*ny),3);
    vel.x+=0.5*(ax+(-OV_MU*nx/r3))*dt; vel.y+=0.5*(ay+(-OV_MU*ny/r3))*dt;
    p.x=nx; p.y=ny; out.push([p.x,p.y]);
  }
  return out;
}
/* how many km one pixel is worth, so the whole orbit fits the frame */
function ovScale(o){
  var far=o.escape?o.r*3.2:Math.max(o.Q,o.r)*1.1;
  return OV_MAXR/far;
}
function ovSvgPt(k,x,y){ return (OV_CXY+x*k).toFixed(1)+' '+(OV_CXY-y*k).toFixed(1); }

/* ---- the drawing ------------------------------------------------------
   Returns the CONTENTS of the <svg>, so the same string is baked at build
   time and assigned to .innerHTML in the browser. */
function ovScene(o,t){
  var k=ovScale(o), s='', i, pt=o.escape?null:ovPos(o,t);
  var track=null;
  /* the escape track's step is set from the orbit's OWN timescale (r/v), not a
     fixed number of seconds: a fixed step that looks smooth at Neptune takes
     giant strides at Mercury, where the same speed covers the frame in days. */
  if(o.escape){ track=ovFly(o.rAU,o.v,260,(o.r/o.v)/12); }
  s+='<rect width="640" height="640" rx="16" fill="#080d1a"/>';
  /* THE FIELD, DRAWN AS IT FALLS OFF. Not decoration: the rings are equal
     steps of distance and the glow is the 1/r² strength, so "the pull is
     concentrated near the sun" is visible before a single number is read. */
  s+='<circle cx="320" cy="320" r="300" fill="url(#ov-field)"/>';
  /* THE RING SPACING ADAPTS, or the inner planets get no scale at all: at
     Mercury the whole frame is 0.43 AU across, so a fixed 1 AU ring never
     fits and the drawing loses its only distance reference. Pick the finest
     step from the ladder that still leaves at least two rings inside. */
  var auPx=OV_AU*k, steps=[0.05,0.1,0.2,0.5,1,2,5,10,20], stp=steps[steps.length-1], si;
  /* the FINEST step whose rings are still far enough apart to read — at most
     about seven of them across the frame. Testing the other way round (does
     the step fit at all?) always picked the smallest step in the list, which
     drew 0.05 AU rings on a 30 AU frame. */
  for(si=0;si<steps.length;si++){ if(auPx*steps[si]>=OV_MAXR/7){ stp=steps[si]; break; } }
  for(i=1;i<=12;i++){
    var rr=auPx*stp*i;
    if(rr>OV_MAXR) break;
    s+='<circle cx="320" cy="320" r="'+rr.toFixed(1)+'" fill="none" stroke="#5b7ba8" stroke-opacity=".18" stroke-width="1"/>';
    if(i===1||i%2===0) s+='<text x="'+(320+rr).toFixed(1)+'" y="314" font-size="10" fill="#5b7ba8" text-anchor="middle">'+(+(stp*i).toFixed(2))+' AU</text>';
  }
  /* the path */
  if(o.escape&&track){
    var d='';
    for(i=0;i<track.length;i++) d+=(i?'L':'M')+ovSvgPt(k,track[i][0],track[i][1]);
    s+='<path d="'+d+'" fill="none" stroke="#f87171" stroke-opacity=".75" stroke-width="2" stroke-dasharray="6 5"/>';
  } else {
    var dd='', E, x, y;
    for(i=0;i<=180;i++){
      E=i/180*2*Math.PI;
      x=o.a*(Math.cos(E)-o.e); y=o.a*Math.sqrt(1-o.e*o.e)*Math.sin(E);
      if(!o.peri){ x=-x; y=-y; }
      dd+=(i?'L':'M')+ovSvgPt(k,x,y);
    }
    s+='<path d="'+dd+'Z" fill="none" stroke="'+(o.hits?'#f87171':'#7dd3fc')+'" stroke-opacity=".7" stroke-width="2" stroke-dasharray="5 5"/>';
  }
  /* the sun. DRAWN FAR TOO BIG and the caption says so — at this scale its
     true radius is a fraction of a pixel, and an invisible sun makes the
     "does it hit?" question unanswerable by eye. */
  s+='<circle cx="320" cy="320" r="26" fill="url(#ov-glow)"/>';
  s+='<circle cx="320" cy="320" r="13" fill="#fcd34d"/>';
  s+='<text x="320" y="352" text-anchor="middle" font-size="12" fill="#fcd34d">Sun</text>';
  /* the planet, with the two arrows that are the whole lesson */
  var px, py, vx, vy;
  if(o.escape&&track){ px=track[0][0]; py=track[0][1]; }
  else { px=pt.x; py=pt.y; }
  var rNow=Math.sqrt(px*px+py*py)/OV_AU;
  var sx=OV_CXY+px*k, sy=OV_CXY-py*k;
  /* velocity, tangential; gravity, straight at the sun */
  var ang=Math.atan2(py,px);
  var vlen=Math.min(96,Math.max(26,46*(o.v/Math.max(1e-6,ovCirc(rNow)))));
  var glen=Math.min(120,Math.max(18,42*Math.pow(ovPull(rNow)/${G_1AU},0.35)));
  var vdirx=-Math.sin(ang), vdiry=Math.cos(ang);
  s+='<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+(sx+vdirx*vlen).toFixed(1)+'" y2="'+(sy-vdiry*vlen).toFixed(1)+'" stroke="#4ade80" stroke-width="3" marker-end="url(#ov-av)"/>';
  s+='<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+(sx-Math.cos(ang)*glen).toFixed(1)+'" y2="'+(sy+Math.sin(ang)*glen).toFixed(1)+'" stroke="#fbbf24" stroke-width="3" marker-end="url(#ov-ag)"/>';
  s+='<circle cx="'+sx.toFixed(1)+'" cy="'+sy.toFixed(1)+'" r="7" fill="#60a5fa" stroke="#dbeafe" stroke-width="1.5"/>';
  s+='<text x="'+(sx+11).toFixed(1)+'" y="'+(sy-11).toFixed(1)+'" font-size="12" font-weight="700" fill="#dbeafe">Planet</text>';
  return s;
}
`;

/* the Node side of the same source — used only to bake the opening frame */
const OV = new Function(`${OV_CORE}
return { ovScene:ovScene, ovOrbit:ovOrbit, ovCirc:ovCirc, ovPull:ovPull };`)();

const OV_DEFS = `<defs>
    <radialGradient id="ov-field" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fcd34d" stop-opacity=".22"/>
      <stop offset="18%" stop-color="#fcd34d" stop-opacity=".08"/>
      <stop offset="45%" stop-color="#60a5fa" stop-opacity=".05"/>
      <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ov-glow" cx="50%" cy="50%" r="50%">
      <stop offset="40%" stop-color="#fcd34d" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#fcd34d" stop-opacity="0"/>
    </radialGradient>
    <marker id="ov-av" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="#4ade80"/></marker>
    <marker id="ov-ag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="#fbbf24"/></marker>
  </defs>`;

const bakedScene = OV.ovScene(OV.ovOrbit(1, OV.ovCirc(1)), 0);

/* ---- the client: controls, animation, read-outs ---------------------- */
const OV_JS = `<script>(function(){
${OV_CORE}
var fig=document.getElementById('ov-scene'); if(!fig) return;
var dEl=document.getElementById('ov-dist'), vEl=document.getElementById('ov-vel'),
    spEl=document.getElementById('ov-speed'), play=document.getElementById('ov-play'),
    reset=document.getElementById('ov-reset'), circ=document.getElementById('ov-makecirc');
var out={ dist:'ov-o-dist', vel:'ov-o-vel', ratio:'ov-o-ratio', status:'ov-o-status',
          pull:'ov-o-pull', rel:'ov-o-rel', need:'ov-o-need', shape:'ov-o-shape' };
function $(id){ return document.getElementById(id); }
var rAU=1, ratio=1, t=0, running=true, days=40, orbit=null, dead=false;
var DAY=86400;
function fmt(x,n){ return x.toFixed(n===undefined?1:n); }
function build(){
  orbit=ovOrbit(rAU, ratio*ovCirc(rAU)); t=0; dead=false;
  paint(); readout();
}
/* the menu's unit control fires this after it has rewritten the page's spans */
document.addEventListener('ac:units',function(){ readout(); });
function paint(){ fig.innerHTML=ovScene(orbit,t); }
/* SPEEDS FOLLOW THE READER'S UNITS. These are written by the script on every
   drag, so they cannot be spans — acFmt (units.mjs) is the same conversion and
   the same rounding the spans use, reached as a function. The fallback keeps
   the page working if that script is ever absent. */
function ovSpeed(v){ return (window.acFmt?window.acFmt(v,'km/s',-1):fmt(v,1)+' km/s'); }
function readout(){
  var v=orbit.v, vc=orbit.vc, g=ovPull(rAU);
  $(out.dist).textContent=fmt(rAU,2)+' AU';
  $(out.vel).textContent=ovSpeed(v);
  $(out.ratio).textContent='×'+fmt(ratio,2)+' of circular';
  $(out.need).textContent=ovSpeed(vc);
  $(out.pull).textContent=g.toFixed(g<0.001?5:4)+' N per kg';
  var rel=g/${G_1AU};
  $(out.rel).textContent=rel>=1?fmt(rel,1)+'× Earth\\u2019s':fmt(1/rel,1)+'× weaker than Earth\\u2019s';
  var st, sh;
  if(orbit.escape){ st='Escapes the sun'; sh='Above escape speed (\\u00D7'+fmt(Math.SQRT2,2)+' circular) \\u2014 it never comes back.'; }
  else if(orbit.hits){ st='Falls into the sun'; sh='Too slow to keep missing: the near end of this ellipse is inside the sun.'; }
  else if(Math.abs(ratio-1)<0.012){ st='Stable circle'; sh='Falling exactly as fast as the curve of the orbit carries it away.'; }
  /* a perihelion of 0.004 AU and one of 0.04 are very different answers to
     "does it hit?", and two decimals prints both as 0.00 and 0.04 — so the
     close ones get the digits they need */
  else if(ratio<1){ var q=orbit.q/OV_AU;
    st='Stable ellipse'; sh='Swings in to '+fmt(q,q<0.1?3:2)+' AU, back out to '+fmt(rAU,2)+' AU \\u2014 and speeds up on the way in. Year: '+fmt(orbit.period/DAY/365.25,2)+'.'; }
  else { st='Stable ellipse'; sh='Swings out to '+fmt(orbit.Q/OV_AU,2)+' AU and back \\u2014 slowing down as it climbs. Year: '+fmt(orbit.period/DAY/365.25,2)+'.'; }
  $(out.status).textContent=st;
  $(out.status).className='ov-status'+(orbit.hits?' is-bad':(orbit.escape?' is-warn':' is-good'));
  $(out.shape).textContent=sh;
}
function step(dt){
  if(!running||dead) return;
  t+=dt*days*DAY;
  if(!orbit.escape){
    var p=ovPos(orbit,t);
    if(p.r<=OV_RSUN){ dead=true; running=false; play.textContent='Play'; play.setAttribute('aria-pressed','false'); }
  }
  paint();
}
var last=null;
function frame(ts){
  if(last===null) last=ts;
  var dt=Math.min(0.05,(ts-last)/1000); last=ts;
  step(dt);
  requestAnimationFrame(frame);
}
/* the sliders. Distance is logarithmic — 0.2 to 40 AU on a linear slider
   spends four fifths of its travel outside Saturn, where nothing changes. */
function distFromSlider(x){ return Math.exp(Math.log(0.2)+(x/1000)*(Math.log(40)-Math.log(0.2))); }
function sliderFromDist(r){ return Math.round((Math.log(r)-Math.log(0.2))/(Math.log(40)-Math.log(0.2))*1000); }
dEl.addEventListener('input',function(){ rAU=distFromSlider(+dEl.value); build(); });
vEl.addEventListener('input',function(){ ratio=+vEl.value/100; build(); });
if(spEl) spEl.addEventListener('input',function(){ days=+spEl.value; });
play.addEventListener('click',function(){
  if(dead){ build(); running=true; } else running=!running;
  play.textContent=running?'Pause':'Play';
  play.setAttribute('aria-pressed',running?'true':'false');
});
reset.addEventListener('click',function(){ build(); running=true; play.textContent='Pause'; play.setAttribute('aria-pressed','true'); });
circ.addEventListener('click',function(){ ratio=1; vEl.value=100; build(); });
/* the planet presets: each sets the distance AND the speed that distance
   actually needs, which is the entire argument of the page in one tap */
var chips=document.querySelectorAll('[data-ov-au]');
for(var i=0;i<chips.length;i++) chips[i].addEventListener('click',function(){
  rAU=+this.getAttribute('data-ov-au'); ratio=1;
  dEl.value=sliderFromDist(rAU); vEl.value=100; build();
  running=true; play.textContent='Pause'; play.setAttribute('aria-pressed','true');
});
dEl.value=sliderFromDist(1); vEl.value=100;
dEl.disabled=false; vEl.disabled=false; if(spEl) spEl.disabled=false;
play.disabled=false; reset.disabled=false; circ.disabled=false;
build();
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){ running=false; play.textContent='Play'; play.setAttribute('aria-pressed','false'); }
requestAnimationFrame(frame);
})();</script>`;

/* ---- the simulator card ---------------------------------------------- */
const presetChips = [MERCURY, EARTH, P_OF("Mars"), JUPITER, NEPTUNE]
  .map((p) => `<button type="button" class="chip ov-preset" data-ov-au="${p.a.toFixed(4)}">${esc(p.name)}</button>`).join("");

const simCard = `  <div class="card">
    <div class="ov-stage">
      <div class="ov-figwrap">
        <svg class="ov-fig" id="ov-fig" viewBox="0 0 640 640" role="img" aria-label="A planet orbiting the sun, with an arrow for its sideways velocity and an arrow for the sun's pull on it">
  ${OV_DEFS}
  <g id="ov-scene">${bakedScene}</g>
        </svg>
        <p class="ov-key"><span class="ov-k ov-k-v">Green: the way it is moving</span><span class="ov-k ov-k-g">Amber: the sun's pull</span></p>
      </div>
      <div class="ov-panel">
        <p class="ov-status is-good" id="ov-o-status">Stable circle</p>
        <p class="ov-shape" id="ov-o-shape">Falling exactly as fast as the curve of the orbit carries it away.</p>
        <div class="ov-ctl">
          <label class="sim-flab" for="ov-dist">Distance from the sun</label>
          <p class="ov-row"><input type="range" class="orr-slider" id="ov-dist" min="0" max="1000" step="1" value="500" disabled aria-label="Distance from the sun"><output id="ov-o-dist">1.00 AU</output></p>
          <label class="sim-flab" for="ov-vel">Sideways speed</label>
          <p class="ov-row">${/* THE MINIMUM IS 5%, NOT 10%, AND THAT IS A PHYSICS CONSTRAINT, not a taste
     one. Falling far enough in to actually strike the sun from distance r
     needs a speed fraction below sqrt(2R_sun/r) — about 0.097 at Earth. A
     slider that bottomed out at 0.10 could therefore never show the fall-in
     case from Earth, while the copy beside it invites the reader to try
     exactly that. 5% clears it at every distance out to Jupiter. */""
     }<input type="range" class="orr-slider" id="ov-vel" min="5" max="150" step="1" value="100" disabled aria-label="Sideways speed, as a percentage of the circular speed"><output id="ov-o-vel">29.8 km/s</output></p>
          <p class="ov-sub"><span id="ov-o-ratio">×1.00 of circular</span></p>
          <label class="sim-flab" for="ov-speed">Playback</label>
          <p class="ov-row"><input type="range" class="orr-slider" id="ov-speed" min="2" max="400" step="1" value="40" disabled aria-label="How fast time runs"><output>days per second</output></p>
        </div>
        <p class="ov-btns">
          <button type="button" class="chip chip-alt" id="ov-play" aria-pressed="true" disabled>Pause</button>
          <button type="button" class="chip" id="ov-reset" disabled>Reset</button>
          <button type="button" class="chip" id="ov-makecirc" disabled>Make it circular</button>
        </p>
        <div class="ov-facts">
          <div class="sun-srow sun-main"><span>The sun pulls each kg here with</span><b id="ov-o-pull">0.0059 N per kg</b></div>
          <div class="sun-srow"><span>Compared with at Earth</span><b id="ov-o-rel">1.0× Earth’s</b></div>
          <div class="sun-srow sun-main"><span>Speed a circle needs here</span><b id="ov-o-need">29.8 km/s</b></div>
        </div>
        <p class="ov-jump">Set it to a real planet: ${presetChips}</p>
      </div>
    </div>
    <p class="hint">Each tap of a planet sets that planet's distance <em>and</em> the speed that distance actually requires — the two always move together, which is the whole point. The sun is drawn far larger than scale (at this size its true disc would be a fraction of a pixel, and you could not see whether an orbit hits it); the rings are one AU apart, and the arrows are indicative in length — the exact figures are the numbers beside them.</p>
  </div>
`;

/* ---- the table that answers the owner's question directly ------------- */
const planetRows = PLANETS.map((p) => `        <tr${p.name === "Mercury" ? ' class="ov-hi"' : ""}>
          <td>${esc(p.name)}</td>
          <td>${n2(p.a)}</td>
          <td>${p.g.toFixed(p.g < 0.001 ? 5 : 4)}</td>
          <td>${p.gRel >= 1 ? `${n1(p.gRel)}×` : `1/${Math.round(1 / p.gRel)}`}</td>
          <td>${n1(p.vc)}</td>
          <td>${n1(p.vMean)}</td>
          <td>${n1(p.years)}</td>
        </tr>`).join("\n");

const tableCard = `  <div class="card">
    <h2>Every planet: the pull it feels, and the speed that answers it</h2>
    <p>This is the comparison the whole page is about. The third column is <strong>the sun's pull on one kilogram</strong> at that planet's distance — the same kilogram, moved further out each row. It collapses as the square of the distance: Mercury's kilogram is pulled <strong>${times(MERCURY.gRel)}</strong> than Earth's and <strong>${times(MERCURY.g / JUPITER.g)}</strong> than Jupiter's. The speed columns are what each planet does about it.</p>
    <div class="ov-tablewrap">
      <table class="ov-table">
        <thead><tr>
          <th>Planet</th><th>Distance (AU)</th><th>Sun's pull (N per kg)</th><th>vs Earth</th>
          <th>Circular speed (km/s)</th><th>Mean actual speed (km/s)</th><th>Year (Earth years)</th>
        </tr></thead>
        <tbody>
${planetRows}
        </tbody>
      </table>
    </div>
    <p class="hint">Every figure is computed from two things only: the sun's gravitational parameter and each planet's semi-major axis. Nothing here is typed in, so nothing can drift from the simulator above.</p>
    <p class="hint"><strong>Why two speed columns.</strong> "Circular speed" is what a perfect circle at that distance needs — the number the simulator uses. "Mean actual speed" is the average around the real, slightly squashed orbit, and it is the figure reference books print. They agree for the near-circular orbits and part company for Mercury (${n1(MERCURY.vc)} against ${n1(MERCURY.vMean)}), whose orbit is the most eccentric of the eight: it actually runs <strong>${kmPerS(MERCURY.vPeri, 1)}</strong> at its closest and <strong>${kmPerS(MERCURY.vApo, 1)}</strong> at its furthest. That swing inside one orbit is the same law again — closer means faster.</p>
  </div>
`;

const whyShort = `  <div class="card">
    <h2>What this is, and how it works</h2>
    <p>This is a working model of one planet around the Sun. The <strong class="ov-ink-v">green arrow</strong> is the way it is already moving. The <strong class="ov-ink-g">amber arrow</strong> is the Sun’s pull, always straight inward. Set the distance and the sideways speed, then watch: a circle, a long ellipse, an escape, or a fall into the Sun.</p>
    <p><strong>Distance</strong> is how far out. <strong>Sideways speed</strong> is a percentage of the speed a circle at that distance needs. <strong>Make it circular</strong> sets the two together, which is the whole point. Planet chips set a real planet’s distance and the speed that distance actually requires.</p>
    <p>A heavier planet is pulled harder, and is harder to turn, in exact proportion — so mass never appears on the sliders. The table below is the comparison the page exists for: the pull per kilogram at each planet, and the speed that answers it.</p>
  </div>
`;

/* THINGS TO TRY — the tasks the two sliders were built for. Percentages are
   of circular speed at the current distance, which is what the speed slider
   reads out; escape sits at √2 ≈ 141% of circular, inside the slider's range
   on purpose. */
const tryCard = `  <div class="card">
    <h2>Things to try</h2>
    <ul class="facts">
      <li><strong>Break the circle, gently.</strong> Press <strong>Make it circular</strong>, then drag the speed down to about <strong>90%</strong>. The point where you slowed it stays put, and the far side of the orbit drops closer to the sun. Slowing down doesn't make a planet spiral in — it reshapes the loop.</li>
      <li><strong>Raise an orbit by pushing forwards.</strong> Back to circular, then up to about <strong>110%</strong>. Now the far side lifts away. This is how real spacecraft climb: they don't point up, they speed up.</li>
      <li><strong>Find escape.</strong> Keep adding speed and watch the ellipse stretch — somewhere around <strong>141%</strong> of circular it stops being a loop at all and the planet leaves. That number is no accident: escape speed is always the circular speed times the square root of two.</li>
      <li><strong>Try to hit the sun.</strong> Drag the speed as low as it goes. Even at a crawl, the planet whips around the sun and comes back — to actually fall straight in you would have to shed nearly all of it. Falling into the sun is one of the hardest trips in the solar system.</li>
      <li><strong>Move house.</strong> Use the presets to jump to Mercury's distance, then Neptune's, and watch two read-outs together: the sun's pull per kilogram, and the speed a circle needs. Closer means pulled harder means faster — the race the solar system simulator shows, explained by two numbers.</li>
    </ul>
${CLASSROOM_PAUSED ? "" : `    <p class="hint">Taught something good with this page? <a href="/classroom/">Help us turn it into a lesson plan</a> — built with you, published free, credited to you.</p>`}
  </div>
`;

const gravityCard = `  <div class="card">
    <h2>What the two arrows are, and why they are different kinds of thing</h2>
    <p>The <strong class="ov-ink-g">amber arrow</strong> is the sun's pull. It always points straight at the sun, and its strength is <strong>GM/r²</strong> — nothing else. Not the planet's mass, not its speed, not what it is made of. Move twice as far out and it drops to a quarter.</p>
    <p>The <strong class="ov-ink-v">green arrow</strong> is where the planet is already going. Gravity never points along it; at a circular orbit the two are exactly at right angles, which is why the pull changes the planet's <em>direction</em> continuously and its <em>speed</em> not at all. Bend the path enough and it closes into a circle.</p>
    <p><strong>The planet's own mass is absent from all of this</strong>, and that is not an approximation. A heavier planet is pulled harder — but it also takes proportionally more force to turn, and the two cancel exactly. A grain of dust at Mercury's distance orbits at Mercury's speed. This is the same fact as Galileo's two balls hitting the ground together, and it is why the simulator above never asks you for a mass: there is nowhere to put one.</p>
    <p>Scale check on that pull: at Earth's distance the sun tugs each kilogram with about ${G_1AU.toFixed(4)} newtons — roughly <strong>1/${SUN_PULL_RATIO} of what the ground under your feet does right now</strong>. It is a weak pull that has simply been applied, without interruption, for four and a half billion years.</p>
  </div>
`;

/* ---------------------------------------------------------------------------
 * WHAT ACTUALLY CHANGES AN ORBIT'S SPEED.
 *
 * The slider on this page is a thought experiment: it changes a planet's speed
 * by hand. The obvious next question — and the one the home page's card now
 * asks out loud — is what could do that in the real world, and the honest
 * answer is "very little, very slowly, except for one violent case". That is
 * worth a section of its own, because the interesting part is not the list of
 * mechanisms; it is that a change in SPEED is a change in ORBIT SHAPE, always,
 * and never a change in "how fast it goes" alone.
 * ------------------------------------------------------------------------- */
const changeCard = `  <div class="card" id="slow-down">
    <h2>What could actually speed a planet up or slow it down?</h2>
    <p>The slider above changes a planet's speed by hand, which nothing in space does. What space does instead is push very gently for a very long time, and every one of these pushes shows up the same way: <strong>not as a faster or slower planet, but as a different-shaped orbit.</strong> Add speed at one point and the far side of the orbit climbs away from the sun; take speed away and the far side drops toward it. The planet then arrives back where you changed it going exactly the speed it was before.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Tides</span><b>The strongest one. Earth's tidal bulge is dragged ahead of the moon by Earth's own spin, and it tows the moon forward — adding energy, which lifts the moon about ${n1(3.8)} cm a year and slows Earth's day by about ${n1(1.8)} milliseconds a century. The moon is speeding up its orbit and getting SLOWER as a result, because a higher orbit is a slower one.</b></div>
      <div class="wc-frow"><span>Drag</span><b>Real for anything low enough to touch an atmosphere — every satellite in low Earth orbit, and Phobos skimming Mars. Drag removes energy, the orbit shrinks, and the object speeds UP as it falls. There is no air between the planets, so this does nothing to them at all.</b></div>
      <div class="wc-frow"><span>Another planet's pull</span><b>Every planet tugs every other one, forever. Mostly the tugs average out; when the periods are a simple ratio they do not, and the same nudge arrives at the same point over and over. That is what cleared the Kirkwood gaps in the asteroid belt and what locks Io, Europa and Ganymede together.</b></div>
      <div class="wc-frow"><span>A close pass</span><b>Flying past a moving planet steals speed from it (or gives speed to it) — the gravity assist every outer-planet mission uses. The planet pays: Voyager 2 left Jupiter faster, and Jupiter's orbit shifted by a distance far too small to measure. It is exact bookkeeping, not a free lunch.</b></div>
      <div class="wc-frow"><span>Losing mass</span><b>The sun turns about four million tonnes of itself into light every second, so its grip is very slowly loosening and every planet's orbit is very slowly widening. Earth's gains roughly a centimetre a year from it.</b></div>
      <div class="wc-frow"><span>Sunlight</span><b>On a small body, absorbing sunlight on one side and radiating it from a warmer, later-in-the-day side is a real thrust — the Yarkovsky effect. It is how asteroids drift into the resonances that eventually throw them at us, and it is far too feeble to matter for a planet.</b></div>
    </div>
    <p class="hint">Every entry here is a change in orbital ENERGY. That is why the answer to "what if it slowed down?" is never "it falls into the sun": it takes shedding almost all of a planet's speed to bring the near end of its new ellipse anywhere near the sun's surface, which the slider above will show you in one drag.</p>
  </div>
`;

/* ---------------------------------------------------------------------------
 * THE IMPACT CASE, which is the one people actually picture.
 * ------------------------------------------------------------------------- */
const impactCard = `  <div class="card">
    <h2>What if something big hit it?</h2>
    <p>An impact is the one thing that can change an orbit all at once, and it changes it by exactly as much momentum as it delivers — no more. That is the whole calculation, and it is why the numbers are so disappointing: an impactor a thousand times lighter than the planet, arriving at the planet's own orbital speed, can shift that speed by at most a thousandth of it.</p>
    <p><strong>The direction of the hit is everything.</strong> A blow from behind adds speed and raises the far side of the orbit; a head-on blow takes speed away and drops the far side toward the sun; a hit from the side tilts the orbital plane instead, which is the most expensive kind of change there is and the reason nothing here has ever been knocked far out of the ecliptic. In every case the planet still passes through the point where it was hit — an orbit pivots about that point, and the rest of the ellipse swings.</p>
    <p><strong>It is much better at changing SPIN than orbit.</strong> The impact that is thought to have tipped Uranus onto its side, and the one that made our moon, rearranged the rotation and the surroundings of their targets while leaving their orbits around the sun very close to what they had been. Mass for mass, a glancing blow torques a planet far more easily than it can move it.</p>
    <p>Small bodies are the exception, because the ratio runs the other way: DART shifted Dimorphos's orbit around Didymos by ${n1(32)} minutes with a ${n1(570)} kg spacecraft in 2022, and that is the first time anyone has deliberately changed the orbit of anything. On the scale of a planet, the same physics buys nothing you could measure.</p>
    <p class="hint">Try it on the simulator: drop the speed a few percent and watch what happens to the far side of the orbit rather than to the planet. That swing is what an impact buys, and it is why deflecting an asteroid is done years in advance — a tiny change to the shape of an orbit becomes a large change to WHERE something is, only after it has gone round.</p>
  </div>
`;

const FAQ = [
  ["Why doesn't the sun's gravity pull the planets into it?",
    `It does pull them — every planet is falling toward the sun at every moment. They miss because they are also moving sideways fast enough that the sun is no longer directly ahead by the time they have fallen. An orbit is a continuous fall that keeps missing, not a balance between gravity and some outward force.`],
  ["Does Mercury have to travel faster than the other planets?",
    `Yes. The sun's pull on each kilogram at Mercury's distance is about ${n1(MERCURY.gRel)} times what it is at Earth and about ${Math.round(MERCURY.g / JUPITER.g)} times what it is at Jupiter, because gravity falls off as the square of distance. To keep missing a pull that strong, Mercury must move sideways at about ${n1(MERCURY.vc)} km/s, against Earth's ${n1(EARTH.vc)} and Jupiter's ${n1(JUPITER.vc)}. Closer in means pulled harder and moving faster — the speed goes as one over the square root of the distance.`],
  ["Does a heavier planet orbit differently from a lighter one?",
    `No. The planet's mass cancels out completely: it is pulled harder in exact proportion to how much harder it is to turn. At a given distance every object needs the same orbital speed, whether it is Jupiter, a satellite or a speck of dust. That is why the simulator has no mass control.`],
  ["What would actually happen if a planet slowed down?",
    `It would not spiral in. It would drop onto a more elongated ellipse — swinging closer to the sun, speeding up as it fell, then climbing back out to where it started. To actually hit the sun from Earth's distance you would have to cut the speed from ${n1(EARTH.vc)} km/s to roughly ${n1(HIT_SUN_1AU)} km/s, because anything faster still has enough sideways motion to miss.`],
  ["What if a planet sped up instead?",
    `It swings further out and slows down as it climbs, then falls back — a longer ellipse. Past ${n1(V_ESC_1AU)} km/s at Earth's distance (the circular speed times the square root of two) it never comes back at all: that is escape velocity, and the orbit stops being a closed loop.`],
  ["Why don't the planets gradually slow down and fall in?",
    `Because there is nothing to slow them. Space has no meaningful air resistance, and gravity — being always at right angles to the motion on a circular orbit — does no work on them. With no friction there is nothing to bleed away the sideways speed, so the fall keeps missing indefinitely.`],
  ["Where did the sideways motion come from in the first place?",
    `From the cloud of gas and dust the solar system condensed out of, which was already turning slightly. As it collapsed it spun faster, for the same reason a skater speeds up when they pull their arms in, and it flattened into a disc. The planets formed inside that already-orbiting disc, and inherited its motion.`],
  ["Is this simulator accurate?",
    `The physics is exact for the case it models: one body orbiting a much heavier one, with the sun's real gravitational parameter and no other planets pulling. Closed orbits are solved rather than stepped, so they do not drift. What it does not include is the pull of the other planets on each other, or the tiny relativistic effect that shifts Mercury's orbit; the drawing's sun is also far larger than scale, which the caption states.`],
];

const head = ({ title, desc, path, ld = "", faq = null }) => `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
${appLd({ name: title, url: `${SITE}${path}`, description: desc })}${ld}
${faq ? faqLd(faq) : ""}
${GA_SNIPPET}`;

/* ---- page 1: the simulator ------------------------------------------- */
const hubHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: "Orbital Velocity Simulator — Why Planets Don't Fall Into the Sun",
  desc: `Change a planet's distance and speed and watch the orbit answer: circle, ellipse, escape, or a fall into the sun. Shows the sun's pull per kilogram at every distance, and why Mercury must travel ${n1(MERCURY.vc)} km/s while Neptune needs only ${n1(NEPTUNE.vc)}.`,
  path: OV_PATH,
  ld: `\n<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Orbital velocity simulator", url: OV_PATH }])}</script>\n${learningLd({ name: "Orbital Velocity Simulator", url: `${SITE}${OV_PATH}`, description: "An interactive model of orbital velocity and gravity: set a distance and a sideways speed and watch whether the result is a circle, an ellipse, an escape or a fall into the sun." })}`,
  faq: FAQ,
})}
</head>
<body>
<div class="wrap wrap-wide">
  ${brand({ crumb: { slug: "orbital-velocity", url: OV_PATH } })}
  <h1>Orbital Velocity Simulator</h1>
  <p class="sub">Set how far out a planet sits and how fast it is moving sideways, and watch what gravity does with it — a circle, a long ellipse, an escape, or a fall into the sun. The two arrows are the whole story: where it is going, and where it is being pulled.</p>

${simCard}${whyShort}${tryCard}${hubQuestionsCard(OV_PATH)}${tableCard}  <div class="card">
    <h2>Keep going</h2>
    <p class="timer-presets">
      <a class="chip" href="/glossary/">The glossary of every term</a>
      <a class="chip" href="/concepts/why-dont-planets-fall-into-the-sun/">Why planets don't fall into the sun</a>
      <a class="chip" href="${OV_WHY}">Newton's cannonball, with the tables</a>
      <a class="chip" href="/solar-system-simulator/">The whole solar system, moving</a>
      <a class="chip" href="/earth-sun-moon-orbit-simulator/">Earth, sun &amp; moon together</a>
      <a class="chip" href="${PLANETS_PATH}">Every planet, a page each</a>
      <a class="chip" href="${ROCKET_PATH}">Launch windows to Mars</a>
    </p>
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${OV_JS}
</body>
</html>
`;

/* ---- page 2: the explainer -------------------------------------------- */
const WHY_FAQ = [
  FAQ[0], FAQ[1], FAQ[2], FAQ[3], FAQ[5], FAQ[6],
];
const whyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: "Why Don't the Planets Fall Into the Sun?",
  desc: `They are falling — constantly. An orbit is a fall that keeps missing. Why the sun's pull is ${n1(MERCURY.gRel)}× stronger at Mercury than at Earth, why that means Mercury must travel faster rather than get dragged in, and why a planet's own mass makes no difference at all.`,
  path: OV_WHY,
  ld: `\n<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Orbital velocity simulator", url: OV_PATH }, { name: "Why planets don't fall into the sun", url: OV_WHY }])}</script>\n${learningLd({ name: "Why don't the planets fall into the sun?", url: `${SITE}${OV_WHY}`, description: "An explanation of orbits as continuous free fall, why stronger gravity closer to the sun requires greater orbital speed, and why orbital motion is independent of mass.", type: "explanation" })}`,
  faq: WHY_FAQ,
})}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "orbital-velocity", url: OV_PATH }, page: { label: "why planets don't fall in", url: OV_WHY } })}
  <h1>Why Don't the Planets Fall Into the Sun?</h1>
  <p class="sub">Short answer: they <em>are</em> falling into the sun. They keep missing. The question lives at <a href="/concepts/why-dont-planets-fall-into-the-sun/">Why don’t planets fall into the Sun?</a> — this page keeps the unique numbers: pull per kilogram at each planet, the speed that answers it, and what it actually takes to hit the Sun.</p>

  <div class="card">
    <h2>1 · The pull really is much stronger close in</h2>
    <p>Start by taking the question seriously, because the premise is correct. Gravity from the sun weakens as the <strong>square</strong> of the distance, so the same kilogram is pulled very differently depending on where you hold it:</p>
    <div class="wc-facts">
${PLANETS.filter((p) => ["Mercury", "Earth", "Jupiter", "Neptune"].includes(p.name)).map((p) =>
    `      <div class="wc-frow"><span>At ${esc(p.name)}'s distance (${n2(p.a)} AU)</span><b>${p.g.toFixed(p.g < 0.001 ? 5 : 4)} N per kg${p.name === "Earth" ? "" : ` — ${times(p.gRel)} than at Earth`}</b></div>`).join("\n")}
    </div>
    <p>Mercury's kilogram is pulled ${times(MERCURY.gRel)} than Earth's, and ${times(MERCURY.g / NEPTUNE.g)} than Neptune's. So the instinct is sound: if anything is going to lose this argument with the sun, it ought to be Mercury.</p>
  </div>

  <div class="card">
    <h2>2 · And Mercury <em>is</em> losing it — continuously</h2>
    <p>Here is the part that reframes everything. Mercury is not resisting that pull. It is not being held up by anything. It is in <strong>free fall</strong> — accelerating toward the sun at ${MERCURY.g.toFixed(4)} metres per second per second, right now, exactly as the pull demands. An astronaut standing on Mercury's orbit would feel no force at all, in the same way an astronaut on the space station feels weightless while very much inside Earth's gravity.</p>
    <p>What keeps it from arriving is not a force. It is a <strong>direction</strong>. Mercury is also moving sideways, at about ${n1(MERCURY.vc)} kilometres every second. In the time it takes to fall a given distance toward the sun, it has moved so far along that the sun is no longer beneath it. It falls, and misses. Then it falls again, and misses again — and the shape traced out by falling and missing forever is a circle.</p>
    <p class="ov-pull">An orbit is not a balance between gravity and something pushing out. There is nothing pushing out. An orbit is a fall that keeps missing the ground.</p>
  </div>

  <div class="card">
    <h2>3 · Newton's cannonball, which is still the best way to see it</h2>
    <p>Newton put it as a thought experiment. Stand on an impossibly high mountain with a cannon pointing horizontally. Fire it gently and the ball arcs downward and lands a mile away. Fire it harder and it lands a hundred miles away — and notice that on that scale, the ground has begun to <em>curve away beneath it</em> as it falls.</p>
    <p>Fire it hard enough and the curve of its fall exactly matches the curve of the planet. It is still falling, at every instant, as hard as it ever was. It simply never gets any closer, because the surface keeps dropping away underneath at precisely the rate it descends. That is orbit — and the only thing that changed between "lands in a field" and "orbits forever" was <strong>sideways speed</strong>.</p>
    <p>Every satellite overhead is doing this. So is the moon. So is Mercury, with the sun in the role of the mountain.</p>
  </div>

  <div class="card">
    <h2>4 · So the strong pull sets the speed, and Mercury has it</h2>
    <p>Now the two halves meet. For the fall to keep exactly missing, the sideways speed has to match the strength of the pull. Written out, the circular orbit condition is that the acceleration needed to keep curving, <strong>v²/r</strong>, equals the acceleration gravity supplies, <strong>GM/r²</strong>. Everything cancels down to one line:</p>
    <p class="ov-eq">v = √(GM / r)</p>
    <p>Which says: <strong>the closer in you are, the faster you must move</strong> — as one over the square root of the distance. Not as a rule imposed from outside, but as the only speed at which falling and missing balance at that distance.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Mercury, pulled ${n1(MERCURY.gRel)}× harder than Earth</span><b>must move ${n1(MERCURY.vc / EARTH.vc)}× faster — ${kmPerS(MERCURY.vc, 1)}</b></div>
      <div class="wc-frow"><span>Earth</span><b>${kmPerS(EARTH.vc, 1)}</b></div>
      <div class="wc-frow"><span>Jupiter, pulled ${Math.round(1 / JUPITER.gRel)}× less</span><b>coasts at ${kmPerS(JUPITER.vc, 1)}</b></div>
      <div class="wc-frow"><span>Neptune, pulled ${Math.round(1 / NEPTUNE.gRel)}× less</span><b>ambles at ${kmPerS(NEPTUNE.vc, 1)}</b></div>
    </div>
    <p>So the answer to "wouldn't Mercury get pulled in?" is: it would, if it were moving at Earth's speed. At ${kmPerS(EARTH.vc, 1)}, Mercury's distance would not hold it — it would fall onto a far more lopsided path. It survives precisely <em>because</em> it is fast, and it is fast because that is the only kind of orbit that lasts at that distance. Anything slower stopped being there a long time ago.</p>
  </div>

  <div class="card">
    <h2>5 · The planet's own mass makes no difference whatsoever</h2>
    <p>This is the step that feels wrong and is not. Nowhere in <strong>v = √(GM/r)</strong> does the orbiting object's mass appear. The M is the <em>sun's</em> mass. Jupiter is more than five thousand times the mass of Mercury, and if you moved Jupiter to Mercury's orbit it would need exactly ${kmPerS(MERCURY.vc, 1)} — the same as Mercury, the same as a satellite, the same as a grain of dust.</p>
    <p>The reason is a cancellation. A heavier object is pulled harder, in exact proportion to its mass. But a heavier object is also harder to deflect, in exactly the same proportion. Double the mass and you double both the force and the resistance to that force; the acceleration is unchanged. It is the same fact as Galileo's heavy and light balls striking the ground together, and it is why the simulator has no mass slider — there would be nothing for it to change.</p>
  </div>

  <div class="card">
    <h2>6 · What would actually make a planet fall in</h2>
    <p>Not a small slowdown. The instinct is that shaving off some speed starts a spiral inward, but that is not what the mathematics gives you. Slow a planet at ${n2(EARTH.a)} AU and it drops onto an <strong>ellipse</strong>: it swings inward, speeds up as it falls (converting height into speed, exactly like a dropped stone), whips around the near end, and climbs back out to precisely where it started, slowing as it goes. Then it does it again, forever.</p>
    <p>To actually strike the sun the near end of that ellipse has to reach the sun's surface — and the sun, for all its size, is a very small target from ${n2(EARTH.a)} AU. You would have to cut Earth's ${kmPerS(EARTH.vc, 1)} all the way down to about <strong>${kmPerS(HIT_SUN_1AU, 1)}</strong>, shedding over ${Math.round((1 - HIT_SUN_1AU / EARTH.vc) * 100)}% of the speed, before the path intersected it. This is also why sending a spacecraft <em>to</em> the sun is one of the hardest trips in the solar system: you are not falling in, you are trying to cancel Earth's enormous sideways motion, which costs far more than escaping the solar system entirely.</p>
    <p>Go the other way and past <strong>${kmPerS(V_ESC_1AU, 1)}</strong> at Earth's distance — the circular speed multiplied by the square root of two — the ellipse opens up and never closes. That is escape velocity. <a href="${OV_PATH}">Try both ends on the simulator</a>.</p>
  </div>

  <div class="card">
    <h2>7 · And why nothing slows them down</h2>
    <p>All of which leaves one loose end: if Mercury needs its speed, why does it not gradually lose it? On Earth everything that moves eventually stops, so a planet coasting for billions of years is the genuinely strange part.</p>
    <p>Two reasons. First, <strong>space is empty enough that there is nothing to rub against</strong> — no air, no meaningful drag. Second, and less obvious: <strong>gravity itself does not slow the planet down</strong>. On a circular orbit the pull is always exactly at right angles to the motion, and a force at right angles changes direction without changing speed — it is the same reason swinging a weight on a string keeps it moving at a steady rate. There is simply no mechanism bleeding energy away, so the sideways motion that arrived with the planet's formation is still there, essentially undiminished.</p>
    <p>Where it came from originally: the cloud of gas and dust that became the solar system was already turning, very slowly. Gravity pulled it inward, and as it shrank it spun faster — the skater pulling in their arms — flattening into a disc. Everything that formed in that disc was already going sideways at close to orbital speed. The planets did not have to acquire their motion. They inherited it, and nothing has taken it away since.</p>
  </div>

  <div class="card tool-about">
    <h2>Common questions</h2>
    ${WHY_FAQ.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>

  <div class="card">
    <h2>See it moving</h2>
    <p class="timer-presets">
      <a class="chip" href="${OV_PATH}">The orbital velocity simulator</a>
      <a class="chip" href="/solar-system-simulator/">All eight planets on their real orbits</a>
      <a class="chip" href="${PLANETS_PATH}">Every planet, a page each</a>
      <a class="chip" href="${planetPath("mercury", 0)}">Mercury</a>
    </p>
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;

mkdirSync(join(root, OV_PATH.slice(1, -1)), { recursive: true });
writeFileSync(join(root, OV_PATH.slice(1) + "index.html"), hubHtml);
mkdirSync(join(root, OV_WHY.slice(1, -1)), { recursive: true });
writeFileSync(join(root, OV_WHY.slice(1) + "index.html"), whyHtml);
console.log(`orbital: wrote ${OV_PATH} and ${OV_WHY}`);
